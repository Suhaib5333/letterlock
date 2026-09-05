import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export class UsernameDto {
  @ApiProperty({ example: 'honeybadger42', description: '3-20 chars, a-z 0-9 _ (lowercased server-side)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(USERNAME_RE, { message: 'username must be 3-20 characters: a-z, 0-9, _' })
  username!: string;
}

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  display_name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['https', 'http'] })
  @MaxLength(500)
  avatar_url?: string | null;
}
