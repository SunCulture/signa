export function getChangedFields<T extends object>(
  current: T,
  initial: T,
): Partial<T> {
  return Object.fromEntries(
    (Object.keys(current) as Array<keyof T>)
      .filter((key) => {
        return !isEqual(current[key], initial[key]);
      })
      .map((key) => {
        return [key, current[key]];
      }),
  ) as Partial<T>;
}

export function hasChangedFields<T extends object>(
  current: T,
  initial: T,
): boolean {
  return Object.keys(getChangedFields(current, initial)).length > 0;
}

export function isEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
