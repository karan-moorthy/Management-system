import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Create the connection with optimized pooling settings for 1000+ users
const client = postgres(process.env.DATABASE_URL, {
  max: 20,          // Maximum number of connections in the pool (reduced to prevent "too many clients" error)
  idle_timeout: 10, // Close idle connections after 10 seconds (more aggressive)
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false,   // Disable prepared statements for better performance with dynamic queries
  max_lifetime: 60 * 10, // Max connection lifetime: 10 minutes (prevents stale connections)
  onnotice: () => {}, // Suppress notices
});

// Create and export the database instance
export const db = drizzle(client, { schema });
