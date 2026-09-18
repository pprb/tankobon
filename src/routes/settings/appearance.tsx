import { createFileRoute } from '@tanstack/react-router';

import { SettingsSection } from '@/components/settings-section';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { READER_BACKGROUND_PRESETS } from '@/shared/settings';

export const Route = createFileRoute('/settings/appearance')({
  component: AppearanceSettingsPage,
});

function AppearanceSettingsPage() {
  const { settings, update } = useSettings();

  return (
    <SettingsSection title="Couleur de fond du lecteur" htmlFor="reader-background">
      <div className="flex flex-wrap items-center gap-2">
        {READER_BACKGROUND_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            title={preset.label}
            aria-label={preset.label}
            aria-pressed={settings.readerBackground === preset.value}
            onClick={() => update('readerBackground', preset.value)}
            className={cn(
              'size-8 rounded-md border-2',
              settings.readerBackground === preset.value ? 'border-primary' : 'border-border hover:border-foreground/40',
            )}
            style={{ backgroundColor: preset.value }}
          />
        ))}
        <input
          id="reader-background"
          type="color"
          className="h-8 w-12 cursor-pointer rounded-md border bg-background"
          title="Couleur personnalisée"
          value={settings.readerBackground}
          onChange={(event) => update('readerBackground', event.target.value)}
        />
        <span className="text-sm text-muted-foreground">{settings.readerBackground}</span>
      </div>
    </SettingsSection>
  );
}
