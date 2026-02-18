import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('patients')
@UseGuards(TenantGuard)
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('page') page: number = 1, @Query('query') query = '') {
    return this.service.findAll(Number(page) || 1, query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
