import { serveStatic } from 'hono/bun';
import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index';
import { contactMessages, posts, projects } from '../db/schema';
import { publishContent } from '../scripts/publish-content';

const app = new Hono();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().max(160),
  message: z.string().trim().min(10).max(5000)
});

const postSchema = z.object({
  title: z.string().trim().min(2).max(180),
  excerpt: z.string().trim().min(10).max(300),
  body: z.string().trim().min(10),
  category: z.string().trim().min(2).max(40),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured: z.boolean().default(false)
});

const projectSchema = z.object({
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(300),
  body: z.string().trim().min(10),
  year: z.coerce.number().int().min(2000).max(2200),
  role: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  coverImage: z.string().trim().max(500).optional()
});

const statusSchema = z.object({ status: z.enum(['new', 'read', 'archived']) });

const slugify = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const getId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const estimateReadingTime = (body: string) => {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(wordCount / 200))} menit`;
};

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/contact', async (c) => {
  const payload = await c.req.json().catch(() => null);
  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    return c.json({ error: 'Periksa kembali data yang Anda kirim.' }, 400);
  }

  await db.insert(contactMessages).values({
    ...parsed.data,
    status: 'new',
    createdAt: new Date().toISOString()
  });

  return c.json({ message: 'Pesan berhasil dikirim.' }, 201);
});

app.use('/api/admin/*', async (c, next) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return c.json({ error: 'ADMIN_TOKEN belum dikonfigurasi.' }, 503);
  if (c.req.header('Authorization') !== `Bearer ${adminToken}`) {
    return c.json({ error: 'Token admin tidak valid.' }, 401);
  }
  await next();
});

app.get('/api/admin/messages', async (c) => {
  const messages = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  return c.json(messages);
});

app.patch('/api/admin/messages/:id', async (c) => {
  const id = getId(c.req.param('id'));
  const payload = await c.req.json().catch(() => null);
  const parsed = statusSchema.safeParse(payload);
  if (!id || !parsed.success) return c.json({ error: 'Data pesan tidak valid.' }, 400);

  const updated = await db.update(contactMessages)
    .set({ status: parsed.data.status })
    .where(eq(contactMessages.id, id))
    .returning();
  if (!updated[0]) return c.json({ error: 'Pesan tidak ditemukan.' }, 404);
  return c.json(updated[0]);
});

app.get('/api/admin/posts', async (c) => {
  const entries = await db.select().from(posts).orderBy(desc(posts.updatedAt));
  return c.json(entries);
});

app.post('/api/admin/posts', async (c) => {
  const payload = await c.req.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) return c.json({ error: 'Data tulisan tidak valid.' }, 400);

  const now = new Date().toISOString();
  const created = await db.insert(posts).values({
    ...parsed.data,
    slug: slugify(parsed.data.title),
    readingTime: estimateReadingTime(parsed.data.body),
    updatedAt: now,
    publishedAt: parsed.data.status === 'published' ? now : null
  }).returning();
  return c.json(created[0], 201);
});

app.put('/api/admin/posts/:id', async (c) => {
  const id = getId(c.req.param('id'));
  const payload = await c.req.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!id || !parsed.success) return c.json({ error: 'Data tulisan tidak valid.' }, 400);

  const existing = await db.select({ publishedAt: posts.publishedAt }).from(posts).where(eq(posts.id, id));
  if (!existing[0]) return c.json({ error: 'Tulisan tidak ditemukan.' }, 404);
  const now = new Date().toISOString();
  const publishedAt = parsed.data.status === 'draft'
    ? null
    : existing[0].publishedAt ?? (parsed.data.status === 'published' ? now : null);

  const updated = await db.update(posts).set({
    ...parsed.data,
    slug: slugify(parsed.data.title),
    readingTime: estimateReadingTime(parsed.data.body),
    updatedAt: now,
    publishedAt
  }).where(eq(posts.id, id)).returning();
  if (!updated[0]) return c.json({ error: 'Tulisan tidak ditemukan.' }, 404);
  return c.json(updated[0]);
});

app.delete('/api/admin/posts/:id', async (c) => {
  const id = getId(c.req.param('id'));
  if (!id) return c.json({ error: 'ID tulisan tidak valid.' }, 400);
  const deleted = await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
  if (!deleted[0]) return c.json({ error: 'Tulisan tidak ditemukan.' }, 404);
  return c.json({ ok: true });
});

app.get('/api/admin/projects', async (c) => {
  const entries = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return c.json(entries);
});

app.post('/api/admin/publish', async (c) => {
  const result = await publishContent();
  return c.json({ message: `Publish selesai: ${result.posts} tulisan dan ${result.projects} karya. Jalankan build untuk memperbarui website.`, ...result });
});

app.post('/api/admin/projects', async (c) => {
  const payload = await c.req.json().catch(() => null);
  const parsed = projectSchema.safeParse(payload);
  if (!parsed.success) return c.json({ error: 'Data karya tidak valid.' }, 400);

  const created = await db.insert(projects).values({
    ...parsed.data,
    slug: slugify(parsed.data.title),
    updatedAt: new Date().toISOString()
  }).returning();
  return c.json(created[0], 201);
});

app.put('/api/admin/projects/:id', async (c) => {
  const id = getId(c.req.param('id'));
  const payload = await c.req.json().catch(() => null);
  const parsed = projectSchema.safeParse(payload);
  if (!id || !parsed.success) return c.json({ error: 'Data karya tidak valid.' }, 400);

  const updated = await db.update(projects).set({
    ...parsed.data,
    slug: slugify(parsed.data.title),
    updatedAt: new Date().toISOString()
  }).where(eq(projects.id, id)).returning();
  if (!updated[0]) return c.json({ error: 'Karya tidak ditemukan.' }, 404);
  return c.json(updated[0]);
});

app.delete('/api/admin/projects/:id', async (c) => {
  const id = getId(c.req.param('id'));
  if (!id) return c.json({ error: 'ID karya tidak valid.' }, 400);
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  if (!deleted[0]) return c.json({ error: 'Karya tidak ditemukan.' }, 404);
  return c.json({ ok: true });
});

app.use('/*', serveStatic({ root: './dist' }));

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch
};
