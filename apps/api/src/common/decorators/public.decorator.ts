import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Route needs no token. If a valid Bearer token IS present, `req.user` is still
 * populated (optional auth), so a public route can personalise its answer.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
/** Alias that reads better on routes that behave differently when signed in. */
export const OptionalAuth = Public;
