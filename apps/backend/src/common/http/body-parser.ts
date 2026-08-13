import { NestExpressApplication } from '@nestjs/platform-express';

const jsonEnvelopeBytes = 1024 * 1024;

export function configureBodyParsers(
  app: NestExpressApplication,
  attachmentMaxBytes: number,
): void {
  app.useBodyParser('json', {
    limit: getBase64JsonBodyLimit(attachmentMaxBytes),
  });
  app.useBodyParser('urlencoded', {
    extended: true,
    limit: jsonEnvelopeBytes,
  });
}

export function getBase64JsonBodyLimit(attachmentMaxBytes: number): number {
  return Math.ceil((attachmentMaxBytes * 4) / 3) + jsonEnvelopeBytes;
}
