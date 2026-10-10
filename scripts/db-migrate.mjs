// Aplica el esquema a mano (el servidor ya lo hace solo al arrancar).
//   npm run db:migrate
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { runMigrations } from '../database/migrate.mjs';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  await runMigrations(conn);
  console.log('Migración terminada.');
} finally {
  await conn.end();
}
