# 0005. Book metadata looked up on demand in public APIs, from the main process

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

The library only knew what a file name and the archive could tell: a title derived from the file name, page and file counts. Users want the series, the volume, the release date, the language and the people behind a book (writer, artist, colorist…), with people stored as entities of their own so that author pages can come later.

That information lives in online databases. Until now the app made no network request at all ("local-first, offline", see [ADR 0002](./0002-local-storage-node-sqlite.md)), and the renderer is sandboxed ([ADR 0001](./0001-electron-process-isolation.md)) under a strict CSP (`index.html`: `default-src 'self'`, so no `connect-src` to anything else).

No single public API covers the whole collection: Comic Vine is the reference for US comics and knows each person's role, but requires a personal API key and barely covers French BD; Google Books covers French editions and manga, works without a key, but has no series field and lists "authors" without roles. Bédéthèque, the reference for BD, has no API (scraping is left for later).

## Decision

- Metadata is looked up **only when the user asks**, book by book, from the "Rechercher les infos" action. Nothing runs in the background, and only the search text (series or title, volume number) is sent.
- The requests are made by the **main process** (`metadata:search`, `src/main/services/metadata-service.ts`), through Electron's `net.fetch`. The renderer never talks to the APIs: the API keys stay out of it, and its CSP still allows no connection beyond `'self'`. The only CSP change is `img-src` for the two cover-thumbnail hosts.
- Two sources, **Comic Vine** and **Google Books**, queried in parallel and normalized to one `MetadataCandidate` shape. Each can be turned off in Paramètres › Métadonnées, where the API keys are entered; they are stored like any other setting.
- Nothing is written without confirmation: the user picks a candidate, then accepts, edits or refuses each field and each credit.
- People are **normalized** (`people` and `credits` tables), unlike tags, and matched by first and last name.

## Consequences

- The app now makes network requests, but only ones the user starts; with no lookup, it behaves exactly as before, offline. The docs say "nothing is sent to the cloud" with that exception spelled out.
- API keys are stored in clear in the database and included in JSON exports (the settings are exported wholesale). The docs warn that an export should be kept private.
- Adding a source means a client returning `MetadataCandidate[]`, a branch in `searchMetadata()`, its settings keys, and possibly a CSP `img-src` host for its covers.
- Matching people by name merges homonyms and splits a person whose name is spelled differently by two sources. Acceptable for a personal library; an external id per source could be added to `people` later.
- Google Books' anonymous quota is shared and often exhausted; the error message points to the optional API key.

## Alternatives considered

- **Requests from the renderer**: would need `connect-src` opened to each API, the keys exposed to the page, and CORS support from every source.
- **Automatic lookup on scan or open**: too many requests (Comic Vine rate-limits), wrong matches written silently, and network traffic the user didn't ask for.
- **Reading `ComicInfo.xml` from the archives**: complementary, not a replacement (most files don't carry one); left for a later task.
- **Tags-style JSON column for credits**: simpler, but people couldn't be shared across books or enriched later.
