import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { posts, projects } from '../db/schema';

const blogDirectory = './src/content/published-blog';
const projectDirectory = './src/content/published-projects';
const quote = (value: string | number | boolean) => JSON.stringify(value);

const clearMarkdownFiles = (directory: string) => {
  mkdirSync(directory, { recursive: true });
  readdirSync(directory).filter((file) => file.endsWith('.md') && file !== '_placeholder.md').forEach((file) => unlinkSync(join(directory, file)));
};

export async function publishContent() {
  const [publishedPosts, publishedProjects] = await Promise.all([
    db.select().from(posts).where(eq(posts.status, 'published')),
    db.select().from(projects)
  ]);

  clearMarkdownFiles(blogDirectory);
  clearMarkdownFiles(projectDirectory);

  publishedPosts.forEach((post) => {
    const file = `---\ntitle: ${quote(post.title)}\ndescription: ${quote(post.excerpt)}\ncategory: ${quote(post.category)}\npublishedAt: ${quote(post.publishedAt ?? post.updatedAt)}\nreadingTime: ${quote(post.readingTime)}\nfeatured: ${quote(post.featured)}\nhidden: false\n---\n\n${post.body}\n`;
    writeFileSync(join(blogDirectory, `${post.slug}.md`), file);
  });

  publishedProjects.forEach((project) => {
    const cover = project.coverImage?.startsWith('#') ? project.coverImage : '#d6c7b5';
    const file = `---\ntitle: ${quote(project.title)}\nsummary: ${quote(project.summary)}\nyear: ${project.year}\nrole: ${quote(project.role)}\ncategory: ${quote(project.category)}\nfeatured: false\ncover: ${quote(cover)}\nhidden: false\n---\n\n${project.body}\n`;
    writeFileSync(join(projectDirectory, `${project.slug}.md`), file);
  });

  return { posts: publishedPosts.length, projects: publishedProjects.length };
}

if (import.meta.main) {
  const result = await publishContent();
  console.log(`Published ${result.posts} post(s) and ${result.projects} project(s).`);
}
