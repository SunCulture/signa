import { compare, hash } from 'bcryptjs';

const passwordHashRounds = 12;

export function hashPassword(password: string): Promise<string> {
  return hash(password, passwordHashRounds);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}
