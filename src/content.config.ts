import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['Cerita', 'Opini', 'Perjalanan', 'Catatan']),
    publishedAt: z.coerce.date(),
    readingTime: z.string(),
    featured: z.boolean().default(false)
  })
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    year: z.number(),
    role: z.string(),
    category: z.string(),
    featured: z.boolean().default(false),
    cover: z.string()
  })
});

export const collections = { blog, projects };
