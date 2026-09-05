import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { toProfileDto, type ProfileDto } from '../common/profile.dto';
import { USERNAME_RE } from './me.dto';

export const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'moderator', 'mod',
  'staff', 'official', 'letterlock', 'null', 'undefined', 'everyone', 'anonymous',
]);

interface ChangeRow {
  ok: boolean;
  error: string | null;
  next_allowed_at: Date | null;
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  /** RLS "profiles select all" was public; here the owner reads their own row. */
  async getProfile(userId: string): Promise<ProfileDto> {
    const p = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (!p) throw new NotFoundException({ message: 'No profile yet: claim a username first', code: 'no_profile' });
    return toProfileDto(p);
  }

  /** RLS "profiles update own": where: { id: userId }. Role/ban/xp are not writable here. */
  async updateProfile(userId: string, patch: { display_name?: string | null; avatar_url?: string | null }): Promise<ProfileDto> {
    const data: Prisma.ProfileUpdateInput = {};
    if (patch.display_name !== undefined) data.displayName = patch.display_name;
    if (patch.avatar_url !== undefined) data.avatarUrl = patch.avatar_url;
    try {
      const p = await this.prisma.profile.update({ where: { id: userId }, data });
      return toProfileDto(p);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException({ message: 'No profile yet: claim a username first', code: 'no_profile' });
      }
      throw e;
    }
  }

  /** RLS "profiles insert own": the row id is always the caller's id. */
  async claimUsername(userId: string, username: string): Promise<ProfileDto> {
    if (!USERNAME_RE.test(username)) throw new BadRequestException({ message: 'Invalid username', code: 'invalid' });
    if (RESERVED_USERNAMES.has(username)) throw new BadRequestException({ message: 'That username is reserved', code: 'reserved' });
    const existing = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (existing) throw new ConflictException({ message: 'Profile already exists; use PUT /me/username to change it', code: 'already_claimed' });
    try {
      const p = await this.prisma.profile.create({ data: { id: userId, username } });
      return toProfileDto(p);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ message: 'That username was just taken', code: 'taken' });
      }
      if (e instanceof Error && /username_reserved/.test(e.message)) {
        throw new BadRequestException({ message: 'That username is reserved', code: 'reserved' });
      }
      throw e;
    }
  }

  /** change_username(p_user_id, p_name): format, reserved, 30-day cooldown, uniqueness. */
  async changeUsername(userId: string, username: string): Promise<{ ok: true; next_allowed_at: string; profile: ProfileDto }> {
    const rows = await this.prisma.$queryRaw<ChangeRow[]>`select * from change_username(${userId}::uuid, ${username})`;
    const row = rows[0];
    if (!row?.ok) {
      const code = row?.error ?? 'failed';
      const next_allowed_at = row?.next_allowed_at ? row.next_allowed_at.toISOString() : null;
      const messages: Record<string, string> = {
        invalid: 'Username must be 3-20 characters: a-z, 0-9, _',
        reserved: 'That username is reserved',
        no_profile: 'No profile yet: claim a username first',
        unchanged: 'That is already your username',
        too_soon: 'You can only change your username once a month',
        taken: 'That username is taken',
      };
      const status = code === 'taken' ? ConflictException : code === 'no_profile' ? NotFoundException : BadRequestException;
      throw new status({ message: messages[code] ?? 'Could not change username', code, next_allowed_at });
    }
    const p = await this.prisma.profile.findUniqueOrThrow({ where: { id: userId } });
    return { ok: true, next_allowed_at: row.next_allowed_at!.toISOString(), profile: toProfileDto(p) };
  }

  /** username_available(name): true when free, never leaks who owns it. */
  async usernameAvailable(name: string): Promise<boolean> {
    const n = name.trim().toLowerCase();
    if (!USERNAME_RE.test(n) || RESERVED_USERNAMES.has(n)) return false;
    const hit = await this.prisma.profile.findUnique({ where: { username: n }, select: { id: true } });
    return !hit;
  }
}
