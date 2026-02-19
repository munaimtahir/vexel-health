import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { LabVerificationQueueController } from './lab-verification-queue.controller';
import { LabWorkflowController } from './lab-workflow.controller';
import { LabWorkflowService } from './lab-workflow.service';

@Module({
  imports: [DocumentsModule],
  controllers: [LabWorkflowController, LabVerificationQueueController],
  providers: [LabWorkflowService],
})
export class LabWorkflowModule {}
