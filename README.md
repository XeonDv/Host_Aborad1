# HostAbroad.ca

Plataforma que conecta estudiantes internacionales con familias anfitrionas en Canadá.

- **Frontend:** React + Vite + Tailwind (`src/`)
- **Backend:** Node + Express (`server/`) con MySQL de Hostinger
- **Pagos:** Stripe Checkout para la cuota de registro del estudiante (`server/routes/payments.ts`)

El servidor Express entrega tanto el API (`/api/...`) como el sitio ya compilado, así que todo corre en un solo proceso.

## Variables de entorno

Copia `.env.example` a `.env` (local) o cárgalas en el panel de Hostinger (producción).
`JWT_SECRET` es **obligatorio** (mínimo 32 caracteres): el servidor no arranca sin él.

## Desarrollo local

```bash
npm install
cp .env.example .env     # llena DB_* y JWT_SECRET
npm run db:migrate       # crea/actualiza las tablas
npm run dev:all          # API en :3001 + sitio en :5173
```

Para probar el registro de estudiantes sin Stripe, agrega `ALLOW_FAKE_PAYMENTS=true` al `.env`
(se ignora en producción).

## Base de datos

- Esquema: `database/schema.sql`. Se aplica con `npm run db:migrate` (se puede correr las veces que sea).
- Crear un administrador (el registro público ya **no** permite elegir "admin"):
  1. Regístrate normalmente en el sitio.
  2. Corre `npm run make-admin -- tu-correo@ejemplo.com`.

## Despliegue en Hostinger

Requiere un plan con **Node.js Web Apps** (Business, Cloud o VPS). El hosting compartido básico no ejecuta Node.

1. hPanel → Sitios web → Agregar sitio web → **Aplicación web Node.js**, conectada a este repositorio de GitHub.
2. Versión de Node: 20 o 22. Build: `npm install && npm run build`. Start: `npm start`.
3. Variables de entorno: las de `.env.example` (`DB_HOST` suele ser `localhost` cuando la base está en la misma cuenta).
4. No hace falta correr la migración a mano: el servidor aplica `database/schema.sql` en cada arranque (solo crea lo que falte, nunca borra datos).
5. **Importante:** la app debe publicarse como aplicación Node/Express (comando `npm run build` y entrada `dist/server.js`), no como sitio estático de Vite; si no, `/api` no existe y el registro no puede funcionar.
6. Comprueba que `https://hostabroad.ca/api/health` responda `{"status":"ok","database":"connected"}`.

### Stripe

1. Crea la cuenta en Stripe y copia la clave secreta a `STRIPE_SECRET_KEY`.
2. En Stripe → Developers → Webhooks agrega el endpoint `https://hostabroad.ca/api/payments/webhook`
   con el evento `checkout.session.completed` y copia el secreto a `STRIPE_WEBHOOK_SECRET`.
3. El monto se controla con `REGISTRATION_FEE_CAD` (95 por defecto).
   El texto de la pantalla de pago usa la constante `REGISTRATION_FEE` de `src/pages/Registration.tsx`; mantén ambos iguales.

## Reglas de seguridad que aplica el servidor

- Solo se puede registrar como `student` o `host`; los admin se crean únicamente con `make-admin`.
- `registration_paid` solo lo cambia el servidor después de verificar el pago con Stripe.
- El rol se lee de la base de datos en cada petición (no del token).
- Los estudiantes no ven homestays ni pueden reservar hasta pagar la cuota.
- El total de cada reserva lo calcula el servidor con el precio real de la habitación.
- Límite de intentos en login/registro y contraseñas de 8+ caracteres.
