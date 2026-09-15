import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FolderOpen, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { LibraryEntry } from '@/shared/library';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});

function LibraryPage() {
  const { electron, chrome, node } = window.tankobon.versions;
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);

  const refresh = useCallback(() => {
    void window.tankobon.library.list().then(setEntries);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFile = async () => {
    const filePath = await window.tankobon.comic.pickFile();
    if (filePath) {
      void navigate({ to: '/reader', search: { path: filePath } });
    }
  };

  const remove = async (id: string) => {
    await window.tankobon.library.remove(id);
    refresh();
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
      <p className="text-muted-foreground">Gestionnaire et lecteur de BD numériques.</p>
      <div>
        <Button onClick={addFile}>
          <FolderOpen />
          Ajouter un fichier
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune BD dans la bibliothèque pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" title={entry.path}>
                  {entry.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Page {entry.currentPage + 1} / {entry.pageCount}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate({ to: '/reader', search: { path: entry.path } })}
              >
                Ouvrir
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(entry.id)}
                title="Retirer de la bibliothèque"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Electron {electron} · Chromium {chrome} · Node {node}
      </p>
    </div>
  );
}
