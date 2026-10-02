import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Library, List, ListOrdered, Settings } from 'lucide-react';
import { type DragEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { notifyReadingListsChanged, useReadingLists } from '@/hooks/use-reading-lists';
import { useSettings } from '@/hooks/use-settings';
import {
  decodeDraggedEntry,
  dropFeedback,
  type DropFeedback,
  LIBRARY_ENTRY_DRAG_TYPE,
  moveItem,
} from '@/lib/reading-list';
import { SETTINGS_SECTIONS } from '@/lib/settings-nav';
import { cn } from '@/lib/utils';
import type { ReadingList } from '@/shared/reading-list';

export const Route = createRootRoute({
  component: RootLayout,
});

const nav = [
  { to: '/', label: 'Bibliothèque', icon: Library },
  { to: '/lists', label: 'Listes de lecture', icon: ListOrdered },
  { to: '/reader', label: 'Lecteur', icon: BookOpen },
] as const;

const linkClass = (collapsed: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md py-1.5 text-sm text-muted-foreground',
    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    collapsed ? 'justify-center px-2' : 'px-2',
  );

const activeLinkClass = 'bg-sidebar-accent text-sidebar-accent-foreground';

/** A sub-entry under a foldable sidebar entry (settings sections, reading lists). */
const subLinkClass = cn(linkClass(false), 'ml-4 gap-2 text-xs');

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
          'flex shrink-0 flex-col gap-1 overflow-y-auto border-r bg-sidebar p-3 text-sidebar-foreground transition-[width] duration-150',
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
        {nav.map(({ to, label, icon: Icon }) =>
          to === '/lists' ? (
            <ReadingListsNav key={to} collapsed={collapsed} />
          ) : (
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
          ),
        )}
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
            className={subLinkClass}
            activeProps={{ className: activeLinkClass }}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
    </>
  );
}

/**
 * "Listes de lecture" with each list underneath, for direct access. Unlike "Paramètres", the entry
 * has its own page (every list's progress), so its label always navigates there, unfolding the
 * lists on the way; only the chevron folds them back. The lists can be reordered by dragging
 * them, which sets their order everywhere they are shown. A book dragged from the library page
 * and dropped on a list is added to it (dragging it over the entry unfolds the lists).
 */
function ReadingListsNav({ collapsed }: { collapsed: boolean }) {
  const onLists = useRouterState({
    select: (state) => state.location.pathname.startsWith('/lists'),
  });
  const lists = useReadingLists();
  // Starts unfolded when the app is already on a list page (e.g. after a reload).
  const [open, setOpen] = useState(onLists);
  const unfolded = open && !collapsed;
  // Index of the list being dragged, and of the one under the pointer (where it would land).
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  // Id of the list a library book is dragged over, and the message about the last book dropped.
  const [bookOver, setBookOver] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<DropFeedback | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // During a drag only the data's types can be read, not the data itself.
  const isBookDrag = (event: DragEvent) => event.dataTransfer.types.includes(LIBRARY_ENTRY_DRAG_TYPE);

  const dropBook = async (list: ReadingList, data: string) => {
    setBookOver(null);
    const entry = decodeDraggedEntry(data);
    if (!entry) return;
    setFeedback(dropFeedback(list, entry, await window.tankobon.readingLists.addEntry(list.id, entry.id)));
    notifyReadingListsChanged();
  };

  const drop = async (to: number) => {
    const order = lists && dragged !== null ? moveItem(lists.map((list) => list.id), dragged, to) : null;
    setDragged(null);
    setOver(null);
    if (!order) return;
    // A refused (stale) order needs no message: reloading shows the lists as they are.
    await window.tankobon.readingLists.reorderLists(order);
    notifyReadingListsChanged();
  };

  return (
    <>
      <div
        className={cn(linkClass(collapsed), 'p-0', onLists && activeLinkClass)}
        onDragEnter={(event) => {
          if (isBookDrag(event)) setOpen(true);
        }}
      >
        <Link
          to="/lists"
          className={cn('flex min-w-0 flex-1 items-center gap-2 py-1.5', collapsed ? 'justify-center px-2' : 'pl-2')}
          onClick={() => setOpen(true)}
          title={collapsed ? 'Listes de lecture' : undefined}
        >
          <ListOrdered className="size-4" />
          {!collapsed && <span className="truncate">Listes de lecture</span>}
        </Link>
        {!collapsed && (
          <button
            type="button"
            className="self-stretch px-2"
            onClick={() => setOpen(!unfolded)}
            title={unfolded ? 'Masquer les listes de lecture' : 'Afficher les listes de lecture'}
            aria-expanded={unfolded}
          >
            <ChevronDown className={cn('size-4 transition-transform', !unfolded && '-rotate-90')} />
          </button>
        )}
      </div>
      {unfolded &&
        lists !== null &&
        (lists.length === 0 ? (
          <p className="ml-4 px-2 py-1.5 text-xs text-muted-foreground">Aucune liste</p>
        ) : (
          lists.map((list, index) => (
            <Link
              key={list.id}
              to="/lists/$listId"
              params={{ listId: list.id }}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                setDragged(index);
              }}
              onDragEnd={() => {
                setDragged(null);
                setOver(null);
              }}
              onDragOver={(event) => {
                if (dragged !== null) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setOver(index);
                } else if (isBookDrag(event)) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setBookOver(list.id);
                }
              }}
              onDragLeave={() => {
                if (bookOver === list.id) setBookOver(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragged !== null) void drop(index);
                else if (isBookDrag(event)) void dropBook(list, event.dataTransfer.getData(LIBRARY_ENTRY_DRAG_TYPE));
              }}
              className={cn(
                subLinkClass,
                dragged === index && 'opacity-30',
                // A line on the side the dragged list would land: above when moving up, below when moving down.
                dragged !== null && over === index && dragged > index && 'shadow-[inset_0_2px_0_0_var(--color-primary)]',
                dragged !== null && over === index && dragged < index && 'shadow-[inset_0_-2px_0_0_var(--color-primary)]',
                bookOver === list.id && 'bg-primary/10 text-primary ring-1 ring-primary',
              )}
              activeProps={{ className: activeLinkClass }}
              title={list.name}
            >
              {/* No pointer events on the children: entering them would fire `dragleave` on the link. */}
              <List className="pointer-events-none size-3.5 shrink-0" />
              <span className="pointer-events-none truncate">{list.name}</span>
            </Link>
          ))
        ))}
      {unfolded && feedback && (
        <p role="status" className={cn('ml-4 px-2 py-1 text-xs', feedback.error ? 'text-destructive' : 'text-muted-foreground')}>
          {feedback.message}
        </p>
      )}
    </>
  );
}
