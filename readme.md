# Tankōbon

Gestionnaire de bibliothèque et lecteur de BD, comics et manga numériques.

## Stack

- [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) (packaging, makers Squirrel / ZIP / deb / rpm)
- [Vite](https://vitejs.dev/) pour le main, le preload et le renderer
- TypeScript, ESLint

## Structure

```
src/
  main.ts       # processus principal (fenêtres, cycle de vie, IPC)
  preload.ts    # pont sécurisé main <-> renderer (contextBridge)
  renderer.ts   # point d'entrée de l'UI
  global.d.ts   # typage de window.tankobon
index.html      # page du renderer
forge.config.ts # configuration Electron Forge (makers, plugins, fuses)
vite.*.config.ts
```

## Développement

```sh
npm install
npm start          # lance l'app en mode dev (HMR sur le renderer)
npm run lint
npm run typecheck
```

## Distribution

```sh
npm run package    # build l'app dans out/
npm run make       # génère les installeurs pour la plateforme courante
```
