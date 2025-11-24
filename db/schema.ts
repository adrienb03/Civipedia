// db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Schéma DB: définition de la table users
// Définit la structure utilisée par les fonctions d'authentification
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Nouveau champs pour stocker prénom / nom séparés et pseudo
  // Ces colonnes sont ajoutées en tant que TEXT (nullable) pour
  // faciliter la compatibilité avec les bases existantes.
  pseudo: text('pseudo'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  email: text('email').notNull().unique(), // .unique() ensures no two users have the same email
  password: text('password').notNull(), // This will store the *hashed* password
  phone: text('phone'),
  organization: text('organization'),
});