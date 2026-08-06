import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';

export type RegistrationMode = 'open' | 'initial_only' | 'disabled';

export type RegistrationStatus = {
  canRegister: boolean;
  mode: RegistrationMode;
  reason: string | null;
};

type RegistrationPolicyContext = {
  configService: ConfigService;
  dataSource: DataSource;
  manager?: EntityManager;
};

export async function getRegistrationStatus(
  context: RegistrationPolicyContext,
): Promise<RegistrationStatus> {
  const mode = getRegistrationMode(context.configService);

  if (mode === 'open') {
    return { canRegister: true, mode, reason: null };
  }

  if (mode === 'disabled') {
    return {
      canRegister: false,
      mode,
      reason: 'Registration is disabled for this installation.',
    };
  }

  const userCount = await getUserRepository(context).count();

  if (userCount === 0) {
    return { canRegister: true, mode, reason: null };
  }

  return {
    canRegister: false,
    mode,
    reason:
      'Initial registration is complete. Ask an administrator to invite you.',
  };
}

export async function assertRegistrationAllowed(
  context: RegistrationPolicyContext,
): Promise<void> {
  const status = await getRegistrationStatus(context);

  if (!status.canRegister) {
    throw new ForbiddenException({
      error: status.reason ?? 'Registration is disabled.',
    });
  }
}

function getRegistrationMode(configService: ConfigService): RegistrationMode {
  return configService.get<RegistrationMode>(
    'REGISTRATION_MODE',
    'initial_only',
  );
}

function getUserRepository(context: RegistrationPolicyContext) {
  return (context.manager ?? context.dataSource).getRepository(User);
}
