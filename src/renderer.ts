// Renderer entry point, loaded by Vite. Runs in a sandboxed browser context:
// no Node.js access here — go through `window.tankobon` (see preload.ts).
import './index.css';

const info = document.getElementById('versions');
if (info) {
  const { electron, chrome, node } = window.tankobon.versions;
  info.textContent = `Electron ${electron} · Chromium ${chrome} · Node ${node}`;
}
