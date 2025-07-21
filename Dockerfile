FROM node:18-alpine

WORKDIR /app

# 프로젝트 파일 복사
COPY . .

# 의존성 설치
RUN npm install

# uploads 디렉토리 생성
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "server.js"]
