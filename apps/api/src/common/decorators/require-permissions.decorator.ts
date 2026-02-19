import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../../auth/permissions.constants';

export const REQUIRED_PERMISSIONS_METADATA_KEY = 'required_permissions';

export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_METADATA_KEY, permissions);

