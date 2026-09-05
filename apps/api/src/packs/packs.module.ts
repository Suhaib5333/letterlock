import {
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
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalAuth } from '../common/decorators/public.decorator';
import type { AuthUser } from '../common/auth-user';
import { Prisma, type CustomPack } from '../generated/prisma/client';

const DIFFICULTIES = ['kids', 'easy', 'medium', 'hard', 'expert', 'extreme'] as const;

export class CreatePackDto {
  @ApiProperty()
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ default: '✨' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string;

  @ApiPropertyOptional({ enum: DIFFICULTIES, default: 'medium' })
  @IsOptional()
  @IsIn(DIFFICULTIES as unknown as string[])
  difficulty?: (typeof DIFFICULTIES)[number];

  @ApiProperty({ description: '{ letters: { A: [{q, a, id?}], ... } }' })
  @IsObject()
  body!: Record<string, unknown>;
}

export class UpdatePackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string;

  @ApiPropertyOptional({ enum: DIFFICULTIES })
  @IsOptional()
  @IsIn(DIFFICULTIES as unknown as string[])
  difficulty?: (typeof DIFFICULTIES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'moderator/admin only' })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export interface CustomPackDto {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  emoji: string;
  difficulty: string;
  body: unknown;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const toDto = (p: CustomPack): CustomPackDto => ({
  id: p.id,
  owner_id: p.ownerId,
  name: p.name,
  description: p.description,
  emoji: p.emoji,
  difficulty: p.difficulty,
  body: p.body,
  published: p.published,
  published_at: p.publishedAt?.toISOString() ?? null,
  created_at: p.createdAt.toISOString(),
  updated_at: p.updatedAt.toISOString(),
});

const isStaff = (u: AuthUser | undefined) => !!u && !u.banned && (u.role === 'moderator' || u.role === 'admin');

/**
 * custom_packs. RLS mapping:
 *   select: published OR owner OR staff       -> list()/get() build that exact where
 *   insert own: owner_id = me                 -> create() sets ownerId from the token
 *   update own or staff                       -> update() loads then checks owner/staff
 *   delete own or staff                       -> remove() same check
 * `published` may only be flipped by staff (owners edit content, staff publish).
 */
@Injectable()
export class PacksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser | undefined, scope: 'mine' | 'published' | 'all'): Promise<CustomPackDto[]> {
    let where: Prisma.CustomPackWhereInput;
    if (scope === 'published') where = { published: true };
    else if (scope === 'all') {
      if (!isStaff(user)) throw new ForbiddenException({ message: 'Staff only', code: 'forbidden' });
      where = {};
    } else {
      if (!user) throw new ForbiddenException({ message: 'Sign in to list your packs', code: 'unauthenticated' });
      where = { ownerId: user.id };
    }
    const rows = await this.prisma.customPack.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map(toDto);
  }

  async get(user: AuthUser | undefined, id: string): Promise<CustomPackDto> {
    const p = await this.prisma.customPack.findUnique({ where: { id } });
    if (!p || !(p.published || p.ownerId === user?.id || isStaff(user))) {
      throw new NotFoundException({ message: 'Pack not found', code: 'not_found' });
    }
    return toDto(p);
  }

  async create(user: AuthUser, dto: CreatePackDto): Promise<CustomPackDto> {
    const p = await this.prisma.customPack.create({
      data: {
        ownerId: user.id,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        emoji: dto.emoji ?? '✨',
        difficulty: dto.difficulty ?? 'medium',
        body: dto.body as Prisma.InputJsonValue,
      },
    });
    return toDto(p);
  }

  async update(user: AuthUser, id: string, dto: UpdatePackDto): Promise<CustomPackDto> {
    const cur = await this.prisma.customPack.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException({ message: 'Pack not found', code: 'not_found' });
    const owner = cur.ownerId === user.id;
    if (!owner && !isStaff(user)) throw new ForbiddenException({ message: 'Not your pack', code: 'forbidden' });
    if (dto.published !== undefined && !isStaff(user)) {
      throw new ForbiddenException({ message: 'Only moderators can publish', code: 'forbidden' });
    }
    const data: Prisma.CustomPackUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.emoji !== undefined) data.emoji = dto.emoji;
    if (dto.difficulty !== undefined) data.difficulty = dto.difficulty;
    if (dto.body !== undefined) data.body = dto.body as Prisma.InputJsonValue;
    if (dto.published !== undefined) {
      data.published = dto.published;
      data.publishedAt = dto.published ? new Date() : null;
    }
    const p = await this.prisma.customPack.update({ where: { id }, data });
    return toDto(p);
  }

  async remove(user: AuthUser, id: string): Promise<{ ok: true }> {
    const cur = await this.prisma.customPack.findUnique({ where: { id }, select: { ownerId: true } });
    if (!cur) throw new NotFoundException({ message: 'Pack not found', code: 'not_found' });
    if (cur.ownerId !== user.id && !isStaff(user)) throw new ForbiddenException({ message: 'Not your pack', code: 'forbidden' });
    await this.prisma.customPack.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('Custom packs')
@ApiBearerAuth()
@Controller('packs/custom')
export class PacksController {
  constructor(private readonly packs: PacksService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: "List packs. ?scope=mine (default, signed in) | published (public) | all (staff)" })
  list(@CurrentUser() user: AuthUser | undefined, @Query('scope') scope: 'mine' | 'published' | 'all' = 'mine') {
    return this.packs.list(user, scope);
  }

  @Get(':id')
  @OptionalAuth()
  get(@CurrentUser() user: AuthUser | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.packs.get(user, id);
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePackDto) {
    return this.packs.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePackDto) {
    return this.packs.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.packs.remove(user, id);
  }
}

@Module({ controllers: [PacksController], providers: [PacksService] })
export class PacksModule {}
