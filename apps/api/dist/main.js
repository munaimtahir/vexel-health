"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const global_exception_filter_1 = require("./common/errors/global-exception.filter");
const validation_errors_1 = require("./common/errors/validation-errors");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        exceptionFactory: (errors) => new common_1.BadRequestException({
            error: {
                type: 'validation_error',
                fields: (0, validation_errors_1.toValidationFieldMap)(errors),
            },
        }),
    }));
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    await app.listen(3000);
}
void bootstrap();
//# sourceMappingURL=main.js.map