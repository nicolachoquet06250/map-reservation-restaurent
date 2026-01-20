import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '~~/server/database/schema';

let db: MySql2Database<typeof schema> | null = null;
let pool: mysql.Pool | null = null;

export const useDb = () => {
  if (db) return db;

  const config = useRuntimeConfig();
  
  pool = mysql.createPool({
    host: config.dbHost || 'localhost',
    user: config.dbUser || 'root',
    password: config.dbPassword || '',
    database: config.dbDatabase || 'restaurant_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  db = drizzle(pool, { schema, mode: 'default' });
  return db;
};
