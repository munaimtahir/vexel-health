import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { InviteAdminUserDto } from './dto/invite-admin-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  async listUsers(query: ListAdminUsersQueryDto) {
    const tenantId = this.tenantId;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.query?.trim() ?? '';

    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          roleMappings: {
            include: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { email: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.mapUser(user)),
      total,
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: this.tenantId,
      },
      include: {
        roleMappings: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUser(user);
  }

  async inviteUser(dto: InviteAdminUserDto) {
    const tenantId = this.tenantId;
    const actor = this.actorIdentity;
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const roleNames = this.normalizeRoleNames(dto.roleNames);

    await this.assertRolesExist(roleNames);

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email,
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new DomainException(
        'USER_ALREADY_EXISTS',
        'A user with this email already exists for the tenant',
      );
    }

    const expiresInHours = dto.expiresInHours ?? 168;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await this.prisma.$transaction(async (tx) => {
      const currentPending = await tx.adminUserInvite.findFirst({
        where: {
          tenantId,
          email,
          status: 'PENDING',
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (currentPending) {
        return tx.adminUserInvite.update({
          where: {
            id: currentPending.id,
          },
          data: {
            name,
            roleNamesCsv: roleNames.join(','),
            expiresAt,
            invitedByUserId: actor,
          },
        });
      }

      return tx.adminUserInvite.create({
        data: {
          tenantId,
          email,
          name,
          roleNamesCsv: roleNames.join(','),
          status: 'PENDING',
          expiresAt,
          invitedByUserId: actor,
        },
      });
    });

    await this.writeAuditEvent({
      eventType: 'admin.user.invited',
      entityType: 'user_invite',
      entityId: invite.id,
      payload: {
        email,
        role_names: roleNames,
        expires_at: expiresAt.toISOString(),
      },
    });

    return this.mapInvite(invite);
  }

  async updateUser(userId: string, dto: UpdateAdminUserDto) {
    if (dto.status === undefined && dto.roleNames === undefined) {
      throw new DomainException(
        'NO_UPDATABLE_FIELDS',
        'At least one updatable field is required',
      );
    }

    const tenantId = this.tenantId;
    const actor = this.actorIdentity;

    const existing = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      include: {
        roleMappings: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const nextRoleNames =
      dto.roleNames !== undefined
        ? this.normalizeRoleNames(dto.roleNames)
        : existing.roleMappings.map((mapping) => mapping.role.name);

    if (dto.roleNames !== undefined) {
      await this.assertRolesExist(nextRoleNames);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: existing.id,
        },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
        },
      });

      if (dto.roleNames !== undefined) {
        await tx.userRole.deleteMany({
          where: {
            userId: existing.id,
          },
        });

        if (nextRoleNames.length > 0) {
          const roles = await tx.role.findMany({
            where: {
              tenantId,
              name: {
                in: nextRoleNames,
              },
            },
            select: {
              id: true,
            },
          });

          if (roles.length !== nextRoleNames.length) {
            throw new DomainException(
              'ROLE_NOT_FOUND',
              'One or more roles are not found for tenant',
            );
          }

          await tx.userRole.createMany({
            data: roles.map((role) => ({
              userId: user.id,
              roleId: role.id,
            })),
          });
        }
      }

      return tx.user.findFirstOrThrow({
        where: {
          id: existing.id,
          tenantId,
        },
        include: {
          roleMappings: {
            include: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    await this.writeAuditEvent({
      eventType: 'admin.user.updated',
      entityType: 'user',
      entityId: updated.id,
      payload: {
        status: updated.status,
        role_names: nextRoleNames,
        actor,
      },
    });

    return this.mapUser(updated);
  }

  private async assertRolesExist(roleNames: string[]) {
    if (roleNames.length === 0) {
      return;
    }

    const roles = await this.prisma.role.findMany({
      where: {
        tenantId: this.tenantId,
        name: {
          in: roleNames,
        },
      },
      select: {
        name: true,
      },
    });

    if (roles.length !== roleNames.length) {
      const existing = new Set(roles.map((role) => role.name));
      const missing = roleNames.filter((role) => !existing.has(role));
      throw new DomainException(
        'ROLE_NOT_FOUND',
        'Roles not found for tenant',
        {
          missing_roles: missing,
        },
      );
    }
  }

  private normalizeRoleNames(roleNames: string[]): string[] {
    const normalized = roleNames
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    if (normalized.length === 0) {
      throw new DomainException(
        'INVALID_ROLE_ASSIGNMENT',
        'At least one role is required',
      );
    }

    return Array.from(new Set(normalized));
  }

  private mapUser(user: {
    id: string;
    email: string;
    name: string | null;
    status: string;
    createdAt: Date;
    roleMappings: Array<{ role: { name: string } }>;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: Array.from(
        new Set(user.roleMappings.map((item) => item.role.name)),
      ).sort(),
      createdAt: user.createdAt,
    };
  }

  private mapInvite(invite: {
    id: string;
    email: string;
    name: string | null;
    status: string;
    expiresAt: Date;
    roleNamesCsv: string;
    createdAt: Date;
  }) {
    return {
      inviteId: invite.id,
      email: invite.email,
      name: invite.name,
      status: invite.status,
      expiresAt: invite.expiresAt,
      roleNames: invite.roleNamesCsv
        .split(',')
        .map((role) => role.trim())
        .filter((role) => role.length > 0),
      createdAt: invite.createdAt,
    };
  }

  private get actorIdentity(): string | null {
    return (
      this.cls.get<string>('USER_EMAIL') ??
      this.cls.get<string>('USER_ID') ??
      this.cls.get<string>('USER_SUB') ??
      null
    );
  }

  private async writeAuditEvent(input: {
    eventType: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        tenantId: this.tenantId,
        actorUserId: this.actorIdentity,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        payloadJson: JSON.stringify(input.payload),
        correlationId: this.cls.get<string>('REQUEST_ID') ?? null,
      },
    });
  }
}
