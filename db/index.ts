// db/index.ts

// DB: connexion SQLite via better-sqlite3 et Drizzle
// Fonction pour initialiser la base de données et l'exporter
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import * as schema from './schema'; // Import your schema

// Allow overriding DB path via env var for different environments
// Cela permet d'utiliser un fichier DB différent en CI / dev / prod
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'local.db');

// Create a connection to the database file
// `better-sqlite3` ouvre le fichier et maintient la connexion en mémoire
const sqlite = new Database(DB_PATH);

// This is the 'db' object you use in your server actions!
// Drizzle enveloppe la connexion pour fournir l'API ORM
export const db = drizzle(sqlite, { schema });