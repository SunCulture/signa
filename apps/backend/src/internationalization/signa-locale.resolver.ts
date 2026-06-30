import { ExecutionContext, Injectable } from '@nestjs/common';
import type { I18nResolver } from 'nestjs-i18n';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { normalizeSignaLocale } from './signa-locale';

@Injectable()
export class SignaLocaleResolver implements I18nResolver {
  resolve(context: ExecutionContext): string | undefined {
    if (context.getType() !== 'http') {
      return undefined;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accountLocale = request.account?.locale;

    return accountLocale ? normalizeSignaLocale(accountLocale) : undefined;
  }
}
