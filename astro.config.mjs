// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { EnumChangefreq } from 'sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Changed from 'static'
  adapter: cloudflare(),
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['astro/compiler-runtime']
    },
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
  },

  site: 'https://www.medidraken.com',
  integrations: [sitemap({
    filter: (page) => !page.includes('/legal/'),
    serialize(item) {
      // Home page — highest priority, weekly
      if (item.url === 'https://www.medidraken.com/') {
        item.changefreq = EnumChangefreq.WEEKLY;
        item.priority = 1.0;
      }
      // Symptom & health goal pages — monthly
      else if (item.url.includes('/symtom/') || item.url.includes('/na-dina-halsomal/')) {
        item.changefreq = EnumChangefreq.MONTHLY;
        item.priority = 0.8;
      }
      // Course pages — weekly (schedule may change)
      else if (item.url.includes('/kurser/')) {
        item.changefreq = EnumChangefreq.WEEKLY;
        item.priority = 0.7;
      }
      // Everything else
      else {
        item.changefreq = EnumChangefreq.MONTHLY;
        item.priority = 0.6;
      }
      item.lastmod = new Date().toISOString().split('T')[0];
      return item;
    }
  })]
});