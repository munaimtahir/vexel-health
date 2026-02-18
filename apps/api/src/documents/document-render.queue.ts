import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

export const DOCUMENT_RENDER_QUEUE = Symbol('DOCUMENT_RENDER_QUEUE');
export const DOCUMENT_RENDER_QUEUE_NAME = 'document-render-queue';

export type DocumentRenderJobPayload = {
  tenantId: string;
  documentId: string;
};

export interface DocumentRenderQueue {
  enqueueDocumentRender(payload: DocumentRenderJobPayload): Promise<void>;
}

@Injectable()
export class BullMqDocumentRenderQueue
  implements DocumentRenderQueue, OnModuleDestroy
{
  private queue: Queue<DocumentRenderJobPayload> | null = null;

  private getQueue(): Queue<DocumentRenderJobPayload> {
    if (this.queue) {
      return this.queue;
    }

    this.queue = new Queue<DocumentRenderJobPayload>(DOCUMENT_RENDER_QUEUE_NAME, {
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    });

    return this.queue;
  }

  async enqueueDocumentRender(payload: DocumentRenderJobPayload): Promise<void> {
    await this.getQueue().add('DOCUMENT_RENDER', payload, {
      jobId: `${payload.tenantId}__${payload.documentId}`,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
