import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import type { Account } from '../../accounts/entities/account.entity';

export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Account | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.account;
  },
);
