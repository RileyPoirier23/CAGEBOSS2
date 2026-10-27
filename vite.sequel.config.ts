/**
 * CAGE BOSS II: THE BUYBACK, built on its own: sequel.html -> dist-sequel/.
 * Same source tree as CAGE BOSS (it shares the rig, the fight engine and the content),
 * a different front door (src/sequel-main.ts) and a different exe (electron-builder.sequel.json).
 */
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.sequelVersion ?? pkg.version) },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    outDir: 'dist-sequel',
    emptyOutDir: true,
    rollupOptions: { input: 'sequel.html' },
  },
  server: { open: '/sequel.html' },
});
