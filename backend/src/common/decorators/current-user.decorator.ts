import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to inject the current authenticated user from the request
 *
 * @example
 * getProfile(@CurrentUser() user: any) {
 *   console.log(user.id);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user?.[data] : user;
  },
);
