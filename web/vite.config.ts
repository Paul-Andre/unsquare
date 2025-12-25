import { defineConfig } from 'vite';
import { resolve } from 'path';

import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        qr: resolve(__dirname, 'qr.html'),
      },
    },
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8000,
    strictPort: false,
    fs: {
      strict: true,
    },
  },
  esbuild: {
    // Allow JS files to be processed and type-checked
    include: /\.(js|ts|tsx|jsx)$/,
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'DocumentFragment',
  },
  plugins: [
    tsconfigPaths(),
  ],
});

