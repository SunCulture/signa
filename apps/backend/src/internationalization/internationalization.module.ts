import { Global, Module } from '@nestjs/common';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nJsonLoader,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SignaLocaleResolver } from './signa-locale.resolver';
import { SignaI18nService } from './signa-i18n.service';

@Global()
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loader: I18nJsonLoader,
      loaderOptions: {
        path: resolveI18nPath(),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        SignaLocaleResolver,
        { use: QueryResolver, options: ['lang', 'locale'] },
        { use: HeaderResolver, options: ['x-locale', 'x-lang'] },
        AcceptLanguageResolver,
      ],
      throwOnMissingKey: false,
    }),
  ],
  providers: [SignaI18nService],
  exports: [SignaI18nService],
})
export class InternationalizationModule {}

function resolveI18nPath(): string {
  const candidates = [
    join(__dirname, '..', 'i18n'),
    join(__dirname, '..', 'src', 'i18n'),
    join(process.cwd(), 'src', 'i18n'),
    join(process.cwd(), 'dist', 'src', 'i18n'),
    join(process.cwd(), 'apps', 'backend', 'src', 'i18n'),
    join(process.cwd(), 'apps', 'backend', 'dist', 'src', 'i18n'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}
