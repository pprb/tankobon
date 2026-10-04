import { useNavigate } from '@tanstack/react-router';
import { CheckCheck, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { NextInList } from '@/hooks/use-next-in-list';

/**
 * On a book's last page, when it was opened from a reading list: opens the list's next book, or
 * says the list is done.
 */
export function NextInListButton({ nextInList }: { nextInList: NextInList | null }) {
  const navigate = useNavigate();
  const { t } = useTranslation('reader');
  if (!nextInList) return null;
  const { listId, listName, next } = nextInList;

  if (!next) {
    return (
      <span className="flex items-center gap-1 text-white/60" title={t('listNamed', { name: listName })}>
        <CheckCheck className="size-4" />
        {t('listFinished')}
      </span>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => navigate({ to: '/reader', search: { book: next.id, list: listId } })}
      title={t('nextInList', { name: listName })}
      className="max-w-64"
    >
      <SkipForward />
      <span className="truncate">{t('nextBook', { title: next.title })}</span>
    </Button>
  );
}
