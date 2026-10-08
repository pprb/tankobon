import { createFileRoute } from '@tanstack/react-router';
import { FolderOpen, FolderX, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirm } from '@/components/confirm-dialog';
import { SETTINGS_SELECT_CLASS, SettingsSection } from '@/components/settings-section';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOrganizationOffer } from '@/hooks/use-organization-offer';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import type { ScanProgress } from '@/shared/library';
import type { LibraryOrganization } from '@/shared/settings';

export const Route = createFileRoute('/settings/library')({
  component: LibrarySettingsPage,
});

function LibrarySettingsPage() {
  const { t, i18n } = useTranslation('settings', { keyPrefix: 'library' });
  const { settings, update } = useSettings();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const offerOrganization = useOrganizationOffer(confirm);
  const [folders, setFolders] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [status, setStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const resyncing = progress !== null;

  // Read again when the organized folder changes: choosing it adds it to the list.
  useEffect(() => {
    let cancelled = false;
    void window.tankobon.library.listFolders().then((list) => {
      if (!cancelled) setFolders(list);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.libraryOrganizationFolder]);

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
    parts.push(...(await offerOrganization(result.organization)));
    setStatus({ message: parts.join(' · ') });
  };

  // The folder is set by the main process (it is where files get moved): the renderer only opens the dialog.
  const pickOrganizationFolder = () => void window.tankobon.library.pickOrganizationFolder();

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

      <SettingsSection title={t('organization')}>
        <p className="text-sm text-muted-foreground">{t('organizationHint')}</p>
        <div className="flex items-center gap-2">
          <label htmlFor="library-organization" className="text-sm">
            {t('organizationMode')}
          </label>
          <select
            id="library-organization"
            className={SETTINGS_SELECT_CLASS}
            value={settings.libraryOrganization}
            onChange={(event) => update('libraryOrganization', event.target.value as LibraryOrganization)}
          >
            <option value="off">{t('organizationOff')}</option>
            <option value="ask">{t('organizationAsk')}</option>
            <option value="always">{t('organizationAlways')}</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{t('organizationFolder')}</span>
          {settings.libraryOrganizationFolder ? (
            <span className="font-mono text-sm break-all">{settings.libraryOrganizationFolder}</span>
          ) : (
            <span className="text-sm text-muted-foreground">{t('organizationNoFolder')}</span>
          )}
          <Button variant="outline" onClick={pickOrganizationFolder} disabled={resyncing}>
            <FolderOpen />
            {t('organizationChoose')}
          </Button>
        </div>
      </SettingsSection>
      {confirmDialog}
    </>
  );
}
