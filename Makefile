.PHONY: up down build clean dev logs

# 開発環境起動
dev:
	@echo "🚀 Starting development environment..."
	docker compose -f docker-compose.dev.yml up --build

# 本番環境起動
up:
	@echo "🚀 Starting MelodicaLife..."
	docker compose up -d --build
	@echo "✅ MelodicaLife is running at http://localhost:3000"

# 停止
down:
	@echo "🛑 Stopping MelodicaLife..."
	docker compose down

# 完全ビルド
build:
	@echo "🔨 Building all services..."
	docker compose build --no-cache

# クリーンアップ
clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v
	docker system prune -f
	@echo "✅ Cleanup completed"

# ログ表示
logs:
	docker compose logs -f

# 初期セットアップ（Dockerコンテナ起動のみ）
setup:
	@echo "🎯 Setup - Starting containers..."
	@echo "All dependencies will be installed inside containers"
	$(MAKE) dev
