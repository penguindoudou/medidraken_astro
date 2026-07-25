import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artiklar = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/artiklar' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Medidraken'),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    focusKeywords: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { artiklar };
