import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import { getConfiguredDatabaseType } from './database-column-types';

type DatabaseConfig = TypeOrmModuleOptions & DataSourceOptions;

export function createTypeOrmOptions(config: ConfigService): DatabaseConfig {
  const databaseType = getConfiguredDatabaseType();

  if (databaseType === 'sqlite') {
    return createSqliteOptions(config);
  }

  return createPostgresOptions(config);
}

function createPostgresOptions(config: ConfigService): DatabaseConfig {
  return {
    type: 'postgres',
    url: getOptionalString(config, 'DATABASE_URL'),
    host: getOptionalString(config, 'DATABASE_HOST') ?? 'localhost',
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

function createSqliteOptions(config: ConfigService): DatabaseConfig {
  return {
    type: 'better-sqlite3',
    database: config.get<string>('SQLITE_DATABASE_PATH', 'data/signa.sqlite'),
    autoLoadEntities: true,
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: getBoolean(config, 'DATABASE_MIGRATIONS_RUN', false),
    synchronize: getBoolean(config, 'SQLITE_SYNCHRONIZE', true),
    logging: getBoolean(config, 'DATABASE_LOGGING', false),
    prepareDatabase: (database: { pragma: (statement: string) => unknown }) => {
      database.pragma('journal_mode = WAL');
      database.pragma('foreign_keys = ON');
    },
  };
}

function getOptionalString(
  config: ConfigService,
  key: string,
): string | undefined {
  const value = config.get<string>(key);

  return value?.trim() ? value : undefined;
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
