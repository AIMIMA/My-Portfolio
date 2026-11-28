import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1700,
    rolldownOptions: {
      output: {
        // Vite 8 / Rolldown native chunk splitting (zero Rollup deprecation warnings)
        codeSplitting: {
          groups: [
            {
              name: 'three',
              test: /[\\/]node_modules[\\/]three[\\/]/,
              priority: 20,
            },
            {
              name: 'maplibre',
              test: /[\\/]node_modules[\\/]maplibre-gl[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
});
