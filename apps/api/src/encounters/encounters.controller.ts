import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { EncountersService } from './encounters.service';

@Controller('encounters')
@UseGuards(TenantGuard)
export class EncountersController {
  constructor(private readonly service: EncountersService) {}

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
  startPrep(@Param('id') id: string) {
    return this.service.startPrep(id);
  }

  @Post(':id\\:start-main')
  startMain(@Param('id') id: string) {
    return this.service.startMain(id);
  }

  @Post(':id\\:finalize')
  finalize(@Param('id') id: string) {
    return this.service.finalize(id);
  }

  @Post(':id\\:document')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createDocument(@Param('id') id: string) {
    throw new NotImplementedException(
      `Encounter document command is deferred for encounter ${id}`,
    );
  }
}
