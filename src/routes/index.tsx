import { createFileRoute } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});

function LibraryPage() {
  const { electron, chrome, node } = window.tankobon.versions;

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
      <p className="text-muted-foreground">
        Gestionnaire et lecteur de BD numériques.
      </p>
      <div>
        <Button>Ajouter un dossier</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Electron {electron} · Chromium {chrome} · Node {node}
      </p>
    </div>
  );
}
