import express from 'express';
import { YouTubeService } from '../services/youtubeService.js';

const router = express.Router();
const youtubeService = YouTubeService.getInstance();

// 動画情報取得
router.post('/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('Received video info request for:', url);
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // URLの検証
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const videoInfo = await youtubeService.getVideoInfo(url);
    console.log('Video info retrieved:', videoInfo.title);
    
    res.json(videoInfo);
  } catch (error) {
    console.error('Video info error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// プレイリスト情報取得
router.post('/playlist-info', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('Received playlist info request for:', url);
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('list=')) {
      return res.status(400).json({ error: 'Invalid playlist URL' });
    }

    const playlistInfo = await youtubeService.getPlaylistInfo(url);
    console.log('Playlist info retrieved:', playlistInfo.title, playlistInfo.videos.length, 'videos');
    
    res.json(playlistInfo);
  } catch (error) {
    console.error('Playlist info error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// 音声ストリーム取得
router.post('/audio-stream', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('Received audio stream request for:', url);
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const audioUrl = await youtubeService.getAudioStream(url);
    console.log('Audio stream retrieved successfully');
    
    res.json({ audioUrl });
  } catch (error) {
    console.error('Audio stream error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ヘルスチェック
router.get('/health', (req, res) => {
  res.json({ status: 'YouTube service is running' });
});

export default router;
