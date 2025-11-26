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

// Table pour stocker les compteurs de requêtes des utilisateurs anonymes
export const anon_counters = sqliteTable('anon_counters', {
  id: text('id').primaryKey(), // id issu d'un cookie `anon_id`
  count: integer('count').notNull().default(0),
  updated_at: integer('updated_at').notNull().default(0), // timestamp ms
});

// Table pour stocker les tokens de réinitialisation de mot de passe (email)
export const password_reset_tokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull(),
  token_hash: text('token_hash').notNull(),
  expires_at: integer('expires_at').notNull(),
  used: integer('used').notNull().default(0),
  created_at: integer('created_at').notNull().default(() => Date.now()),
});

// Table pour logger les demandes de reset (rate-limiting)
export const reset_request_logs = sqliteTable('reset_request_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  identifier: text('identifier'), // email ou phone
  ip: text('ip'),
  created_at: integer('created_at').notNull().default(() => Date.now()),
});