import { BookOpen, Database, Palette, type LucideIcon } from 'lucide-react';

/**
 * The settings sub-pages, shared by the sidebar's collapsible "Paramètres" entry and the
 * `/settings` layout — one list so the two can't drift apart.
 */
export const SETTINGS_SECTIONS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/settings/reading', label: 'Lecture', icon: BookOpen },
  { to: '/settings/appearance', label: 'Affichage', icon: Palette },
  { to: '/settings/data', label: 'Données', icon: Database },
];
