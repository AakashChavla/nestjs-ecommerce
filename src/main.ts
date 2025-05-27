import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3700, 'localhost');

  console.log(`Server is running at http://localhost:3700`);
}
bootstrap();
