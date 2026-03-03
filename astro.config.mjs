// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/legacy_wp_site/**']
      }
    },
    build: {
      rollupOptions: {
        external: [/^\/legacy_wp_site\/.*/]
      }
    }
  }
});