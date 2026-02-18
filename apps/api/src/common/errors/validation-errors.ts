import { ValidationError } from 'class-validator';

export function toValidationFieldMap(
  errors: ValidationError[],
  parentPath = '',
  fieldMap: Record<string, string[]> = {},
): Record<string, string[]> {
  for (const error of errors) {
    const fieldPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      fieldMap[fieldPath] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      toValidationFieldMap(error.children, fieldPath, fieldMap);
    }
  }

  if (Object.keys(fieldMap).length === 0) {
    fieldMap.request = ['Invalid request payload'];
  }

  return fieldMap;
}
