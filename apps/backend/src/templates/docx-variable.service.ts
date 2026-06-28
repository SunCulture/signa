import { Injectable } from '@nestjs/common';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const xmlEntryPattern = /^word\/.+\.xml$/;
const variablePattern = /\[\[([^[\]]+)\]\]/g;

@Injectable()
export class DocxVariableService {
  expandVariables(
    input: Buffer,
    variables: Record<string, unknown> | undefined,
  ): Buffer {
    if (!variables || !Object.keys(variables).length) {
      return input;
    }

    const zipEntries = unzipSync(new Uint8Array(input));
    let changed = false;
    const nextEntries = { ...zipEntries };

    for (const [path, content] of Object.entries(zipEntries)) {
      if (!xmlEntryPattern.test(path)) {
        continue;
      }

      const xml = strFromU8(content);
      const nextXml = xml.replace(variablePattern, (match, rawName: string) => {
        const value = resolveVariableValue(variables, rawName.trim());

        if (value === null) {
          return match;
        }

        changed = true;
        return escapeXml(stringifyVariableValue(value));
      });

      if (nextXml !== xml) {
        nextEntries[path] = strToU8(nextXml);
      }
    }

    return changed ? Buffer.from(zipSync(nextEntries)) : input;
  }
}

function resolveVariableValue(
  variables: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split('.').filter(Boolean);
  let value: unknown = variables;

  for (const part of parts) {
    if (!isRecord(value) || !(part in value)) {
      return null;
    }

    value = value[part];
  }

  return value ?? '';
}

function stringifyVariableValue(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return JSON.stringify(value);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
