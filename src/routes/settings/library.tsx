import { createFileRoute } from '@tanstack/react-router';
import { FolderX, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsSection } from '@/components/settings-section';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import type { ScanProgress } from '@/shared/library';

export const Route = createFileRoute('/settings/library')({
  component: LibrarySettingsPage,
});

function LibrarySettingsPage() {
  const { t, i18n } = useTranslation('settings', { keyPrefix: 'library' });
  const { settings, update } = useSettings();
  const [folders, setFolders] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [status, setStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const resyncing = progress !== null;

  useEffect(() => {
    let cancelled = false;
    void window.tankobon.library.listFolders().then((list) => {
      if (!cancelled) setFolders(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Also shows a resynchronization started at launch, or one started from another window.
  useEffect(() => window.tankobon.library.onScanProgress((p) => setProgress(p.phase === 'done' ? null : p)), []);

  const removeFolder = async (folder: string) => {
    await window.tankobon.library.removeFolder(folder);
    setFolders((list) => list?.filter((f) => f !== folder) ?? list);
  };

  const resync = async () => {
    setStatus(null);
    setProgress({ phase: 'scanning', processed: 0, total: 0, currentFile: '' });
    const result = await window.tankobon.library.resync();
    setProgress(null);
    if (result.status === 'error') {
      setStatus({ message: result.message, error: true });
      return;
    }
    const parts = [t('resyncDone', { added: result.added, removed: result.removed })];
    if (result.failed > 0) parts.push(t('resyncFailed', { count: result.failed }));
    if (result.unreachable > 0) parts.push(t('resyncUnreachable', { count: result.unreachable }));
    setStatus({ message: parts.join(' · ') });
  };

  const lastResync = settings.lastResyncAt
    ? t('lastResync', { date: new Date(settings.lastResyncAt).toLocaleString(i18n.language) })
    : t('neverResynced');

  return (
    <>
      <SettingsSection title={t('folders')}>
        <p className="text-sm text-muted-foreground">{t('foldersHint')}</p>
        {folders?.length === 0 && <p className="text-sm text-muted-foreground">{t('noFolders')}</p>}
        <ul className="flex flex-col gap-1">
          {folders?.map((folder) => (
            <li key={folder} className="flex items-center gap-2">
              <span className="font-mono text-sm break-all">{folder}</span>
              <Button
                variant="ghost"
                size="icon"
                title={t('removeFolder')}
                aria-label={t('removeFolder')}
                disabled={resyncing}
                onClick={() => void removeFolder(folder)}
              >
                <FolderX />
              </Button>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title={t('resync')}>
        <p className="text-sm text-muted-foreground">{t('resyncHint')}</p>
        <div>
          <Button variant="outline" onClick={() => void resync()} disabled={resyncing || folders?.length === 0}>
            <RefreshCw />
            {resyncing ? t('resyncRunning') : t('resyncButton')}
          </Button>
        </div>
        {progress && progress.phase === 'importing' && (
          <Progress value={progress.processed} max={progress.total} label={t('resyncRunning')} />
        )}
        {status && (
          <p className={cn('text-sm', status.error ? 'text-destructive' : 'text-muted-foreground')}>{status.message}</p>
        )}
        <p className="text-sm text-muted-foreground">{lastResync}</p>
        <div className="flex items-center gap-2">
          <input
            id="resync-on-startup"
            type="checkbox"
            checked={settings.resyncOnStartup}
            onChange={(event) => update('resyncOnStartup', event.target.checked)}
          />
          <label htmlFor="resync-on-startup" className="text-sm">
            {t('resyncOnStartup')}
          </label>
        </div>
      </SettingsSection>
    </>
  );
}
