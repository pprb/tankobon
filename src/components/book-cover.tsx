import { BookImage } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Cover thumbnail of a library entry. It is only requested once the row comes near the viewport,
 * since a missing thumbnail makes the main process open the archive; until then, and for a book
 * without one, a placeholder icon keeps the row's layout.
 */
export function BookCover({ entryId, title, className }: { entryId: string; title: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || near) return;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) setNear(true);
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    void window.tankobon.library.thumbnail(entryId).then((bytes) => {
      if (cancelled || !bytes) return;
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [near, entryId]);

  return (
    <div
      ref={ref}
      className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted', className)}
    >
      {url ? (
        <img src={url} alt={`Couverture de ${title}`} className="size-full object-cover" draggable={false} />
      ) : (
        <BookImage className="size-5 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}
