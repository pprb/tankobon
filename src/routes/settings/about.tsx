import { createFileRoute } from '@tanstack/react-router';
import { BookText, Bug, Check, Code, Copy, Tag, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsSection } from '@/components/settings-section';
import { Button } from '@/components/ui/button';
import { formatAppInfo, type AppInfo, type AppLink } from '@/shared/app';

export const Route = createFileRoute('/settings/about')({
  component: AboutSettingsPage,
});

/** Each link's label is the `settings:about.<link>` translation. */
const LINKS: { link: AppLink; icon: LucideIcon }[] = [
  { link: 'documentation', icon: BookText },
  { link: 'repository', icon: Code },
  { link: 'releases', icon: Tag },
  { link: 'issues', icon: Bug },
];

function AboutSettingsPage() {
  const { t } = useTranslation('settings', { keyPrefix: 'about' });
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.tankobon.app.getInfo().then((result) => {
      if (!cancelled) setInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(formatAppInfo(info));
    setCopied(true);
  };

  return (
    <>
      <SettingsSection title={t('version')}>
        {info && (
          <>
            <p className="text-sm">
              <span className="font-medium">{info.name}</span> {info.version}
            </p>
            <dl className="grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Electron</dt>
              <dd>{info.electron}</dd>
              <dt className="text-muted-foreground">Chromium</dt>
              <dd>{info.chrome}</dd>
              <dt className="text-muted-foreground">Node.js</dt>
              <dd>{info.node}</dd>
              <dt className="text-muted-foreground">V8</dt>
              <dd>{info.v8}</dd>
              <dt className="text-muted-foreground">{t('system')}</dt>
              <dd>
                {info.platform} {info.arch}
              </dd>
            </dl>
            <div>
              <Button variant="outline" size="sm" onClick={() => void copy()}>
                {copied ? <Check /> : <Copy />}
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </>
        )}
      </SettingsSection>

      <SettingsSection title={t('links')}>
        <div className="flex flex-wrap gap-2">
          {LINKS.map(({ link, icon: Icon }) => (
            <Button key={link} variant="outline" onClick={() => void window.tankobon.app.openLink(link)}>
              <Icon />
              {t(link)}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{t('linksHint')}</p>
      </SettingsSection>
    </>
  );
}
