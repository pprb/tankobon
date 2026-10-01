import { createFileRoute } from '@tanstack/react-router';

import { SettingsSection } from '@/components/settings-section';
import { useSettings } from '@/hooks/use-settings';
import type { AppSettings } from '@/shared/settings';

export const Route = createFileRoute('/settings/metadata')({
  component: MetadataSettingsPage,
});

const KEY_INPUT_CLASS = 'w-full max-w-md rounded-md border bg-background px-3 py-1.5 font-mono text-sm';

function MetadataSettingsPage() {
  const { settings, update } = useSettings();

  return (
    <>
      <p className="text-sm text-muted-foreground">
        L'action « Rechercher les infos » d'une BD de la bibliothèque interroge ces services pour
        retrouver sa série, son tome, sa date de sortie, sa langue et ses auteurs. Seul le texte de
        la recherche leur est envoyé, et seulement quand tu lances une recherche.
      </p>

      <SettingsSection title="Comic Vine (comics)">
        <SourceToggle
          id="comic-vine-enabled"
          label="Interroger Comic Vine"
          checked={settings.comicVineEnabled}
          onChange={(checked) => update('comicVineEnabled', checked)}
        />
        <ApiKeyInput
          id="comic-vine-key"
          label="Clé API (obligatoire)"
          value={settings.comicVineApiKey}
          settingKey="comicVineApiKey"
          update={update}
        />
        <p className="text-sm text-muted-foreground">
          La référence des comics américains (séries, numéros, scénaristes, dessinateurs, coloristes…).
          Une clé gratuite s'obtient en créant un compte sur comicvine.gamespot.com/api. Sans clé,
          Comic Vine est ignoré.
        </p>
      </SettingsSection>

      <SettingsSection title="Google Books (BD, manga, livres)">
        <SourceToggle
          id="google-books-enabled"
          label="Interroger Google Books"
          checked={settings.googleBooksEnabled}
          onChange={(checked) => update('googleBooksEnabled', checked)}
        />
        <ApiKeyInput
          id="google-books-key"
          label="Clé API (facultative)"
          value={settings.googleBooksApiKey}
          settingKey="googleBooksApiKey"
          update={update}
        />
        <p className="text-sm text-muted-foreground">
          Couvre les éditions françaises et les mangas, mais ne distingue pas le scénariste du
          dessinateur : les personnes trouvées y sont toutes « auteur ». Sans clé, les requêtes
          partagent un quota anonyme qui peut être épuisé.
        </p>
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
