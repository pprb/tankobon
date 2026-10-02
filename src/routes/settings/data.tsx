import { createFileRoute } from '@tanstack/react-router';
import { Database, Download, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SettingsSection } from '@/components/settings-section';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { notifyReadingListsChanged } from '@/hooks/use-reading-lists';
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
  // What clearing would delete, shown in the confirmation dialog; null while it's closed.
  const [clearCounts, setClearCounts] = useState<{ entries: number; readingLists: number } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<string | null>(null);

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
    // It also replaced the reading lists the sidebar shows.
    notifyReadingListsChanged();
    setDataStatus({
      message: `${result.added} BD ajoutée(s), ${result.updated} mise(s) à jour et paramètres restaurés depuis ${result.filePath}`,
    });
  };

  const askClearLibrary = async () => {
    const [entries, readingLists] = await Promise.all([
      window.tankobon.library.list(),
      window.tankobon.readingLists.list(),
    ]);
    setClearStatus(null);
    setClearCounts({ entries: entries.length, readingLists: readingLists.length });
  };

  const clearLibrary = async () => {
    setClearing(true);
    try {
      const result = await window.tankobon.data.clearLibrary();
      // The reading lists are gone too: the sidebar must stop showing them.
      notifyReadingListsChanged();
      setClearStatus(
        `Bibliothèque effacée : ${result.entries} BD et ${result.readingLists} liste(s) de lecture retirée(s).`,
      );
    } finally {
      setClearing(false);
      setClearCounts(null);
    }
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

      <SettingsSection title="Effacer la bibliothèque">
        <p className="text-sm text-muted-foreground">
          Retire toutes les BD de la bibliothèque (progression, notes, étiquettes, infos et
          auteurs) et supprime les listes de lecture et les miniatures. Les fichiers BD sur le
          disque et les paramètres ne sont pas touchés. Exporte tes données avant si tu veux
          pouvoir les restaurer.
        </p>
        <div>
          <Button variant="destructive" onClick={() => void askClearLibrary()}>
            <Trash2 />
            Effacer la bibliothèque…
          </Button>
        </div>
        {clearStatus && <p className="text-sm text-muted-foreground">{clearStatus}</p>}
      </SettingsSection>

      <Dialog
        open={clearCounts !== null}
        onOpenChange={(open) => !open && !clearing && setClearCounts(null)}
        title="Effacer la bibliothèque ?"
        description="Cette action est irréversible."
        className="max-w-md"
      >
        {clearCounts && (
          <p className="text-sm">
            {clearCounts.entries} BD et {clearCounts.readingLists} liste(s) de lecture seront
            retirées, avec leur progression, leurs notes, leurs étiquettes et leurs infos. Les
            fichiers BD restent sur le disque.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={clearing} onClick={() => setClearCounts(null)}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={clearing} onClick={() => void clearLibrary()}>
            <Trash2 />
            Effacer
          </Button>
        </div>
      </Dialog>
    </>
  );
}
