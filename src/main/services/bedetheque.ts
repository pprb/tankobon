/**
 * Reads a book's information from a Bédéthèque album page, whose link the user pasted. Bédéthèque
 * (the BDGest' database) has no public API: the page's HTML is parsed.
 * @module
 */
import { t } from '../../shared/i18n';
import type { CreditInput, CreditRole } from '../../shared/library';
import { isBedethequeAlbumUrl, type MetadataCandidate } from '../../shared/metadata';
import { splitPersonName } from '../../shared/title-parsing';
import { getHtml, type HttpOptions } from './http-json';

const SOURCE = 'Bédéthèque';

/** Bédéthèque's credit labels; the others ("Traduction", "Préface", "Autres"…) are dropped. */
const ROLES: Record<string, CreditRole> = {
  'scénario': 'writer',
  dessin: 'artist',
  couleurs: 'colorist',
  encrage: 'inker',
  lettrage: 'letterer',
  couverture: 'cover',
};

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Decodes the HTML entities found in Bédéthèque's text (named basics and numeric ones). */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/** The text of an HTML fragment: tags dropped, entities decoded, whitespace collapsed. */
function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/** The `content` of the first `<meta itemprop="…">` in `html`. */
function metaItemprop(html: string, prop: string): string | null {
  const match = new RegExp(`<meta\\s+itemprop="${prop}"\\s+content="([^"]*)"`, 'i').exec(html);
  return match ? decodeEntities(match[1]).trim() || null : null;
}

/**
 * The release date: the legal deposit ("Dépôt légal") is `MM/YYYY`, with the exact day in
 * parentheses when Bédéthèque knows it. Its `datePublished` meta pads an unknown day with `01`, so
 * it is only used when that day is spelled out.
 */
function releaseDate(album: string): string | null {
  const deposit = /<li title="Dépôt légal">([\s\S]*?)<\/li>/i.exec(album)?.[1];
  if (!deposit) {
    return null;
  }
  const published = metaItemprop(deposit, 'datePublished');
  if (published && /^\d{4}-\d{2}-\d{2}$/.test(published) && /\(\s*\d{1,2}(er)? \S+ \d{4}\s*\)/.test(textOf(deposit))) {
    return published;
  }
  const shown = textOf(/<b>([\s\S]*?)<\/b>/i.exec(deposit)?.[1] ?? '');
  const monthYear = /^(\d{2})\/(\d{4})$/.exec(shown);
  if (monthYear) {
    return `${monthYear[2]}-${monthYear[1]}`;
  }
  return /^\d{4}$/.test(shown) ? shown : null;
}

/**
 * The album's credits, in the page's order. Placeholders such as `<N&B>` or `<Collectif>` aren't
 * people and are dropped; a person credited twice for the same role is kept once.
 */
function credits(album: string): CreditInput[] {
  const list = /<div class="[^"]*\bliste-auteurs\b[^"]*">([\s\S]*?)<\/div>/i.exec(album)?.[1] ?? '';
  const result: CreditInput[] = [];
  const seen = new Set<string>();
  // Attribute values are skipped as a whole: a placeholder's `title` holds a raw "<N&B>".
  for (const match of list.matchAll(/<a\b(?:"[^"]*"|[^">])*>([\s\S]*?)<\/a>\s*<small>([\s\S]*?)<\/small>/gi)) {
    const name = textOf(match[1]);
    const role = ROLES[textOf(match[2]).replace(/[()]/g, '').trim().toLowerCase()];
    if (!role || !name || name.startsWith('<')) {
      continue;
    }
    const credit = { ...splitPersonName(name), role };
    const key = `${credit.lastName}|${credit.firstName}|${role}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(credit);
    }
  }
  return result;
}

/**
 * Parses a Bédéthèque album page. Only its main album block (`<section class="bdt-ah">`) is read,
 * not the series' other albums or editions further down the page. Throws a translated message when
 * the page has no album block.
 */
export function parseBedethequeAlbum(html: string, url: string): MetadataCandidate {
  const album = /<section class="bdt-ah">([\s\S]*?)<\/section>/i.exec(html)?.[1];
  if (!album) {
    throw new Error(t('errors:metadata.notAlbumPage', { source: SOURCE }));
  }

  const series = textOf(/<h1>([\s\S]*?)<\/h1>/i.exec(album)?.[1] ?? '') || null;
  // "6<span class="bdt-numa"></span>. Sibylline et les cravates noires": the number, an optional
  // letter ("12a"), then the title. A one-shot has no number.
  const subtitle = textOf(/<h2 class="bdt-ah-sub">([\s\S]*?)<\/h2>/i.exec(album)?.[1] ?? '');
  const numbered = /^([^\s.]+)\s*\.\s*(.*)$/.exec(subtitle);
  const volume = numbered ? numbered[1] : null;
  const title = (numbered ? numbered[2] : subtitle) || metaItemprop(album, 'alternativeheadline');

  return {
    source: 'bedetheque',
    sourceId: /-(\d+)\.html$/i.exec(new URL(url).pathname)?.[1] ?? url,
    sourceUrl: url,
    coverUrl: /<img\s+itemprop="image"\s+src="([^"]+)"/i.exec(album)?.[1] ?? null,
    title: title || null,
    series,
    volume,
    releaseDate: releaseDate(album),
    language: metaItemprop(album, 'inLanguage'),
    credits: credits(album),
  };
}

/** Downloads and parses a Bédéthèque album page. Throws a translated message on failure. */
export async function fetchBedethequeAlbum(url: string, http: HttpOptions): Promise<MetadataCandidate> {
  if (!isBedethequeAlbumUrl(url)) {
    throw new Error(t('errors:metadata.notAlbumUrl', { source: SOURCE }));
  }
  const normalized = new URL(url.trim());
  normalized.protocol = 'https:';
  normalized.hash = '';
  return parseBedethequeAlbum(await getHtml(normalized.toString(), http, SOURCE), normalized.toString());
}
