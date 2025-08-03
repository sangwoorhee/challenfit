// src/common/config/multer-s3-config.ts
import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as multerS3 from 'multer-s3';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// 환경변수 가져오기 헬퍼 함수
const getEnvValue = (configService: ConfigService, key: string): string | undefined => {
  // 1. ConfigService에서 먼저 시도
  const configValue = configService.get<string>(key);
  if (configValue) return configValue;
  
  // 2. process.env에서 직접 시도
  const envValue = process.env[key];
  if (envValue) return envValue;
  
  // 3. .env 파일 다시 로드 시도 (동기적)
  try {
    require('dotenv').config({ path: '.env' });
    return process.env[key];
  } catch (e) {
    console.error(`Failed to load .env file: ${e}`);
  }
  
  return undefined;
};

// S3 클라이언트 생성 함수
export const createS3Client = (configService: ConfigService) => {
  const region = getEnvValue(configService, 'AWS_S3_REGION');
  const accessKeyId = getEnvValue(configService, 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = getEnvValue(configService, 'AWS_SECRET_ACCESS_KEY');

  console.log('S3 Configuration Debug:', {
    region: region ? `${region.substring(0, 5)}...` : 'NOT FOUND',
    accessKeyId: accessKeyId ? `${accessKeyId.substring(0, 5)}...` : 'NOT FOUND',
    secretAccessKey: secretAccessKey ? 'SET' : 'NOT FOUND',
    cwd: process.cwd(),
    envPath: `${process.cwd()}/.env`,
  });

  if (!region || !accessKeyId || !secretAccessKey) {
    const errorMsg = `AWS S3 설정이 누락되었습니다. 
    Region: ${region ? 'SET' : 'MISSING'}
    AccessKeyId: ${accessKeyId ? 'SET' : 'MISSING'}
    SecretAccessKey: ${secretAccessKey ? 'SET' : 'MISSING'}
    Current Directory: ${process.cwd()}
    `;
    console.error(errorMsg);
    throw new Error('AWS S3 설정이 누락되었습니다. AWS_S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY를 확인해주세요.');
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

// S3 multer 설정 생성 함수
export const createS3MulterConfig = (
  uploadDir: string,
  configService: ConfigService,
) => {
  const s3 = createS3Client(configService);
  const bucketName = getEnvValue(configService, 'AWS_S3_BUCKET_NAME');

  if (!bucketName) {
    throw new Error('AWS S3 버킷명이 누락되었습니다. AWS_S3_BUCKET_NAME을 확인해주세요.');
  }

  return {
    storage: multerS3({
      s3: s3,
      bucket: bucketName,
      // acl: 'public-read', // ACL 비활성화된 버킷에서는 주석처리
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const uniqueName = uuidv4() + extname(file.originalname);
        const key = `${uploadDir}/${uniqueName}`;
        cb(null, key);
      },
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(null, true);
      } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB 제한
    },
  };
};

// 기본 S3 설정 (workout-images용)
export const getS3MulterConfig = (configService: ConfigService) => {
  return createS3MulterConfig('workout-images', configService);
};