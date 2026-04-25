import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

/**
 * Next.js 16: use ESLint CLI (not `next lint`). We use core-web-vitals only here;
 * `eslint-config-next/typescript` is omitted because the repo predates strict
 * @typescript-eslint defaults and would block CI on hundreds of legacy issues.
 */
export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // React Compiler / hooks rules — enable gradually; current code predates them.
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/preserve-manual-memoization': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@next/next/no-img-element': 'warn',
      'import/no-anonymous-default-export': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'scripts/**',
    'postcss.config.mjs',
  ]),
]);
