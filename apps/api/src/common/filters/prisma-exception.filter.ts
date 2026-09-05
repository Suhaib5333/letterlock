import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { titleOf } from './problem.filter';

function problem(res: Response, req: Request, status: number, detail: string, code?: string) {
  res
    .status(status)
    .type('application/problem+json')
    .json({
      type: 'about:blank',
      title: titleOf(status),
      status,
      detail,
      instance: req?.originalUrl,
      ...(code ? { code } : {}),
    });
}

/** Known Prisma errors mapped to HTTP statuses (copied from the palmandplate filter). */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (!res || typeof res.status !== 'function') return;

    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ') || 'field';
        return problem(res, req, HttpStatus.CONFLICT, `A record with this ${target} already exists`, 'unique_violation');
      }
      case 'P2025':
        return problem(res, req, HttpStatus.NOT_FOUND, 'Record not found', 'not_found');
      case 'P2003':
        return problem(res, req, HttpStatus.BAD_REQUEST, 'Invalid reference: related record does not exist', 'fk_violation');
      case 'P2022':
        return problem(res, req, HttpStatus.SERVICE_UNAVAILABLE, 'Database schema is out of sync', 'schema_drift');
      default:
        this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
        return problem(res, req, HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected database error');
    }
  }
}

@Catch(Prisma.PrismaClientInitializationError)
export class PrismaInitFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaInitFilter.name);

  catch(exception: Prisma.PrismaClientInitializationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (!res || typeof res.status !== 'function') return;
    this.logger.error(`Database connection failed: ${exception.message}`);
    problem(res, req, HttpStatus.SERVICE_UNAVAILABLE, 'Database is temporarily unavailable', 'db_unavailable');
  }
}
