// db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Schéma DB: définition de la table users
// Définit la structure utilisée par les fonctions d'authentification
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(), // .unique() ensures no two users have the same email
  password: text('password').notNull(), // This will store the *hashed* password
});