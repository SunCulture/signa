import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AbilityFactory } from './ability.factory';
import { checkPoliciesMetadataKey } from './check-policies.decorator';
import type { PolicyHandler } from './policy-handler';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers = this.reflector.getAllAndOverride<PolicyHandler[]>(
      checkPoliciesMetadataKey,
      [context.getHandler(), context.getClass()],
    );

    if (!handlers?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new ForbiddenException({ error: 'Not authorized' });
    }

    const ability = this.abilityFactory.createForUser(request.user);
    const isAllowed = handlers.every((handler) => handler(ability));

    if (!isAllowed) {
      throw new ForbiddenException({ error: 'Not authorized' });
    }

    return true;
  }
}
