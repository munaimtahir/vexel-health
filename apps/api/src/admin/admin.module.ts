import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { BusinessConfigController } from './business-config.controller';
import { BusinessConfigService } from './business-config.service';

@Module({
  imports: [PrismaModule, ClsModule],
  controllers: [
    AdminController,
    AdminUsersController,
    BusinessConfigController,
  ],
  providers: [AdminService, AdminUsersService, BusinessConfigService],
})
export class AdminModule {}
