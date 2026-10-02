import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SettingsSection } from '@/components/settings-section';
import { useSettings } from '@/hooks/use-settings';
import type { AppSettings } from '@/shared/settings';

export const Route = createFileRoute('/settings/metadata')({
  component: MetadataSettingsPage,
});

const KEY_INPUT_CLASS = 'w-full max-w-md rounded-md border bg-background px-3 py-1.5 font-mono text-sm';

function MetadataSettingsPage() {
  const { t } = useTranslation('settings', { keyPrefix: 'metadata' });
  const { settings, update } = useSettings();

  return (
    <>
      <p className="text-sm text-muted-foreground">{t('intro')}</p>

      <SettingsSection title={t('comicVine')}>
        <SourceToggle
          id="comic-vine-enabled"
          label={t('comicVineEnable')}
          checked={settings.comicVineEnabled}
          onChange={(checked) => update('comicVineEnabled', checked)}
        />
        <ApiKeyInput
          id="comic-vine-key"
          label={t('comicVineKey')}
          value={settings.comicVineApiKey}
          settingKey="comicVineApiKey"
          update={update}
        />
        <p className="text-sm text-muted-foreground">{t('comicVineHint')}</p>
      </SettingsSection>

      <SettingsSection title={t('googleBooks')}>
        <SourceToggle
          id="google-books-enabled"
          label={t('googleBooksEnable')}
          checked={settings.googleBooksEnabled}
          onChange={(checked) => update('googleBooksEnabled', checked)}
        />
        <ApiKeyInput
          id="google-books-key"
          label={t('googleBooksKey')}
          value={settings.googleBooksApiKey}
          settingKey="googleBooksApiKey"
          update={update}
        />
        <p className="text-sm text-muted-foreground">{t('googleBooksHint')}</p>
      </SettingsSection>
    </>
  );
}

function SourceToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

function ApiKeyInput({
  id,
  label,
  value,
  settingKey,
  update,
}: {
  id: string;
  label: string;
  value: string;
  settingKey: 'comicVineApiKey' | 'googleBooksApiKey';
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="off"
        spellCheck={false}
        className={KEY_INPUT_CLASS}
        value={value}
        onChange={(event) => update(settingKey, event.target.value.trim())}
      />
    </div>
  );
}
