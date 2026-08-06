import { ConfigService } from '@nestjs/config';
import {
  getS3RuntimeConfig,
  getWriteStorageServiceName,
} from './storage-runtime-config';

describe('storage runtime config', () => {
  it('uses local storage when no bucket is configured', () => {
    expect(getWriteStorageServiceName(createConfig({}))).toBe('local');
  });

  it('activates S3 from the DocuSeal-compatible bucket variable alone', () => {
    const config = createConfig({
      S3_ATTACHMENTS_BUCKET: 'signa-documents',
    });

    expect(getWriteStorageServiceName(config)).toBe('s3');
    expect(getS3RuntimeConfig(config)).toEqual({
      bucket: 'signa-documents',
      forcePathStyle: false,
      prefix: '',
      region: 'us-east-1',
    });
  });

  it('keeps the existing AWS bucket variable as a compatible alias', () => {
    const runtime = getS3RuntimeConfig(
      createConfig({
        AWS_REGION: 'eu-west-1',
        AWS_S3_BUCKET: 'legacy-signa-documents',
        AWS_S3_PREFIX: '/production/blobs/',
      }),
    );

    expect(runtime).toMatchObject({
      bucket: 'legacy-signa-documents',
      prefix: 'production/blobs',
      region: 'eu-west-1',
    });
  });

  it('enables path-style access for a custom S3 endpoint', () => {
    const runtime = getS3RuntimeConfig(
      createConfig({
        S3_ATTACHMENTS_BUCKET: 'signa-documents',
        S3_ENDPOINT: 'https://storage.example.com',
      }),
    );

    expect(runtime).toMatchObject({
      endpoint: 'https://storage.example.com',
      forcePathStyle: true,
    });
  });

  it('leaves credentials unset for the AWS SDK default provider chain', () => {
    const runtime = getS3RuntimeConfig(
      createConfig({ S3_ATTACHMENTS_BUCKET: 'signa-documents' }),
    );

    expect(runtime.credentials).toBeUndefined();
  });

  it('rejects incomplete static credentials', () => {
    expect(() =>
      getS3RuntimeConfig(
        createConfig({
          AWS_ACCESS_KEY_ID: 'access-key',
          S3_ATTACHMENTS_BUCKET: 'signa-documents',
        }),
      ),
    ).toThrow(
      'S3 static credentials require both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
    );
  });
});

function createConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const value = values[key];

      return value === undefined ? defaultValue : value;
    }),
  } as unknown as ConfigService;
}
