import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthUser, TokenPayload } from '../auth-user';

/**
 * Global guard. Every route requires a user access token unless marked @Public().
 * Guest tokens (POST /auth/guest) are for the realtime gateway only: on HTTP they
 * are refused with 403 so a guest can never write account data.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({ message: 'Missing bearer token', code: 'unauthenticated' });
    }

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token, { secret: process.env.JWT_SECRET });
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException({ message: 'Invalid or expired token', code: 'token_invalid' });
    }

    if (payload.typ === 'guest') {
      if (isPublic) {
        // Public room routes (award / clear) can still identify a guest host.
        (req as Request & { guest?: { id: string; name?: string } }).guest = { id: payload.sub, name: payload.name };
        return true;
      }
      throw new ForbiddenException({ message: 'Guest tokens cannot call account endpoints', code: 'guest_forbidden' });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, profile: { select: { role: true, bannedAt: true, username: true } } },
    });
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException({ message: 'Account no longer exists', code: 'user_gone' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.profile?.role ?? 'player',
      banned: !!user.profile?.bannedAt,
      hasProfile: !!user.profile,
      username: user.profile?.username ?? null,
    };
    return true;
  }
}
