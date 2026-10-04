import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

// Query parameters whose values must never reach the logs.
const SENSITIVE_PARAM = /token|password|secret|key|authorization/i;

// Path plus query string, with sensitive query values masked.
function safeUrl(originalUrl: string): string {
  const [path, query] = originalUrl.split('?');
  if (!query) return path;

  const params = new URLSearchParams(query);
  for (const key of Array.from(params.keys())) {
    if (SENSITIVE_PARAM.test(key)) params.set(key, '***');
  }
  return `${path}?${params.toString()}`;
}

interface HttpLoggerOptions {
  // Platforms ping "GET /" for health checks every few seconds; skipped by default.
  logHealthChecks?: boolean;
}

/**
 * Logs one line per request when the response finishes:
 *   GET /api/auth/me 200 12ms user=<id> ip=1.2.3.4 origin=https://app.example.com
 *
 * Request bodies and headers are never logged (they contain passwords and tokens).
 * Responses are logged at LOG for 1xx-3xx, WARN for 4xx and ERROR for 5xx. A request
 * whose client disconnected before a response was sent is logged as "aborted".
 */
export function httpLogger(options: HttpLoggerOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const isHealthCheck = req.method === 'GET' && req.originalUrl === '/';
    if (isHealthCheck && !options.logHealthChecks) {
      next();
      return;
    }

    const start = process.hrtime.bigint();
    let logged = false;

    const write = (aborted: boolean) => {
      if (logged) return;
      logged = true;

      const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
      const status = res.statusCode;
      const user = (req as Request & { user?: { userId?: string } }).user?.userId;
      const origin = req.headers.origin;

      const line = [
        `${req.method} ${safeUrl(req.originalUrl)}`,
        aborted ? 'aborted' : status,
        `${ms.toFixed(0)}ms`,
        `user=${user ?? '-'}`,
        `ip=${req.ip ?? '-'}`,
        origin ? `origin=${origin}` : '',
      ]
        .filter((part) => part !== '')
        .join(' ');

      if (aborted || status >= 500) logger.error(line);
      else if (status >= 400) logger.warn(line);
      else logger.log(line);
    };

    res.on('finish', () => write(false));
    // "close" without "finish" means the client went away mid-request.
    res.on('close', () => write(!res.writableFinished));

    next();
  };
}
