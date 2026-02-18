"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const domain_exception_1 = require("./domain.exception");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const correlationId = this.getCorrelationId(request);
        response.setHeader('x-correlation-id', correlationId);
        if (exception instanceof domain_exception_1.DomainException) {
            response.status(common_1.HttpStatus.CONFLICT).json({
                error: {
                    type: 'domain_error',
                    code: exception.code,
                    message: this.extractMessage(exception.getResponse()),
                },
            });
            return;
        }
        if (exception instanceof common_1.BadRequestException) {
            const payload = this.asValidationEnvelope(exception.getResponse());
            response.status(common_1.HttpStatus.BAD_REQUEST).json(payload);
            return;
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            if (status === common_1.HttpStatus.UNAUTHORIZED ||
                status === common_1.HttpStatus.FORBIDDEN) {
                response.status(status).json({
                    error: {
                        type: 'auth_error',
                        message: status === common_1.HttpStatus.UNAUTHORIZED ? 'Unauthorized' : 'Forbidden',
                    },
                });
                return;
            }
            if (status === common_1.HttpStatus.NOT_FOUND) {
                response.status(status).json({
                    error: {
                        type: 'not_found',
                        message: 'Resource not found',
                    },
                });
                return;
            }
            if (status === common_1.HttpStatus.NOT_IMPLEMENTED) {
                response.status(status).json({
                    error: {
                        type: 'not_implemented',
                        message: this.extractMessage(exception.getResponse()) ?? 'Not implemented',
                    },
                });
                return;
            }
            if (status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
                this.logUnexpectedError(exception, correlationId, request);
                response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
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
        response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: {
                type: 'unexpected_error',
                message: 'An unexpected error occurred.',
                correlationId,
            },
        });
    }
    getCorrelationId(request) {
        const headerValue = request.headers['x-correlation-id'];
        if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
            return headerValue.trim();
        }
        if (Array.isArray(headerValue) && headerValue[0]?.trim().length) {
            return headerValue[0].trim();
        }
        return (0, crypto_1.randomUUID)();
    }
    asValidationEnvelope(payload) {
        if (typeof payload === 'object' &&
            payload !== null &&
            'error' in payload &&
            typeof payload.error === 'object' &&
            payload.error !== null &&
            'type' in payload.error &&
            payload.error.type === 'validation_error' &&
            'fields' in payload.error) {
            return payload;
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
    extractMessage(payload) {
        if (typeof payload === 'string' && payload.length > 0) {
            return payload;
        }
        if (typeof payload === 'object' && payload !== null) {
            if ('message' in payload) {
                const message = payload.message;
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
    logUnexpectedError(exception, correlationId, request) {
        const method = request.method;
        const url = request.originalUrl;
        const message = exception instanceof Error ? exception.message : String(exception);
        const stack = exception instanceof Error ? exception.stack : undefined;
        this.logger.error(`[${correlationId}] ${method} ${url} -> ${message}`, stack);
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map