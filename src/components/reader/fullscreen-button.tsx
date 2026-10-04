import { Maximize, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

/** Fullscreen toggle button, shared by both reader modes. */
export function FullscreenButton({ fullscreen, toggle }: { fullscreen: boolean; toggle: () => void }) {
  const { t } = useTranslation('reader');
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      title={fullscreen ? t('exitFullscreen') : t('enterFullscreen')}
    >
      {fullscreen ? <Minimize /> : <Maximize />}
    </Button>
  );
}
