import React, { useEffect, useState } from 'react';

interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
}

interface AudioAnalyzerProps {
  isPlaying: boolean;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  onFeaturesUpdate: (features: AudioFeatures) => void;
}

const AudioAnalyzer: React.FC<AudioAnalyzerProps> = ({ 
  isPlaying, 
  audioContext, 
  analyser, 
  onFeaturesUpdate 
}) => {
  const [features, setFeatures] = useState<AudioFeatures>({
    bpm: 0,
    pitch: 440,
    volume: 0,
    frequency: []
  });

  useEffect(() => {
    if (isPlaying && analyser) {
      analyzeAudio();
    }
  }, [isPlaying, analyser]);

  const analyzeAudio = () => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const analyze = () => {
      if (!analyser) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // 音楽特徴抽出
      const volume = Array.from(dataArray).reduce((sum, value) => sum + value, 0) / bufferLength;
      const frequency = Array.from(dataArray).slice(0, 12);
      
      // 周波数スペクトラムから主要周波数を検出
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxValue) {
          maxValue = dataArray[i];
          maxIndex = i;
        }
      }
      
      const pitch = (maxIndex * audioContext!.sampleRate) / (2 * bufferLength);
      
      const audioFeatures: AudioFeatures = {
        bpm: estimateBPM(volume),
        pitch: pitch || 440,
        volume: (volume / 255) * 100,
        frequency: frequency.map(f => f / 255)
      };
      
      setFeatures(audioFeatures);
      onFeaturesUpdate(audioFeatures);
      
      if (isPlaying) {
        requestAnimationFrame(analyze);
      }
    };
    
    analyze();
  };

  const estimateBPM = (volume: number): number => {
    // 簡易BPM推定（より複雑なアルゴリズムが必要）
    return Math.max(60, Math.min(180, 120 + (volume - 128) / 2));
  };

  return (
    <div className="audio-analyzer">
      <h3>🎼 Audio Analysis</h3>
      
      <div className="feature-display">
        <div className="feature-item">
          <label>BPM:</label>
          <span>{features.bpm.toFixed(1)}</span>
          <div className="meter">
            <div 
              className="meter-fill bpm" 
              style={{ width: `${(features.bpm / 180) * 100}%` }}
            />
          </div>
        </div>

        <div className="feature-item">
          <label>Pitch:</label>
          <span>{features.pitch.toFixed(1)} Hz</span>
          <div className="meter">
            <div 
              className="meter-fill pitch" 
              style={{ width: `${(features.pitch / 1000) * 100}%` }}
            />
          </div>
        </div>

        <div className="feature-item">
          <label>Volume:</label>
          <span>{features.volume.toFixed(1)} dB</span>
          <div className="meter">
            <div 
              className="meter-fill volume" 
              style={{ width: `${features.volume}%` }}
            />
          </div>
        </div>

        <div className="frequency-spectrum">
          <label>Frequency Spectrum:</label>
          <div className="spectrum-bars">
            {features.frequency.slice(0, 12).map((freq, index) => (
              <div 
                key={index}
                className="spectrum-bar"
                style={{ height: `${Math.abs(freq) * 10}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="status">
        Status: {isPlaying ? '🎵 Analyzing...' : '⏸️ Paused'}
      </div>
    </div>
  );
};

export default AudioAnalyzer;
