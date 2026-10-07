import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/* Test config lives in the root vitest.config.ts, which defines the node and
   jsdom projects for the whole workspace. A `test` block here was shadowed by
   it and only served to disagree about the environment. */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@ft/domain', replacement: fileURLToPath(new URL('../../packages/domain/src/index.ts', import.meta.url)) },
      { find: '@ft/ui', replacement: fileURLToPath(new URL('../../packages/ui/src', import.meta.url)) },
    ],
  },
});
