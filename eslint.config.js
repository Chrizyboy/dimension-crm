import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'src-tauri/target',
      'src/routeTree.gen.ts',
      'docs/modul-vorlage',
      'supabase/functions',
      'coverage',
      'playwright-report',
      'test-results',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['Route'] }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // TanStack Router signalisiert «nicht gefunden» und Weiterleitungen per throw notFound()/redirect().
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [
            { from: 'package', package: '@tanstack/router-core', name: 'NotFoundError' },
            { from: 'package', package: '@tanstack/router-core', name: 'Redirect' },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*', '../../modules/*'],
              message: 'Module nur über ihre index.ts importieren (z.B. "@/modules/sales").',
            },
          ],
        },
      ],
    },
  },
  {
    // shadcn-Muster: Basis-Bausteine exportieren neben der Komponente auch ihre Varianten (buttonVariants …).
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  { files: ['**/*.js', '**/*.mjs'], extends: [js.configs.recommended], languageOptions: { globals: globals.node } },
)
