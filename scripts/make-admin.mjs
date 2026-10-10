// Convierte una cuenta existente en administrador. Es la ÚNICA forma de
// crear admins (el registro público ya no lo permite).
//   npm run make-admin -- correo@ejemplo.com
import 'dotenv/config';
import mysql from 'mysql2/promise';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run make-admin -- correo@ejemplo.com');
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  const [users] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (users.length === 0) {
    console.error(`No existe ninguna cuenta con el correo ${email}. Regístrate primero en el sitio.`);
    process.exit(1);
  }
  await conn.query("UPDATE profiles SET user_type = 'admin' WHERE id = ?", [users[0].id]);
  console.log(`Listo: ${email} ahora es administrador.`);
} finally {
  await conn.end();
}
