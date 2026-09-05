import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RealtimeModule } from '../realtime/realtime.module';

export interface FriendRow {
  other_id: string;
  username: string;
  level: number;
  prestige: number;
  status: 'pending' | 'accepted';
  incoming: boolean;
}
export interface FoundUser {
  id: string;
  username: string;
  level: number;
  prestige: number;
}

export class TargetDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  target!: string;
}
export class RespondDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  other!: string;

  @ApiProperty()
  @IsBoolean()
  accept!: boolean;
}
export class OtherDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  other!: string;
}

const pair = (a: string, b: string) => (a < b ? { userLow: a, userHigh: b } : { userLow: b, userHigh: a });

/**
 * Friends graph. Every method takes `me` from the verified token: the old RLS
 * "friendships select own" becomes `where: { OR: [{userLow: me}, {userHigh: me}] }`,
 * and every write is scoped to a pair that includes `me`.
 */
@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  /** friends_list() */
  async list(me: string): Promise<FriendRow[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ userLow: me }, { userHigh: me }], status: { in: ['pending', 'accepted'] } },
      include: {
        low: { select: { profile: { select: { username: true, level: true, prestige: true } } } },
        high: { select: { profile: { select: { username: true, level: true, prestige: true } } } },
      },
    });
    const out: FriendRow[] = [];
    for (const f of rows) {
      const otherId = f.userLow === me ? f.userHigh : f.userLow;
      const p = f.userLow === me ? f.high.profile : f.low.profile;
      if (!p) continue;
      out.push({
        other_id: otherId,
        username: p.username,
        level: p.level,
        prestige: p.prestige,
        status: f.status as 'pending' | 'accepted',
        incoming: f.status === 'pending' && f.actionBy !== me,
      });
    }
    // pending first, then by username (same order as the SQL function)
    out.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || a.username.localeCompare(b.username));
    return out;
  }

  /** find_user(name): exact username, never yourself. */
  async find(me: string, name: string): Promise<FoundUser | null> {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    const p = await this.prisma.profile.findFirst({
      where: { username: n, NOT: { id: me } },
      select: { id: true, username: true, level: true, prestige: true },
    });
    return p;
  }

  /** send_friend_request(target) */
  async request(me: string, meName: string | null, target: string): Promise<{ status: 'pending' | 'accepted' }> {
    if (target === me) throw new BadRequestException({ message: 'Cannot friend yourself', code: 'self' });
    const exists = await this.prisma.profile.findUnique({ where: { id: target }, select: { id: true } });
    if (!exists) throw new NotFoundException({ message: 'No such user', code: 'no_such_user' });
    const key = pair(me, target);
    const cur = await this.prisma.friendship.findUnique({ where: { userLow_userHigh: key } });
    let status: 'pending' | 'accepted';
    if (!cur) {
      await this.prisma.friendship.create({ data: { ...key, status: 'pending', actionBy: me } });
      status = 'pending';
      this.rt.notifyUser(target, { type: 'friend_request', fromName: meName ?? 'Someone', fromId: me });
    } else if (cur.status === 'blocked') {
      throw new ForbiddenException({ message: 'Blocked', code: 'blocked' });
    } else if (cur.status === 'accepted') {
      status = 'accepted';
    } else if (cur.actionBy !== me) {
      await this.prisma.friendship.update({ where: { userLow_userHigh: key }, data: { status: 'accepted', actionBy: me } });
      status = 'accepted';
      this.rt.notifyUser(target, { type: 'friend_accepted', fromName: meName ?? 'Someone', fromId: me });
    } else {
      status = 'pending';
    }
    return { status };
  }

  /** respond_friend_request(other, accept) */
  async respond(me: string, meName: string | null, other: string, accept: boolean): Promise<{ status: 'accepted' | 'declined' }> {
    const key = pair(me, other);
    const cur = await this.prisma.friendship.findUnique({ where: { userLow_userHigh: key } });
    if (!cur || cur.status !== 'pending') throw new NotFoundException({ message: 'No pending request', code: 'no_pending' });
    if (accept) {
      await this.prisma.friendship.update({ where: { userLow_userHigh: key }, data: { status: 'accepted', actionBy: me } });
      this.rt.notifyUser(other, { type: 'friend_accepted', fromName: meName ?? 'Someone', fromId: me });
      return { status: 'accepted' };
    }
    await this.prisma.friendship.delete({ where: { userLow_userHigh: key } });
    return { status: 'declined' };
  }

  /** remove_friend(other): only pending/accepted rows, never a block. */
  async remove(me: string, other: string): Promise<{ ok: true }> {
    await this.prisma.friendship.deleteMany({ where: { ...pair(me, other), status: { in: ['pending', 'accepted'] } } });
    return { ok: true };
  }

  /** block_user(other) */
  async block(me: string, other: string): Promise<{ ok: true }> {
    if (other === me) throw new BadRequestException({ message: 'Cannot block yourself', code: 'self' });
    const key = pair(me, other);
    await this.prisma.friendship.upsert({
      where: { userLow_userHigh: key },
      create: { ...key, status: 'blocked', actionBy: me },
      update: { status: 'blocked', actionBy: me },
    });
    return { ok: true };
  }

  /** unblock_user(other): only the blocker can lift it. */
  async unblock(me: string, other: string): Promise<{ ok: true }> {
    await this.prisma.friendship.deleteMany({ where: { ...pair(me, other), status: 'blocked', actionBy: me } });
    return { ok: true };
  }
}

@ApiTags('Friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'My friends + pending requests (incoming flagged)' })
  list(@CurrentUser() user: AuthUser) {
    return this.friends.list(user.id);
  }

  @Get('find')
  @ApiOperation({ summary: 'Find a player by exact username' })
  async find(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    return { user: await this.friends.find(user.id, q) };
  }

  @Post('request')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a friend request (auto-accepts a reciprocal one)' })
  request(@CurrentUser() user: AuthUser, @Body() dto: TargetDto) {
    return this.friends.request(user.id, user.username, dto.target);
  }

  @Post('respond')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept or decline a pending request' })
  respond(@CurrentUser() user: AuthUser, @Body() dto: RespondDto) {
    return this.friends.respond(user.id, user.username, dto.other, dto.accept);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a friend / cancel a request' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.friends.remove(user.id, id);
  }

  @Post('block')
  @HttpCode(200)
  block(@CurrentUser() user: AuthUser, @Body() dto: OtherDto) {
    return this.friends.block(user.id, dto.other);
  }

  @Post('unblock')
  @HttpCode(200)
  unblock(@CurrentUser() user: AuthUser, @Body() dto: OtherDto) {
    return this.friends.unblock(user.id, dto.other);
  }
}

@Module({
  imports: [RealtimeModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
