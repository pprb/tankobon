import { createFileRoute } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update } = useSettings();
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const exportData = async () => {
    const filePath = await window.tankobon.data.export();
    setExportStatus(filePath ? `Données exportées vers ${filePath}` : null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>

      <section className="flex flex-col gap-2">
        <label htmlFor="reading-direction" className="text-sm font-medium">
          Sens de lecture
        </label>
        <select
          id="reading-direction"
          className="w-fit rounded-md border bg-background px-3 py-1.5 text-sm"
          value={settings.readingDirection}
          onChange={(event) => update('readingDirection', event.target.value as 'ltr' | 'rtl')}
        >
          <option value="ltr">Gauche à droite (BD, comics)</option>
          <option value="rtl">Droite à gauche (manga)</option>
        </select>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="scroll-direction" className="text-sm font-medium">
          Sens du défilement (molette souris / trackpad)
        </label>
        <select
          id="scroll-direction"
          className="w-fit rounded-md border bg-background px-3 py-1.5 text-sm"
          value={settings.scrollDirection}
          onChange={(event) => update('scrollDirection', event.target.value as 'standard' | 'inverted')}
        >
          <option value="standard">Standard (vers le bas = page suivante)</option>
          <option value="inverted">Inversé (vers le bas = page précédente)</option>
        </select>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="reading-mode" className="text-sm font-medium">
          Mode de lecture
        </label>
        <select
          id="reading-mode"
          className="w-fit rounded-md border bg-background px-3 py-1.5 text-sm"
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
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Données</h2>
        <div>
          <Button variant="outline" onClick={exportData}>
            <Download />
            Exporter la bibliothèque et les paramètres (JSON)
          </Button>
        </div>
        {exportStatus && <p className="text-sm text-muted-foreground">{exportStatus}</p>}
      </section>
    </div>
  );
}
