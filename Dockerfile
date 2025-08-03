# 빌드 스테이지
FROM node:22-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스코드 복사
COPY . .

# Nest.js 빌드
RUN npm run build

# 실행 스테이지 (Production)
FROM node:22-alpine AS runner

WORKDIR /app

# 빌드 결과물만 runner 스테이지로 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Production 의존성 설치
RUN npm install --only=production \
    && apk add --no-cache curl

# .env 파일은 docker-compose의 env_file로 처리하므로 여기서는 제거

# 포트 설정
EXPOSE 3000

# Health check 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Nest.js 프로덕션용 실행 명령
CMD ["node", "dist/main"]