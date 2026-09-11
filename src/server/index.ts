import { serveStatic } from 'hono/bun';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index';
import { contactMessages } from '../db/schema';

const app = new Hono();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().max(160),
  message: z.string().trim().min(10).max(5000)
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/contact', async (c) => {
  const payload = await c.req.json().catch(() => null);
  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    return c.json({ error: 'Periksa kembali data yang Anda kirim.' }, 400);
  }

  await db.insert(contactMessages).values({
    ...parsed.data,
    createdAt: new Date().toISOString()
  });

  return c.json({ message: 'Pesan berhasil dikirim.' }, 201);
});

app.use('/*', serveStatic({ root: './dist' }));

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch
};
