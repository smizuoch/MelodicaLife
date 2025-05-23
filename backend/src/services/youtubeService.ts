import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  audioUrl: string;
}

interface PlaylistInfo {
  id: string;
  title: string;
  videos: VideoInfo[];
}

export class YouTubeService {
  private static instance: YouTubeService;
  private cachePath = path.join(process.cwd(), 'cache');
  private ytDlpPath = process.env.YTDLP_PATH || 'yt-dlp';

  constructor() {
    // キャッシュディレクトリを作成
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
  }

  public static getInstance(): YouTubeService {
    if (!YouTubeService.instance) {
      YouTubeService.instance = new YouTubeService();
    }
    return YouTubeService.instance;
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) throw new Error('Invalid YouTube URL');

      console.log(`Getting video info for: ${url}`);

      // より安全なyt-dlpコマンド
      const command = `${this.ytDlpPath} --dump-json --no-warnings --no-playlist --no-check-certificate --user-agent "Mozilla/5.0" "${url}"`;
      console.log(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 45000,
        maxBuffer: 1024 * 1024 * 20,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      if (stderr && !stderr.includes('WARNING')) {
        console.error('yt-dlp stderr:', stderr);
      }

      if (!stdout.trim()) {
        throw new Error('No data returned from yt-dlp');
      }

      const videoData = JSON.parse(stdout);

      return {
        id: videoId,
        title: videoData.title || videoData.fulltitle || `Video ${videoId}`,
        duration: Math.floor(videoData.duration) || 180,
        thumbnail: this.getBestThumbnail(videoData),
        audioUrl: '' // 別途取得
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      return this.getFallbackVideoInfo(url);
    }
  }

  async getPlaylistInfo(playlistUrl: string): Promise<PlaylistInfo> {
    try {
      const playlistId = this.extractPlaylistId(playlistUrl);
      if (!playlistId) throw new Error('Invalid playlist URL');

      console.log(`Getting playlist info for: ${playlistUrl}`);

      // yt-dlpでプレイリスト情報を取得（最初の5件のみ）
      const command = `${this.ytDlpPath} --dump-json --flat-playlist --playlist-end 5 "${playlistUrl}"`;
      console.log(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stderr) {
        console.warn('yt-dlp stderr:', stderr);
      }

      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const videos: VideoInfo[] = [];
      
      let playlistTitle = 'Unknown Playlist';

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          
          if (entry.playlist_title && !playlistTitle.includes('Unknown')) {
            playlistTitle = entry.playlist_title;
          }

          if (entry.id && entry.title) {
            videos.push({
              id: entry.id,
              title: entry.title,
              duration: parseInt(entry.duration) || 0,
              thumbnail: entry.thumbnail || '',
              audioUrl: '' // 後で取得
            });
          }
        } catch (parseError) {
          console.warn('Failed to parse playlist entry:', parseError);
        }
      }

      return {
        id: playlistId,
        title: playlistTitle,
        videos: videos.slice(0, 10) // 最大10件
      };
    } catch (error) {
      console.error('Failed to get playlist info:', error);
      throw new Error('Failed to fetch playlist information');
    }
  }

  async getAudioStream(url: string): Promise<string> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) throw new Error('Invalid YouTube URL');

      console.log(`Getting audio stream for: ${url}`);

      // キャッシュチェック
      const cachedPath = path.join(this.cachePath, `${videoId}_audio.json`);
      if (fs.existsSync(cachedPath)) {
        const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
        if (Date.now() - cached.timestamp < 900000) { // 15分キャッシュ
          console.log('Using cached audio URL');
          return cached.audioUrl;
        }
      }

      // yt-dlpで音声ストリームURLを取得
      const command = `${this.ytDlpPath} -f "bestaudio[ext=m4a]/bestaudio/best[height<=480]" --get-url --no-warnings --no-check-certificate --user-agent "Mozilla/5.0" "${url}"`;
      console.log(`Executing audio command: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 45000,
        maxBuffer: 1024 * 1024 * 5,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      if (stderr && !stderr.includes('WARNING')) {
        console.error('yt-dlp audio stderr:', stderr);
      }

      const audioUrl = stdout.trim().split('\n')[0]; // 最初のURLを使用

      if (!audioUrl || audioUrl.includes('ERROR') || !audioUrl.startsWith('http')) {
        throw new Error('No valid audio stream found');
      }

      console.log('Got audio URL successfully');

      // キャッシュに保存
      try {
        fs.writeFileSync(cachedPath, JSON.stringify({
          audioUrl,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to write cache:', cacheError);
      }

      return audioUrl;
    } catch (error) {
      console.error('Failed to get audio stream:', error);
      throw new Error(`Audio stream unavailable: ${(error as Error).message}`);
    }
  }

  private getBestThumbnail(videoData: any): string {
    if (videoData.thumbnail) return videoData.thumbnail;
    if (videoData.thumbnails && videoData.thumbnails.length > 0) {
      // 中程度の解像度のサムネイルを選択
      const thumb = videoData.thumbnails.find((t: any) => t.width >= 320 && t.width <= 640) 
        || videoData.thumbnails[Math.floor(videoData.thumbnails.length / 2)]
        || videoData.thumbnails[0];
      return thumb.url;
    }
    return `https://img.youtube.com/vi/${this.extractVideoId(videoData.webpage_url || '')}/mqdefault.jpg`;
  }

  private getFallbackVideoInfo(url: string): VideoInfo {
    const videoId = this.extractVideoId(url) || 'unknown';
    return {
      id: videoId,
      title: `YouTube Video ${videoId}`,
      duration: 180,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      audioUrl: ''
    };
  }

  private extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  private extractPlaylistId(url: string): string | null {
    const regex = /[?&]list=([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}
