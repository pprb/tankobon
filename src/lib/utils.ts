/**
 * Small UI helpers.
 * @module
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { currentLanguage, t } from '@/shared/i18n';

/** Joins class names (clsx) and resolves conflicting Tailwind classes (tailwind-merge) — the shadcn/ui helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FILE_SIZE_UNITS = ['b', 'kb', 'mb', 'gb', 'tb'] as const;

/** In the current language, e.g. 1500 -> "1.5 KB" in English, "1,5 Ko" in French. */
export function formatFileSize(bytes: number): string {
  const unit = (exponent: number) => t(`common:sizeUnits.${FILE_SIZE_UNITS[exponent]}`);
  if (bytes <= 0) return `0 ${unit(0)}`;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), FILE_SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 || value >= 10 ? 0 : 1;
  const formatted = new Intl.NumberFormat(currentLanguage(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
  return `${formatted} ${unit(exponent)}`;
}

/**
 * An ISO 639-1 code as a language name in the current language ("fr" → "French", or "français"
 * in French); null for null, the code itself when the runtime doesn't know it.
 */
export function formatLanguage(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([currentLanguage()], { type: 'language' }).of(code) ?? code;
  } catch {
    // `of()` throws a RangeError on a malformed code.
    return code;
  }
}
