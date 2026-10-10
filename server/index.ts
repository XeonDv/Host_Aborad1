import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profiles';
import listingRoutes from './routes/listings';
import bookingRoutes from './routes/bookings';
import adminRoutes from './routes/admin';
import paymentRoutes, { stripeWebhook } from './routes/payments';
import { assertAuthConfigured } from './auth';
import pool, { testConnection } from './db';
import { runMigrations } from '../database/migrate.mjs';

assertAuthConfigured(); // falla al arrancar si falta JWT_SECRET

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Detrás del proxy de Hostinger/Nginx: así req.ip es la IP real del visitante.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// El sitio y el API salen del mismo dominio, así que CORS solo se necesita si
// el frontend vive en otro origen (CORS_ORIGIN="https://hostabroad.ca,https://www.hostabroad.ca").
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
if (allowedOrigins.length > 0) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
}

// El webhook de Stripe necesita el cuerpo SIN parsear para verificar la firma.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '200kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err: unknown) {
    console.error('Health check failed:', err); // el detalle queda en los logs, no en la respuesta pública
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// En producción el mismo servidor entrega el sitio ya compilado (carpeta dist).
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

async function main() {
  // Deja la base lista (solo agrega tablas/columnas que falten). Si falla, el sitio
  // arranca igual y el motivo queda en los logs; /api/health mostrará si hay conexión.
  try {
    await runMigrations(pool);
  } catch (err) {
    console.error('Migration failed (the server will start anyway):', err);
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main();
