# Tankōbon

Gestionnaire de bibliothèque et lecteur de BD, comics et manga numériques.
Formats d'archive pris en charge : CBZ et CBR.

## Stack

- [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) (packaging, makers Squirrel / ZIP / deb / rpm)
- [Vite](https://vitejs.dev/) pour le main, le preload et le renderer
- [React 19](https://react.dev/) + [TanStack Router](https://tanstack.com/router) (routes par fichiers, historique mémoire)
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (`npx shadcn add <composant>`)
- TypeScript 6, ESLint 10 (flat config, `typescript-eslint`, `import-x`, `react-hooks`, `react-refresh`)
- [`node:sqlite`](https://nodejs.org/api/sqlite.html) pour le stockage local (bibliothèque, paramètres, progression de lecture)
- [node-unrar-js](https://github.com/YuJianrong/node-unrar.js) (unrar compilé en WebAssembly) pour la lecture des CBR
- [Vitest](https://vitest.dev/) pour les tests unitaires
- [UpscalerJS](https://github.com/thekevinscott/UpscalerJS) (TensorFlow.js, modèle ESRGAN local) pour l'amélioration d'image à la volée

## Données locales

Tankōbon stocke tout dans un fichier SQLite (`tankobon.db`, dans le dossier
`userData` d'Electron — jamais dans le cloud, ni dans le `localStorage`/IndexedDB
de Chromium) : la bibliothèque de BD (chemin, titre, page courante) et les
paramètres de l'application. Cela permet de reprendre la lecture à la bonne
page à la réouverture d'une BD. Les données peuvent être exportées au format
JSON depuis la page Paramètres (bouton "Exporter").

## Zoom et amélioration d'image (IA)

Le lecteur propose un zoom (ajuster à la fenêtre, taille réelle, 50 à 200 %).
Quand l'affichage dépasse la résolution native de la page, une case
"Améliorer (IA)" permet d'agrandir l'image via un modèle de super-résolution
(ESRGAN, [UpscalerJS](https://github.com/thekevinscott/UpscalerJS) sur
TensorFlow.js) exécuté localement dans le renderer — le modèle est servi
depuis les fichiers de l'app (`vite.renderer.config.mts`), jamais depuis un
CDN, pour rester utilisable hors ligne. Le code du modèle n'est chargé
(`import()` dynamique) que si la fonctionnalité est effectivement utilisée.

La molette souris/trackpad tourne aussi les pages : en mode "ajuster à la
fenêtre" chaque cran tourne une page (avec un court anti-rebond pour qu'un
seul geste de trackpad ne saute pas plusieurs pages) ; en zoom, la molette
fait d'abord défiler l'image et ne tourne la page qu'une fois arrivé en haut
ou en bas. Le sens (bas = page suivante ou précédente) se choisit dans
Paramètres.

## Mode de lecture continu

En plus du mode page par page, Paramètres propose un mode "Défilement
continu" : les pages s'enchaînent verticalement, chargées à la volée à
l'approche (elles ne sont pas toutes chargées en mémoire d'un coup).
L'espacement entre les pages se règle en pixels (0 minimum, pages
collées). La page en cours (pour le compteur et la reprise de lecture)
est celle la plus visible à l'écran pendant le défilement.

## Panneau latéral réductible

Le bouton en haut du panneau latéral le réduit à une colonne d'icônes, pour
gagner de la place à l'écran pendant la lecture. L'état (réduit ou non) est
mémorisé comme les autres paramètres.

## Structure

```
src/
  main.ts       # processus principal (fenêtres, cycle de vie, ouverture de la DB)
  main/db/      # base SQLite locale (node:sqlite) : schéma, repositories, export JSON
  main/ipc/     # handlers ipcMain (comic, library, settings, data:export)
  main/services # ComicService + archives (ComicArchive, CbzArchive, CbrArchive)
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
