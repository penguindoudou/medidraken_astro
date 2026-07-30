import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  // Skip: already has trailing slash, has a file extension (static assets), or is root
  if (pathname.endsWith('/') || pathname.includes('.')) {
    return next();
  }

  return context.redirect(pathname + '/', 301);
});
