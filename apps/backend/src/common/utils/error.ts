import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

type PostgresDriverError = {
  code?: string;
  detail?: string;
  table?: string;
  column?: string;
  constraint?: string;
};

type ConstraintDetails = {
  table?: string;
  column?: string;
  value?: string;
  constraint?: string;
  detail?: string;
};

export function throwIfNotFound(
  error: unknown,
  message = 'Record not found',
): never {
  if (error instanceof EntityNotFoundError) {
    throw new NotFoundException({ error: message });
  }

  throw error;
}

export function throwIfUniqueConstraint(
  error: unknown,
  message = 'Record already exists',
): never {
  const driverError = getPostgresDriverError(error);

  if (driverError?.code === '23505') {
    throw new ConflictException({
      error: message,
      ...getConstraintDetails(driverError),
    });
  }

  throw error;
}

export function throwDatabaseErrors(error: unknown): never {
  if (error instanceof EntityNotFoundError) {
    throw new NotFoundException({ error: 'Record not found' });
  }

  const driverError = getPostgresDriverError(error);

  if (!driverError?.code) {
    throw error;
  }

  const details = getConstraintDetails(driverError);

  if (driverError.code === '23505') {
    throw new ConflictException({
      error: getDuplicateMessage(details),
      ...details,
    });
  }

  if (driverError.code === '23502') {
    throw new BadRequestException({
      error: `Missing required field${driverError.column ? `: ${driverError.column}` : ''}`,
      ...details,
    });
  }

  if (driverError.code === '23503') {
    throw new BadRequestException({
      error: 'Related record does not exist',
      ...details,
    });
  }

  if (driverError.code === '23514') {
    throw new BadRequestException({
      error: 'Value violates a database constraint',
      ...details,
    });
  }

  if (driverError.code === '22P02') {
    throw new BadRequestException({
      error: 'Invalid input syntax',
      ...details,
    });
  }

  throw new InternalServerErrorException({ error: 'Database error' });
}

function getPostgresDriverError(error: unknown): PostgresDriverError | null {
  if (!(error instanceof QueryFailedError)) {
    return null;
  }

  return error.driverError as PostgresDriverError;
}

function getConstraintDetails(
  driverError: PostgresDriverError,
): ConstraintDetails {
  const fieldAndValue = extractFieldAndValue(driverError.detail);

  return {
    table: driverError.table,
    column: driverError.column ?? fieldAndValue.column,
    value: fieldAndValue.value,
    constraint: driverError.constraint,
    detail: driverError.detail,
  };
}

function getDuplicateMessage(details: ConstraintDetails): string {
  if (details.column) {
    return `${sentenceCase(details.column)} already exists`;
  }

  return 'Record already exists';
}

function extractFieldAndValue(detail?: string): {
  column?: string;
  value?: string;
} {
  if (!detail) {
    return {};
  }

  const match = detail.match(/Key \((?<column>[^)]+)\)=\((?<value>[^)]+)\)/);

  if (!match?.groups) {
    return {};
  }

  return {
    column: match.groups.column.replaceAll('"', ''),
    value: match.groups.value,
  };
}

function sentenceCase(value: string): string {
  const normalized = value.replaceAll('_', ' ');

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
