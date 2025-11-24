// drizzle.config.ts

import type { Config } from 'drizzle-kit';

// Configuration Drizzle ORM
// Fichier de configuration pour Drizzle et la base SQLite locale
export default {
  schema: './db/schema.ts',   // Points to your schema file
  out: './drizzle',
  dialect: 'sqlite', // We are using SQLite
  dbCredentials: {
    url: 'local.db', // Nom du fichier DB local
  },
} satisfies Config;