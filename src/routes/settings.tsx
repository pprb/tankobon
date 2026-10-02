import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/settings')({
  component: SettingsLayout,
});

/**
 * Chrome shared by every settings sub-page (`src/routes/settings/*`). The sub-pages are picked
 * from the sidebar, which unfolds them under "Settings" (see `SETTINGS_SECTIONS`).
 */
function SettingsLayout() {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <Outlet />
    </div>
  );
}
