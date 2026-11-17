import { SetMetadata } from '@nestjs/common';

export type AppRole = 'ADMIN' | 'CUSTOMER';
export const ROLES_KEY = 'fitzone:roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
