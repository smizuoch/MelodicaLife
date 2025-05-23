import React, { useState, useRef, useEffect } from 'react';

interface Track {
  id: string;
  title: string;
  url: string;
  duration: number;
  audioUrl?: string;
  thumbnail?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface MusicPlayerProps {
  onPlayStateChange: (isPlaying: boolean) => void;
  onAudioContextChange: (audioContext: AudioContext | null, analyser: AnalyserNode | null) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ onPlayStateChange, onAudioContextChange }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: 'demo',
      name: 'Demo Playlist',
      tracks: [
        { id: '1', title: 'Chill Beat 1', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', duration: 180 },
        { id: '2', title: 'Ambient Sound', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A', duration: 240 },
        { id: '3', title: 'Electronic Vibes', url: 'https://www.youtube.com/watch?v=36YnV9STBqc', duration: 200 }
      ]
    }
  ]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(playlists[0]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLooped, setIsLooped] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextTrackCache, setNextTrackCache] = useState<{[key: string]: string}>({});
  const [isPreloading, setIsPreloading] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (currentPlaylist && currentPlaylist.tracks.length > 0) {
      setCurrentTrack(currentPlaylist.tracks[currentTrackIndex]);
    }
  }, [currentPlaylist, currentTrackIndex]);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      loadTrackAudio(currentTrack);
    }
  }, [currentTrack]);

  // 次のトラックの先読み
  useEffect(() => {
    if (currentPlaylist && currentTrackIndex < currentPlaylist.tracks.length - 1) {
      preloadNextTrack();
    }
  }, [currentTrackIndex, currentPlaylist]);

  const loadPlaylistFromUrl = async (url: string) => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading from URL:', url);

      if (url.includes('list=')) {
        // プレイリストの場合
        console.log('Loading as playlist');
        const response = await fetch('http://localhost:3001/api/youtube/playlist-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        const responseText = await response.text();
        console.log('Playlist response:', responseText);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} - ${responseText}`);
        }

        const playlistData = JSON.parse(responseText);
        
        const newPlaylist: Playlist = {
          id: playlistData.id,
          name: playlistData.title,
          tracks: playlistData.videos.map((video: any) => ({
            id: video.id,
            title: video.title,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            duration: video.duration,
            audioUrl: video.audioUrl,
            thumbnail: video.thumbnail
          }))
        };

        setPlaylists(prev => [...prev, newPlaylist]);
        setCurrentPlaylist(newPlaylist);
        setCurrentTrackIndex(0);
        setPlaylistUrl('');
      } else {
        // 単一動画の場合
        console.log('Loading as single video');
        const response = await fetch('http://localhost:3001/api/youtube/video-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        const responseText = await response.text();
        console.log('Video response:', responseText);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} - ${responseText}`);
        }

        const videoData = JSON.parse(responseText);
        
        const newTrack: Track = {
          id: videoData.id,
          title: videoData.title,
          url: url,
          duration: videoData.duration,
          audioUrl: videoData.audioUrl,
          thumbnail: videoData.thumbnail
        };

        const newPlaylist: Playlist = {
          id: 'single_' + videoData.id,
          name: 'Imported Track',
          tracks: [newTrack]
        };

        setPlaylists(prev => [...prev, newPlaylist]);
        setCurrentPlaylist(newPlaylist);
        setCurrentTrackIndex(0);
        setPlaylistUrl('');
      }
    } catch (error) {
      console.error('Failed to load from URL:', error);
      setError(`Failed to load: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 次のトラックを先読み
  const preloadNextTrack = async () => {
    if (!currentPlaylist || isPreloading) return;
    
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex >= currentPlaylist.tracks.length) return;
    
    const nextTrack = currentPlaylist.tracks[nextIndex];
    if (nextTrackCache[nextTrack.id] || nextTrack.audioUrl) return;

    setIsPreloading(true);
    
    try {
      console.log('Preloading next track:', nextTrack.title);
      
      const response = await fetch('http://localhost:3001/api/youtube/audio-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: nextTrack.url }),
      });

      if (response.ok) {
        const { audioUrl } = await response.json();
        const proxyUrl = `http://localhost:3001/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`;
        
        setNextTrackCache(prev => ({
          ...prev,
          [nextTrack.id]: proxyUrl
        }));
        
        console.log('Next track preloaded successfully');
      }
    } catch (error) {
      console.warn('Failed to preload next track:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  const loadTrackAudio = async (track: Track) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading audio for track:', track.title);
      
      // キャッシュされた音源があるかチェック
      if (nextTrackCache[track.id]) {
        console.log('Using preloaded audio');
        track.audioUrl = nextTrackCache[track.id];
        
        if (audioRef.current) {
          audioRef.current.src = track.audioUrl;
          audioRef.current.load();
          setupAudioContext();
        }
        
        // キャッシュから削除
        setNextTrackCache(prev => {
          const newCache = { ...prev };
          delete newCache[track.id];
          return newCache;
        });
        
        return;
      }
      
      // 既にaudioUrlがある場合
      if (track.audioUrl) {
        if (audioRef.current) {
          audioRef.current.src = track.audioUrl;
          audioRef.current.load();
          setupAudioContext();
        }
        return;
      }

      // 新規取得
      const response = await fetch('http://localhost:3001/api/youtube/audio-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: track.url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get audio: ${response.status}`);
      }

      const { audioUrl } = await response.json();
      
      if (!audioUrl) {
        throw new Error('No audio URL received');
      }

      const proxyUrl = `http://localhost:3001/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`;
      
      if (audioRef.current) {
        audioRef.current.src = proxyUrl;
        audioRef.current.load();
        
        // オーディオ要素のイベントリスナーを設定
        audioRef.current.addEventListener('loadstart', () => {
          console.log('Audio loading started');
        });
        
        audioRef.current.addEventListener('canplay', () => {
          console.log('Audio can start playing');
          setupAudioContext();
        });
        
        audioRef.current.addEventListener('error', (e) => {
          console.error('Audio error:', e);
          setError('Audio playback error');
        });
      }
      
      track.audioUrl = proxyUrl;
      
      console.log('Audio URL set successfully');
    } catch (error) {
      console.error('Failed to load track audio:', error);
      setError(`Failed to load audio: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const convertYouTubeUrl = (url: string): string => {
    // 実際の実装では youtube-dl や外部APIを使用
    // デモ用にサンプル音楽ファイルを返す
    const demoTracks = [
      'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      'https://www.soundjay.com/misc/sounds/bell-ringing-04.wav',
      'https://www.soundjay.com/misc/sounds/bell-ringing-03.wav'
    ];
    const index = Math.abs(url.hashCode()) % demoTracks.length;
    return demoTracks[index];
  };

  const setupAudioContext = async () => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      console.log('Setting up audio context');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      onAudioContextChange(audioContextRef.current, analyserRef.current);
      console.log('Audio context setup complete');
    } catch (error) {
      console.error('Audio context setup failed:', error);
    }
  };

  const handlePlay = async () => {
    if (!audioRef.current || !currentTrack) return;

    try {
      // ユーザーインタラクションを記録
      setUserInteracted(true);
      
      // まずオーディオコンテキストを再開
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // オーディオが準備できていない場合は読み込み
      if (!currentTrack.audioUrl) {
        await loadTrackAudio(currentTrack);
        // 読み込み完了後に再生
        setTimeout(async () => {
          if (audioRef.current) {
            await audioRef.current.play();
            setIsPlaying(true);
            onPlayStateChange(true);
            setAutoPlayEnabled(true); // 自動再生を有効化
          }
        }, 500);
        return;
      }

      console.log('Starting playback');
      await audioRef.current.play();
      setIsPlaying(true);
      onPlayStateChange(true);
      setAutoPlayEnabled(true); // 自動再生を有効化
    } catch (error) {
      console.error('Play failed:', error);
      setError('Playback failed. Click to retry.');
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPlayStateChange(false);
    }
  };

  const handleNext = () => {
    if (!currentPlaylist) return;
    
    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * currentPlaylist.tracks.length);
    } else {
      nextIndex = (currentTrackIndex + 1) % currentPlaylist.tracks.length;
    }
    setCurrentTrackIndex(nextIndex);
  };

  const handlePrevious = () => {
    if (!currentPlaylist) return;
    
    let prevIndex;
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * currentPlaylist.tracks.length);
    } else {
      prevIndex = currentTrackIndex === 0 ? currentPlaylist.tracks.length - 1 : currentTrackIndex - 1;
    }
    setCurrentTrackIndex(prevIndex);
  };

  const handleTrackEnd = async () => {
    console.log('Track ended, autoPlayEnabled:', autoPlayEnabled);
    
    if (isLooped && currentTrack) {
      // ループモードの場合は同じ曲を再開
      if (audioRef.current && autoPlayEnabled) {
        try {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        } catch (error) {
          console.warn('Loop playback failed:', error);
        }
      }
    } else if (currentPlaylist && currentTrackIndex < currentPlaylist.tracks.length - 1 && autoPlayEnabled) {
      // 次の曲がある場合は自動再生
      console.log('Auto-playing next track');
      const nextIndex = isShuffled ? 
        Math.floor(Math.random() * currentPlaylist.tracks.length) :
        currentTrackIndex + 1;
      
      setCurrentTrackIndex(nextIndex);
      
      // 少し待ってから次の曲を開始
      setTimeout(async () => {
        const nextTrack = currentPlaylist.tracks[nextIndex];
        if (nextTrack) {
          try {
            // キャッシュされた音源があるかチェック
            if (nextTrackCache[nextTrack.id]) {
              console.log('Using preloaded audio for auto-play');
              nextTrack.audioUrl = nextTrackCache[nextTrack.id];
            }
            
            if (nextTrack.audioUrl && audioRef.current) {
              audioRef.current.src = nextTrack.audioUrl;
              await audioRef.current.play();
            } else {
              // 音源がない場合は読み込んでから再生
              await loadTrackAudio(nextTrack);
              if (audioRef.current && nextTrack.audioUrl) {
                setTimeout(async () => {
                  try {
                    await audioRef.current!.play();
                  } catch (error) {
                    console.warn('Auto-play blocked, user interaction required');
                    setIsPlaying(false);
                    onPlayStateChange(false);
                  }
                }, 500);
              }
            }
          } catch (error) {
            console.error('Auto-play failed:', error);
            setIsPlaying(false);
            onPlayStateChange(false);
          }
        }
      }, 300);
    } else if (currentPlaylist && currentPlaylist.tracks.length > 1 && autoPlayEnabled) {
      // プレイリストの最後の場合は最初に戻る
      console.log('Playlist ended, restarting from beginning');
      setCurrentTrackIndex(0);
      
      setTimeout(async () => {
        const firstTrack = currentPlaylist.tracks[0];
        if (firstTrack && audioRef.current) {
          try {
            if (firstTrack.audioUrl) {
              audioRef.current.src = firstTrack.audioUrl;
              await audioRef.current.play();
            } else {
              await loadTrackAudio(firstTrack);
              if (firstTrack.audioUrl) {
                setTimeout(async () => {
                  try {
                    await audioRef.current!.play();
                  } catch (error) {
                    console.warn('Auto-restart blocked');
                    setIsPlaying(false);
                    onPlayStateChange(false);
                  }
                }, 500);
              }
            }
          } catch (error) {
            console.error('Auto-restart failed:', error);
            setIsPlaying(false);
            onPlayStateChange(false);
          }
        }
      }, 300);
    } else {
      // 自動再生が無効または単一トラック
      console.log('Playback ended');
      setIsPlaying(false);
      onPlayStateChange(false);
    }
  };

  // トラック変更時の処理を簡素化
  useEffect(() => {
    if (currentTrack && !currentTrack.audioUrl) {
      loadTrackAudio(currentTrack);
    }
  }, [currentTrackIndex]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="music-player">
      <h3>🎵 Music Player</h3>
      
      {/* Current Track Display */}
      <div className="current-track">
        <div className="track-info">
          <h4>{currentTrack?.title || 'No track selected'}</h4>
          <p>{currentPlaylist?.name}</p>
          {isLoading && <p className="loading">Loading...</p>}
          {isPreloading && <p className="preloading">📥 Preloading next track...</p>}
          {!autoPlayEnabled && userInteracted && (
            <p className="auto-play-hint">🔄 Click auto-play button to enable continuous playback</p>
          )}
          {error && <p className="error">{error}</p>}
        </div>
        <div className="track-art">
          {currentTrack?.thumbnail ? (
            <img 
              src={currentTrack.thumbnail} 
              alt="Track thumbnail" 
              style={{ width: '50px', height: '50px', borderRadius: '4px' }}
            />
          ) : (
            <span>🎼</span>
          )}
        </div>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={handleTrackEnd}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            audioRef.current.volume = volume;
            console.log('Audio metadata loaded, duration:', audioRef.current.duration);
          }
        }}
        onCanPlay={() => {
          console.log('Audio can play');
          setupAudioContext();
        }}
        onPlay={() => {
          console.log('Audio started playing');
          setIsPlaying(true);
          onPlayStateChange(true);
        }}
        onPause={() => {
          console.log('Audio paused');
          setIsPlaying(false);
          onPlayStateChange(false);
        }}
        onError={(e) => {
          console.error('Audio element error:', e);
          setError('Audio playback error');
          
          // エラー時は次の曲に自動スキップ（自動再生が有効な場合のみ）
          if (autoPlayEnabled && currentPlaylist && currentTrackIndex < currentPlaylist.tracks.length - 1) {
            console.log('Skipping to next track due to error');
            setTimeout(() => handleNext(), 1000);
          }
        }}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Progress Bar */}
      <div className="progress-container">
        <span className="time">{formatTime(currentTime)}</span>
        <div 
          className="progress-bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = (currentTrack?.duration || 0) * percent;
            handleSeek(newTime);
          }}
        >
          <div 
            className="progress" 
            style={{ 
              width: `${currentTrack ? (currentTime / currentTrack.duration) * 100 : 0}%` 
            }}
          />
        </div>
        <span className="time">{formatTime(currentTrack?.duration || 0)}</span>
      </div>

      {/* Main Controls */}
      <div className="main-controls">
        <button onClick={handlePrevious} title="Previous" disabled={isLoading}>
          ⏮️
        </button>
        <button 
          onClick={isPlaying ? handlePause : handlePlay} 
          className="play-pause"
          disabled={isLoading}
        >
          {isLoading ? '⏳' : (isPlaying ? '⏸️' : '▶️')}
        </button>
        <button onClick={handleNext} title="Next" disabled={isLoading}>
          ⏭️
        </button>
      </div>

      {/* Debug Info */}
      {import.meta.env.DEV && (
        <div className="debug-info">
          <small>
            Audio URL: {currentTrack?.audioUrl ? '✅' : '❌'}<br/>
            Audio Context: {audioContextRef.current ? '✅' : '❌'}<br/>
            Auto-play: {autoPlayEnabled ? '✅' : '❌'}<br/>
            User Interacted: {userInteracted ? '✅' : '❌'}<br/>
            Current Time: {currentTime.toFixed(1)}s<br/>
            Preloaded: {Object.keys(nextTrackCache).length} tracks
          </small>
        </div>
      )}

      {/* Secondary Controls */}
      <div className="secondary-controls">
        <button 
          onClick={() => setIsShuffled(!isShuffled)}
          className={isShuffled ? 'active' : ''}
          title="Shuffle"
        >
          🔀
        </button>
        <button 
          onClick={() => setIsLooped(!isLooped)}
          className={isLooped ? 'active' : ''}
          title="Loop Current Track"
        >
          🔁
        </button>
        <button 
          onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
          className={autoPlayEnabled ? 'active' : ''}
          title={autoPlayEnabled ? 'Auto-play Enabled' : 'Auto-play Disabled (Click to Enable)'}
        >
          {autoPlayEnabled ? '🔄' : '⏯️'}
        </button>
      </div>

      {/* Volume Control */}
      <div className="volume-control">
        <span>🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
        />
        <span>{Math.round(volume * 100)}%</span>
      </div>

      {/* Playlist Import */}
      <div className="playlist-import">
        <h4>Import from YouTube</h4>
        <div className="url-input">
          <input
            type="text"
            placeholder="YouTube URL or Playlist URL..."
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
          />
          <button 
            onClick={() => loadPlaylistFromUrl(playlistUrl)}
            disabled={isLoading || !playlistUrl}
          >
            {isLoading ? 'Loading...' : 'Import'}
          </button>
        </div>
      </div>

      {/* Playlist Selection */}
      <div className="playlist-selection">
        <h4>Playlists</h4>
        <select 
          value={currentPlaylist?.id || ''}
          onChange={(e) => {
            const playlist = playlists.find(p => p.id === e.target.value);
            if (playlist) {
              setCurrentPlaylist(playlist);
              setCurrentTrackIndex(0);
            }
          }}
        >
          {playlists.map(playlist => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name} ({playlist.tracks.length} tracks)
            </option>
          ))}
        </select>
      </div>

      {/* Track List */}
      <div className="track-list">
        <h4>Tracks ({currentPlaylist?.tracks.length || 0})</h4>
        <div className="tracks" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {currentPlaylist?.tracks.map((track, index) => (
            <div 
              key={track.id}
              className={`track-item ${index === currentTrackIndex ? 'active' : ''} ${
                nextTrackCache[track.id] ? 'preloaded' : ''
              }`}
              onClick={() => setCurrentTrackIndex(index)}
            >
              <span className="track-number">{index + 1}</span>
              <span className="track-title" title={track.title}>{track.title}</span>
              <span className="track-status">
                {index === currentTrackIndex && isPlaying && '▶️'}
                {index === currentTrackIndex && !isPlaying && '⏸️'}
                {nextTrackCache[track.id] && '📥'}
              </span>
              <span className="track-duration">{formatTime(track.duration)}</span>
            </div>
          ))}
        </div>
        
        {/* プレイリスト統計 */}
        {currentPlaylist && (
          <div className="playlist-stats" style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.8rem', 
            opacity: 0.7,
            padding: '0.5rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px'
          }}>
            <div>Total tracks: {currentPlaylist.tracks.length}</div>
            <div>Total duration: {formatTime(
              currentPlaylist.tracks.reduce((sum, track) => sum + track.duration, 0)
            )}</div>
            <div>Current: {currentTrackIndex + 1}/{currentPlaylist.tracks.length}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// String.prototype.hashCode拡張
declare global {
  interface String {
    hashCode(): number;
  }
}

String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

export default MusicPlayer;
