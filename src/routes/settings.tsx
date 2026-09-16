import { createFileRoute } from '@tanstack/react-router';
import { Database, Download, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import type { DatabaseLocation } from '@/shared/data';
import { READER_BACKGROUND_PRESETS } from '@/shared/settings';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update, reload } = useSettings();
  const [dataStatus, setDataStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const [dbLocation, setDbLocation] = useState<DatabaseLocation | null>(null);
  // A location change only takes effect on the next start, so the app has to offer a restart.
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void window.tankobon.database.getLocation().then((location) => {
      if (!cancelled) setDbLocation(location);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseDatabaseLocation = async () => {
    const result = await window.tankobon.database.chooseLocation();
    if (result.status === 'cancelled') {
      return;
    }
    if (result.status === 'error') {
      setDbError(result.message);
      return;
    }
    setDbError(null);
    setDbLocation(result.location);
    setRestartNeeded(true);
  };

  const resetDatabaseLocation = async () => {
    setDbError(null);
    setDbLocation(await window.tankobon.database.resetLocation());
    setRestartNeeded(true);
  };

  const exportData = async () => {
    const filePath = await window.tankobon.data.export();
    setDataStatus(filePath ? { message: `Données exportées vers ${filePath}` } : null);
  };

  const importData = async () => {
    const result = await window.tankobon.data.import();
    if (result.status === 'cancelled') {
      setDataStatus(null);
      return;
    }
    if (result.status === 'error') {
      setDataStatus({ message: result.message, error: true });
      return;
    }
    // The import wrote settings straight to the database; pull them back into the form.
    await reload();
    setDataStatus({
      message: `${result.added} BD ajoutée(s), ${result.updated} mise(s) à jour et paramètres restaurés depuis ${result.filePath}`,
    });
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
        <label htmlFor="reader-background" className="text-sm font-medium">
          Couleur de fond du lecteur
        </label>
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
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Données</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download />
            Exporter la bibliothèque et les paramètres (JSON)
          </Button>
          <Button variant="outline" onClick={importData}>
            <Upload />
            Importer un export (JSON)
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          L'import fusionne : les BD absentes sont ajoutées, celles déjà présentes (même chemin de
          fichier) reprennent la progression, la note et les étiquettes du fichier importé, et les
          paramètres sont remplacés.
        </p>
        {dataStatus && (
          <p className={cn('text-sm', dataStatus.error ? 'text-destructive' : 'text-muted-foreground')}>
            {dataStatus.message}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Emplacement de la base de données</h2>
        <p className="font-mono text-sm break-all text-muted-foreground">
          {dbLocation ? dbLocation.filePath : '…'}
          {dbLocation?.isDefault && ' (emplacement par défaut)'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={chooseDatabaseLocation}>
            <Database />
            Changer de dossier…
          </Button>
          {dbLocation && !dbLocation.isDefault && (
            <Button variant="outline" onClick={resetDatabaseLocation}>
              Revenir à l'emplacement par défaut
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Le fichier existant n'est pas déplacé : si le nouveau dossier contient déjà une base
          Tankōbon, elle est utilisée telle quelle, sinon une base vide y est créée. Exporte tes
          données avant de changer si tu veux les emmener.
        </p>
        {dbError && <p className="text-sm text-destructive">{dbError}</p>}
        {restartNeeded && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Le changement prendra effet au prochain démarrage.
            </p>
            <Button size="sm" onClick={() => void window.tankobon.database.relaunch()}>
              Redémarrer maintenant
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
