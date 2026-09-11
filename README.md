# tsabita

Website portofolio pribadi dan jurnal digital dengan Astro, Hono, Bun, Drizzle, dan SQLite.

## Menjalankan proyek

```bash
bun install
cp .env.example .env
bun run dev:api
```

Pada terminal lain:

```bash
bun run dev:web
```

Buka `http://localhost:4321` untuk melihat website. API berjalan di `http://localhost:3001`.

## Perintah utama

- `bun run check` — memeriksa tipe dan file Astro.
- `bun run build` — membuat build statis ke `dist/`.
- `bun run start` — menjalankan server Bun yang melayani `dist/` dan API.
- `bun run db:generate` — membuat migration dari schema Drizzle.
- `bun run db:migrate` — menjalankan migration database.

Tulisan blog ada di `src/content/blog/`, sedangkan karya ada di `src/content/projects/`. Ganti nama, email, tautan sosial, dan konten contoh sebelum dipublikasikan.

## Dashboard admin

Atur `ADMIN_TOKEN` di `.env`, lalu buka `http://localhost:4321/admin`. Dashboard dapat melihat pesan kontak serta membuat, mengubah, dan menghapus post atau karya di SQLite.

Konten publik saat ini tetap bersumber dari Markdown sehingga perubahan dari library database belum otomatis tampil di halaman publik. Untuk workflow produksi, tahap berikutnya adalah memindahkan renderer publik ke database atau membuat proses publish yang mengekspor konten database menjadi Markdown.
