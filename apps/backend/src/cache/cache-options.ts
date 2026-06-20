import type { CacheModuleOptions } from '@nestjs/cache-manager';
import type { ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';
import { Cacheable } from 'cacheable';

export function createCacheOptions(config: ConfigService): CacheModuleOptions {
  const ttl = config.get<number>('CACHE_TTL_MS', 3_600_000);
  const redisUrl = config.get<string>('REDIS_URL');

  if (!redisUrl) {
    return { ttl };
  }

  const secondary = createKeyv(redisUrl, {
    namespace: config.get<string>('CACHE_NAMESPACE', 'signa-cache'),
    useUnlink: true,
  });

  return {
    ttl,
    store: new Cacheable({
      secondary,
      ttl,
    }),
  };
}
