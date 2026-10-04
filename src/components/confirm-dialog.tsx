import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/** What a confirmation asks: a title, the consequence in `message`, and the label of the action. */
export interface ConfirmOptions {
  title: string;
  message: string;
  /** Label of the confirming button. */
  action: string;
}

/**
 * In-app replacement for `window.confirm()`: `confirm(options)` resolves `true` when the user
 * confirms and `false` when they cancel, press Escape or click the backdrop. Render the returned
 * `dialog` once in the component's tree.
 */
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
  const { t } = useTranslation('common');
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback(
    (next: ConfirmOptions) => {
      // A confirmation still open is dismissed rather than left pending forever.
      resolver.current?.(false);
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOptions(next);
      });
    },
    [],
  );

  const dialog = (
    <Dialog
      open={options !== null}
      onOpenChange={(open) => !open && settle(false)}
      title={options?.title ?? ''}
      description={options?.message}
      className="max-w-md"
    >
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => settle(false)}>
          {t('cancel')}
        </Button>
        <Button variant="destructive" onClick={() => settle(true)}>
          {options?.action}
        </Button>
      </div>
    </Dialog>
  );

  return { confirm, dialog };
}
