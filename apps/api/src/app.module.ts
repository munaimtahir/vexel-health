import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DocumentsModule } from './documents/documents.module';
import { MeModule } from './me/me.module';
import { ClsModule } from 'nestjs-cls';
import { EncountersModule } from './encounters/encounters.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestTraceInterceptor } from './common/observability/request-trace.interceptor';
import { LabCatalogModule } from './lab-catalog/lab-catalog.module';
import { LabWorkflowModule } from './lab-workflow/lab-workflow.module';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    PrismaModule,
    TenancyModule,
    AuthModule,
    PatientsModule,
    EncountersModule,
    DocumentsModule,
    LabCatalogModule,
    LabWorkflowModule,
    MeModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PermissionsGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTraceInterceptor,
    },
  ],
})
export class AppModule {}
