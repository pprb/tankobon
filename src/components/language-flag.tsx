import { BG, CN, CZ, DE, DK, ES, FI, FR, GB, GR, HR, HU, ID, IL, IN, IT, JP, KR, NL, NO, PL, PT, RO, RS, RU, SA, SE, SK, TH, TR, UA, VN } from 'country-flag-icons/react/3x2';
import type { FlagComponent } from 'country-flag-icons/react/3x2';

import { languageCountry } from '@/lib/language-flag';
import { cn } from '@/lib/utils';

/** The flags bundled with the app, by country code (only those {@link languageCountry} can return). */
const FLAGS: Record<string, FlagComponent> = {
  BG,
  CN,
  CZ,
  DE,
  DK,
  ES,
  FI,
  FR,
  GB,
  GR,
  HR,
  HU,
  ID,
  IL,
  IN,
  IT,
  JP,
  KR,
  NL,
  NO,
  PL,
  PT,
  RO,
  RS,
  RU,
  SA,
  SE,
  SK,
  TH,
  TR,
  UA,
  VN,
};

/**
 * The flag of the country standing for an ISO 639-1 language code, as an inline SVG (emoji flags
 * aren't drawn on Windows); nothing when the language has no flag. Decorative: the language's name
 * is always next to it or in its `title`.
 */
export function LanguageFlag({ code, className }: { code: string | null; className?: string }) {
  const country = languageCountry(code);
  const Flag = country ? FLAGS[country] : undefined;
  if (!Flag) return null;
  return <Flag aria-hidden className={cn('inline-block h-3 w-auto shrink-0 rounded-[2px]', className)} />;
}
