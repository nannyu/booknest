import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace(/^file:/, '') ?? './data/booknest.db',
  },
  verbose: true,
  strict: true,
});
