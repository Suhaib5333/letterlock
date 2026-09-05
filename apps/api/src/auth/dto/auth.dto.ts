import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const lowerTrim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class RequestOtpDto {
  @ApiProperty({ example: 'player@example.com' })
  @Transform(lowerTrim)
  @IsEmail()
  email!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'player@example.com' })
  @Transform(lowerTrim)
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  refreshToken!: string;
}

export class ExchangeCodeDto {
  @ApiProperty({ description: 'One-time code from /auth/callback?code=' })
  @IsString()
  @Length(20, 200)
  code!: string;
}

export class GoogleNativeDto {
  @ApiProperty({ description: 'Google ID token from the native sign-in sheet' })
  @IsString()
  @MaxLength(4096)
  idToken!: string;
}

export class AppleDto {
  @ApiProperty({ description: 'Apple identity token (JWT)' })
  @IsString()
  @MaxLength(4096)
  identityToken!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  authorizationCode?: string;

  @ApiPropertyOptional({ description: 'Only sent by Apple on the very first sign-in' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;
}

export class GuestDto {
  @ApiPropertyOptional({ description: 'Display name for the room roster' })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  name?: string;
}
