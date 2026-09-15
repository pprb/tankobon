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
