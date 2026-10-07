import { defineConfig } from 'vitest/config';

/* Two lanes, because the suite has two kinds of test.

   The pure logic — domain, tree layout, seed integrity — runs in node: no DOM,
   no React, fast. Component tests need a document, so .test.tsx files run in
   jsdom with React Testing Library (all four packages were already installed
   but had no way to run). Keeping them separate means the pure lane stays
   honest about importing nothing. */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'packages/*/src/**/*.test.ts',
            'apps/*/src/**/*.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: [
            'packages/*/src/**/*.test.tsx',
            'apps/*/src/**/*.test.tsx',
          ],
        },
      },
    ],
  },
});
