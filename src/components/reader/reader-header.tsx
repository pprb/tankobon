import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The reader's top bar. In fullscreen it detaches from the layout and floats over the
 * page, invisible until the mouse reaches the top edge, so the page gets the whole screen.
 */
export function ReaderHeader({ fullscreen, children }: { fullscreen: boolean; children: ReactNode }) {
  return (
    <header
      className={cn(
        'flex items-center gap-2 border-b border-white/10 bg-black px-3 py-2 text-sm text-white',
        fullscreen && 'absolute inset-x-0 top-0 z-10 bg-black/80 opacity-0 transition-opacity hover:opacity-100',
      )}
    >
      {children}
    </header>
  );
}
