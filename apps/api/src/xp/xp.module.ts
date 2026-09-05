import { BadRequestException, Body, Controller, HttpCode, Injectable, Module, NotFoundException, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthUser } from '../common/auth-user';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RealtimeModule } from '../realtime/realtime.module';

export class AwardXpDto {
  @ApiProperty({ description: 'Clamped to [0,200] server-side' })
  @IsInt()
  amount!: number;
}

export class RoomAwardDto {
  @ApiProperty({ example: 'ABC234' })
  @IsString()
  @Length(6, 6)
  room!: string;

  @ApiPropertyOptional({ enum: ['A', 'B'], nullable: true })
  @IsOptional()
  @IsIn(['A', 'B'])
  winner?: 'A' | 'B' | null;

  @ApiProperty({ description: 'Idempotency key for this game (e.g. "g2")' })
  @IsString()
  @MaxLength(80)
  gameKey!: string;
}

export interface AwardResult {
  xp: number;
  level: number;
  prestige: number;
  total_xp: number;
  leveled_up: boolean;
}

@Injectable()
export class XpService {
  constructor(private readonly prisma: PrismaService) {}

  /** award_xp(p_user_id, amount): clamp [0,200], xp cap 8500, total_xp forever. */
  async award(userId: string, amount: number): Promise<AwardResult> {
    try {
      const rows = await this.prisma.$queryRaw<(AwardResult & { total_xp: bigint })[]>`
        select * from award_xp(${userId}::uuid, ${amount}::int)`;
      const r = rows[0];
      return { ...r, total_xp: Number(r.total_xp) };
    } catch (e) {
      if (e instanceof Error && /no profile/.test(e.message)) {
        throw new NotFoundException({ message: 'Claim a username first', code: 'no_profile' });
      }
      throw e;
    }
  }

  /** prestige_up(p_user_id): only at level 10, below max prestige. */
  async prestige(userId: string): Promise<{ level: number; prestige: number }> {
    try {
      const rows = await this.prisma.$queryRaw<{ level: number; prestige: number }[]>`select * from prestige_up(${userId}::uuid)`;
      return rows[0];
    } catch (e) {
      if (e instanceof Error && /not eligible/.test(e.message)) {
        throw new BadRequestException({ message: 'Not eligible to prestige (level 10 required)', code: 'not_eligible' });
      }
      throw e;
    }
  }

  /** award_room_xp(p_room, p_winner, p_game_key): fixed 100/50 amounts, idempotent. */
  async roomAward(room: string, winner: 'A' | 'B' | null, gameKey: string): Promise<{ credited: number }> {
    try {
      const rows = await this.prisma.$queryRaw<{ n: number }[]>`
        select award_room_xp(${room}, ${winner}, ${gameKey}) as n`;
      return { credited: Number(rows[0]?.n ?? 0) };
    } catch (e) {
      if (e instanceof Error && /bad (room|winner)/.test(e.message)) {
        throw new BadRequestException({ message: 'Bad room code or winner', code: 'bad_request' });
      }
      throw e;
    }
  }
}

@ApiTags('XP')
@Controller('xp')
export class XpController {
  constructor(
    private readonly xp: XpService,
    private readonly rt: RealtimeGateway,
  ) {}

  @Post('award')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Award myself XP (clamped [0,200])' })
  award(@CurrentUser() user: AuthUser, @Body() dto: AwardXpDto) {
    return this.xp.award(user.id, dto.amount);
  }

  @Post('prestige')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Prestige up (level 10 only)' })
  prestige(@CurrentUser() user: AuthUser) {
    return this.xp.prestige(user.id);
  }

  @Post('room-award')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Host: credit every linked member of a couch room for one finished game' })
  roomAward(@Req() req: Request & { user?: AuthUser; guest?: { id: string } }, @Body() dto: RoomAwardDto) {
    const callerId = req.user?.id ?? req.guest?.id ?? null;
    this.rt.assertHostOrUntracked(dto.room, callerId);
    return this.xp.roomAward(dto.room, dto.winner ?? null, dto.gameKey);
  }
}

@Module({
  imports: [RealtimeModule],
  controllers: [XpController],
  providers: [XpService],
  exports: [XpService],
})
export class XpModule {}
