/**
 * Flags standing for languages, shown in the language pickers and next to a book's language.
 * @module
 */
/** The country whose flag stands for each language (ISO 639-1 → ISO 3166-1 alpha-2). */
const LANGUAGE_COUNTRIES: Record<string, string> = {
  ar: 'SA', bg: 'BG', ca: 'ES', cs: 'CZ', da: 'DK', de: 'DE', el: 'GR', en: 'GB', es: 'ES', fi: 'FI',
  fr: 'FR', he: 'IL', hi: 'IN', hr: 'HR', hu: 'HU', id: 'ID', it: 'IT', ja: 'JP', ko: 'KR', nb: 'NO',
  nl: 'NL', no: 'NO', pl: 'PL', pt: 'PT', ro: 'RO', ru: 'RU', sk: 'SK', sr: 'RS', sv: 'SE', th: 'TH',
  tr: 'TR', uk: 'UA', vi: 'VN', zh: 'CN',
};

/** Regional indicator letters spelling `country`, which fonts draw as its flag. */
function flagEmoji(country: string): string {
  return [...country].map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join('');
}

/**
 * The flag emoji of the country that stands for an ISO 639-1 language code ("fr" → 🇫🇷), or null
 * when the code is empty or unknown. A region suffix is ignored ("fr-CA" → 🇫🇷).
 */
export function languageFlag(code: string | null): string | null {
  if (!code) return null;
  const country = LANGUAGE_COUNTRIES[code.split(/[-_]/)[0].toLowerCase()];
  return country ? flagEmoji(country) : null;
}

/** The flag followed by `name` ("🇫🇷 français"), or `name` alone when the language has no flag. */
export function withFlag(code: string | null, name: string): string {
  const flag = languageFlag(code);
  return flag ? `${flag} ${name}` : name;
}
