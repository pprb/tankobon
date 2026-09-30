import { createFileRoute } from '@tanstack/react-router';

import { SETTINGS_SELECT_CLASS, SettingsSection } from '@/components/settings-section';
import { useSettings } from '@/hooks/use-settings';

export const Route = createFileRoute('/settings/reading')({
  component: ReadingSettingsPage,
});

function ReadingSettingsPage() {
  const { settings, update } = useSettings();

  return (
    <>
      <SettingsSection title="Sens de lecture" htmlFor="reading-direction">
        <select
          id="reading-direction"
          className={SETTINGS_SELECT_CLASS}
          value={settings.readingDirection}
          onChange={(event) => update('readingDirection', event.target.value as 'ltr' | 'rtl')}
        >
          <option value="ltr">Gauche à droite (BD, comics)</option>
          <option value="rtl">Droite à gauche (manga)</option>
        </select>
      </SettingsSection>

      <SettingsSection title="Sens du défilement (molette souris / trackpad)" htmlFor="scroll-direction">
        <select
          id="scroll-direction"
          className={SETTINGS_SELECT_CLASS}
          value={settings.scrollDirection}
          onChange={(event) => update('scrollDirection', event.target.value as 'standard' | 'inverted')}
        >
          <option value="standard">Standard (vers le bas = page suivante)</option>
          <option value="inverted">Inversé (vers le bas = page précédente)</option>
        </select>
      </SettingsSection>

      <SettingsSection title="Mode de lecture" htmlFor="reading-mode">
        <select
          id="reading-mode"
          className={SETTINGS_SELECT_CLASS}
          value={settings.readingMode}
          onChange={(event) => update('readingMode', event.target.value as 'single' | 'continuous')}
        >
          <option value="single">Page par page</option>
          <option value="continuous">Défilement continu (pages qui se suivent)</option>
        </select>

        {settings.readingMode === 'continuous' && (
          <div className="flex items-center gap-2 pt-1">
            <label htmlFor="page-spacing" className="text-sm text-muted-foreground">
              Espacement entre les pages
            </label>
            <input
              id="page-spacing"
              type="number"
              min={0}
              step={4}
              className="w-20 rounded-md border bg-background px-3 py-1.5 text-sm"
              value={settings.pageSpacing}
              onChange={(event) => update('pageSpacing', Math.max(0, Number(event.target.value) || 0))}
            />
            <span className="text-sm text-muted-foreground">px</span>
          </div>
        )}
      </SettingsSection>
    </>
  );
}
