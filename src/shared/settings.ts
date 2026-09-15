// Types shared between the main process and the renderer (via preload).

export interface AppSettings {
  /** Page-turn direction: left-to-right (BD/comics) or right-to-left (manga). */
  readingDirection: 'ltr' | 'rtl';
  /** Whether the sidebar is collapsed to an icon-only rail. */
  sidebarCollapsed: boolean;
  /** Mouse/trackpad wheel direction in the reader: scrolling down advances or retreats a page. */
  scrollDirection: 'standard' | 'inverted';
}

export const DEFAULT_SETTINGS: AppSettings = {
  readingDirection: 'ltr',
  sidebarCollapsed: false,
  scrollDirection: 'standard',
};
