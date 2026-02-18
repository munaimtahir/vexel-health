import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [EncountersController],
  providers: [EncountersService],
})
export class EncountersModule {}
