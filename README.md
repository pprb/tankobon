# Tankōbon

Desktop library manager and reader for digital comics, BD and manga (CBZ, CBR and PDF). Everything stays on your machine: the library, reading progress, ratings and tags live in a local SQLite file.

Built with Electron, React 19 and TypeScript.

## Install

Installers for Windows, macOS (Apple silicon) and Linux (`.deb`, `.rpm`) are attached to each [GitHub release](https://github.com/pprb/tankobon/releases).

From source: requires Node.js 22 (see `.nvmrc`).

```sh
npm install
```

## Run

```sh
npm start          # the app in dev mode, with hot reload of the UI
npm test           # unit tests
npm run make       # installers for the current platform
```

## Documentation

**https://pprb.github.io/tankobon/**, built from `docs/`:

- [Features](docs/guide/features.md)
- [Development](docs/development.md): all commands, CI, releases
- [Architecture](docs/architecture.md) and [decision records](docs/decisions/index.md)
- API reference, IPC channels and database schema: generated from the code (`npm run docs:dev` to browse them locally)

Contributing: see [CONTRIBUTING.md](CONTRIBUTING.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

MIT
