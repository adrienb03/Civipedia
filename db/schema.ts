// db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// This is the 'users' table your 'signup' function will use
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(), // .unique() ensures no two users have the same email
  password: text('password').notNull(), // This will store the *hashed* password
});