import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks and toggles the HTML Fullscreen API on the whole document. In Electron this
 * puts the BrowserWindow itself in fullscreen (no IPC needed), and Chromium already
 * exits on Escape, so this hook only has to mirror `document.fullscreenElement`.
 */
export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(() => document.fullscreenElement !== null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }, []);

  return { fullscreen, toggle, exit };
}
