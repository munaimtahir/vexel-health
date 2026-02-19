import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClsService } from 'nestjs-cls';
import { catchError, tap, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { writeWorkflowTrace } from './workflow-trace';

type TraceRequest = Request & {
  tenantId?: string;
  requestId?: string;
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Injectable()
export class RequestTraceInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<TraceRequest>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const requestId =
      this.cls.get<string>('REQUEST_ID') ?? request.requestId ?? randomUUID();
    const tenantId =
      this.cls.get<string>('TENANT_ID') ?? request.tenantId ?? null;
    const userId =
      request.user?.id ?? request.user?.userId ?? request.user?.sub ?? null;
    const viewFunction = `${context.getClass().name}.${context.getHandler().name}`;

    if (!this.cls.get<string>('REQUEST_ID')) {
      this.cls.set('REQUEST_ID', requestId);
    }

    return next.handle().pipe(
      tap(() => {
        writeWorkflowTrace({
          event: 'http.request.completed',
          requestId,
          tenantId,
          userId,
          endpoint: `${request.method} ${request.originalUrl ?? request.url}`,
          method: request.method,
          path: request.originalUrl ?? request.url,
          viewFunction,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          ok: true,
        });
      }),
      catchError((error: unknown) => {
        writeWorkflowTrace({
          event: 'http.request.completed',
          requestId,
          tenantId,
          userId,
          endpoint: `${request.method} ${request.originalUrl ?? request.url}`,
          method: request.method,
          path: request.originalUrl ?? request.url,
          viewFunction,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          ok: false,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: String(error) },
        });
        return throwError(() => error);
      }),
    );
  }
}
