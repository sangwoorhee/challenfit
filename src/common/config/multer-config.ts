// src/common/config/multer-config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const uploadPath = './uploads/workout-images';

// 디렉토리가 없으면 생성
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

export const multerConfig = {
  storage: diskStorage({
    destination: uploadPath, // 업로드될 폴더 경로
    filename: (req, file, cb) => {
      // 파일명을 UUID + 확장자로 설정
      const uniqueName = uuidv4() + extname(file.originalname);
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
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