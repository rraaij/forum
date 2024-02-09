import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TrpcModule } from "@server/trpc/trpc.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersController } from "./users/users.controller";

@Module({
  imports: [ConfigModule.forRoot(), TrpcModule],
  controllers: [AppController, UsersController],
  providers: [AppService],
})
export class AppModule {}
