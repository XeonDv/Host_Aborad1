import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

// El secreto es obligatorio: sin él cualquiera podría fabricar sesiones.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET no está configurado (mínimo 32 caracteres). Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  return secret;
}

export function assertAuthConfigured(): void {
  getSecret();
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as TokenPayload;
    return decoded?.userId ? decoded : null;
  } catch {
    return null;
  }
}
