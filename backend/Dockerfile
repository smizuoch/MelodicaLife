FROM node:18-alpine as builder

# Python仮想環境とyt-dlpをインストール
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install yt-dlp

# PATHに仮想環境を追加
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 依存関係をコンテナ内でインストール
RUN npm cache clean --force && \
    npm install --no-package-lock

# ソースコードをコピー
COPY . .

# TypeScriptビルド
RUN npm run build

# Production stage
FROM node:18-alpine

# Python仮想環境とyt-dlpをインストール
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install yt-dlp

# PATHに仮想環境を追加
ENV PATH="/opt/venv/bin:$PATH"
ENV YTDLP_PATH="/opt/venv/bin/yt-dlp"

WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 本番用依存関係のみインストール
RUN npm cache clean --force && \
    npm install --no-package-lock --omit=dev

# ビルド済みJSファイルをコピー
COPY --from=builder /app/dist ./dist

# キャッシュディレクトリを作成
RUN mkdir -p cache

EXPOSE 3001

# yt-dlpが利用可能かテスト
RUN yt-dlp --version || echo "yt-dlp not found but continuing"

CMD ["npm", "start"]
