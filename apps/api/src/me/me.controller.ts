import { Body, Controller, Get, HttpCode, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthUser } from '../common/auth-user';
import { MeService } from './me.service';
import { UpdateMeDto, UsernameDto } from './me.dto';

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOperation({ summary: 'My profile (404 no_profile until the username is claimed)' })
  get(@CurrentUser() user: AuthUser) {
    return this.me.getProfile(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update display_name / avatar_url' })
  patch(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.me.updateProfile(user.id, dto);
  }

  @Post('username')
  @HttpCode(201)
  @ApiOperation({ summary: 'Claim my username (creates the profile row)' })
  claim(@CurrentUser() user: AuthUser, @Body() dto: UsernameDto) {
    return this.me.claimUsername(user.id, dto.username);
  }

  @Put('username')
  @ApiOperation({ summary: 'Change my username (30-day cooldown, reserved names, uniqueness)' })
  change(@CurrentUser() user: AuthUser, @Body() dto: UsernameDto) {
    return this.me.changeUsername(user.id, dto.username);
  }
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly me: MeService) {}

  @Get('username-available')
  @Public()
  @ApiOperation({ summary: 'Is this username free? (also false for reserved / invalid names)' })
  async available(@Query('name') name = '') {
    return { available: await this.me.usernameAvailable(name) };
  }
}
