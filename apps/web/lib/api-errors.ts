import type { components } from '@vexel/contracts';

export type FieldErrors = Record<string, string[]>;

export type ApiErrorView = {
    message: string;
    fieldErrors: FieldErrors;
};

type DomainErrorEnvelope = components['schemas']['DomainErrorEnvelope'];

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

function asDomainErrorEnvelope(value: unknown): DomainErrorEnvelope | null {
    if (!isRecord(value) || !isRecord(value.error)) {
        return null;
    }

    if (value.error.type !== 'domain_error' || typeof value.error.code !== 'string') {
        return null;
    }

    return value as DomainErrorEnvelope;
}

function formatDomainErrorMessage(envelope: DomainErrorEnvelope): string {
    const message = typeof envelope.error.message === 'string'
        ? envelope.error.message
        : 'Request failed';
    const details = envelope.error.details;

    if (envelope.error.code === 'LAB_RESULTS_INCOMPLETE' && isRecord(details) && Array.isArray(details.missing)) {
        const missingNames = details.missing
            .map((item) => isRecord(item) && typeof item.parameter_name === 'string' ? item.parameter_name : null)
            .filter((item): item is string => Boolean(item));
        if (missingNames.length > 0) {
            return `${message}: ${missingNames.join(', ')}`;
        }
    }

    if (envelope.error.code === 'ENCOUNTER_FINALIZE_BLOCKED_UNVERIFIED_LAB' && isRecord(details) && Array.isArray(details.unverified_order_items)) {
        return `${message} (${details.unverified_order_items.length} unverified order item(s))`;
    }

    if (envelope.error.code === 'LAB_ALREADY_VERIFIED' && isRecord(details)) {
        const verifiedBy = typeof details.verified_by === 'string' ? details.verified_by : null;
        const verifiedAt = typeof details.verified_at === 'string' ? details.verified_at : null;
        if (verifiedBy && verifiedAt) {
            return `${message} (verified by ${verifiedBy} at ${verifiedAt})`;
        }
        if (verifiedBy) {
            return `${message} (verified by ${verifiedBy})`;
        }
    }

    if (envelope.error.code === 'LAB_PUBLISH_BLOCKED_NOT_FINALIZED' && isRecord(details)) {
        const currentStatus = typeof details.current_status === 'string' ? details.current_status : null;
        if (currentStatus) {
            return `${message} (current status: ${currentStatus})`;
        }
    }

    return message;
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
    const domainError = asDomainErrorEnvelope(error);
    const domainMessage = domainError ? formatDomainErrorMessage(domainError) : null;

    return {
        message: domainMessage ?? pickMessage(error, fallback),
        fieldErrors,
    };
}
