import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { log } from './trace';
import { authFailuresTotal } from './metrics';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: number;
      ssoToken: string;
    }
  }
}

export function requireSsoAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    authFailuresTotal.inc();
    log(req.traceId ?? 'unknown', 'sso token rejected', { action: 'sso_login_verify', authz_result: 'denied', reason: 'missing_token' });
    res.status(401).json({ error: 'Missing bearer token.' });
    return;
  }

  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) {
    throw new Error('SSO_SHARED_SECRET is not configured.');
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    const userId = Number(typeof payload === 'object' ? payload.sub : undefined);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      throw new Error('Token payload is missing a valid sub claim.');
    }
    req.userId = userId;
    req.ssoToken = token;
    log(req.traceId ?? 'unknown', 'sso token verified', { action: 'sso_login_verify', authz_result: 'allowed', user_id: userId });
    next();
  } catch (err) {
    authFailuresTotal.inc();
    log(req.traceId ?? 'unknown', 'sso token rejected', { action: 'sso_login_verify', authz_result: 'denied', reason: (err as Error).message });
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
