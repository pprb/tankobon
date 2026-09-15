# Tankōbon

Gestionnaire de bibliothèque et lecteur de BD, comics et manga numériques.

## Stack

- [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) (packaging, makers Squirrel / ZIP / deb / rpm)
- [Vite](https://vitejs.dev/) pour le main, le preload et le renderer
- [React 19](https://react.dev/) + [TanStack Router](https://tanstack.com/router) (routes par fichiers, historique mémoire)
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (`npx shadcn add <composant>`)
- TypeScript 6, ESLint 10 (flat config, `typescript-eslint`, `import-x`, `react-hooks`, `react-refresh`)
- [`node:sqlite`](https://nodejs.org/api/sqlite.html) pour le stockage local (bibliothèque, paramètres, progression de lecture)
- [Vitest](https://vitest.dev/) pour les tests unitaires

## Données locales

Tankōbon stocke tout dans un fichier SQLite (`tankobon.db`, dans le dossier
`userData` d'Electron — jamais dans le cloud, ni dans le `localStorage`/IndexedDB
de Chromium) : la bibliothèque de BD (chemin, titre, page courante) et les
paramètres de l'application. Cela permet de reprendre la lecture à la bonne
page à la réouverture d'une BD. Les données peuvent être exportées au format
JSON depuis la page Paramètres (bouton "Exporter").

## Structure

```
src/
  main.ts       # processus principal (fenêtres, cycle de vie, ouverture de la DB)
  main/db/      # base SQLite locale (node:sqlite) : schéma, repositories, export JSON
  main/ipc/     # handlers ipcMain (comic, library, settings, data:export)
  main/services # ComicService + archives (ComicArchive, CbzArchive)
  shared/       # types partagés main <-> renderer (ComicInfo, LibraryEntry, AppSettings)
  preload.ts    # pont sécurisé main <-> renderer (contextBridge)
  hooks/        # hooks React (useComic, useSettings)
  renderer.tsx  # point d'entrée de l'UI (React + RouterProvider)
  routes/       # routes TanStack Router (__root.tsx = layout, index.tsx = /)
  routeTree.gen.ts # généré par le plugin router, ne pas éditer
  components/ui # composants shadcn/ui
  lib/utils.ts  # helper cn()
  index.css     # Tailwind + tokens shadcn
  global.d.ts   # typage de window.tankobon
index.html      # page du renderer
components.json # config shadcn CLI
forge.config.ts # configuration Electron Forge (makers, plugins, fuses)
vite.*.config.mts
```

## Développement

```sh
npm install
npm start          # lance l'app en mode dev (HMR sur le renderer)
npm run lint
npm run typecheck
npm test           # tests unitaires (Vitest)
```

Ces trois vérifications tournent en parallèle dans la CI (`.github/workflows/ci.yml`)
à chaque push et pull request.

## Distribution

```sh
npm run package    # build l'app dans out/
npm run make       # génère les installeurs pour la plateforme courante
```
