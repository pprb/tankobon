/**
 * Settings types shared between the main process and the renderer (via preload).
 * @module
 */
import type { LanguageSetting } from './i18n';

/** User preferences, persisted key by key in the `settings` table (see `SettingsRepository`). */
export interface AppSettings {
  /** Interface language: one forced by the user, or `system` to follow the OS (English when it isn't supported). */
  language: LanguageSetting;
  /** Page-turn direction: left-to-right (BD/comics) or right-to-left (manga). */
  readingDirection: 'ltr' | 'rtl';
  /** Whether the sidebar is collapsed to an icon-only rail. */
  sidebarCollapsed: boolean;
  /** Mouse/trackpad wheel direction in the reader: scrolling down advances or retreats a page. */
  scrollDirection: 'standard' | 'inverted';
  /** `single`: one page at a time. `continuous`: pages flow one after another in a vertical scroll. */
  readingMode: 'single' | 'continuous';
  /** Gap in pixels between pages in continuous mode (0 = pages touch). */
  pageSpacing: number;
  /** CSS color behind the pages in the reader (any `<input type="color">` value, i.e. `#rrggbb`). */
  readerBackground: string;
  /** Whether metadata lookups query Comic Vine (only when `comicVineApiKey` is set too). */
  comicVineEnabled: boolean;
  /** Personal Comic Vine API key (free, from comicvine.gamespot.com/api); Comic Vine refuses requests without one. */
  comicVineApiKey: string;
  /** Whether metadata lookups query Google Books. */
  googleBooksEnabled: boolean;
  /** Optional Google Books API key; without one, requests share Google's anonymous quota. */
  googleBooksApiKey: string;
}

/**
 * Value of every setting not stored yet. Merged under the stored values on read, so adding a key
 * needs no database migration.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  language: 'system',
  readingDirection: 'ltr',
  sidebarCollapsed: false,
  scrollDirection: 'standard',
  readingMode: 'single',
  pageSpacing: 16,
  readerBackground: '#000000',
  comicVineEnabled: true,
  comicVineApiKey: '',
  googleBooksEnabled: true,
  googleBooksApiKey: '',
};

/** A reader background preset; its label is the `settings:appearance.backgrounds.<name>` translation. */
export interface ReaderBackgroundPreset {
  value: string;
  name: 'black' | 'darkGrey' | 'grey' | 'sepia' | 'white';
}

/** Presets offered in the settings page; the color picker accepts anything else. */
export const READER_BACKGROUND_PRESETS: ReaderBackgroundPreset[] = [
  { value: '#000000', name: 'black' },
  { value: '#262626', name: 'darkGrey' },
  { value: '#808080', name: 'grey' },
  { value: '#f4ecd8', name: 'sepia' },
  { value: '#ffffff', name: 'white' },
];
