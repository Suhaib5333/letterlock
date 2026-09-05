import { Body, Controller, Delete, Get, Injectable, Module, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import type { Prisma } from '../generated/prisma/client';

export class PutSaveDto {
  @ApiProperty({ description: '{ setup?, opts: { packId }, series, log } (opaque to the server)' })
  @IsObject()
  state!: Record<string, unknown>;
}

/** saved_games: ONE row per user. RLS "sg * own" = where: { userId }. */
@Injectable()
export class SavesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<{ state: unknown | null; updated_at: string | null }> {
    const row = await this.prisma.savedGame.findUnique({ where: { userId } });
    return { state: row?.state ?? null, updated_at: row?.updatedAt.toISOString() ?? null };
  }

  async put(userId: string, state: Record<string, unknown>): Promise<{ ok: true; updated_at: string }> {
    const row = await this.prisma.savedGame.upsert({
      where: { userId },
      create: { userId, state: state as Prisma.InputJsonValue },
      update: { state: state as Prisma.InputJsonValue, updatedAt: new Date() },
    });
    return { ok: true, updated_at: row.updatedAt.toISOString() };
  }

  async clear(userId: string): Promise<{ ok: true }> {
    await this.prisma.savedGame.deleteMany({ where: { userId } });
    return { ok: true };
  }
}

@ApiTags('Saves')
@ApiBearerAuth()
@Controller('saves')
export class SavesController {
  constructor(private readonly saves: SavesService) {}

  @Get()
  @ApiOperation({ summary: 'My saved game (state null when none)' })
  get(@CurrentUser() user: AuthUser) {
    return this.saves.get(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Replace my saved game' })
  put(@CurrentUser() user: AuthUser, @Body() dto: PutSaveDto) {
    return this.saves.put(user.id, dto.state);
  }

  @Delete()
  @ApiOperation({ summary: 'Drop my saved game' })
  clear(@CurrentUser() user: AuthUser) {
    return this.saves.clear(user.id);
  }
}

@Module({ controllers: [SavesController], providers: [SavesService] })
export class SavesModule {}
