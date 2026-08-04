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
  trailingSlash: 'always',
  redirects: {
    '/behandling/tuina-massage/': '/behandling/medicinsk-kinesisk-massage/',

    // Ghost pages from old site — redirect to canonical equivalents
    '/taiji.html':    '/kurser/tai-chi/',
    '/taiji':         '/kurser/tai-chi/',
    '/johannes.html': '/om-oss/',
    '/kurser.html':   '/kurser/',
    '/fest.html':     '/for-foretag/foretagsevent-aktiviteter/',

    // Renamed pages (old slug → new slug)
    '/behandlingar.html': '/behandling/',
    '/behandlingar':      '/behandling/',

    // Hälsoresor moved under upplevelser
    '/halsoresor':        '/upplevelser/halsoresor/',
    '/halsoresor.html':   '/upplevelser/halsoresor/',

    // Old index2 test/staging page → home
    '/index2':            '/',
    '/index2.html':       '/',

    // Pages that no longer exist → closest relevant destination
    '/ansikte':           '/',          // ansiktsbehandling discontinued → home
    '/ansikte.html':      '/',
    '/zon':               '/',          // zonterapi discontinued → home
    '/zon.html':          '/',
    '/privat':            '/kurser/',   // no general privatundervisning page → courses index
    '/privat.html':       '/kurser/',

    // Old top-level WP slugs that moved or were restructured
    '/qigong':            '/kurser/medicinsk-qigong/',   // top-level qigong → course page
    '/qigong.html':       '/kurser/medicinsk-qigong/',
    '/akupunktur':        '/behandling/akupunktur/',     // top-level → treatment page
    '/akupunktur.html':   '/behandling/akupunktur/',
    '/helg':              '/kurser/',                    // generic helgkurs → courses index (both tai-chi & qigong have helgkurser)
    '/helg.html':         '/kurser/',
    '/forelasningar':     '/for-foretag/',                    // lectures discontinued → corporate services
    '/forelasningar.html':'/for-foretag/',
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['astro/compiler-runtime', 'mrmime']
    },
    ssr: {
      optimizeDeps: {
        exclude: ['astro/compiler-runtime', 'mrmime']
      }
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