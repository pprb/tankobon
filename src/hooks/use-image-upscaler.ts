import { useEffect, useState } from 'react';
import type Upscaler from 'upscaler';

/** Fixed upscale factor of `@upscalerjs/default-model` (a lightweight ESRGAN model). */
export const UPSCALE_FACTOR = 2;

// TensorFlow.js and the model are only pulled in (as a separate chunk) the first time
// upscaling actually runs, so opening the reader never pays for this unless it's used.
// A single instance is then reused for the app's lifetime — loading it is the slow part.
let sharedUpscaler: Promise<InstanceType<typeof Upscaler>> | null = null;

function getUpscaler() {
  sharedUpscaler ??= Promise.all([import('upscaler'), import('@upscalerjs/default-model')]).then(
    ([{ default: UpscalerCtor }, { default: defaultModel }]) =>
      // Point at the copy served locally (see vite.renderer.config.mts) instead of the
      // package's default CDN lookup, so this works fully offline.
      new UpscalerCtor({ model: { ...defaultModel, path: 'models/default-model/model.json' } }),
  );
  return sharedUpscaler;
}

// Small LRU-ish cache so flipping zoom on/off or revisiting a page doesn't re-run inference.
const MAX_CACHE_ENTRIES = 4;
const cache = new Map<string, string>();

function cachePut(src: string, dataUrl: string): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(src, dataUrl);
}

interface ImageUpscalerResult {
  /** Data URL of the AI-upscaled image, or null while disabled/unavailable. */
  upscaledUrl: string | null;
  isUpscaling: boolean;
  /** Set when the last attempt failed; the caller falls back to the original image either way. */
  error: string | null;
}

/** Runs `src` through a local super-resolution model (ESRGAN via TensorFlow.js) when `enabled`. */
export function useImageUpscaler(src: string | null, enabled: boolean): ImageUpscalerResult {
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src || !enabled) {
      setUpscaledUrl(null);
      setIsUpscaling(false);
      setError(null);
      return;
    }

    const cached = cache.get(src);
    if (cached) {
      setUpscaledUrl(cached);
      setError(null);
      return;
    }

    let cancelled = false;
    setUpscaledUrl(null);
    setIsUpscaling(true);
    setError(null);

    const image = new Image();
    image.src = src;
    Promise.all([image.decode(), getUpscaler()])
      // Tile the image so large comic pages don't blow up GPU/CPU memory in one pass.
      .then(([, upscaler]) => upscaler.upscale(image, { patchSize: 64, padding: 4 }))
      .then((dataUrl) => {
        if (cancelled) return;
        cachePut(src, dataUrl);
        setUpscaledUrl(dataUrl);
      })
      .catch((err: unknown) => {
        // Best-effort enhancement: fall back to the original image on failure.
        console.error('Image upscaling failed:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setIsUpscaling(false);
      });

    return () => {
      cancelled = true;
    };
  }, [src, enabled]);

  return { upscaledUrl, isUpscaling, error };
}
