# MelodicaLife - 音楽による光子生命体進化シミュレーター

## 🎯 概要
音楽をリアルタイム解析し、その特徴に基づいて光子をモチーフとした人工生命体が進化・成長するWebアプリケーション

## 🚀 クイックスタート

### 必要な環境
- Docker & Docker Compose
- **Node.jsのローカルインストールは不要** - すべてコンテナ内で実行

### 起動手順
```bash
# プロジェクトクローン
git clone <repository-url>
cd MelodicaLife

# 開発環境起動（依存関係は自動でコンテナ内にインストール）
make dev

# ブラウザで http://localhost:5173 にアクセス
```

## 📋 開発コマンド
```bash
make dev       # 開発環境起動（推奨）
make up        # 本番環境起動
make down      # 停止
make build     # ビルド
make clean     # クリーンアップ
make logs      # ログ表示
```

## ✨ 特徴
- **完全コンテナ化**: すべての依存関係はDocker内で管理
- **ホットリロード**: ソースコード変更の即座反映
- **ボリュームマウント**: node_modulesはコンテナボリューム内で永続化

## 🏗️ 技術スタック
- **Frontend**: React 18.3.1 + TypeScript + Three.js + Vite
- **Backend**: Node.js 18 + Express + Socket.io
- **Database**: MongoDB 7.0
- **Audio**: Web Audio API + Meyda
- **3D Graphics**: Three.js + React Three Fiber

## 📖 開発ガイド
### 初回起動
```bash
make dev  # すべて自動セットアップ
```

### ログ確認
```bash
make logs  # 全サービスのログ
docker-compose -f docker-compose.dev.yml logs frontend  # フロントエンドのみ
docker-compose -f docker-compose.dev.yml logs backend   # バックエンドのみ
```

### 完全リセット
```bash
make clean  # コンテナ・ボリューム・イメージ削除
make dev    # 再起動
```
