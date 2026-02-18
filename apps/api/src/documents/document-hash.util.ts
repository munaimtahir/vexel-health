import { createHash } from 'node:crypto';

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      normalized[key] = normalizeValue(record[key]);
    }

    return normalized;
  }

  return value;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

export function sha256HexFromText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sha256HexFromBytes(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
