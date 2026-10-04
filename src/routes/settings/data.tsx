import { createFileRoute } from '@tanstack/react-router';
import { Database, Download, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['settings', 'common']);
  const { reload } = useSettings();
  const [dataStatus, setDataStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const [dbLocation, setDbLocation] = useState<DatabaseLocation | null>(null);
  // A location change only takes effect on the next start, so the app has to offer a restart.
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  // What clearing would delete, shown in the confirmation dialog; null while it's closed.
  const [clearCounts, setClearCounts] = useState<{ entries: number; readingLists: number } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<{ message: string; error?: boolean } | null>(null);

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
    const result = await window.tankobon.data.export();
    if (result.status === 'cancelled') {
      setDataStatus(null);
      return;
    }
    if (result.status === 'error') {
      setDataStatus({ message: result.message, error: true });
      return;
    }
    setDataStatus({ message: t('data.exported', { filePath: result.filePath }) });
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
      message: t('data.imported', { count: result.added, updated: result.updated, filePath: result.filePath }),
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
      if (result.status === 'error') {
        setClearStatus({ message: result.message, error: true });
        return;
      }
      // The reading lists are gone too: the sidebar must stop showing them.
      notifyReadingListsChanged();
      setClearStatus({ message: t('data.cleared', { entries: result.entries, count: result.readingLists }) });
    } finally {
      setClearing(false);
      setClearCounts(null);
    }
  };

  return (
    <>
      <SettingsSection title={t('data.importExport')}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download />
            {t('data.export')}
          </Button>
          <Button variant="outline" onClick={importData}>
            <Upload />
            {t('data.import')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('data.importHint')}</p>
        {dataStatus && (
          <p className={cn('text-sm', dataStatus.error ? 'text-destructive' : 'text-muted-foreground')}>
            {dataStatus.message}
          </p>
        )}
      </SettingsSection>

      <SettingsSection title={t('data.location')}>
        <p className="font-mono text-sm break-all text-muted-foreground">
          {dbLocation ? dbLocation.filePath : '…'}
          {dbLocation?.isDefault && t('data.defaultLocation')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={chooseDatabaseLocation}>
            <Database />
            {t('data.changeFolder')}
          </Button>
          {dbLocation && !dbLocation.isDefault && (
            <Button variant="outline" onClick={resetDatabaseLocation}>
              {t('data.resetLocation')}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t('data.locationHint')}</p>
        {dbError && <p className="text-sm text-destructive">{dbError}</p>}
        {restartNeeded && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{t('data.restartNeeded')}</p>
            <Button size="sm" onClick={() => void window.tankobon.database.relaunch()}>
              {t('data.restartNow')}
            </Button>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title={t('data.clear')}>
        <p className="text-sm text-muted-foreground">{t('data.clearHint')}</p>
        <div>
          <Button variant="destructive" onClick={() => void askClearLibrary()}>
            <Trash2 />
            {t('data.clearButton')}
          </Button>
        </div>
        {clearStatus && (
          <p className={cn('text-sm', clearStatus.error ? 'text-destructive' : 'text-muted-foreground')}>
            {clearStatus.message}
          </p>
        )}
      </SettingsSection>

      <Dialog
        open={clearCounts !== null}
        onOpenChange={(open) => !open && !clearing && setClearCounts(null)}
        title={t('data.clearConfirmTitle')}
        description={t('data.clearConfirmDescription')}
        className="max-w-md"
      >
        {clearCounts && (
          <p className="text-sm">
            {t('data.clearConfirm', { entries: clearCounts.entries, count: clearCounts.readingLists })}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={clearing} onClick={() => setClearCounts(null)}>
            {t('common:cancel')}
          </Button>
          <Button variant="destructive" disabled={clearing} onClick={() => void clearLibrary()}>
            <Trash2 />
            {t('data.clearAction')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
