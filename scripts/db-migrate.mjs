// Aplica database/schema.sql y agrega las columnas nuevas si la base ya
// existía con el esquema viejo de Bolt. Seguro de correr varias veces.
//   npm run db:migrate
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(here, '..', 'database', 'schema.sql'), 'utf8');

// Quita comentarios de línea y separa por ';' (el esquema no usa DELIMITER).
const statements = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

// Columnas que no existían en el esquema viejo de Bolt.
const ENSURE_COLUMNS = [
  ['listings', 'amenities', 'TEXT NULL'],
  ['listings', 'photo_urls', 'LONGTEXT NULL'],
  ['rooms', 'photo_urls', 'LONGTEXT NULL'],
];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  for (const stmt of statements) await conn.query(stmt);
  console.log(`OK: ${statements.length} sentencias del esquema aplicadas.`);

  for (const [table, column, definition] of ENSURE_COLUMNS) {
    const [rows] = await conn.query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, column],
    );
    if (rows.length === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`OK: columna agregada ${table}.${column}`);
    }
  }
  console.log('Migración terminada.');
} finally {
  await conn.end();
}
