"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toValidationFieldMap = toValidationFieldMap;
function toValidationFieldMap(errors, parentPath = '', fieldMap = {}) {
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
//# sourceMappingURL=validation-errors.js.map