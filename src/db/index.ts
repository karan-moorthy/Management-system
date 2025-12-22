import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Create the connection with optimized pooling settings
// Note: Connections are REUSED among all users - 10 connections can serve 10,000+ users
// Each query only holds a connection for milliseconds, then releases it for the next user
const client = postgres(process.env.DATABASE_URL, {
  max: process.env.NODE_ENV === 'production' ? 15 : 5,  // Production: 15 connections, Dev: 5 (enough for 10K users)
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false,   // Disable prepared statements for better performance with dynamic queries
  max_lifetime: 60 * 5, // Max connection lifetime: 5 minutes (prevents stale connections)
  onnotice: () => {}, // Suppress notices
});

// Create and export the database instance
export const db = drizzle(client, { schema });
