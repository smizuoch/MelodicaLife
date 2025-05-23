import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import youtubeRoutes from './routes/youtube.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/melodicalife';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "http:"],
      frameSrc: ["'self'", "https://www.youtube.com"]
    }
  }
}));

// CORS設定を強化
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB接続
mongoose.connect(MONGODB_URL)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ルート設定
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    ytdlp: process.env.YTDLP_PATH || 'yt-dlp'
  });
});

app.use('/api/youtube', youtubeRoutes);

// 音楽ストリーミング用のプロキシルート
app.get('/api/proxy/audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    console.log('Proxying audio from:', url);

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*,*/*;q=0.9',
        'Accept-Encoding': 'identity',
        'Range': req.headers.range || 'bytes=0-'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    // ヘッダーをコピー
    res.set({
      'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Content-Length': response.headers.get('content-length') || undefined,
      'Cache-Control': 'public, max-age=3600'
    });

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      res.set('Content-Range', contentRange);
      res.status(206);
    }

    if (response.body) {
      response.body.pipe(res);
    } else {
      res.status(500).json({ error: 'No response body' });
    }
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy audio' });
  }
});

// Socket.IO接続処理
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // 音楽特徴データの受信
  socket.on('audio-features', (data) => {
    // 他のクライアントに音楽特徴を転送
    socket.broadcast.emit('audio-features-update', data);
  });

  // 生命体データの受信
  socket.on('lifeform-update', (data) => {
    socket.broadcast.emit('lifeform-sync', data);
  });

  // 進化イベントの受信
  socket.on('evolution-event', (data) => {
    socket.broadcast.emit('evolution-broadcast', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404ハンドリング
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// サーバー起動
server.listen(PORT, () => {
  console.log(`🚀 MelodicaLife Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
