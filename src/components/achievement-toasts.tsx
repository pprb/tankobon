import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AchievementIcon } from '@/components/achievement-icon';
import { useAchievements } from '@/hooks/use-achievements';
import type { AchievementId } from '@/shared/achievements';

/** How long a toast stays, in milliseconds. */
const TOAST_DURATION = 6000;

/** Beyond this many at once (an existing library earns many in one go) they are summed up in one toast. */
const MAX_INDIVIDUAL_TOASTS = 3;

interface Toast {
  key: number;
  ids: AchievementId[];
}

/**
 * Announces each achievement as it is earned, bottom right. The ones already earned when the
 * window loads aren't announced again: only what appears afterwards is.
 */
export function AchievementToasts() {
  const { t } = useTranslation('achievements');
  const earned = useAchievements();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<AchievementId> | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (!earned) return;
    if (!seen.current) {
      seen.current = new Set(earned.map((achievement) => achievement.id));
      return;
    }
    const fresh = earned.map((achievement) => achievement.id).filter((id) => !seen.current!.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => seen.current!.add(id));
    const batches = fresh.length > MAX_INDIVIDUAL_TOASTS ? [fresh] : fresh.map((id) => [id]);
    setToasts((current) => [...current, ...batches.map((ids) => ({ key: counter.current++, ids }))]);
  }, [earned]);

  const dismiss = useCallback((key: number) => setToasts((current) => current.filter((toast) => toast.key !== key)), []);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.key} id={toast.key} onDismiss={dismiss}>
          <AchievementIcon id={toast.ids[0]} unlocked className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-achievement">
              {toast.ids.length > 1 ? t('toastMany', { count: toast.ids.length }) : t('toastTitle')}
            </p>
            <p className="truncate text-sm font-semibold">
              {toast.ids.length > 1 ? t('toastManyHint') : t(`items.${toast.ids[0]}.name`)}
            </p>
          </div>
          <button type="button" className="self-start text-muted-foreground hover:text-foreground" onClick={() => dismiss(toast.key)} aria-label={t('dismiss')}>
            <X className="size-4" />
          </button>
        </ToastCard>
      ))}
    </div>
  );
}

function ToastCard({ id, children, onDismiss }: { id: number; children: React.ReactNode; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);
  return (
    <div className="pointer-events-auto flex w-72 items-center gap-3 rounded-lg border-2 border-foreground bg-background p-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
      {children}
    </div>
  );
}
