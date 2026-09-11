import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const contactMessages = sqliteTable('contact_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: text('created_at').notNull()
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  body: text('body').notNull(),
  category: text('category').notNull(),
  readingTime: text('reading_time').notNull().default('5 menit'),
  status: text('status').notNull().default('draft'),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  publishedAt: text('published_at'),
  updatedAt: text('updated_at').notNull()
});

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  body: text('body').notNull(),
  year: integer('year').notNull(),
  role: text('role').notNull(),
  category: text('category').notNull(),
  coverImage: text('cover_image'),
  updatedAt: text('updated_at').notNull()
});
