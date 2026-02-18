import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(
      {
        error: {
          type: 'domain_error',
          code,
          message,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}
