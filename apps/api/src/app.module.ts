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
    MeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
