import { afterAll, describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const databasePath = '/tmp/tsabita-api-test-' + process.pid + '.sqlite';
const blogOutputPath = '/tmp/tsabita-api-test-' + process.pid + '-blog';
const projectOutputPath = '/tmp/tsabita-api-test-' + process.pid + '-projects';
process.env.DB_FILE_NAME = databasePath;
process.env.ADMIN_TOKEN = 'test-admin-token';

const {
  app,
  createApp,
  estimateReadingTime,
  getId,
  slugify
} = await import('../../src/server/index');
const { db } = await import('../../src/db/index');
const { publishContent } = await import('../../src/scripts/publish-content');

const authHeaders = { Authorization: 'Bearer test-admin-token' };

const request = (path: string, options: RequestInit = {}, authenticated = false) => {
  const headers = new Headers(options.headers);
  if (authenticated) headers.set('Authorization', authHeaders.Authorization);
  return app.request(path, { ...options, headers });
};

const jsonRequest = (path: string, body: unknown, options: RequestInit = {}, authenticated = true) => request(path, {
  ...options,
  method: options.method ?? 'POST',
  headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  body: JSON.stringify(body)
}, authenticated);

const readJson = async <T = Record<string, unknown>>(response: Response) => await response.json() as T;

const validPost = (overrides: Record<string, unknown> = {}) => ({
  title: 'Catatan API ' + Date.now() + '-' + Math.random(),
  excerpt: 'Catatan pengujian API dengan ringkasan yang cukup panjang.',
  body: 'Isi tulisan pengujian yang cukup panjang untuk melewati validasi.',
  category: 'Catatan',
  status: 'draft',
  featured: false,
  ...overrides
});

const validProject = (overrides: Record<string, unknown> = {}) => ({
  title: 'Karya API ' + Date.now() + '-' + Math.random(),
  summary: 'Ringkasan karya pengujian yang cukup panjang untuk validasi.',
  body: 'Deskripsi karya pengujian yang cukup panjang untuk melewati validasi.',
  year: 2026,
  role: 'Research',
  category: 'Praktikum',
  ...overrides
});

describe('fungsi utilitas backend', () => {
  test('slugify membuat slug dari judul', () => {
    expect(slugify('Catatan Praktikum: Hari Pertama!')).toBe('catatan-praktikum-hari-pertama');
  });

  test('getId menerima hanya bilangan bulat positif', () => {
    expect(getId('12')).toBe(12);
    expect(getId('0')).toBeNull();
    expect(getId('abc')).toBeNull();
  });

  test('estimateReadingTime menghitung minimal satu menit', () => {
    expect(estimateReadingTime('Satu tulisan pendek.')).toBe('1 menit');
    expect(estimateReadingTime(Array.from({ length: 201 }, () => 'kata').join(' '))).toBe('2 menit');
  });
});

describe('health endpoint', () => {
  test('mengembalikan status sehat tanpa autentikasi', async () => {
    const response = await request('/api/health');
    expect(response.status).toBe(200);
    expect(await readJson<Record<string, unknown>>(response)).toEqual({ ok: true });
  });
});

describe('autentikasi admin', () => {
  test('menolak request tanpa token', async () => {
    const response = await request('/api/admin/posts');
    expect(response.status).toBe(401);
    expect(await readJson<Record<string, unknown>>(response)).toEqual({ error: 'Token admin tidak valid.' });
  });

  test('menolak token yang salah', async () => {
    const response = await request('/api/admin/posts', { headers: { Authorization: 'Bearer wrong-token' } });
    expect(response.status).toBe(401);
  });
});

describe('contact endpoints', () => {
  test('menolak data kontak yang tidak valid', async () => {
    const response = await jsonRequest('/api/contact', { name: 'A', email: 'invalid', message: 'pendek' }, {}, false);
    expect(response.status).toBe(400);
    expect(await readJson<Record<string, unknown>>(response)).toEqual({ error: 'Periksa kembali data yang Anda kirim.' });
  });

  test('membuat dan membaca pesan kontak', async () => {
    const response = await jsonRequest('/api/contact', {
      name: 'Ananya Putri',
      email: 'ananya@example.com',
      message: 'Saya ingin berdiskusi tentang karya Tsabita.'
    }, {}, false);
    expect(response.status).toBe(201);
    expect(await readJson<Record<string, unknown>>(response)).toEqual({ message: 'Pesan berhasil dikirim.' });

    const messagesResponse = await request('/api/admin/messages', {}, true);
    const messages = await readJson<Array<{ name: string; status: string }>>(messagesResponse);
    expect(messagesResponse.status).toBe(200);
    expect(messages.some((message) => message.name === 'Ananya Putri' && message.status === 'new')).toBe(true);
  });

  test('menolak perubahan status pesan yang tidak valid', async () => {
    const response = await jsonRequest('/api/admin/messages/1', { status: 'invalid' }, { method: 'PATCH' });
    expect(response.status).toBe(400);
  });

  test('mengembalikan 404 untuk pesan yang tidak ditemukan', async () => {
    const response = await jsonRequest('/api/admin/messages/999999', { status: 'read' }, { method: 'PATCH' });
    expect(response.status).toBe(404);
  });

  test('mengubah status pesan', async () => {
    await jsonRequest('/api/contact', {
      name: 'Bima Putra',
      email: 'bima@example.com',
      message: 'Pesan kedua untuk menguji perubahan status.'
    }, {}, false);
    const messages = await readJson<Array<{ id: number }>>(await request('/api/admin/messages', {}, true));
    const message = messages.find((item) => item.id > 1) ?? messages[0];
    const response = await jsonRequest('/api/admin/messages/' + message.id, { status: 'read' }, { method: 'PATCH' });
    const updated = await readJson<{ status: string }>(response);
    expect(response.status).toBe(200);
    expect(updated.status).toBe('read');
  });
});

describe('post endpoints', () => {
  test('membaca daftar tulisan', async () => {
    const response = await request('/api/admin/posts', {}, true);
    expect(response.status).toBe(200);
    expect(Array.isArray(await readJson(response))).toBe(true);
  });

  test('menolak tulisan yang tidak valid', async () => {
    const response = await jsonRequest('/api/admin/posts', { title: '' }, { method: 'POST' });
    expect(response.status).toBe(400);
  });

  test('membuat draft dengan metadata otomatis', async () => {
    const response = await jsonRequest('/api/admin/posts', validPost(), { method: 'POST' });
    const post = await readJson<{ status: string; readingTime: string; publishedAt: string | null }>(response);
    expect(response.status).toBe(201);
    expect(post.status).toBe('draft');
    expect(post.readingTime).toBe('1 menit');
    expect(post.publishedAt).toBeNull();
  });

  test('menolak update tulisan yang tidak valid', async () => {
    const response = await jsonRequest('/api/admin/posts/1', { title: '' }, { method: 'PUT' });
    expect(response.status).toBe(400);
  });

  test('mengembalikan 404 saat update tulisan tidak ditemukan', async () => {
    const response = await jsonRequest('/api/admin/posts/999999', validPost(), { method: 'PUT' });
    expect(response.status).toBe(404);
  });

  test('mempublikasikan tulisan dan mempertahankan tanggal terbit saat diedit', async () => {
    const created = await readJson<{ id: number }>(await jsonRequest('/api/admin/posts', validPost(), { method: 'POST' }));
    const publishedResponse = await jsonRequest('/api/admin/posts/' + created.id, validPost({ status: 'published' }), { method: 'PUT' });
    const published = await readJson<{ publishedAt: string | null }>(publishedResponse);
    const updatedResponse = await jsonRequest('/api/admin/posts/' + created.id, validPost({ status: 'published' }), { method: 'PUT' });
    const updated = await readJson<{ publishedAt: string | null }>(updatedResponse);
    expect(publishedResponse.status).toBe(200);
    expect(published.publishedAt).toBeString();
    expect(updated.publishedAt).toBe(published.publishedAt);
  });

  test('menolak id tulisan yang tidak valid saat dihapus', async () => {
    const response = await request('/api/admin/posts/nope', { method: 'DELETE' }, true);
    expect(response.status).toBe(400);
  });

  test('mengembalikan 404 saat tulisan yang dihapus tidak ditemukan', async () => {
    const response = await request('/api/admin/posts/999999', { method: 'DELETE' }, true);
    expect(response.status).toBe(404);
  });

  test('menghapus tulisan', async () => {
    const created = await readJson<{ id: number }>(await jsonRequest('/api/admin/posts', validPost(), { method: 'POST' }));
    const response = await request('/api/admin/posts/' + created.id, { method: 'DELETE' }, true);
    expect(response.status).toBe(200);
    expect(await readJson<Record<string, unknown>>(response)).toEqual({ ok: true });
  });
});

describe('project endpoints', () => {
  test('membaca daftar karya', async () => {
    const response = await request('/api/admin/projects', {}, true);
    expect(response.status).toBe(200);
    expect(Array.isArray(await readJson(response))).toBe(true);
  });

  test('menolak karya yang tidak valid', async () => {
    const response = await jsonRequest('/api/admin/projects', { title: '' }, { method: 'POST' });
    expect(response.status).toBe(400);
  });

  test('membuat karya', async () => {
    const response = await jsonRequest('/api/admin/projects', validProject(), { method: 'POST' });
    const project = await readJson<{ title: string; slug: string }>(response);
    expect(response.status).toBe(201);
    expect(project.slug).toContain('karya-api');
  });

  test('menolak update karya yang tidak valid', async () => {
    const response = await jsonRequest('/api/admin/projects/1', { title: '' }, { method: 'PUT' });
    expect(response.status).toBe(400);
  });

  test('mengembalikan 404 saat update karya tidak ditemukan', async () => {
    const response = await jsonRequest('/api/admin/projects/999999', validProject(), { method: 'PUT' });
    expect(response.status).toBe(404);
  });

  test('mengubah karya', async () => {
    const created = await readJson<{ id: number }>(await jsonRequest('/api/admin/projects', validProject(), { method: 'POST' }));
    const response = await jsonRequest('/api/admin/projects/' + created.id, validProject({ title: 'Karya API Diperbarui' }), { method: 'PUT' });
    const project = await readJson<{ title: string }>(response);
    expect(response.status).toBe(200);
    expect(project.title).toBe('Karya API Diperbarui');
  });

  test('menolak id karya yang tidak valid saat dihapus', async () => {
    const response = await request('/api/admin/projects/nope', { method: 'DELETE' }, true);
    expect(response.status).toBe(400);
  });

  test('mengembalikan 404 saat karya yang dihapus tidak ditemukan', async () => {
    const response = await request('/api/admin/projects/999999', { method: 'DELETE' }, true);
    expect(response.status).toBe(404);
  });

  test('menghapus karya', async () => {
    const created = await readJson<{ id: number }>(await jsonRequest('/api/admin/projects', validProject(), { method: 'POST' }));
    const response = await request('/api/admin/projects/' + created.id, { method: 'DELETE' }, true);
    expect(response.status).toBe(200);
    expect(await readJson<Record<string, unknown>>(response)).toEqual({ ok: true });
  });
});

describe('publish endpoint', () => {
  test('menjalankan publisher dan mengembalikan ringkasan publish', async () => {
    let called = false;
    const publishApp = createApp(db, async () => {
      called = true;
      return { posts: 3, projects: 2 };
    });
    const response = await publishApp.request('/api/admin/publish', { method: 'POST', headers: authHeaders });
    const result = await readJson<{ posts: number; projects: number; message: string }>(response);
    expect(response.status).toBe(200);
    expect(called).toBe(true);
    expect(result.posts).toBe(3);
    expect(result.projects).toBe(2);
    expect(result.message).toContain('3 tulisan dan 2 karya');
  });
});

describe('publishContent', () => {
  test('menulis konten published ke file Markdown', async () => {
    await jsonRequest('/api/admin/posts', validPost({ status: 'published', title: 'Tulisan Publish API' }), { method: 'POST' });
    await jsonRequest('/api/admin/projects', validProject({ title: 'Karya Publish API' }), { method: 'POST' });

    const result = await publishContent(db, {
      blogDirectory: blogOutputPath,
      projectDirectory: projectOutputPath
    });
    const blogFiles = readdirSync(blogOutputPath).filter((file) => file.endsWith('.md'));
    const projectFiles = readdirSync(projectOutputPath).filter((file) => file.endsWith('.md'));

    expect(result.posts).toBeGreaterThan(0);
    expect(result.projects).toBeGreaterThan(0);
    expect(blogFiles.some((file) => readFileSync(join(blogOutputPath, file), 'utf8').includes('Tulisan Publish API'))).toBe(true);
    expect(projectFiles.some((file) => readFileSync(join(projectOutputPath, file), 'utf8').includes('Karya Publish API'))).toBe(true);
  });
});

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(databasePath + suffix, { force: true });
  }
  rmSync(blogOutputPath, { recursive: true, force: true });
  rmSync(projectOutputPath, { recursive: true, force: true });
});
