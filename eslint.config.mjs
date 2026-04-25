import tseslint from 'typescript-eslint';

/**
 * Shared lint for workspace packages. Paths are matched relative to each package
 * cwd (e.g. `src/index.ts`), not the monorepo root — do not prefix with `packages/`.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/out/**',
      '**/build/**',
      'apps/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/node_modules/**', 'apps/**'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
