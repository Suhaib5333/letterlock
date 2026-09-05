import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../auth-user';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] | undefined => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    return data ? user?.[data] : user;
  },
);
