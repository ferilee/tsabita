import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['Cerita', 'Opini', 'Perjalanan', 'Catatan']),
  publishedAt: z.coerce.date(),
  readingTime: z.string(),
  featured: z.boolean().default(false),
  hidden: z.boolean().default(false)
});

const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  year: z.number(),
  role: z.string(),
  category: z.string(),
  featured: z.boolean().default(false),
  cover: z.string(),
  hidden: z.boolean().default(false)
});

const blog = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/blog' }), schema: blogSchema });
const publishedBlog = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/published-blog' }), schema: blogSchema });
const projects = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/projects' }), schema: projectSchema });
const publishedProjects = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/published-projects' }), schema: projectSchema });

export const collections = { blog, publishedBlog, projects, publishedProjects };
