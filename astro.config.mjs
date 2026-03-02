// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/previous_wp_site/**']
      }
    },
    build: {
      rollupOptions: {
        external: [/^\/previous_wp_site\/.*/]
      }
    }
  }
});