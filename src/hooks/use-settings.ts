import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_SETTINGS, type AppSettings } from '@/shared/settings';

/** Owns the app settings: loads them from the database once, persists changes. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    void window.tankobon.settings.getAll().then((loaded) => {
      if (!cancelled) setSettings(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    void window.tankobon.settings.set(key, value);
  }, []);

  return { settings, update };
}
