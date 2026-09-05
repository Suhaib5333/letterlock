import { Body, Controller, Delete, Get, Injectable, Module, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/auth-user';

export class PutProgressDto {
  @ApiProperty({ type: [String], description: 'Question ids served in the current cycle' })
  @IsArray()
  @ArrayMaxSize(5000)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  served!: string[];
}

/** question_progress keyed by (user_id, pack_id). RLS "qp * own" = where: { userId }. */
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async all(userId: string): Promise<{ packs: Record<string, string[]> }> {
    const rows = await this.prisma.questionProgress.findMany({ where: { userId }, select: { packId: true, served: true } });
    const packs: Record<string, string[]> = {};
    for (const r of rows) packs[r.packId] = r.served;
    return { packs };
  }

  async put(userId: string, packId: string, served: string[]): Promise<{ ok: true }> {
    await this.prisma.questionProgress.upsert({
      where: { userId_packId: { userId, packId } },
      create: { userId, packId, served },
      update: { served, updatedAt: new Date() },
    });
    return { ok: true };
  }

  async reset(userId: string, packId: string): Promise<{ ok: true }> {
    await this.prisma.questionProgress.deleteMany({ where: { userId, packId } });
    return { ok: true };
  }
}

@ApiTags('Progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'My no-repeat cycle for every pack' })
  all(@CurrentUser() user: AuthUser) {
    return this.progress.all(user.id);
  }

  @Put(':packId')
  @ApiOperation({ summary: 'Replace the served list for one pack' })
  put(@CurrentUser() user: AuthUser, @Param('packId') packId: string, @Body() dto: PutProgressDto) {
    return this.progress.put(user.id, packId, dto.served);
  }

  @Delete(':packId')
  @ApiOperation({ summary: 'Reset one pack cycle' })
  reset(@CurrentUser() user: AuthUser, @Param('packId') packId: string) {
    return this.progress.reset(user.id, packId);
  }
}

@Module({ controllers: [ProgressController], providers: [ProgressService] })
export class ProgressModule {}
