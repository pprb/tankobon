# Tankōbon

Gestionnaire de bibliothèque et lecteur de BD, comics et manga numériques.
Formats pris en charge : CBZ, CBR et PDF.

## Stack

- [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) (packaging, makers Squirrel / ZIP / deb / rpm)
- [Vite](https://vitejs.dev/) pour le main, le preload et le renderer
- [React 19](https://react.dev/) + [TanStack Router](https://tanstack.com/router) (routes par fichiers, historique mémoire)
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (`npx shadcn add <composant>`)
- TypeScript 6, ESLint 10 (flat config, `typescript-eslint`, `import-x`, `react-hooks`, `react-refresh`)
- [`node:sqlite`](https://nodejs.org/api/sqlite.html) pour le stockage local (bibliothèque, paramètres, progression de lecture)
- [node-unrar-js](https://github.com/YuJianrong/node-unrar.js) (unrar compilé en WebAssembly) pour la lecture des CBR
- [pdfjs-dist](https://github.com/mozilla/pdf.js) + [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) (rendu Canvas natif, sans compilation) pour la lecture des PDF
- [Vitest](https://vitest.dev/) pour les tests unitaires
- [UpscalerJS](https://github.com/thekevinscott/UpscalerJS) (TensorFlow.js, modèle ESRGAN local) pour l'amélioration d'image à la volée

## Données locales

Tankōbon stocke tout dans un fichier SQLite (`tankobon.db`, dans le dossier
`userData` d'Electron — jamais dans le cloud, ni dans le `localStorage`/IndexedDB
de Chromium) : la bibliothèque de BD (chemin, titre, page courante, nombre de
fichiers, taille, note, étiquettes) et les paramètres de l'application. Cela
permet de reprendre la lecture à la bonne page à la réouverture d'une BD. Les
données peuvent être exportées au format JSON depuis la page Paramètres
(bouton "Exporter").

## Métadonnées de bibliothèque

Pour chaque BD, la page Bibliothèque affiche le nombre de fichiers dans
l'archive et sa taille sur disque (calculés à l'ouverture, stockés en base).
Chaque livre peut aussi être noté (0 à 5 étoiles, cliquer sur l'étoile déjà
sélectionnée l'enlève) et étiqueté : deux étiquettes rapides ("Lu", "À lire")
plus des étiquettes libres ajoutées via le champ texte. Note et étiquettes
sont définies par l'utilisateur et ne sont jamais réinitialisées à la
réouverture d'un livre (seuls titre, pagination, nombre de fichiers et
taille sont rafraîchis). L'extraction automatique de métadonnées (langue,
auteurs, année) n'est pas encore implémentée.

## Support PDF

En plus des archives CBZ/CBR, Tankōbon lit directement les fichiers PDF :
chaque page est rasterisée à la volée (~200 DPI, un bon compromis qualité/
mémoire) via [pdfjs-dist](https://github.com/mozilla/pdf.js) et
[@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) — une implémentation
native (binaire précompilé, pas de compilation locale) de l'API Canvas pour
Node.js, le même mécanisme que pdf.js utilise lui-même hors navigateur. Le
reste du lecteur (zoom, mode continu, progression, étiquettes/note...) ne
fait pas de distinction entre une page rasterisée depuis un PDF et une page
d'image classique.

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

## Avancement et temps de lecture restant

L'en-tête du lecteur (page par page comme défilement continu) affiche le
pourcentage lu du livre, et une estimation du temps restant basée sur la
vitesse de lecture observée depuis l'ouverture du livre dans cette session
(nombre de pages tournées / temps écoulé) — l'estimation n'apparaît
qu'une fois qu'il y a assez de données pour être fiable.

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
  main/services # ComicService + archives (ComicArchive, CbzArchive, CbrArchive, PdfArchive)
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
