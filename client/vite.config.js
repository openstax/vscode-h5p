import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  root: './src/app',
  publicDir: false,
  plugins: [react()],
  build: {
    target: 'es2020', // required by @h5web/h5wasm for BigInt `123n` notation support
    sourcemap: 'inline', // can't load external sourcemaps from webviews
    outDir: '../../out',
    emptyOutDir: true,
    manifest: true, // so the extension knows what the app's built files are called
  },
});
