import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

type DatabaseConfig = TypeOrmModuleOptions & DataSourceOptions;

export function createTypeOrmOptions(config: ConfigService): DatabaseConfig {
  return {
    type: 'postgres',
    host: config.get<string>('DATABASE_HOST', 'localhost'),
    port: getNumber(config, 'DATABASE_PORT', 5432),
    username: config.get<string>('DATABASE_USER', 'postgres'),
    password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
    database: config.get<string>('DATABASE_NAME', 'signa_development'),
    autoLoadEntities: true,
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false,
    synchronize: false,
    logging: getBoolean(config, 'DATABASE_LOGGING', false),
    ssl: getBoolean(config, 'DATABASE_SSL', false),
  };
}

function getNumber(
  config: ConfigService,
  key: string,
  defaultValue: number,
): number {
  const value = config.get<string | number>(key, defaultValue);

  return typeof value === 'number' ? value : Number(value);
}

function getBoolean(
  config: ConfigService,
  key: string,
  defaultValue: boolean,
): boolean {
  const value = config.get<string | boolean>(key, defaultValue);

  if (typeof value === 'boolean') {
    return value;
  }

  return value.toLowerCase() === 'true';
}
