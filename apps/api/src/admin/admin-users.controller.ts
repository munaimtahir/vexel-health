import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AdminUsersService } from './admin-users.service';
import { InviteAdminUserDto } from './dto/invite-admin-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin/users')
@UseGuards(TenantGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  listUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.service.listUsers(query);
  }

  @Post('invite')
  inviteUser(@Body() dto: InviteAdminUserDto) {
    return this.service.inviteUser(dto);
  }

  @Get(':userId')
  getUserById(@Param('userId') userId: string) {
    return this.service.getUserById(userId);
  }

  @Patch(':userId')
  updateUser(@Param('userId') userId: string, @Body() dto: UpdateAdminUserDto) {
    return this.service.updateUser(userId, dto);
  }
}
