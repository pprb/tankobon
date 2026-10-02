# 0008. Interface translations with i18next, split by area

- **Status:** Accepted
- **Date:** 2026-10-02

## Context

The interface was French only: every label and every user-facing error message was a French string literal, in the renderer's components and in the main process (native dialog titles, the `{ status: 'error', message }` results, the errors of the archive readers and the metadata clients). The app has to be usable in English too, with room for more languages later. The language must follow the operating system by default, fall back to English when the system language isn't supported, and be forceable from the settings.

Both processes produce text: the main process builds error messages and opens native dialogs, so translating only the renderer would leave French messages in an English interface. The strings also have to stay maintainable as the app grows: one big file per language becomes a merge-conflict hotspot and hard to review.

## Decision

The interface is translated with **i18next**, plus **react-i18next** in the renderer. A single module, `src/shared/i18n.ts`, creates the i18next instance, holds the language rules (`resolveLanguage()`, `FALLBACK_LANGUAGE = 'en'`) and is imported by both processes, each getting its own instance. Every locale is bundled and loaded synchronously: there are only two, they are small, and nothing has to be fetched by a sandboxed renderer or a main process that needs messages from its first line.

Strings live in `src/locales/<language>/<namespace>.ts`, one namespace per area of the app (a page, a dialog, the main process's errors or dialogs), as TypeScript modules. The English locale is the reference: it types the keys of `t()` (`CustomTypeOptions`), and each French namespace is typed against it (`Translation<typeof en>`), so a missing, extra or mistyped key fails the type check.

The `language` setting (`system`, `en` or `fr`) is stored with the other settings. The main process resolves it against `app.getPreferredSystemLanguages()` and passes that same list to the renderer (`app:get-system-languages`), so both sides always agree on the language.

## Consequences

- No UI string is hard-coded any more: a new one needs a key in both locales, which `npm run typecheck` enforces; `i18n.test.ts` checks that both locales use the same interpolation variables.
- Pure helpers in `src/lib/` and the main-process services call the module's `t()` directly. Their output depends on a process-wide language, which their tests set with `applyLanguage()`; the tests checking user-facing messages run in French.
- Main-process messages are translated in the language last applied there; the settings and import IPC handlers re-apply it whenever the setting changes.
- Stored data is never translated: the quick tags stay `Lu`/`À lire` in the database and in exports, and are only labelled in the current language.
- Adding a language means a `src/locales/<code>/` folder typed against English, plus the code in `SUPPORTED_LANGUAGES` and `LANGUAGE_NAMES`.

## Alternatives considered

- **Hand-rolled dictionaries** (a `Record` per language and a small `t()`): no dependency, but plurals, interpolation and React re-rendering on a language change would all have to be rewritten, less well.
- **JSON locale files**: the usual i18next layout, editable by translation tools, but they can't be typed against each other without a generation step, and a missing French key would only show at runtime (as the English fallback).
- **One file per language**: simpler to wire, but it grows with every feature and mixes unrelated areas in one diff.
- **Translating in the renderer only, with error codes from the main process**: keeps the main process language-agnostic, but every result union and thrown error would need a code and a mapping, and the native dialogs' titles would still be in the main process.
- **Resolving the system language from `navigator.languages` in the renderer**: Chromium only exposes the app locale there, not the OS's preference list, so a user whose first language isn't supported but whose second is could see the renderer and the main process pick different languages.
