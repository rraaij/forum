import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from '@server/trpc/trpc.module';

@Module({
  imports: [ConfigModule.forRoot(), TrpcModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
