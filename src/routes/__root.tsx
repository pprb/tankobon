import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { BookOpen, ChevronLeft, ChevronRight, Library, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

export const Route = createRootRoute({
  component: RootLayout,
});

const nav = [
  { to: '/', label: 'Bibliothèque', icon: Library },
  { to: '/reader', label: 'Lecteur', icon: BookOpen },
  { to: '/settings', label: 'Paramètres', icon: Settings },
] as const;

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
            className={cn(
              'flex items-center gap-2 rounded-md py-1.5 text-sm text-muted-foreground',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed ? 'justify-center px-2' : 'px-2',
            )}
            activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
            activeOptions={{ exact: to === '/' }}
            title={collapsed ? label : undefined}
          >
            <Icon className="size-4" />
            {!collapsed && label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
