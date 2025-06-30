import { nanoid } from 'nanoid';

/**
 * Generates a unique, URL-friendly, 6-character alphanumeric ID.
 * Uses nanoid's default alphabet (A-Za-z0-9_-).
 *
 * @returns A 6-character string ID.
 */
export function generateShortId(): string {
  return nanoid(6);
}

/**
 * Generates a unique ID with a specified prefix and length.
 *
 * @param prefix - The prefix for the ID (e.g., 'prj', 'tsk', 'knw').
 * @param length - The desired length of the random part of the ID (default: 10).
 * @returns A prefixed ID string (e.g., 'prj_aBcDeFgHiJ').
 */
export function generatePrefixedId(prefix: string, length: number = 10): string {
  return `${prefix}_${nanoid(length)}`;
}
