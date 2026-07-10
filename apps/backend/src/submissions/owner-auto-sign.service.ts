import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AccountConfig } from '../accounts/entities/account-config.entity';
import { StorageService } from '../storage/storage.service';
import { Submitter } from '../submitters/entities/submitter.entity';
import { Template } from '../templates/entities/template.entity';
import { TemplateField } from '../templates/types/template-json';
import { UserConfig } from '../users/entities/user-config.entity';
import { User } from '../users/entities/user.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';
import {
  buildSubmissionEventData,
  type SubmissionRequestMetadata,
} from './submission-event-data';

type AutoSignConfig = {
  enabled: boolean;
  role: string;
  sendEmail: boolean;
};

type ProfileAssetKey = 'signature' | 'initials';

@Injectable()
export class OwnerAutoSignService {
  constructor(
    @InjectRepository(AccountConfig)
    private readonly accountConfigs: Repository<AccountConfig>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserConfig)
    private readonly userConfigs: Repository<UserConfig>,
    private readonly storageService: StorageService,
  ) {}

  async prepareSubmittersInput(
    user: User,
    template: Template,
    input: CreateSubmissionDto,
  ): Promise<CreateSubmissionDto> {
    const config = await this.resolveConfig(user.accountId, template, input);

    if (!config.enabled) {
      return input;
    }

    const existingOwner = input.submitters.find((submitter) =>
      isRoleMatch(submitter.role, config.role),
    );

    if (existingOwner && !existingOwner.use_saved_signature) {
      throw new UnprocessableEntityException({
        error: `${config.role} is reserved for account owner auto-signing`,
      });
    }

    if (existingOwner) {
      return {
        ...input,
        submitters: input.submitters.map((submitter) =>
          isRoleMatch(submitter.role, config.role)
            ? {
                ...submitter,
                completed_by_user_id: submitter.completed_by_user_id ?? user.id,
                send_email: submitter.send_email ?? config.sendEmail,
                use_saved_signature: true,
              }
            : submitter,
        ),
      };
    }

    return {
      ...input,
      submitters: [
        {
          completed_by_user_id: user.id,
          email: user.email,
          name: getUserDisplayName(user),
          role: config.role,
          send_email: config.sendEmail,
          send_sms: false,
          use_saved_signature: true,
        },
        ...input.submitters,
      ],
    };
  }

  async completeSavedSignatureSubmitters(options: {
    manager: EntityManager;
    metadata?: SubmissionRequestMetadata;
    submission: Submission;
    user: User;
  }): Promise<void> {
    for (const submitter of options.submission.submitters ?? []) {
      if (submitter.preferences?.use_saved_signature !== true) {
        continue;
      }

      await this.completeSubmitter({
        manager: options.manager,
        metadata: options.metadata,
        submission: options.submission,
        submitter,
        user: options.user,
      });
    }
  }

  private async completeSubmitter(options: {
    manager: EntityManager;
    metadata?: SubmissionRequestMetadata;
    submission: Submission;
    submitter: Submitter;
    user: User;
  }): Promise<void> {
    const signingUser = await this.findAutoSigningUser(
      options.submitter,
      options.user,
    );
    const fields = getSubmitterFields(options.submission, options.submitter);
    const values = { ...(options.submitter.values ?? {}) };

    await this.applyAssetFieldValues({
      fields,
      key: 'signature',
      submitter: options.submitter,
      userId: signingUser.id,
      values,
    });
    await this.applyAssetFieldValues({
      fields,
      key: 'initials',
      submitter: options.submitter,
      userId: signingUser.id,
      values,
    });
    this.applyDateFieldValues(fields, values);

    const missing = getMissingRequiredFieldNames(fields, values);

    if (missing.length) {
      throw new UnprocessableEntityException({
        error: `Account owner auto-sign is missing required owner values: ${missing.join(', ')}`,
      });
    }

    options.submitter.values = values;
    options.submitter.completedAt = options.submitter.completedAt ?? new Date();
    options.submitter.metadata = {
      ...(options.submitter.metadata ?? {}),
      auto_signed: true,
      auto_signed_at: options.submitter.completedAt.toISOString(),
      auto_signed_by_user_id: signingUser.id,
      auto_signed_role: getSubmitterRole(options.submission, options.submitter),
    };

    await options.manager.getRepository(Submitter).save(options.submitter);

    await options.manager.getRepository(SubmissionEvent).save(
      options.manager.getRepository(SubmissionEvent).create({
        accountId: options.submitter.accountId,
        submissionId: options.submitter.submissionId,
        submitterId: options.submitter.id,
        eventType: 'api_complete_form',
        eventTimestamp: new Date(),
        data: buildSubmissionEventData(options.metadata, {
          auto_signed: true,
          auto_signed_by_user_id: signingUser.id,
          auto_signed_role: getSubmitterRole(
            options.submission,
            options.submitter,
          ),
        }),
      }),
    );
  }

  private async findAutoSigningUser(
    submitter: Submitter,
    fallbackUser: User,
  ): Promise<User> {
    const userId = normalizeId(submitter.preferences?.completed_by_user_id);

    if (!userId || userId === fallbackUser.id) {
      return fallbackUser;
    }

    const user = await this.users.findOne({
      where: {
        accountId: fallbackUser.accountId,
        id: userId,
      },
    });

    if (!user) {
      throw new UnprocessableEntityException({
        error: 'Auto-signing user must belong to the current account',
      });
    }

    return user;
  }

  private async applyAssetFieldValues(options: {
    fields: TemplateField[];
    key: ProfileAssetKey;
    submitter: Submitter;
    userId: string;
    values: Record<string, unknown>;
  }): Promise<void> {
    const fields = options.fields.filter(
      (field) => field.type === options.key && field.uuid,
    );

    if (!fields.length) {
      return;
    }

    const asset = await this.findProfileAsset(options.userId, options.key);

    if (!asset) {
      throw new UnprocessableEntityException({
        error: `Saved ${options.key} is required to auto-sign ${getSubmitterRole(options.submitter.submission, options.submitter)}`,
      });
    }

    const attachment = await this.storageService.cloneAttachment({
      sourceAttachment: asset,
      name: 'attachments',
      recordType: 'Submitter',
      recordId: options.submitter.id,
    });

    for (const field of fields) {
      if (field.uuid) {
        options.values[field.uuid] = attachment.uuid;
      }
    }
  }

  private applyDateFieldValues(
    fields: TemplateField[],
    values: Record<string, unknown>,
  ): void {
    const today = new Date().toISOString().slice(0, 10);

    for (const field of fields) {
      if (
        field.uuid &&
        field.type === 'date' &&
        (values[field.uuid] === undefined || values[field.uuid] === '')
      ) {
        values[field.uuid] = today;
      }
    }
  }

  private async findProfileAsset(
    userId: string,
    key: ProfileAssetKey,
  ): Promise<
    Awaited<ReturnType<StorageService['findRecordAttachments']>>[number] | null
  > {
    const config = await this.userConfigs.findOneBy({ userId, key });

    if (!config?.value) {
      return null;
    }

    const [attachment] = await this.storageService.findRecordAttachments({
      recordType: 'User',
      recordId: userId,
      name: key,
    });

    return attachment?.uuid === config.value ? attachment : null;
  }

  private async resolveConfig(
    accountId: string,
    template: Template,
    input: CreateSubmissionDto,
  ): Promise<AutoSignConfig> {
    const accountConfigs = await this.accountConfigs.find({
      where: { accountId },
    });
    const byKey = new Map(accountConfigs.map((config) => [config.key, config]));
    const preferences = template.preferences ?? {};
    const enabled =
      input.auto_sign_owner ??
      toOptionalBoolean(preferences.auto_sign_owner_enabled) ??
      toOptionalBoolean(byKey.get('auto_sign_owner_enabled')?.value) ??
      false;
    const role =
      normalizeRole(input.auto_sign_owner_role) ??
      normalizeRole(preferences.auto_sign_owner_role) ??
      normalizeRole(byKey.get('auto_sign_owner_role')?.value) ??
      'First Party';
    const sendEmail =
      toOptionalBoolean(preferences.auto_sign_owner_send_email) ??
      toOptionalBoolean(byKey.get('auto_sign_owner_send_email')?.value) ??
      false;

    return { enabled, role, sendEmail };
  }
}

function getSubmitterFields(
  submission: Submission,
  submitter: Submitter,
): TemplateField[] {
  return (
    submission.templateFields ??
    submission.template?.fields ??
    []
  ).filter((field) => field.submitter_uuid === submitter.uuid);
}

function getMissingRequiredFieldNames(
  fields: TemplateField[],
  values: Record<string, unknown>,
): string[] {
  return fields
    .filter((field) => field.required !== false && field.readonly !== true)
    .filter((field) => field.uuid && isBlankValue(values[field.uuid]))
    .map((field) => field.name ?? field.uuid ?? 'Unnamed field');
}

function getSubmitterRole(
  submission: Submission,
  submitter: Submitter,
): string {
  return (
    (
      submission.templateSubmitters ??
      submission.template?.submitters ??
      []
    ).find((item) => item.uuid === submitter.uuid)?.name ??
    submitter.name ??
    submitter.email ??
    'Submitter'
  );
}

function getUserDisplayName(user: User): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  );
}

function isBlankValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isRoleMatch(value: unknown, role: string): boolean {
  return (
    typeof value === 'string' &&
    value.trim().toLowerCase() === role.toLowerCase()
  );
}

function normalizeRole(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}
