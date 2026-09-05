import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthUser } from '../common/auth-user';
import { LeaderboardService } from './leaderboard.service';

export class SubmitScoreDto {
  @ApiProperty({ example: 'gk-medium' })
  @IsString()
  @MaxLength(120)
  packId!: string;

  @ApiProperty({ description: 'Games won this match (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100_000)
  moves!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  durationMs!: number;
}

@ApiTags('Leaderboard')
@Controller()
export class LeaderboardController {
  constructor(private readonly lb: LeaderboardService) {}

  @Get('leaderboard/:pack')
  @Public()
  @ApiOperation({ summary: "Paged match scores, one row per player (their best). pack = 'all' or a pack id" })
  page(@Param('pack') pack: string, @Query('limit') limit = '25', @Query('offset') offset = '0') {
    return this.lb.page(pack, Number(limit), Number(offset));
  }

  @Post('leaderboard')
  @ApiBearerAuth()
  @HttpCode(201)
  @ApiOperation({ summary: 'Submit a finished match (username derived server-side, bounds enforced)' })
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitScoreDto) {
    return this.lb.submit(user.id, dto.packId, dto.score, dto.moves, dto.durationMs);
  }

  @Get('ranks')
  @Public()
  @ApiOperation({ summary: 'Top players by lifetime XP' })
  ranks(@Query('limit') limit = '100') {
    return this.lb.ranks(Number(limit));
  }

  @Get('ranks/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My exact global rank' })
  myRank(@CurrentUser() user: AuthUser) {
    return this.lb.myRank(user.id);
  }
}
