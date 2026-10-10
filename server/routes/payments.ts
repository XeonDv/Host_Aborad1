import { Router, type Request, type Response } from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware';

// Pago de la cuota de registro. Habla con la API REST de Stripe directamente
// (sin SDK). Flujo: el estudiante paga en Stripe Checkout, y el servidor marca
// registration_paid SOLO después de comprobar con Stripe que el pago existe.
//   Variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL, REGISTRATION_FEE_CAD

const STRIPE_API = 'https://api.stripe.com/v1';

function feeCents(): number {
  const fee = Number(process.env.REGISTRATION_FEE_CAD || 95);
  return Math.round((Number.isFinite(fee) && fee > 0 ? fee : 95) * 100);
}

function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function stripeRequest(path: string, init: { method?: string; form?: URLSearchParams } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_NOT_CONFIGURED');
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init.form,
  });
  const body = (await response.json()) as Record<string, any>;
  if (!response.ok) {
    throw new Error(`Stripe error: ${body?.error?.message ?? response.status}`);
  }
  return body;
}

// Marca el pago de forma idempotente (el webhook y /confirm pueden llegar los dos).
async function markRegistrationPaid(userId: string, sessionId: string, amountCents: number) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT IGNORE INTO payments (id, user_id, kind, stripe_session_id, amount, currency)
       VALUES (?, ?, 'registration_fee', ?, ?, 'cad')`,
      [randomUUID(), userId, sessionId, amountCents / 100],
    );
    await conn.query(
      `UPDATE profiles
          SET registration_paid = 1,
              registration_fee_paid_at = COALESCE(registration_fee_paid_at, UTC_TIMESTAMP())
        WHERE id = ? AND user_type = 'student'`,
      [userId],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
}

function sessionIsValidPayment(session: Record<string, any>, userId?: string): boolean {
  return (
    session.payment_status === 'paid' &&
    session.currency === 'cad' &&
    session.amount_total === feeCents() &&
    typeof session.client_reference_id === 'string' &&
    (userId === undefined || session.client_reference_id === userId)
  );
}

const router = Router();

// Webhook de Stripe (el cuerpo llega crudo; ver server/index.ts)
export async function stripeWebhook(req: Request, res: Response) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const header = req.headers['stripe-signature'];
  if (!secret || typeof header !== 'string' || !Buffer.isBuffer(req.body)) {
    return res.status(400).send('Webhook not configured');
  }

  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i), kv.slice(i + 1)];
    }),
  ) as Record<string, string>;
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return res.status(400).send('Invalid signature');
  }
  const expected = createHmac('sha256', secret).update(`${parts.t}.${req.body.toString('utf8')}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(400).send('Invalid signature');
  }

  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Record<string, any>;
      if (sessionIsValidPayment(session)) {
        await markRegistrationPaid(session.client_reference_id, session.id, session.amount_total);
      }
    }
    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook failed:', err);
    return res.status(500).send('Webhook handler failed');
  }
}

// El estudiante inicia el pago
router.post('/registration/checkout', requireAuth, requireRole('student'), async (req: Request, res: Response) => {
  if (req.auth!.registrationPaid) {
    return res.json({ data: { alreadyPaid: true } });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // Solo para desarrollo local; nunca en producción.
    if (process.env.ALLOW_FAKE_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production') {
      await markRegistrationPaid(req.auth!.userId, `dev_${randomUUID()}`, feeCents());
      return res.json({ data: { alreadyPaid: true } });
    }
    return res.status(503).json({ error: 'Online payments are not available yet. Please contact support.' });
  }

  try {
    const form = new URLSearchParams({
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][unit_amount]': String(feeCents()),
      'line_items[0][price_data][product_data][name]': 'HostAbroad registration fee',
      client_reference_id: req.auth!.userId,
      customer_email: req.auth!.email,
      success_url: `${appUrl()}/register?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/register?canceled=1`,
    });
    const session = await stripeRequest('/checkout/sessions', { method: 'POST', form });
    return res.json({ data: { url: session.url as string } });
  } catch (err) {
    console.error('Create checkout failed:', err);
    return res.status(502).json({ error: 'Could not start the payment. Please try again.' });
  }
});

// Al volver de Stripe: confirmamos con Stripe (no confiamos en el navegador)
router.post('/registration/confirm', requireAuth, requireRole('student'), async (req: Request, res: Response) => {
  const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id : '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid payment session.' });
  }
  try {
    const session = await stripeRequest(`/checkout/sessions/${sessionId}`);
    if (!sessionIsValidPayment(session, req.auth!.userId)) {
      return res.status(402).json({ error: 'We could not confirm this payment yet.' });
    }
    await markRegistrationPaid(req.auth!.userId, session.id, session.amount_total);
    return res.json({ data: { paid: true } });
  } catch (err) {
    console.error('Confirm payment failed:', err);
    return res.status(502).json({ error: 'Could not confirm the payment. If you were charged, contact support.' });
  }
});

export default router;
