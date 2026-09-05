import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, Max, Min } from 'class-validator';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthUser } from '../common/auth-user';
import type { UserRole } from '../generated/prisma/client';

export class SetRoleDto {
  @ApiProperty({ enum: ['player', 'moderator', 'admin'] })
  @IsIn(['player', 'moderator', 'admin'])
  role!: UserRole;
}
export class SetBannedDto {
  @ApiProperty()
  @IsBoolean()
  banned!: boolean;
}
export class GrantXpDto {
  @ApiProperty({ description: 'Signed amount, -100000..100000' })
  @IsInt()
  @Min(-100_000)
  @Max(100_000)
  amount!: number;
}
export class FullAccessDto {
  @ApiProperty()
  @IsBoolean()
  value!: boolean;
}

export interface AdminUserRow {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: UserRole;
  banned_at: string | null;
  created_at: string;
  level: number;
  prestige: number;
  total_xp: number;
  full_access: boolean;
  ads_removed: boolean;
}

/**
 * DELETE /admin/users/:target accepts either an admin bearer token or the CI
 * header `x-qa-token: <QA_ADMIN_TOKEN>` (qa-cleanup-api.yml). Exact matches only.
 */
@Injectable()
export class AdminOrQaGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const secret = process.env.QA_ADMIN_TOKEN ?? '';
    const given = String(req.headers['x-qa-token'] ?? '');
    if (secret && given && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
      return true;
    }
    if (req.user && !req.user.banned && req.user.role === 'admin') return true;
    throw new ForbiddenException({ message: 'Admin role or QA token required', code: 'forbidden' });
  }
}

/** Every method here used to be a SECURITY DEFINER RPC guarded by is_admin(). */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** admin_list_users() */
  async listUsers(): Promise<AdminUserRow[]> {
    const rows = await this.prisma.profile.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' } });
    return rows.map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.displayName,
      email: p.user.email,
      role: p.role,
      banned_at: p.bannedAt?.toISOString() ?? null,
      created_at: p.createdAt.toISOString(),
      level: p.level,
      prestige: p.prestige,
      total_xp: Number(p.totalXp),
      full_access: p.fullAccess,
      ads_removed: p.adsRemoved,
    }));
  }

  /** set_user_role(target_id, new_role): cannot demote yourself. */
  async setRole(me: string, target: string, role: UserRole): Promise<{ ok: true }> {
    if (target === me && role !== 'admin') throw new BadRequestException({ message: 'Cannot demote yourself', code: 'self_demote' });
    await this.mustExist(target);
    await this.prisma.profile.update({ where: { id: target }, data: { role } });
    return { ok: true };
  }

  /** set_user_banned(target_id, banned): cannot ban yourself. */
  async setBanned(me: string, target: string, banned: boolean): Promise<{ ok: true }> {
    if (target === me) throw new BadRequestException({ message: 'Cannot ban yourself', code: 'self_ban' });
    await this.mustExist(target);
    await this.prisma.profile.update({ where: { id: target }, data: { bannedAt: banned ? new Date() : null } });
    return { ok: true };
  }

  /** admin_grant_xp(target_id, amount) */
  async grantXp(target: string, amount: number): Promise<{ ok: true }> {
    await this.mustExist(target);
    await this.prisma.$executeRaw`select admin_grant_xp(${target}::uuid, ${amount}::int)`;
    return { ok: true };
  }

  /** admin_reset_progression(target_id) */
  async resetProgression(target: string): Promise<{ ok: true }> {
    await this.mustExist(target);
    await this.prisma.profile.update({ where: { id: target }, data: { xp: 0, level: 1, prestige: 0, totalXp: 0 } });
    return { ok: true };
  }

  /** admin_set_full_access(target_id, value) */
  async setFullAccess(target: string, value: boolean): Promise<{ ok: true }> {
    await this.mustExist(target);
    await this.prisma.profile.update({ where: { id: target }, data: { fullAccess: value } });
    return { ok: true };
  }

  /** admin_delete_leaderboard_row(row_id) */
  async deleteLeaderboardRow(id: string): Promise<{ ok: true }> {
    await this.prisma.leaderboardRow.deleteMany({ where: { id } });
    return { ok: true };
  }

  /** QA cleanup: delete a user by exact username or email. Cascades everything. */
  async deleteUser(target: string): Promise<{ ok: true; id: string; email: string | null; username: string | null }> {
    const t = target.trim().toLowerCase();
    const user = t.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: t }, include: { profile: { select: { username: true } } } })
      : await this.prisma.profile.findUnique({ where: { username: t }, select: { user: { include: { profile: { select: { username: true } } } } } }).then((p) => p?.user ?? null);
    if (!user) throw new NotFoundException({ message: `No account matches "${target}"`, code: 'not_found' });
    await this.prisma.user.delete({ where: { id: user.id } });
    return { ok: true, id: user.id, email: user.email, username: user.profile?.username ?? null };
  }

  private async mustExist(id: string) {
    const p = await this.prisma.profile.findUnique({ where: { id }, select: { id: true } });
    if (!p) throw new NotFoundException({ message: 'No such profile', code: 'not_found' });
  }
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List every profile with email + progression' })
  list() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/role')
  setRole(@CurrentUser() me: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRoleDto) {
    return this.admin.setRole(me.id, id, dto.role);
  }

  @Patch('users/:id/banned')
  setBanned(@CurrentUser() me: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetBannedDto) {
    return this.admin.setBanned(me.id, id, dto.banned);
  }

  @Post('users/:id/grant-xp')
  @HttpCode(200)
  grantXp(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GrantXpDto) {
    return this.admin.grantXp(id, dto.amount);
  }

  @Post('users/:id/reset-progression')
  @HttpCode(200)
  resetProgression(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.resetProgression(id);
  }

  @Patch('users/:id/full-access')
  setFullAccess(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FullAccessDto) {
    return this.admin.setFullAccess(id, dto.value);
  }

  @Delete('leaderboard/:id')
  @Roles('moderator', 'admin')
  deleteLeaderboardRow(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteLeaderboardRow(id);
  }

  @Delete('users/:target')
  @Public()
  @Roles()
  @UseGuards(AdminOrQaGuard)
  @ApiOperation({ summary: 'QA cleanup: delete an account by exact username or email (admin token or x-qa-token)' })
  deleteUser(@Param('target') target: string) {
    return this.admin.deleteUser(target);
  }
}

@Module({ controllers: [AdminController], providers: [AdminService, AdminOrQaGuard] })
export class AdminModule {}
