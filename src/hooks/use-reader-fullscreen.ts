/**
 * Fullscreen handling of the reader.
 * @module
 */
import { useEffect } from 'react';

import { useFullscreen } from '@/hooks/use-fullscreen';

/** What {@link useReaderFullscreen} returns. */
export interface ReaderFullscreen {
  /** Whether the window is fullscreen. */
  fullscreen: boolean;
  /** Enters or leaves fullscreen. */
  toggle: () => void;
}

/** Toggles fullscreen on `F`/`F11` while a comic is open; leaves fullscreen once it's closed. */
export function useReaderFullscreen(comicOpen: boolean): ReaderFullscreen {
  const { fullscreen, toggle, exit } = useFullscreen();

  useEffect(() => {
    if (!comicOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F' || event.key === 'F11') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [comicOpen, toggle]);

  // Closing the comic or leaving the reader route shouldn't strand the window in fullscreen.
  useEffect(() => {
    if (!comicOpen) exit();
    return exit;
  }, [comicOpen, exit]);

  return { fullscreen, toggle };
}
