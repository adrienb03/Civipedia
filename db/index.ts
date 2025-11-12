// db/index.ts

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema'; // Import your schema

// Create a connection to the database file
const sqlite = new Database('local.db');

// This is the 'db' object you use in your server actions!
export const db = drizzle(sqlite, { schema });