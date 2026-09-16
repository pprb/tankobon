import { cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

// `@napi-rs/canvas` (native binary) and `pdfjs-dist` (its JS + `standard_fonts`/`cmaps` data —
// see pdf-archive.ts) are kept as real npm dependencies rather than bundled by Vite (see
// vite.main.config.mts). The Vite plugin's packaging step only copies its own build output plus
// `package.json` — no `node_modules` — so anything left external has to be copied in by hand.
async function copyNodeModule(buildPath: string, name: string): Promise<void> {
  await cp(path.join('node_modules', name), path.join(buildPath, 'node_modules', name), { recursive: true });
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    // `@napi-rs/canvas` (used for PDF rendering, see pdf-archive.ts) ships a native `.node`
    // binary, which can't be dlopen'd from inside the asar archive — this unpacks any such
    // binaries into `app.asar.unpacked` automatically at package time.
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      await copyNodeModule(buildPath, 'pdfjs-dist');
      await copyNodeModule(buildPath, '@napi-rs/canvas');
      // Only the platform package matching the machine that ran `npm install` is actually
      // present on disk (the others are npm optionalDependencies for other platforms/arches).
      const napiPackages = await readdir('node_modules/@napi-rs');
      await Promise.all(
        napiPackages
          .filter((name) => name.startsWith('canvas-'))
          .map((name) => copyNodeModule(buildPath, `@napi-rs/${name}`)),
      );
    },
  },
};

export default config;
