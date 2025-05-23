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

      // yt-dlpでプレイリスト情報を取得（制限を50件に拡張）
      const command = `${this.ytDlpPath} --dump-json --flat-playlist --playlist-end 50 --no-warnings --no-check-certificate "${playlistUrl}"`;
      console.log(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 120000, // タイムアウトを2分に延長
        maxBuffer: 1024 * 1024 * 50 // バッファを50MBに拡張
      });

      if (stderr && !stderr.includes('WARNING')) {
        console.warn('yt-dlp stderr:', stderr);
      }

      if (!stdout.trim()) {
        throw new Error('No data returned from yt-dlp for playlist');
      }

      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const videos: VideoInfo[] = [];
      
      let playlistTitle = 'Unknown Playlist';

      console.log(`Processing ${lines.length} playlist entries...`);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          
          // プレイリストタイトルを取得
          if (entry.playlist_title && playlistTitle === 'Unknown Playlist') {
            playlistTitle = entry.playlist_title;
          }

          // 動画エントリーのみ処理
          if (entry.id && entry.title && entry._type !== 'playlist') {
            videos.push({
              id: entry.id,
              title: entry.title,
              duration: parseInt(entry.duration) || 0,
              thumbnail: entry.thumbnail || `https://img.youtube.com/vi/${entry.id}/mqdefault.jpg`,
              audioUrl: '' // 後で取得
            });
          }
        } catch (parseError) {
          console.warn('Failed to parse playlist entry:', line.substring(0, 100), parseError);
        }
      }

      console.log(`Successfully parsed ${videos.length} videos from playlist`);

      // 最大50件まで返す
      return {
        id: playlistId,
        title: playlistTitle,
        videos: videos.slice(0, 50)
      };
    } catch (error) {
      console.error('Failed to get playlist info:', error);
      
      // フォールバック：直接プレイリストURLからビデオIDを抽出を試行
      try {
        console.log('Trying fallback method...');
        return await this.getFallbackPlaylistInfo(playlistUrl);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw new Error(`Failed to fetch playlist information: ${(error as Error).message}`);
      }
    }
  }

  // フォールバック方法：より簡単なプレイリスト取得
  private async getFallbackPlaylistInfo(playlistUrl: string): Promise<PlaylistInfo> {
    const playlistId = this.extractPlaylistId(playlistUrl);
    if (!playlistId) throw new Error('Invalid playlist URL');

    console.log('Using fallback playlist method...');

    // より基本的なコマンドを使用
    const command = `${this.ytDlpPath} --flat-playlist --print id --print title --playlist-end 50 "${playlistUrl}"`;
    
    const { stdout } = await execAsync(command, { 
      timeout: 90000,
      maxBuffer: 1024 * 1024 * 20
    });

    const lines = stdout.trim().split('\n');
    const videos: VideoInfo[] = [];
    
    // IDとタイトルが交互に出力されると仮定
    for (let i = 0; i < lines.length; i += 2) {
      const id = lines[i]?.trim();
      const title = lines[i + 1]?.trim();
      
      if (id && title && id.length === 11) { // YouTube video ID は11文字
        videos.push({
          id,
          title,
          duration: 180, // デフォルト値
          thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
          audioUrl: ''
        });
      }
    }

    return {
      id: playlistId,
      title: `Playlist ${playlistId}`,
      videos
    };
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
