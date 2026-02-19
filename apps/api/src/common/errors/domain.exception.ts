import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  public readonly details?: Record<string, unknown>;

  constructor(
    public readonly code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    const errorPayload: {
      error: {
        type: 'domain_error';
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
    } = {
      error: {
        type: 'domain_error',
        code,
        message,
      },
    };

    if (details && Object.keys(details).length > 0) {
      errorPayload.error.details = details;
    }

    super(
      errorPayload,
      HttpStatus.CONFLICT,
    );
    this.details = details;
  }
}
