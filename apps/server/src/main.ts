import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrpcRouter } from '@server/trpc/trpc.router';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS moet enabled zijn om web met server te laten praten
  app.enableCors();

  const trpc = app.get(TrpcRouter);
  await trpc.applyMiddleware(app);

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
