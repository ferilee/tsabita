import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

const databaseFile = process.env.DB_FILE_NAME ?? './data/tsabita.sqlite';
mkdirSync(dirname(databaseFile), { recursive: true });

const sqlite = new Database(databaseFile);
sqlite.run('PRAGMA journal_mode = WAL;');

export const db = drizzle({ client: sqlite });

migrate(db, { migrationsFolder: './drizzle' });
