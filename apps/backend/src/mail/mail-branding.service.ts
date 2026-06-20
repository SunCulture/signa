import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailBrandingService {
  constructor(private readonly config: ConfigService) {}

  getBaseContext(): Record<string, unknown> {
    return {
      locale: 'en',
      logoUrl: this.getLogoUrl(),
      assetBaseUrl: this.config.get<string>('MAIL_ASSET_BASE_URL') || null,
      productName: 'Signa',
    };
  }

  getFrontendUrl(path = ''): string {
    const origin = this.config
      .get<string>('FRONTEND_ORIGIN', 'http://localhost:3000')
      .replace(/\/$/, '');

    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private getLogoUrl(): string {
    const configuredLogo = this.config.get<string>('MAIL_LOGO_URL');

    if (configuredLogo) {
      return configuredLogo;
    }

    return this.getFrontendUrl('/images/logo.png');
  }
}
