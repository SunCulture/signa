export type SignaDatabaseType = 'postgres' | 'sqlite';

export function getConfiguredDatabaseType(): SignaDatabaseType {
  const explicitType = process.env.DATABASE_TYPE?.trim().toLowerCase();

  if (explicitType === 'sqlite' || explicitType === 'better-sqlite3') {
    return 'sqlite';
  }

  if (explicitType === 'postgres' || explicitType === 'postgresql') {
    return 'postgres';
  }

  return hasPostgresConfig() ? 'postgres' : 'sqlite';
}

export function hasPostgresConfig(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.DATABASE_HOST);
}
