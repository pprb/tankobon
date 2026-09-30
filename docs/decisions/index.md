# Architecture decision records

An ADR records one structural decision: the context, what was decided, and what it costs. ADRs are immutable once accepted: to change a decision, write a new ADR that supersedes the old one and update the old one's status.

| # | Decision | Status |
|---|---|---|
| [0001](./0001-electron-process-isolation.md) | Strict Electron process isolation, one preload bridge | Accepted (rationale to be confirmed) |
| [0002](./0002-local-storage-node-sqlite.md) | Local storage in a SQLite file through `node:sqlite` | Accepted (alternatives to be confirmed) |
| [0003](./0003-database-location-pointer-file.md) | Database location in a pointer file, never moved automatically | Accepted |
| [0004](./0004-pdf-rendering-pdfjs-napi-canvas.md) | PDF pages rasterized in the main process with pdf.js + `@napi-rs/canvas` | Accepted |

These first four ADRs were written after the fact, from the code and its comments. Parts marked **to be confirmed** are inferred and should be checked by the maintainer.

## Writing a new ADR

Copy [the template](./template.md) to `NNNN-short-title.md` (next number), fill it in, add it to the table above, and ship it in the same pull request as the change it describes.
