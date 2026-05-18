import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/**/src/**', 'packages/**/src/**'],
      exclude: ['**/*.test.ts', '**/*.config.*', '**/node_modules/**'],
    },
  },
});
