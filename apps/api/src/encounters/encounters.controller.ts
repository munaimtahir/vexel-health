import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { DocumentsService } from '../documents/documents.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { EncountersService } from './encounters.service';

@Controller('encounters')
@UseGuards(TenantGuard)
export class EncountersController {
  constructor(
    private readonly service: EncountersService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  create(@Body() dto: CreateEncounterDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('patientId') patientId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(Number(page) || 1, { patientId, type, status });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id\\:start-prep')
  @HttpCode(HttpStatus.OK)
  startPrep(@Param('id') id: string) {
    return this.service.startPrep(id);
  }

  @Post(':id\\:start-main')
  @HttpCode(HttpStatus.OK)
  startMain(@Param('id') id: string) {
    return this.service.startMain(id);
  }

  @Post(':id\\:finalize')
  @HttpCode(HttpStatus.OK)
  finalize(@Param('id') id: string) {
    return this.service.finalize(id);
  }

  @Post(':id\\:document')
  @HttpCode(HttpStatus.OK)
  createDocument(@Param('id') id: string) {
    return this.documentsService.queueEncounterDocument(id);
  }
}
