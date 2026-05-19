import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  '../db/migrations',
);

export async function setupMemoryDb(): Promise<{
  closeDb: () => void;
  getDb: typeof import('../db/client.js').getDb;
}> {
  process.env.DATABASE_URL = ':memory:';
  const client = await import('../db/client.js');
  client.closeDb();
  migrate(client.getDb(), { migrationsFolder });
  return client;
}
