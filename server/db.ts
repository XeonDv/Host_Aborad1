import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  // DATE/DATETIME llegan como texto (sin sorpresas de zona horaria) y
  // DECIMAL como número, para que el JSON sea el que espera el frontend.
  dateStrings: true,
  decimalNumbers: true,
  timezone: 'Z',
});

// Todas las fechas se guardan en UTC, sin importar la zona del servidor.
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

export default pool;
