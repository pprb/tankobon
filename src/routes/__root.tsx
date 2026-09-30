import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Library, Settings } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useSettings } from '@/hooks/use-settings';
import { SETTINGS_SECTIONS } from '@/lib/settings-nav';
import { cn } from '@/lib/utils';

export const Route = createRootRoute({
  component: RootLayout,
});

const nav = [
  { to: '/', label: 'Bibliothèque', icon: Library },
  { to: '/reader', label: 'Lecteur', icon: BookOpen },
] as const;

const linkClass = (collapsed: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md py-1.5 text-sm text-muted-foreground',
    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    collapsed ? 'justify-center px-2' : 'px-2',
  );

const activeLinkClass = 'bg-sidebar-accent text-sidebar-accent-foreground';

function RootLayout() {
  const { settings, update } = useSettings();
  const collapsed = settings.sidebarCollapsed;
  // Fullscreen reading (toggled from the reader) hides the sidebar entirely; the
  // collapsed/expanded preference is untouched and comes back on exit.
  const { fullscreen } = useFullscreen();

  return (
    <div className="flex h-full">
      <aside
        className={cn(
          'flex shrink-0 flex-col gap-1 border-r bg-sidebar p-3 text-sidebar-foreground transition-[width] duration-150',
          collapsed ? 'w-14 items-center' : 'w-56',
          fullscreen && 'hidden',
        )}
      >
        <div className={cn('flex items-center py-3', collapsed ? 'justify-center' : 'justify-between px-2')}>
          {!collapsed && <span className="text-lg font-semibold tracking-tight">Tankōbon</span>}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => update('sidebarCollapsed', !collapsed)}
            title={collapsed ? 'Développer le panneau latéral' : 'Réduire le panneau latéral'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={linkClass(collapsed)}
            activeProps={{ className: activeLinkClass }}
            activeOptions={{ exact: to === '/' }}
            title={collapsed ? label : undefined}
          >
            <Icon className="size-4" />
            {!collapsed && label}
          </Link>
        ))}
        <SettingsNav collapsed={collapsed} />
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * "Paramètres" unfolds its sub-pages instead of opening one big screen. Clicking it while folded
 * unfolds the list and opens the first section; clicking it while unfolded only folds it back
 * (navigating there too would drag the user off the section they're already on).
 */
function SettingsNav({ collapsed }: { collapsed: boolean }) {
  const onSettings = useRouterState({
    select: (state) => state.location.pathname.startsWith('/settings'),
  });
  // Starts unfolded when the app is already on a settings page (e.g. after a reload).
  const [open, setOpen] = useState(onSettings);
  // The rail has no room for the sub-pages; they come back when it's expanded again.
  const unfolded = open && !collapsed;

  return (
    <>
      <Link
        to="/settings"
        className={cn(linkClass(collapsed), onSettings && activeLinkClass)}
        onClick={(event) => {
          if (unfolded) event.preventDefault();
          setOpen(!unfolded);
        }}
        title={collapsed ? 'Paramètres' : undefined}
      >
        <Settings className="size-4" />
        {!collapsed && (
          <>
            <span className="flex-1">Paramètres</span>
            <ChevronDown className={cn('size-4 transition-transform', !unfolded && '-rotate-90')} />
          </>
        )}
      </Link>
      {unfolded &&
        SETTINGS_SECTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(linkClass(false), 'ml-4 gap-2 text-xs')}
            activeProps={{ className: activeLinkClass }}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
    </>
  );
}
