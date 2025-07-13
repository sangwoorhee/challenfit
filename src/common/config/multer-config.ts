// src/common/config/multer-config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// 동적으로 multer 설정을 생성하는 함수
export const createMulterConfig = (uploadDir: string) => {
  const uploadPath = `./uploads/${uploadDir}`;

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  return {
    storage: diskStorage({
      destination: uploadPath,
      filename: (req, file, cb) => {
        const uniqueName = uuidv4() + extname(file.originalname);
        cb(null, uniqueName);
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

// 기존 코드와의 호환성을 위한 기본 설정
export const multerConfig = createMulterConfig('workout-images');