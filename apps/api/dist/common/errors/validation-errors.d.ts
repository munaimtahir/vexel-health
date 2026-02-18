import { ValidationError } from 'class-validator';
export declare function toValidationFieldMap(errors: ValidationError[], parentPath?: string, fieldMap?: Record<string, string[]>): Record<string, string[]>;
