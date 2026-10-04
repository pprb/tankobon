import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ContinuousPageProps {
  comicId: string;
  index: number;
  onActive: (index: number) => void;
}

export function ContinuousPage({ comicId, index, onActive }: ContinuousPageProps) {
  const { t } = useTranslation('reader');
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Two observers: one preloads well before the page is visible, the other tracks which
  // page actually counts as "current" for resuming later: the one crossing the middle of
  // the viewport. A visibility threshold wouldn't do, since a page taller than twice the
  // viewport (a portrait page on a landscape screen) is never 50 % visible.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { rootMargin: '800px 0px' },
    );
    const activeObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onActive(index);
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    loadObserver.observe(el);
    activeObserver.observe(el);
    return () => {
      loadObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [index, onActive]);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    window.tankobon.comic
      .readPage(comicId, index)
      .then(({ data, mimeType }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([data], { type: mimeType }));
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shouldLoad, comicId, index]);

  return (
    <div ref={ref} className="w-full max-w-full">
      {url ? (
        <img src={url} alt={t('pageAlt', { page: index + 1 })} draggable={false} className="block w-full" />
      ) : (
        <div className="flex h-[60vh] w-full items-center justify-center text-neutral-500">
          {failed ? <span className="text-sm">{t('pageUnreadable')}</span> : <Loader2 className="size-6 animate-spin" />}
        </div>
      )}
    </div>
  );
}
