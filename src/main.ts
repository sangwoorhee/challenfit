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
import { Logger, ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptor/transform.interceptor'
import { RedisIoAdapter } from './common/config/redis.adapter';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';
import { TokenResponseInterceptor } from './common/interceptor/token-response.interceptor';
dotenv.config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'verbose', 'debug'],
  });
  const configService = app.get(ConfigService);

    // Redis Adapter 설정 (WebSocket 수평 확장용) - 선택적 활성화
  try {
    const redisIoAdapter = await RedisIoAdapter.create(app);
    app.useWebSocketAdapter(redisIoAdapter);
    logger.log('Redis adapter successfully initialized');
  } catch (error) {
    logger.error('Failed to initialize Redis adapter. Running without Redis.', error.message);
    logger.warn('WebSocket will work but without horizontal scaling support');
    // Redis 없이도 WebSocket은 작동하지만 수평 확장은 불가능
  }

    // uploads 폴더 생성 (이미지 업로드용)
    // const uploadDir = join(process.cwd(), 'uploads', 'workout-images');
    // if (!fs.existsSync(uploadDir)) {
    //   fs.mkdirSync(uploadDir, { recursive: true });
    // }
  
    // // 정적 파일 서빙 설정
    // app.useStaticAssets(join(process.cwd(), 'uploads'), {
    //   prefix: '/uploads/',
    //   index: false, // 디렉토리 인덱싱 비활성화
    //   redirect: false, // 디렉토리 리다이렉션 비활성화
    //   dotfiles: 'deny', // 숨김 파일 접근 차단
    //   setHeaders: (res, path, stat) => {
    //     // 캐시 설정
    //     res.set('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
    //     // 보안 헤더 추가
    //     res.set('X-Content-Type-Options', 'nosniff');
    //   },
    // });
  
  // cookie-parser 추가
  app.use(cookieParser());

  // 환경별 origin 설정
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN');

  // CORS 설정 추가
  const allowedOrigins = [
    frontendOrigin,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://3.34.199.169:3000',
    'http://3.34.199.169:3002',
    'http://10.0.2.2:3000',
    'http://localhost:7357',  // 플러터 웹 기본 포트
    'http://localhost:8080',  // 대체 포트
    'http://10.0.2.2:3000',   // Android 에뮬레이터
    'http://127.0.0.1:3000',  // iOS 시뮬레이터
  ].filter(Boolean); // undefined 값 제거

  app.enableCors({
  origin: (origin, callback) => {
    // 개발 환경에서는 모든 origin 허용
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // origin이 없는 경우 (같은 도메인 요청) 허용
    if (!origin) {
      return callback(null, true);
    }
    
    // 허용된 origin 목록에 있는지 확인
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
    credentials: true, // 쿠키 전송 허용
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Origin',
      'x-member-seq',
      'Accept',
      'Accept-Language',
      'Content-Language',
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

  // TransformInterceptor, TokenResponseInterceptor 전역 적용
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new TokenResponseInterceptor(),
  );

  const PORT = configService.get<number>('PORT') ?? 3000;
  await app.listen(PORT);
  
  logger.log(`Server running on port ${PORT}`);
  logger.log(`DB Host: ${configService.get<string>('DB_HOST')}`);
  logger.log(`Redis Host: ${configService.get<string>('REDIS_HOST')}`);
}

bootstrap();
