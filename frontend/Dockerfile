FROM node:18-alpine as builder

WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 全依存関係をインストール（ビルド用）
RUN npm cache clean --force && \
    npm install --no-package-lock

# ソースコードをコピー
COPY . .

# ビルド
RUN npm run build

# Production stage
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
