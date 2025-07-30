// src/common/config/multer-s3-config.ts
import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as multerS3 from 'multer-s3';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// S3 클라이언트 생성 함수
export const createS3Client = (configService: ConfigService) => {
  const region = configService.get<string>('AWS_S3_REGION');
  const accessKeyId = configService.get<string>('AWS_ACCESS_KEY_ID');
  const secretAccessKey = configService.get<string>('AWS_SECRET_ACCESS_KEY');

  if (!region || !accessKeyId || !secretAccessKey) {
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
  const bucketName = configService.get<string>('AWS_S3_BUCKET_NAME');

  if (!bucketName) {
    throw new Error('AWS S3 버킷명이 누락되었습니다. AWS_S3_BUCKET_NAME을 확인해주세요.');
  }

  return {
    storage: multerS3({
      s3: s3,
      bucket: bucketName,
      acl: 'public-read', // 퍼블릭 읽기 권한
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