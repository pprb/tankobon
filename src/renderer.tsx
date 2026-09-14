// Renderer entry point, loaded by Vite. Runs in a sandboxed browser context:
// no Node.js access here — go through `window.tankobon` (see preload.ts).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';

import './index.css';
import { routeTree } from './routeTree.gen';

// Memory history: the renderer is served from a local file in production,
// so there is no meaningful URL to sync with.
const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ['/'] }),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
