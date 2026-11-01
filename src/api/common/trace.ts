import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      traceId: string;
    }
  }
}

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const traceId = req.header('x-trace-id') || randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
}

const APP_VERSION = process.env.npm_package_version ?? 'unknown';

export function log(
  traceId: string,
  message: string,
  extra?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: 'backend',
    trace_id: traceId,
    app_version: APP_VERSION,
    message,
    ...extra,
  };
  const line = JSON.stringify(record);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
