import js from '@eslint/js';
import globals from 'globals';
import { config, configs as tsConfigs } from 'typescript-eslint';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

export default config(
  { ignores: ['.vite/', 'out/', 'dist/', 'src/routeTree.gen.ts'] },
  js.configs.recommended,
  ...tsConfigs.recommended,
  importX.recommended,
  importX.typescript,
  importX.electron,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
  },
  {
    // Renderer: React rules only apply to the UI code.
    files: ['src/**/*.tsx'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['src/**/*.tsx'],
    ...refresh.configs.vite,
  },
  {
    // Route files export `Route` next to a non-exported component and shadcn
    // components export their `*Variants` helpers: fast refresh still works.
    files: ['src/routes/**/*.tsx', 'src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);
