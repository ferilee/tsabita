import { getCollection } from 'astro:content';

export async function getBlogEntries() {
  const [manual, published] = await Promise.all([getCollection('blog'), getCollection('publishedBlog')]);
  type BlogEntry = (typeof manual)[number];
  const entries = new Map<string, BlogEntry>(manual.filter((entry) => !entry.data.hidden).map((entry) => [entry.id, entry]));
  published.filter((entry) => !entry.data.hidden).forEach((entry) => entries.set(entry.id, entry as unknown as BlogEntry));
  return [...entries.values()];
}

export async function getProjectEntries() {
  const [manual, published] = await Promise.all([getCollection('projects'), getCollection('publishedProjects')]);
  type ProjectEntry = (typeof manual)[number];
  const entries = new Map<string, ProjectEntry>(manual.filter((entry) => !entry.data.hidden).map((entry) => [entry.id, entry]));
  published.filter((entry) => !entry.data.hidden).forEach((entry) => entries.set(entry.id, entry as unknown as ProjectEntry));
  return [...entries.values()];
}
