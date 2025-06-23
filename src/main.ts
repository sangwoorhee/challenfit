import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
} from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptor/transform.interceptor'
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // cookie-parser 추가
  app.use(cookieParser());

  // CORS 설정 추가
  const allowedOrigins = [
    configService.get<string>('FRONTEND_ORIGIN'), 
    'http://localhost:3000',
    'http://localhost:3001', // 허용하는 도메인 이런식으로 콤마구분해서 추가
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // 쿠키 전송 허용
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Origin',
      'x-member-seq',
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204, // pre-flight 응답 204
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('백엔드 API')
    .setDescription('챌린핏 백엔드 API description')
    .setVersion('1.0')
    .addTag('backend')
    .build();

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true, // 쿠키 전송 허용
    },
  };

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, customOptions);

  // 전역 유효성 검사 파이프 추가
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // 페이지네이션을 위한 TransformInterceptor 전역 적용
  app.useGlobalInterceptors(new TransformInterceptor());

  const PORT = configService.get<number>('PORT') ?? 3000;
  await app.listen(PORT);
  console.log('DB_HOST:', configService.get<string>('DB_HOST'));
  console.log('DB_USERNAME:', configService.get<string>('DB_USERNAME'));
  console.log('DB_NAME:', configService.get<string>('DB_NAME'));
  console.log(`POSTGRESQL_PORT: ${PORT} is running...`);
}

bootstrap();
