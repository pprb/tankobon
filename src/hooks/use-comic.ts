import { useCallback, useEffect, useRef, useState } from 'react';

import type { ComicInfo } from '@/shared/comic';

interface ComicState {
  comic: ComicInfo | null;
  page: number;
  /** Blob URL of the current page, null while loading. */
  pageUrl: string | null;
  error: string | null;
  loading: boolean;
}

const initialState: ComicState = { comic: null, page: 0, pageUrl: null, error: null, loading: false };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Owns the currently opened comic: file picking, page loading, cleanup. */
export function useComic() {
  const [state, setState] = useState<ComicState>(initialState);
  const currentUrl = useRef<string | null>(null);

  const revokeCurrentUrl = () => {
    if (currentUrl.current) {
      URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = null;
    }
  };

  const close = useCallback(async () => {
    revokeCurrentUrl();
    const id = state.comic?.id;
    setState(initialState);
    if (id) {
      await window.tankobon.comic.close(id);
    }
  }, [state.comic?.id]);

  const openFile = useCallback(async (filePath: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const comic = await window.tankobon.comic.open(filePath);
      revokeCurrentUrl();
      setState({ comic, page: 0, pageUrl: null, error: null, loading: true });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error: errorMessage(error) }));
    }
  }, []);

  const pickAndOpen = useCallback(async () => {
    const filePath = await window.tankobon.comic.pickFile();
    if (filePath) {
      await openFile(filePath);
    }
  }, [openFile]);

  const goTo = useCallback((page: number) => {
    setState((s) => {
      if (!s.comic) return s;
      const clamped = Math.max(0, Math.min(page, s.comic.pageCount - 1));
      return clamped === s.page ? s : { ...s, page: clamped, loading: true };
    });
  }, []);

  // Load the page image whenever the comic or page index changes.
  const comicId = state.comic?.id;
  const page = state.page;
  useEffect(() => {
    if (!comicId) return;
    let cancelled = false;

    window.tankobon.comic
      .readPage(comicId, page)
      .then(({ data, mimeType }) => {
        if (cancelled) return;
        revokeCurrentUrl();
        const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
        currentUrl.current = url;
        setState((s) => ({ ...s, pageUrl: url, loading: false }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: errorMessage(error) }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [comicId, page]);

  // Release the archive and blob URL on unmount.
  useEffect(() => {
    return () => {
      revokeCurrentUrl();
      if (comicId) {
        void window.tankobon.comic.close(comicId);
      }
    };
  }, [comicId]);

  return {
    ...state,
    pickAndOpen,
    openFile,
    close,
    goTo,
    next: () => goTo(state.page + 1),
    prev: () => goTo(state.page - 1),
  };
}
