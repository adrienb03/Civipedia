// db/index.ts

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import * as schema from './schema'; // Import your schema

// Allow overriding DB path via env var for different environments
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'local.db');

// Create a connection to the database file
const sqlite = new Database(DB_PATH);

// This is the 'db' object you use in your server actions!
export const db = drizzle(sqlite, { schema });