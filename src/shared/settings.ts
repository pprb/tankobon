// Types shared between the main process and the renderer (via preload).

export interface AppSettings {
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
}

export const DEFAULT_SETTINGS: AppSettings = {
  readingDirection: 'ltr',
  sidebarCollapsed: false,
  scrollDirection: 'standard',
  readingMode: 'single',
  pageSpacing: 16,
};
