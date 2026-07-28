import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { Socket } from 'node:net';
import { join } from 'node:path';
import { TLSSocket, connect as tlsConnect } from 'node:tls';
import { DataSource } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import {
  HealthDependencyDto,
  HealthResponseDto,
} from './dto/health-response.dto';
import { RuntimeObservabilityService } from './runtime-observability.service';

@Injectable()
export class HealthService {
  private packageMeta?: { name?: string; version?: string };

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly observability: RuntimeObservabilityService,
    private readonly storageService: StorageService,
  ) {}

  async live(): Promise<HealthResponseDto> {
    return {
      status: 'ok',
      service: await this.getServiceName(),
      version: await this.getVersion(),
      ...this.getReleaseMetadata(),
      environment: this.getEnvironment(),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: this.checkMemory(),
      message: 'Application process is running.',
    };
  }

  async ready(): Promise<HealthResponseDto> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);
    const memory = this.checkMemory();
    const coreDependencies = [database, storage, memory];
    const coreHealthy = coreDependencies.every(
      (entry) => entry.status === 'up',
    );
    const redisBlocking = this.isRedisRequired() && redis.status !== 'up';
    const status = coreHealthy && !redisBlocking ? 'ok' : 'error';

    return {
      status,
      service: await this.getServiceName(),
      version: await this.getVersion(),
      ...this.getReleaseMetadata(),
      environment: this.getEnvironment(),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      message:
        status === 'ok'
          ? 'Core dependencies are ready to serve traffic.'
          : 'One or more core dependencies are not ready.',
      database,
      redis,
      storage,
      memory,
    };
  }

  async detailed(): Promise<HealthResponseDto> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);
    const memory = this.checkMemory();
    const apiPerformance = this.checkApiPerformance();
    const redisBlocking = this.isRedisRequired() && redis.status !== 'up';
    const coreHealthy =
      database.status === 'up' &&
      storage.status === 'up' &&
      memory.status === 'up' &&
      !redisBlocking;
    const hasDegraded =
      redis.status === 'degraded' || apiPerformance.status !== 'up';

    return {
      status: coreHealthy ? (hasDegraded ? 'degraded' : 'ok') : 'error',
      service: await this.getServiceName(),
      version: await this.getVersion(),
      ...this.getReleaseMetadata(),
      environment: this.getEnvironment(),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      message: coreHealthy
        ? hasDegraded
          ? 'Core dependencies are healthy, but one or more supporting checks are degraded.'
          : 'Core dependencies are healthy.'
        : 'One or more core dependencies are unavailable.',
      database,
      redis,
      storage,
      memory,
      apiPerformance,
    };
  }

  private async checkDatabase(): Promise<HealthDependencyDto> {
    const startedAt = Date.now();

    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        message:
          error instanceof Error
            ? error.message
            : 'Database query failed. Verify PostgreSQL connectivity.',
      };
    }
  }

  private async checkRedis(): Promise<HealthDependencyDto> {
    const redisUrl = this.config.get<string>('REDIS_URL');

    if (!redisUrl) {
      return {
        status: 'up',
        message: 'Redis is not configured; cache is running in local mode.',
        details: {
          configured: false,
        },
      };
    }

    const startedAt = Date.now();

    try {
      const reply = await this.pingRedis(redisUrl);
      return {
        status: reply === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - startedAt,
        message:
          reply === 'PONG'
            ? undefined
            : `Unexpected Redis ping response: ${reply}`,
        details: {
          configured: true,
          endpoint: this.getRedisEndpointLabel(redisUrl),
          required: this.isRedisRequired(),
        },
      };
    } catch (error) {
      return {
        status: this.isRedisRequired() ? 'down' : 'degraded',
        latencyMs: Date.now() - startedAt,
        message:
          error instanceof Error
            ? error.message
            : 'Redis ping failed. Verify cache connectivity.',
        details: {
          configured: true,
          endpoint: this.getRedisEndpointLabel(redisUrl),
          required: this.isRedisRequired(),
        },
      };
    }
  }

  private async checkStorage(): Promise<HealthDependencyDto> {
    const startedAt = Date.now();

    try {
      const details = await this.storageService.checkAvailability();

      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
        details,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        message:
          error instanceof Error
            ? error.message
            : 'Configured storage backend is unavailable.',
      };
    }
  }

  private checkMemory(): HealthDependencyDto {
    const heapUsedMb = process.memoryUsage().heapUsed / 1024 / 1024;
    const heapLimitMb = this.config.get<number>('HEALTH_HEAP_LIMIT_MB', 512);
    const status = heapUsedMb >= heapLimitMb ? 'degraded' : 'up';

    return {
      status,
      message:
        status === 'up'
          ? undefined
          : 'Process heap usage is above the configured health threshold.',
      details: {
        heapUsedMb: Number(heapUsedMb.toFixed(1)),
        heapLimitMb,
      },
    };
  }

  private checkApiPerformance(): HealthDependencyDto {
    const snapshot = this.observability.getApiPerformanceSnapshot();

    return {
      status: snapshot.status,
      message: snapshot.message,
      details: snapshot.details,
    };
  }

  private async pingRedis(redisUrl: string): Promise<string> {
    const parsed = new URL(redisUrl);
    const socket = await this.connectRedisSocket(parsed);

    try {
      if (parsed.password) {
        const authArgs = parsed.username
          ? [
              decodeURIComponent(parsed.username),
              decodeURIComponent(parsed.password),
            ]
          : [decodeURIComponent(parsed.password)];
        const authReply = await this.writeRedisCommand(socket, [
          'AUTH',
          ...authArgs,
        ]);

        if (!authReply.startsWith('+OK')) {
          throw new Error(`Redis auth failed: ${authReply}`);
        }
      }

      const reply = await this.writeRedisCommand(socket, ['PING']);
      return reply.replace(/^\+/, '').trim();
    } finally {
      socket.end();
    }
  }

  private connectRedisSocket(parsed: URL): Promise<Socket | TLSSocket> {
    const port = Number(parsed.port || 6379);
    const host = parsed.hostname;
    const timeoutMs = this.config.get<number>('HEALTH_REDIS_TIMEOUT_MS', 1000);

    return new Promise((resolveSocket, reject) => {
      const socket =
        parsed.protocol === 'rediss:'
          ? tlsConnect({ host, port })
          : new Socket().connect({ host, port });
      const fail = (error: Error) => {
        socket.destroy();
        reject(error);
      };

      socket.setTimeout(timeoutMs, () => {
        fail(new Error('Redis health check timed out.'));
      });
      socket.once('error', fail);
      socket.once('connect', () => {
        socket.off('error', fail);
        resolveSocket(socket);
      });
    });
  }

  private writeRedisCommand(
    socket: Socket | TLSSocket,
    parts: string[],
  ): Promise<string> {
    const command = [
      `*${parts.length}`,
      ...parts.flatMap((part) => [`$${Buffer.byteLength(part)}`, part]),
      '',
    ].join('\r\n');

    return new Promise((resolveReply, reject) => {
      const timeout = setTimeout(
        () => {
          cleanup();
          reject(new Error('Redis health check timed out.'));
        },
        this.config.get<number>('HEALTH_REDIS_TIMEOUT_MS', 1000),
      );
      const onData = (data: Buffer) => {
        cleanup();
        resolveReply(data.toString('utf8').trim());
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
      };

      socket.once('data', onData);
      socket.once('error', onError);
      socket.write(command);
    });
  }

  private async getVersion(): Promise<string> {
    const configuredVersion = this.config.get<string>('APP_VERSION');

    if (configuredVersion) {
      return configuredVersion;
    }

    const meta = await this.getPackageMeta();
    return meta.version ?? 'unknown';
  }

  private getReleaseMetadata(): {
    buildTime?: string;
    commitSha?: string;
  } {
    const commitSha = this.config.get<string>('APP_COMMIT_SHA');
    const buildTime = this.config.get<string>('APP_BUILD_TIME');

    return {
      ...(commitSha ? { commitSha } : {}),
      ...(buildTime ? { buildTime } : {}),
    };
  }

  private async getServiceName(): Promise<string> {
    const meta = await this.getPackageMeta();
    return meta.name ?? 'backend';
  }

  private async getPackageMeta(): Promise<{ name?: string; version?: string }> {
    if (this.packageMeta) {
      return this.packageMeta;
    }

    try {
      const raw = await readFile(join(process.cwd(), 'package.json'), 'utf8');
      this.packageMeta = JSON.parse(raw) as { name?: string; version?: string };
    } catch {
      this.packageMeta = {};
    }

    return this.packageMeta;
  }

  private getEnvironment(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  private getRedisEndpointLabel(redisUrl: string): string {
    try {
      return new URL(redisUrl).host;
    } catch {
      return 'invalid-redis-url';
    }
  }

  private isRedisRequired(): boolean {
    return this.config.get<boolean>('HEALTH_REDIS_REQUIRED', false);
  }
}
