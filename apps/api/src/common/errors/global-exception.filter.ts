import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { DomainException } from './domain.exception';

type ValidationEnvelope = {
  error: {
    type: 'validation_error';
    fields: Record<string, string[]>;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const correlationId = this.getCorrelationId(request);

    response.setHeader('x-correlation-id', correlationId);

    if (exception instanceof DomainException) {
      const details = this.extractDomainDetails(exception.getResponse());
      response.status(HttpStatus.CONFLICT).json({
        error: {
          type: 'domain_error',
          code: exception.code,
          message: this.extractMessage(exception.getResponse()),
          ...(details ? { details } : {}),
        },
      });
      return;
    }

    if (exception instanceof BadRequestException) {
      const payload = this.asValidationEnvelope(exception.getResponse());
      response.status(HttpStatus.BAD_REQUEST).json(payload);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus() as HttpStatus;

      if (
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.FORBIDDEN
      ) {
        response.status(status).json({
          error: {
            type: 'auth_error',
            message:
              status === HttpStatus.UNAUTHORIZED ? 'Unauthorized' : 'Forbidden',
          },
        });
        return;
      }

      if (status === HttpStatus.NOT_FOUND) {
        response.status(status).json({
          error: {
            type: 'not_found',
            message: 'Resource not found',
          },
        });
        return;
      }

      if (status === HttpStatus.NOT_IMPLEMENTED) {
        response.status(status).json({
          error: {
            type: 'not_implemented',
            message:
              this.extractMessage(exception.getResponse()) ?? 'Not implemented',
          },
        });
        return;
      }

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logUnexpectedError(exception, correlationId, request);
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: {
            type: 'unexpected_error',
            message: 'An unexpected error occurred.',
            correlationId,
          },
        });
        return;
      }

      response.status(status).json({
        error: {
          type: 'http_error',
          message: this.extractMessage(exception.getResponse()),
        },
      });
      return;
    }

    this.logUnexpectedError(exception, correlationId, request);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        type: 'unexpected_error',
        message: 'An unexpected error occurred.',
        correlationId,
      },
    });
  }

  private getCorrelationId(request: Request): string {
    const headerValue = request.headers['x-correlation-id'];
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }

    if (Array.isArray(headerValue) && headerValue[0]?.trim().length) {
      return headerValue[0].trim();
    }

    return randomUUID();
  }

  private asValidationEnvelope(payload: unknown): ValidationEnvelope {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'object' &&
      payload.error !== null &&
      'type' in payload.error &&
      payload.error.type === 'validation_error' &&
      'fields' in payload.error
    ) {
      return payload as ValidationEnvelope;
    }

    return {
      error: {
        type: 'validation_error',
        fields: {
          request: [this.extractMessage(payload)],
        },
      },
    };
  }

  private extractMessage(payload: unknown): string {
    if (typeof payload === 'string' && payload.length > 0) {
      return payload;
    }

    if (typeof payload === 'object' && payload !== null) {
      if ('message' in payload) {
        const message = (payload as { message?: unknown }).message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string' && message.length > 0) {
          return message;
        }
      }
    }

    return 'Request failed';
  }

  private extractDomainDetails(
    payload: unknown,
  ): Record<string, unknown> | undefined {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'object' &&
      (payload as { error?: unknown }).error !== null &&
      'details' in ((payload as { error: Record<string, unknown> }).error ?? {})
    ) {
      const details = (
        payload as {
          error: {
            details?: unknown;
          };
        }
      ).error.details;
      if (typeof details === 'object' && details !== null) {
        return details as Record<string, unknown>;
      }
    }

    return undefined;
  }

  private logUnexpectedError(
    exception: unknown,
    correlationId: string,
    request: Request,
  ): void {
    const method = request.method;
    const url = request.originalUrl;
    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `[${correlationId}] ${method} ${url} -> ${message}`,
      stack,
    );
  }
}
