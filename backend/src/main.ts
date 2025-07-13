import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화 (프론트엔드에서 접근 가능하도록)
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite 기본 포트와 React 기본 포트
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001); // 포트를 3001로 변경 (프론트엔드와 구분)
}
void bootstrap();
