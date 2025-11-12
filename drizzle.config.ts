// drizzle.config.ts

import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',   // Points to your schema file
  out: './drizzle',
  dialect: 'sqlite',// Where to put migration files   // We are using SQLite
  dbCredentials: {
    url: 'local.db',       // This will be the name of your database file!
  },
} satisfies Config;