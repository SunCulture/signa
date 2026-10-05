import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEvent } from '../../submissions/entities/submission-event.entity';
import { Submitter } from '../../submitters/entities/submitter.entity';
import type {
  AmtOtpGateTokenResponseDto,
  SigningGatedResponseDto,
} from '../dto/signing-response.dto';
import {
  buildEventData,
  type SigningRequestMetadata,
} from '../signing-request-metadata';
import { AmtOtpClient, type AmtSubmitterRef } from './amt-otp.client';
import {
  AMT_OTP_GATE_REQUIRED_ERROR,
  AMT_OTP_INVALID_CODE_MESSAGE,
  isAmtOtpRequired,
} from './amt-otp-gate.policy';

const GATE_TOKEN_TYPE = 'amt_otp_gate';
const GATE_TOKEN_TTL_SECONDS = 2 * 60 * 60;
const AMT_UNAVAILABLE_MESSAGE =
  'We could not check your code right now. Please try again in a moment.';

type GateClaims = { typ?: unknown; sub?: unknown; cid?: unknown };

type GateSubject = Pick<
  Submitter,
  'id' | 'slug' | 'accountId' | 'submissionId' | 'metadata' | 'completedAt'
>;

export type GateCheckOptions = { checkCurrent: boolean };

/**
 * The OTP gate on public signing for AMT-owned submitters (FSS-793). AMT owns the code; Signa only asks AMT whether
 * the code is right, then hands the browser a short-lived token bound to the slug and to the AMT challenge it passed.
 *
 * Gate tokens are signed with a secret derived from `JWT_SECRET`, so a gate token is never a valid session token and
 * a session token never opens a gate.
 */
@Injectable()
export class AmtOtpGateService {
  constructor(
    @InjectRepository(Submitter)
    private readonly submitters: Repository<Submitter>,
    @InjectRepository(SubmissionEvent)
    private readonly submissionEvents: Repository<SubmissionEvent>,
    private readonly amt: AmtOtpClient,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async verify(
    slug: string,
    code: string,
    metadata?: SigningRequestMetadata,
  ): Promise<AmtOtpGateTokenResponseDto> {
    const submitter = await this.findSubjectOrFail(slug);
    if (!isAmtOtpRequired(submitter)) {
      throw new ConflictException({
        error: 'This signing form does not need a code',
      });
    }

    const outcome = await this.amt.verify(refOf(submitter), code);
    if (outcome.status === 'unavailable') throw unavailable();
    if (outcome.status === 'invalid') {
      throw new UnprocessableEntityException({
        error: AMT_OTP_INVALID_CODE_MESSAGE,
      });
    }

    const gateToken = await this.jwt.signAsync(
      { typ: GATE_TOKEN_TYPE, sub: slug, cid: outcome.challengeId },
      { secret: this.gateSecret(), expiresIn: GATE_TOKEN_TTL_SECONDS },
    );
    await this.recordVerified(submitter, metadata);
    return { gate_token: gateToken, expires_in: GATE_TOKEN_TTL_SECONDS };
  }

  /** Throws 403 `amt_otp_gate_required` unless the gate is not needed or `token` passes it. */
  async assertPassed(
    submitter: GateSubject,
    token: string | undefined,
    options: GateCheckOptions,
  ): Promise<void> {
    if (!isAmtOtpRequired(submitter)) return;
    if (await this.hasPassed(submitter, token, options)) return;
    throw new ForbiddenException({ error: AMT_OTP_GATE_REQUIRED_ERROR });
  }

  /** An unknown slug passes here so the route itself answers 404 the way it always has. */
  async assertPassedForSlug(
    slug: string | undefined,
    token: string | undefined,
    options: GateCheckOptions,
  ): Promise<void> {
    const submitter = slug ? await this.findSubject(slug) : null;
    if (submitter) await this.assertPassed(submitter, token, options);
  }

  /** The page a gated signer sees before the code: no documents, fields, values or attachments. */
  async gatedFormFor(
    slug: string,
    token: string | undefined,
  ): Promise<SigningGatedResponseDto | null> {
    const submitter = await this.submitters.findOne({
      where: { slug },
      relations: { submission: { template: true } },
    });
    if (!submitter || !isAmtOtpRequired(submitter)) return null;
    if (await this.hasPassed(submitter, token, { checkCurrent: true })) {
      return null;
    }

    return {
      amt_otp_gate: { required: true },
      submitter: { slug: submitter.slug, name: submitter.name },
      template: { name: submitter.submission?.template?.name ?? null },
    };
  }

  private async hasPassed(
    submitter: GateSubject,
    token: string | undefined,
    { checkCurrent }: GateCheckOptions,
  ): Promise<boolean> {
    const challengeId = await this.readChallengeId(token, submitter.slug);
    if (!challengeId) return false;
    if (!checkCurrent) return true;

    const current = await this.amt.isCurrent(refOf(submitter), challengeId);
    if (current === 'unavailable') throw unavailable();
    return current === 'current';
  }

  private async readChallengeId(
    token: string | undefined,
    slug: string,
  ): Promise<string | null> {
    if (!token) return null;
    try {
      const claims = await this.jwt.verifyAsync<GateClaims>(token, {
        secret: this.gateSecret(),
      });
      const isGateToken = claims.typ === GATE_TOKEN_TYPE && claims.sub === slug;
      return isGateToken && typeof claims.cid === 'string' ? claims.cid : null;
    } catch {
      return null;
    }
  }

  private gateSecret(): string {
    const secret = this.config.get<string>(
      'JWT_SECRET',
      'signa-development-secret',
    );
    return `${secret}:${GATE_TOKEN_TYPE}`;
  }

  private findSubject(slug: string): Promise<GateSubject | null> {
    return this.submitters.findOne({
      where: { slug },
      select: {
        id: true,
        slug: true,
        accountId: true,
        submissionId: true,
        metadata: true,
        completedAt: true,
      },
    });
  }

  private async findSubjectOrFail(slug: string): Promise<GateSubject> {
    const submitter = await this.findSubject(slug);
    if (!submitter) {
      throw new NotFoundException({ error: 'Signing form not found' });
    }
    return submitter;
  }

  private async recordVerified(
    submitter: GateSubject,
    metadata?: SigningRequestMetadata,
  ): Promise<void> {
    await this.submissionEvents.save(
      this.submissionEvents.create({
        accountId: submitter.accountId,
        submissionId: submitter.submissionId,
        submitterId: submitter.id,
        eventType: 'amt_otp_verified',
        eventTimestamp: new Date(),
        data: buildEventData(metadata, {}),
      }),
    );
  }
}

function refOf(submitter: GateSubject): AmtSubmitterRef {
  return { submissionId: submitter.submissionId, submitterId: submitter.id };
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({ error: AMT_UNAVAILABLE_MESSAGE });
}
