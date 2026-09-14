import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/reader')({
  component: ReaderPage,
});

function ReaderPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Lecteur</h1>
    </div>
  );
}
