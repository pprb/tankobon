/**
 * Argument guards for the IPC handlers. The renderer is typed by `TankobonApi`, but nothing
 * enforces those types at run time: a compromised or buggy renderer can send anything over a
 * channel, so every handler checks what it receives before using it (see ADR 0009). A refused
 * call rejects with an {@link IpcArgumentError}; these are programming errors or hostile calls,
 * never something to show the user, so the message is not translated.
 * @module
 */
import { CREDIT_ROLES, type CreditInput, type CreditRole, type MetadataUpdate } from '../../shared/library';
import type { MetadataQuery } from '../../shared/metadata';

/** Longest string accepted for a free-form field (a title, a tag, a search text), in characters. */
export const MAX_TEXT_LENGTH = 10_000;
/** Longest list accepted (tags, credits, ids of a reorder). */
export const MAX_LIST_LENGTH = 1_000;
/** Longest file path or URL accepted, in characters. */
export const MAX_PATH_LENGTH = 4_096;

/** A renderer argument that doesn't have the expected type or range. */
export class IpcArgumentError extends Error {
  constructor(name: string, expected: string) {
    super(`Invalid argument "${name}": expected ${expected}`);
    this.name = 'IpcArgumentError';
  }
}

/** A string of at most `max` characters. */
export function expectString(value: unknown, name: string, max = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string' || value.length > max) {
    throw new IpcArgumentError(name, `a string of at most ${max} characters`);
  }
  return value;
}

/** A non-empty string: an id, a path, a name. */
export function expectNonEmptyString(value: unknown, name: string, max = MAX_TEXT_LENGTH): string {
  const text = expectString(value, name, max);
  if (text === '') {
    throw new IpcArgumentError(name, 'a non-empty string');
  }
  return text;
}

/** A string or `null`. */
export function expectNullableString(value: unknown, name: string): string | null {
  return value === null ? null : expectString(value, name);
}

/** A finite integer in `[min, max]`. */
export function expectInteger(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new IpcArgumentError(name, `an integer between ${min} and ${max}`);
  }
  return value;
}

/** An array of at most {@link MAX_LIST_LENGTH} strings. */
export function expectStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_LENGTH) {
    throw new IpcArgumentError(name, `an array of at most ${MAX_LIST_LENGTH} strings`);
  }
  return value.map((item, index) => expectString(item, `${name}[${index}]`));
}

function expectRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new IpcArgumentError(name, 'an object');
  }
  return value as Record<string, unknown>;
}

function expectCredits(value: unknown): CreditInput[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_LENGTH) {
    throw new IpcArgumentError('update.credits', `an array of at most ${MAX_LIST_LENGTH} credits`);
  }
  return value.map((item, index): CreditInput => {
    const credit = expectRecord(item, `update.credits[${index}]`);
    if (!CREDIT_ROLES.includes(credit.role as CreditRole)) {
      throw new IpcArgumentError(`update.credits[${index}].role`, 'a credit role');
    }
    return {
      firstName: expectString(credit.firstName, `update.credits[${index}].firstName`),
      lastName: expectString(credit.lastName, `update.credits[${index}].lastName`),
      role: credit.role as CreditRole,
    };
  });
}

/** A {@link MetadataUpdate}: only the known fields are kept, each with its type checked. */
export function expectMetadataUpdate(value: unknown): MetadataUpdate {
  const input = expectRecord(value, 'update');
  const update: MetadataUpdate = {};
  if (input.title !== undefined) update.title = expectString(input.title, 'update.title');
  for (const field of ['series', 'volume', 'releaseDate', 'language'] as const) {
    if (input[field] !== undefined) update[field] = expectNullableString(input[field], `update.${field}`);
  }
  if (input.credits !== undefined) update.credits = expectCredits(input.credits);
  return update;
}

/** A {@link MetadataQuery}. */
export function expectMetadataQuery(value: unknown): MetadataQuery {
  const input = expectRecord(value, 'query');
  return { text: expectString(input.text, 'query.text'), volume: expectNullableString(input.volume, 'query.volume') };
}
