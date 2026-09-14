import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { BookOpen, Library, Settings } from 'lucide-react';

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
  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-r bg-sidebar p-3 text-sidebar-foreground">
        <div className="px-2 py-3 text-lg font-semibold tracking-tight">Tankōbon</div>
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
            activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
            activeOptions={{ exact: to === '/' }}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
