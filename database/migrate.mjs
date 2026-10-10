// Aplica database/schema.sql y agrega las columnas nuevas si la base ya
// existía con el esquema viejo de Bolt. Solo AGREGA: nunca borra ni modifica datos.
// Lo usan el servidor (al arrancar) y `npm run db:migrate`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Columnas que no existían en el esquema viejo de Bolt.
const ENSURE_COLUMNS = [
  ['listings', 'amenities', 'TEXT NULL'],
  ['listings', 'photo_urls', 'LONGTEXT NULL'],
  ['rooms', 'photo_urls', 'LONGTEXT NULL'],
];

function readSchema() {
  // Funciona tanto desde el código fuente como desde el servidor ya compilado (dist/).
  const candidates = [
    path.resolve(process.cwd(), 'database', 'schema.sql'),
    path.resolve(here, 'schema.sql'),
    path.resolve(here, '..', 'database', 'schema.sql'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }
  throw new Error(`No se encontró database/schema.sql (busqué en: ${candidates.join(', ')})`);
}

// `db` es cualquier objeto con .query(sql, params) (pool o conexión de mysql2/promise).
export async function runMigrations(db, log = console.log) {
  const statements = readSchema()
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) await db.query(stmt);
  log(`Base de datos: ${statements.length} sentencias del esquema aplicadas.`);

  for (const [table, column, definition] of ENSURE_COLUMNS) {
    const [rows] = await db.query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, column],
    );
    if (rows.length === 0) {
      await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      log(`Base de datos: columna agregada ${table}.${column}`);
    }
  }
}
