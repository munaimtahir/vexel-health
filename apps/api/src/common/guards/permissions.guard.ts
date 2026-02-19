import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { parseMockBearerTokenHeader } from '../auth/mock-token.util';
import {
  REQUIRED_PERMISSIONS_METADATA_KEY,
} from '../decorators/require-permissions.decorator';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    tenantId: string;
    permissions: string[];
  };
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        REQUIRED_PERMISSIONS_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const claims = parseMockBearerTokenHeader(request.headers.authorization);
    if (!claims) {
      throw new ForbiddenException('Permission denied');
    }

    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId || claims.tenantId !== tenantId) {
      throw new ForbiddenException('Permission denied');
    }

    const claimedPermissions = new Set(claims.permissions);
    if (this.hasAllRequiredPermissions(claimedPermissions, requiredPermissions)) {
      this.bindUserContext(request, claims.userId, claims.tenantId, claims.permissions);
      return true;
    }

    const dbPermissions = await this.lookupUserPermissionsFromRoleMappings(
      claims.userId,
      tenantId,
    );
    if (!this.hasAllRequiredPermissions(new Set(dbPermissions), requiredPermissions)) {
      throw new ForbiddenException('Permission denied');
    }

    this.bindUserContext(request, claims.userId, claims.tenantId, dbPermissions);
    return true;
  }

  private hasAllRequiredPermissions(
    available: Set<string>,
    required: string[],
  ): boolean {
    return required.every((permission) => available.has(permission));
  }

  private bindUserContext(
    request: AuthenticatedRequest,
    userId: string,
    tenantId: string,
    permissions: string[],
  ): void {
    this.cls.set('USER_ID', userId);
    this.cls.set('USER_SUB', userId);
    this.cls.set('USER_PERMISSIONS', permissions);
    request.user = {
      id: userId,
      tenantId,
      permissions,
    };
  }

  private async lookupUserPermissionsFromRoleMappings(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    const rolePermissionModel = (this.prisma as unknown as {
      rolePermission?: {
        findMany?: (args: unknown) => Promise<Array<{ permission: { key: string } }>>;
      };
    }).rolePermission;

    if (!rolePermissionModel?.findMany) {
      return [];
    }

    const mappings = await rolePermissionModel.findMany({
      where: {
        role: {
          tenantId,
          users: {
            some: {
              userId,
            },
          },
        },
      },
      select: {
        permission: {
          select: {
            key: true,
          },
        },
      },
    });

    return mappings.map((item) => item.permission.key);
  }
}

