// Types shared between the main process and the renderer (via preload).

export interface AppSettings {
  /** Page-turn direction: left-to-right (BD/comics) or right-to-left (manga). */
  readingDirection: 'ltr' | 'rtl';
}

export const DEFAULT_SETTINGS: AppSettings = {
  readingDirection: 'ltr',
};
