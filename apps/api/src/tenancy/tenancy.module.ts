import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClsModule } from 'nestjs-cls';
import { TenantContextMiddleware } from './tenant-context.middleware';

@Module({
    imports: [PrismaModule, ClsModule], // Need ClsModule
    providers: [TenancyService],
    exports: [TenancyService],
})
export class TenancyModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantContextMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
