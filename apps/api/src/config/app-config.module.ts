import { Body, Controller, Get, Header, Injectable, Module, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Prisma } from '../generated/prisma/client';

const SEMVER = /^\d+\.\d+\.\d+$/;

export class PatchAppConfigDto {
  @ApiPropertyOptional({ example: '1.2.0' })
  @IsOptional()
  @Matches(SEMVER)
  minNative?: string;

  @ApiPropertyOptional({ example: '1.4.3' })
  @IsOptional()
  @Matches(SEMVER)
  minBundle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  maintenance?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string | null;

  @ApiPropertyOptional({ description: '{ ios?: url, android?: url }; empty until both apps are live' })
  @IsOptional()
  @IsObject()
  storeLinks?: Record<string, string>;

  @ApiPropertyOptional({ description: '{ version, url, sha256, minNative } or null (OTA, Phase 3c)', nullable: true })
  @IsOptional()
  @IsObject()
  latestBundle?: Record<string, unknown> | null;
}

export interface AppConfigDto {
  minNative: string;
  minBundle: string;
  maintenance: boolean;
  message: string | null;
  storeLinks: Record<string, string>;
  latestBundle: Record<string, unknown> | null;
  updatedAt: string;
}

const CACHE_MS = 60_000;

@Injectable()
export class AppConfigService {
  private cache: { at: number; value: AppConfigDto } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<AppConfigDto> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const row = await this.prisma.appConfig.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    const value: AppConfigDto = {
      minNative: row.minNative,
      minBundle: row.minBundle,
      maintenance: row.maintenance,
      message: row.message,
      storeLinks: (row.storeLinks as Record<string, string>) ?? {},
      latestBundle: (row.latestBundle as Record<string, unknown> | null) ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
    this.cache = { at: Date.now(), value };
    return value;
  }

  async patch(dto: PatchAppConfigDto): Promise<AppConfigDto> {
    const data: Prisma.AppConfigUpdateInput = { updatedAt: new Date() };
    if (dto.minNative !== undefined) data.minNative = dto.minNative;
    if (dto.minBundle !== undefined) data.minBundle = dto.minBundle;
    if (dto.maintenance !== undefined) data.maintenance = dto.maintenance;
    if (dto.message !== undefined) data.message = dto.message;
    if (dto.storeLinks !== undefined) data.storeLinks = dto.storeLinks as Prisma.InputJsonValue;
    if (dto.latestBundle !== undefined) {
      data.latestBundle = dto.latestBundle === null ? Prisma.DbNull : (dto.latestBundle as Prisma.InputJsonValue);
    }
    await this.prisma.appConfig.upsert({ where: { id: 1 }, create: { id: 1 }, update: data });
    this.cache = null;
    return this.get();
  }
}

@ApiTags('App config')
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly cfg: AppConfigService) {}

  @Get()
  @Public()
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Version gate + maintenance flag + store links + latest OTA bundle (cached 60 s)' })
  get() {
    return this.cfg.get();
  }

  @Patch()
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: update any subset of the config' })
  patch(@Body() dto: PatchAppConfigDto) {
    return this.cfg.patch(dto);
  }
}

@Module({ controllers: [AppConfigController], providers: [AppConfigService] })
export class AppConfigModule {}
