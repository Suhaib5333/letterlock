import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * RFC 7807 "problem details" for every HTTP error. Shape:
 *   { type, title, status, detail, instance, errors? }
 * ValidationPipe errors arrive as BadRequestException with a message array; those
 * land in `errors` so the client can show field-level hints.
 */
/** 'TOO_MANY_REQUESTS' -> 'Too Many Requests' */
export function titleOf(status: number): string {
  const raw = HttpStatus[status]?.toString() ?? 'Error';
  return raw
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    // Websocket / RPC contexts never reach here (gateway handles its own errors).
    if (!res || typeof res.status !== 'function') return;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: string[] | undefined;
    let code: string | undefined;
    let extra: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else if (body && typeof body === 'object') {
        const { message, error: _error, statusCode: _sc, code: c, ...rest } = body as {
          message?: string | string[];
          error?: string;
          statusCode?: number;
          code?: string;
          [k: string]: unknown;
        };
        if (Array.isArray(message)) {
          errors = message;
          detail = 'Validation failed';
        } else {
          detail = message;
        }
        code = c;
        extra = rest; // structured hints such as next_allowed_at / retryAfter
      }
      title = titleOf(status);
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack ?? exception.message : String(exception),
      );
    }

    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title,
        status,
        detail,
        instance: req?.originalUrl,
        ...(code ? { code } : {}),
        ...(errors ? { errors } : {}),
        ...extra,
      });
  }
}
