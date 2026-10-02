import { createFileRoute } from '@tanstack/react-router';
import { BookText, Bug, Check, Code, Copy, Tag, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SettingsSection } from '@/components/settings-section';
import { Button } from '@/components/ui/button';
import { formatAppInfo, type AppInfo, type AppLink } from '@/shared/app';

export const Route = createFileRoute('/settings/about')({
  component: AboutSettingsPage,
});

const LINKS: { link: AppLink; label: string; icon: LucideIcon }[] = [
  { link: 'documentation', label: 'Documentation', icon: BookText },
  { link: 'repository', label: 'Code source (GitHub)', icon: Code },
  { link: 'releases', label: 'Versions publiées', icon: Tag },
  { link: 'issues', label: 'Signaler un problème', icon: Bug },
];

function AboutSettingsPage() {
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
      <SettingsSection title="Version">
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
              <dt className="text-muted-foreground">Système</dt>
              <dd>
                {info.platform} {info.arch}
              </dd>
            </dl>
            <div>
              <Button variant="outline" size="sm" onClick={() => void copy()}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copié' : 'Copier les informations'}
              </Button>
            </div>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Liens">
        <div className="flex flex-wrap gap-2">
          {LINKS.map(({ link, label, icon: Icon }) => (
            <Button key={link} variant="outline" onClick={() => void window.tankobon.app.openLink(link)}>
              <Icon />
              {label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Les liens s'ouvrent dans le navigateur.</p>
      </SettingsSection>
    </>
  );
}
