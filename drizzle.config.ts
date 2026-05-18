// drizzle.config.ts
// Drizzle ORM configuration for Replit's built-in PostgreSQL database
// DATABASE_URL is auto-injected by Replit — do not set it manually

import type { Config } from 'drizzle-kit'

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Verbose logging in development
  verbose: process.env.NODE_ENV === 'development',
  strict: true,
} satisfies Config
