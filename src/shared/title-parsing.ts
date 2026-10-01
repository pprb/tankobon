/**
 * Pure helpers that read series, volume and people's names out of free text: file names on one
 * side (to prefill a metadata lookup), API results on the other.
 * @module
 */
import type { PersonName } from './library';
import type { MetadataQuery } from './metadata';

/** An explicit volume marker followed by its number: "T03", "Tome 3", "Vol. 2", "n°12", "#5". */
const VOLUME_MARKER = /(?:\b(?:tome|t|vol(?:ume)?|no)\.?|n°|#)\s*(\d+(?:[.,]\d+)?[a-z]?)\b/i;

/** Separators commonly found between a series, its volume and the book title. */
const SEPARATORS = /^[\s,:;.–—-]+|[\s,:;.–—-]+$/g;

function clean(value: string): string {
  return value.replace(SEPARATORS, '').replace(/\s+/g, ' ').trim();
}

/** "03" → "3", "12.5" → "12.5", "000" → "0". */
function normalizeVolume(volume: string): string {
  return volume.replace(',', '.').replace(/^0+(?=\d)/, '');
}

/**
 * Guesses what to search for from a file-name-derived title: tags in brackets ("(2019)",
 * "[Digital]") and `_`/`.` word separators are dropped, then the volume is taken from an explicit
 * marker ("T03", "Vol. 2", "#12") or else from a standalone 1–3 digit number, and the text is
 * what precedes it (the series, usually).
 *
 * @example guessQueryFromTitle('Blacksad_T02_Arctic-Nation (2003)') // { text: 'Blacksad', volume: '2' }
 */
export function guessQueryFromTitle(title: string): MetadataQuery {
  const stripped = title
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, ' ')
    .replace(/[_]+/g, ' ')
    // Dots used as word separators ("Batman.012.2016"), but not a decimal issue number ("12.5").
    .replace(/(?<!\d)\.|\.(?!\d{1,2}\b)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const marker = VOLUME_MARKER.exec(stripped) ?? /(?<![\d.])\b(\d{1,3}(?:\.\d{1,2})?)\b(?![\d.])/.exec(stripped);
  if (!marker) {
    return { text: clean(stripped), volume: null };
  }
  const before = clean(stripped.slice(0, marker.index));
  const after = clean(stripped.slice(marker.index + marker[0].length));
  return { text: before || after, volume: normalizeVolume(marker[1]) };
}

/**
 * Splits a full book title into series, volume and the book's own title, when it has an
 * explicit volume marker: "Astérix - Tome 3 - Astérix et les Goths", "Naruto, Vol. 1". Without
 * one, the whole text is the title and the series is unknown.
 */
export function splitSeriesTitle(full: string): { series: string | null; volume: string | null; title: string } {
  const text = full.replace(/\s+/g, ' ').trim();
  const marker = VOLUME_MARKER.exec(text);
  if (!marker) {
    return { series: null, volume: null, title: text };
  }
  const series = clean(text.slice(0, marker.index));
  const rest = clean(text.slice(marker.index + marker[0].length));
  return {
    series: series || null,
    volume: normalizeVolume(marker[1]),
    title: rest || text,
  };
}

/** Lowercase particles that belong to the last name: "Jean Van Hamme" → last name "Van Hamme". */
const NAME_PARTICLES = new Set(['de', 'du', 'des', 'di', 'da', 'del', 'della', 'van', 'von', 'der', 'den', 'le', 'la']);

/**
 * Splits a person's full name as the APIs give it. "Last, First" is honoured; otherwise the last
 * word is the last name, extended to the left over particles ("de", "van"…). A single word (a pen
 * name like "Hergé") is a last name with no first name.
 */
export function splitPersonName(full: string): PersonName {
  const text = full.replace(/\s+/g, ' ').trim();
  const comma = text.indexOf(',');
  if (comma > 0) {
    return { firstName: text.slice(comma + 1).trim(), lastName: text.slice(0, comma).trim() };
  }
  const words = text.split(' ').filter(Boolean);
  if (words.length <= 1) {
    return { firstName: '', lastName: text };
  }
  let start = words.length - 1;
  while (start > 1 && NAME_PARTICLES.has(words[start - 1].toLowerCase())) {
    start -= 1;
  }
  return { firstName: words.slice(0, start).join(' '), lastName: words.slice(start).join(' ') };
}

/** "First Last", or just "Last" when there is no first name. */
export function formatPersonName(name: PersonName): string {
  return [name.firstName, name.lastName].filter(Boolean).join(' ');
}
