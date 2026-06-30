import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import {
  defaultSignaLocale,
  normalizeSignaLocale,
  type SignaLocale,
} from './signa-locale';

type TranslateInput = {
  args?: Record<string, unknown>;
  defaultValue?: string;
  lang?: string | null;
};

@Injectable()
export class SignaI18nService {
  constructor(private readonly i18n: I18nService) {}

  currentLocale(): SignaLocale {
    return normalizeSignaLocale(I18nContext.current()?.lang);
  }

  localeFromRequest(
    request?: Pick<AuthenticatedRequest, 'account'>,
  ): SignaLocale {
    return normalizeSignaLocale(request?.account?.locale);
  }

  normalizeLocale(locale?: string | null): SignaLocale {
    return normalizeSignaLocale(locale);
  }

  translate(key: string, input: TranslateInput = {}): string {
    return this.i18n.translate(key, {
      args: input.args,
      defaultValue: input.defaultValue ?? key,
      lang: normalizeSignaLocale(input.lang ?? this.currentLocale()),
    });
  }

  snapshotLocale(locale?: string | null): SignaLocale {
    return normalizeSignaLocale(locale ?? I18nContext.current()?.lang);
  }

  fallbackLocale(): SignaLocale {
    return defaultSignaLocale;
  }
}
