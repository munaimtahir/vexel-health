export type FieldErrors = Record<string, string[]>;

export type ApiErrorView = {
    message: string;
    fieldErrors: FieldErrors;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function toMessageArray(value: unknown): string[] {
    if (typeof value === 'string' && value.trim().length > 0) {
        return [value.trim()];
    }

    if (Array.isArray(value)) {
        return value
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim());
    }

    return [];
}

function normalizeFieldErrors(value: unknown): FieldErrors {
    if (!isRecord(value)) {
        return {};
    }

    const result: FieldErrors = {};

    for (const [field, messages] of Object.entries(value)) {
        const parsed = toMessageArray(messages);
        if (parsed.length > 0) {
            result[field] = parsed;
        }
    }

    return result;
}

function pickMessage(source: Record<string, unknown>, fallback: string): string {
    const envelopeMessage = isRecord(source.error) ? toMessageArray(source.error.message) : [];
    const directMessage = toMessageArray(source.message);
    const nestedDetail = toMessageArray(source.detail);

    const candidates = [...envelopeMessage, ...directMessage, ...nestedDetail];
    const specific = candidates.find((candidate) => candidate.toLowerCase() !== 'internal server error');

    return specific ?? candidates[0] ?? fallback;
}

export function parseApiError(error: unknown, fallback = 'Request failed'): ApiErrorView {
    if (!isRecord(error)) {
        return {
            message: fallback,
            fieldErrors: {},
        };
    }

    const envelopeFields = isRecord(error.error) ? normalizeFieldErrors(error.error.fields) : {};
    const rootFields = normalizeFieldErrors(error.fields);
    const fieldErrors = Object.keys(envelopeFields).length > 0 ? envelopeFields : rootFields;

    return {
        message: pickMessage(error, fallback),
        fieldErrors,
    };
}
