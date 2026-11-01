import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@pethertz/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@pethertz/cat': path.resolve(__dirname, './packages/cat/src/index.ts'),
      '@pethertz/dog': path.resolve(__dirname, './packages/dog/src/index.ts'),
    },
  },
});

