import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type TracePayload = Record<string, unknown>;

const traceFilePath =
  process.env.WORKFLOW_TRACE_FILE?.trim() ||
  resolve(
    process.cwd(),
    '_audit_evidence',
    'workflow_audit',
    'RUNTIME_TRACE.jsonl',
  );

function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    };
  }

  return { message: String(error) };
}

export function writeWorkflowTrace(payload: TracePayload): void {
  try {
    mkdirSync(dirname(traceFilePath), { recursive: true });
    appendFileSync(
      traceFilePath,
      `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`,
      'utf8',
    );
  } catch {
    // Trace writing must never block queue processing.
  }
}

export async function traceSpan<T>(
  input: {
    span: string;
    requestId?: string | null;
    tenantId?: string | null;
    metadata?: TracePayload;
  },
  work: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  writeWorkflowTrace({
    event: 'span.start',
    span: input.span,
    requestId: input.requestId ?? null,
    tenantId: input.tenantId ?? null,
    metadata: input.metadata ?? {},
  });

  try {
    const result = await work();
    writeWorkflowTrace({
      event: 'span.end',
      span: input.span,
      requestId: input.requestId ?? null,
      tenantId: input.tenantId ?? null,
      durationMs: Date.now() - startedAt,
      ok: true,
      metadata: input.metadata ?? {},
    });
    return result;
  } catch (error) {
    writeWorkflowTrace({
      event: 'span.end',
      span: input.span,
      requestId: input.requestId ?? null,
      tenantId: input.tenantId ?? null,
      durationMs: Date.now() - startedAt,
      ok: false,
      metadata: input.metadata ?? {},
      error: formatError(error),
    });
    throw error;
  }
}
