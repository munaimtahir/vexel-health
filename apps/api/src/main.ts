import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { toValidationFieldMap } from './common/errors/validation-errors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          error: {
            type: 'validation_error',
            field_errors: toValidationFieldMap(errors),
          },
        }),
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(3000);
}
void bootstrap();
