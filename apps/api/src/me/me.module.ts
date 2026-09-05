import { Module } from '@nestjs/common';
import { MeController, UsersController } from './me.controller';
import { MeService } from './me.service';

@Module({
  controllers: [MeController, UsersController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}
