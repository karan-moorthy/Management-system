import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Create the connection
const client = postgres(process.env.DATABASE_URL);

// Create and export the database instance
export const db = drizzle(client);
