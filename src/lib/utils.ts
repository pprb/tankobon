/**
 * Small UI helpers.
 * @module
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names (clsx) and resolves conflicting Tailwind classes (tailwind-merge) — the shadcn/ui helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FILE_SIZE_UNITS = ['o', 'Ko', 'Mo', 'Go', 'To'];

/** e.g. 1500 -> "1,5 Ko". */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 o';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), FILE_SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const formatted = exponent === 0 ? String(value) : value.toFixed(value < 10 ? 1 : 0);
  return `${formatted.replace('.', ',')} ${FILE_SIZE_UNITS[exponent]}`;
}

/**
 * An ISO 639-1 code as a French language name ("fr" → "français"); null for null, the code itself
 * when the runtime doesn't know it.
 */
export function formatLanguage(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['fr'], { type: 'language' }).of(code) ?? code;
  } catch {
    // `of()` throws a RangeError on a malformed code.
    return code;
  }
}
