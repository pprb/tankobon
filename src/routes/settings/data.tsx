import { createFileRoute } from '@tanstack/react-router';
import { Database, Download, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SettingsSection } from '@/components/settings-section';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import type { DatabaseLocation } from '@/shared/data';

export const Route = createFileRoute('/settings/data')({
  component: DataSettingsPage,
});

function DataSettingsPage() {
  const { reload } = useSettings();
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
    <>
      <SettingsSection title="Import / export">
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
      </SettingsSection>

      <SettingsSection title="Emplacement de la base de données">
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
      </SettingsSection>
    </>
  );
}
