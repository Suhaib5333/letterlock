import { Body, Controller, Delete, Get, Injectable, Module, Param, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthUser } from '../common/auth-user';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RealtimeModule } from '../realtime/realtime.module';

export class LinkMemberDto {
  @ApiProperty({ enum: ['A', 'B'] })
  @IsIn(['A', 'B'])
  team!: 'A' | 'B';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 40)
  name?: string;
}

export interface RoomMemberDto {
  room_code: string;
  user_id: string;
  team: 'A' | 'B';
  name: string | null;
  joined_at: string;
}

/** room_members. RLS rm_self_* = where: { roomCode, userId }. room_clear = host only. */
@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(userId: string, room: string): Promise<{ members: RoomMemberDto[] }> {
    const rows = await this.prisma.roomMember.findMany({ where: { roomCode: room, userId } });
    return {
      members: rows.map((r) => ({
        room_code: r.roomCode,
        user_id: r.userId,
        team: r.team as 'A' | 'B',
        name: r.name,
        joined_at: r.joinedAt.toISOString(),
      })),
    };
  }

  async link(userId: string, room: string, team: 'A' | 'B', name?: string): Promise<{ ok: true }> {
    await this.prisma.roomMember.upsert({
      where: { roomCode_userId: { roomCode: room, userId } },
      create: { roomCode: room, userId, team, name: name ?? null },
      update: { team, name: name ?? null },
    });
    return { ok: true };
  }

  async unlink(userId: string, room: string): Promise<{ ok: true }> {
    await this.prisma.roomMember.deleteMany({ where: { roomCode: room, userId } });
    return { ok: true };
  }

  /** room_clear(p_room): wipe membership + award log. */
  async clear(room: string): Promise<{ ok: true }> {
    await this.prisma.$transaction([
      this.prisma.roomMember.deleteMany({ where: { roomCode: room } }),
      this.prisma.roomAward.deleteMany({ where: { roomCode: room } }),
    ]);
    return { ok: true };
  }
}

@ApiTags('Rooms')
@Controller('rooms/:code')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly rt: RealtimeGateway,
  ) {}

  @Get('members')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My own membership row(s) for this room' })
  mine(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.rooms.mine(user.id, code.toUpperCase());
  }

  @Put('members')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link myself to a team in this room (earn XP even with the phone closed)' })
  link(@CurrentUser() user: AuthUser, @Param('code') code: string, @Body() dto: LinkMemberDto) {
    return this.rooms.link(user.id, code.toUpperCase(), dto.team, dto.name);
  }

  @Delete('members')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink myself from this room' })
  unlink(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.rooms.unlink(user.id, code.toUpperCase());
  }

  @Delete()
  @Public()
  @ApiOperation({ summary: 'Host: clear the room membership + award log (match end / host exit)' })
  clear(@Req() req: Request & { user?: AuthUser; guest?: { id: string } }, @Param('code') code: string) {
    const room = code.toUpperCase();
    this.rt.assertHostOrUntracked(room, req.user?.id ?? req.guest?.id ?? null);
    return this.rooms.clear(room);
  }
}

@Module({ imports: [RealtimeModule], controllers: [RoomsController], providers: [RoomsService] })
export class RoomsModule {}
