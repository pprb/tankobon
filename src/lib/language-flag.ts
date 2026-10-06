/**
 * Which country's flag stands for a language, shown in the language pickers and next to a book's
 * language.
 * @module
 */

/** The country whose flag stands for each language (ISO 639-1 → ISO 3166-1 alpha-2). */
const LANGUAGE_COUNTRIES: Record<string, string> = {
  ar: 'SA', bg: 'BG', ca: 'ES', cs: 'CZ', da: 'DK', de: 'DE', el: 'GR', en: 'GB', es: 'ES', fi: 'FI',
  fr: 'FR', he: 'IL', hi: 'IN', hr: 'HR', hu: 'HU', id: 'ID', it: 'IT', ja: 'JP', ko: 'KR', nb: 'NO',
  nl: 'NL', no: 'NO', pl: 'PL', pt: 'PT', ro: 'RO', ru: 'RU', sk: 'SK', sr: 'RS', sv: 'SE', th: 'TH',
  tr: 'TR', uk: 'UA', vi: 'VN', zh: 'CN',
};

/**
 * The ISO 3166-1 alpha-2 code of the country whose flag stands for an ISO 639-1 language code
 * ("fr" → "FR", "en" → "GB"), or null when the code is empty or unknown. A region suffix is
 * ignored ("fr-CA" → "FR").
 */
export function languageCountry(code: string | null): string | null {
  if (!code) return null;
  return LANGUAGE_COUNTRIES[code.split(/[-_]/)[0].toLowerCase()] ?? null;
}
