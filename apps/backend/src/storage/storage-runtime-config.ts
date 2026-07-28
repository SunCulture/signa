import type { ServerSideEncryption } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';

export type StorageServiceName = 'local' | 's3';

export type S3RuntimeConfig = {
  bucket: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
  forcePathStyle: boolean;
  prefix: string;
  region: string;
  serverSideEncryption?: ServerSideEncryption;
};

const DEFAULT_AWS_REGION = 'us-east-1';

export function getWriteStorageServiceName(
  config: ConfigService,
): StorageServiceName {
  const configuredService = getOptionalString(config, 'STORAGE_SERVICE');

  if (configuredService === 'local' || configuredService === 's3') {
    return configuredService;
  }

  return getS3Bucket(config) ? 's3' : 'local';
}

export function getS3RuntimeConfig(config: ConfigService): S3RuntimeConfig {
  const bucket = getS3Bucket(config);

  if (!bucket) {
    throw new Error(
      'S3_ATTACHMENTS_BUCKET is required when S3 storage is enabled.',
    );
  }

  const endpoint =
    getOptionalString(config, 'S3_ENDPOINT') ??
    getOptionalString(config, 'AWS_S3_ENDPOINT');
  const prefix = getOptionalString(config, 'AWS_S3_PREFIX') ?? '';
  const serverSideEncryption = getServerSideEncryption(config);
  const credentials = getCredentials(config);

  return {
    bucket,
    region:
      getOptionalString(config, 'AWS_REGION') ??
      getOptionalString(config, 'AWS_DEFAULT_REGION') ??
      DEFAULT_AWS_REGION,
    prefix: prefix.replace(/^\/+|\/+$/g, ''),
    forcePathStyle:
      Boolean(endpoint) ||
      config.get<boolean>('AWS_S3_FORCE_PATH_STYLE', false) === true,
    ...(endpoint ? { endpoint } : {}),
    ...(serverSideEncryption ? { serverSideEncryption } : {}),
    ...(credentials ? { credentials } : {}),
  };
}

function getS3Bucket(config: ConfigService): string | undefined {
  return (
    getOptionalString(config, 'S3_ATTACHMENTS_BUCKET') ??
    getOptionalString(config, 'AWS_S3_BUCKET')
  );
}

function getCredentials(config: ConfigService): S3RuntimeConfig['credentials'] {
  const accessKeyId = getOptionalString(config, 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = getOptionalString(config, 'AWS_SECRET_ACCESS_KEY');

  if (!accessKeyId && !secretAccessKey) {
    // Leaving credentials undefined activates the AWS SDK default provider chain.
    return undefined;
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3 static credentials require both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
    );
  }

  const sessionToken = getOptionalString(config, 'AWS_SESSION_TOKEN');

  return {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
}

function getServerSideEncryption(
  config: ConfigService,
): ServerSideEncryption | undefined {
  const value = getOptionalString(config, 'AWS_S3_SERVER_SIDE_ENCRYPTION');

  return value === 'AES256' || value === 'aws:kms' ? value : undefined;
}

function getOptionalString(
  config: ConfigService,
  key: string,
): string | undefined {
  const value = config.get<string>(key);
  const normalized = value?.trim();

  return normalized || undefined;
}
