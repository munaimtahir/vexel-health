"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDocumentResponse = toDocumentResponse;
function toDocumentResponse(document) {
    return {
        id: document.id,
        type: document.documentType,
        status: document.status,
        encounterId: document.encounterId,
        payloadHash: document.payloadHash,
        pdfHash: document.pdfHash,
        payloadVersion: document.payloadVersion,
        templateVersion: document.templateVersion,
        createdAt: document.createdAt.toISOString(),
        renderedAt: document.renderedAt ? document.renderedAt.toISOString() : null,
        errorCode: document.errorCode,
        errorMessage: document.errorMessage,
    };
}
//# sourceMappingURL=documents.types.js.map