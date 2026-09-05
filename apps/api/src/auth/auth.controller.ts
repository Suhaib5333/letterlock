import { Body, Controller, Delete, Get, Headers, HttpCode, Post, Query, Redirect } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import {
  AppleDto,
  ExchangeCodeDto,
  GoogleNativeDto,
  GuestDto,
  RefreshTokenDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @Public()
  @HttpCode(200)
  // 3 per IP per 5 minutes here; 3 per email per 5 minutes in the service.
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOperation({ summary: 'Email a 6-digit sign-in code' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.email);
  }

  @Post('otp/verify')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify the code, receive tokens (+ profile or null)' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Headers('user-agent') ua?: string) {
    return this.auth.verifyOtp(dto.email, dto.code, ua);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate the refresh token, get a new access token' })
  refresh(@Body() dto: RefreshTokenDto, @Headers('user-agent') ua?: string) {
    return this.auth.refresh(dto.refreshToken, ua);
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke a refresh token (idempotent)' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user + profile (null until the username is claimed)' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Delete('me')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete my account and every row it owns (store requirement)' })
  deleteMe(@CurrentUser() user: AuthUser) {
    return this.auth.deleteAccount(user.id);
  }

  @Get('google')
  @Public()
  @Redirect()
  @ApiOperation({ summary: 'Start Google sign-in (web). Optional ?returnTo=/path' })
  google(@Query('returnTo') returnTo?: string) {
    return { url: this.auth.googleRedirectUrl(returnTo), statusCode: 302 };
  }

  @Get('google/callback')
  @Public()
  @Redirect()
  @ApiOperation({ summary: 'Google redirect target; forwards to WEB_URL/auth/callback?code=' })
  async googleCallback(@Query('code') code?: string, @Query('state') state?: string, @Query('error') error?: string) {
    return { url: await this.auth.googleCallback(code, state, error), statusCode: 302 };
  }

  @Post('exchange')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Swap the one-time code from the Google redirect for tokens' })
  exchange(@Body() dto: ExchangeCodeDto, @Headers('user-agent') ua?: string) {
    return this.auth.exchangeLoginCode(dto.code, ua);
  }

  @Post('google/native')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Native Google sign-in: verify an ID token' })
  googleNative(@Body() dto: GoogleNativeDto, @Headers('user-agent') ua?: string) {
    return this.auth.googleNative(dto.idToken, ua);
  }

  @Post('apple')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with Apple (native or web JS): verify an identity token' })
  apple(@Body() dto: AppleDto, @Headers('user-agent') ua?: string) {
    return this.auth.apple(dto.identityToken, ua);
  }

  @Post('guest')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: '24-hour guest token for a phone joining a room without an account' })
  guest(@Body() dto: GuestDto) {
    return this.auth.guest(dto.name);
  }
}
