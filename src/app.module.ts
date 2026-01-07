import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './proxy/proxy.controller';

@Module({
  imports: [HttpModule],
  controllers: [ProxyController],
  providers: [],
})
export class AppModule {}
