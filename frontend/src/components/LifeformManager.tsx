import React, { useState, useEffect } from 'react';

interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
}

interface LifeformManagerProps {
  audioFeatures: AudioFeatures;
}

interface LifeformStats {
  count: number;
  averageEnergy: number;
  generations: number;
  dominantColor: string;
}

const LifeformManager: React.FC<LifeformManagerProps> = ({ audioFeatures }) => {
  const [stats, setStats] = useState<LifeformStats>({
    count: 3,
    averageEnergy: 75,
    generations: 1,
    dominantColor: '#ffffff'
  });

  const [settings, setSettings] = useState({
    maxLifeforms: 10,
    energyThreshold: 50,
    evolutionRate: 1.0,
    interactionStrength: 0.5
  });

  useEffect(() => {
    // 音楽特徴に基づいて統計を更新
    const energyFromMusic = (audioFeatures.volume + audioFeatures.bpm / 2) / 2;
    const hue = (audioFeatures.pitch - 220) / 660 * 360;
    
    setStats(prev => ({
      ...prev,
      averageEnergy: Math.max(0, Math.min(100, energyFromMusic)),
      dominantColor: `hsl(${hue}, 70%, 60%)`
    }));
  }, [audioFeatures]);

  const addLifeform = () => {
    if (stats.count < settings.maxLifeforms) {
      setStats(prev => ({ ...prev, count: prev.count + 1 }));
    }
  };

  const removeLifeform = () => {
    if (stats.count > 1) {
      setStats(prev => ({ ...prev, count: prev.count - 1 }));
    }
  };

  const resetEcosystem = () => {
    setStats({
      count: 3,
      averageEnergy: 75,
      generations: 1,
      dominantColor: '#ffffff'
    });
  };

  return (
    <div className="lifeform-manager">
      <h3>🌌 Flow Dynamics</h3>
      
      {/* 流れパターン表示 */}
      <div className="flow-pattern">
        <h4>Current Flow Pattern</h4>
        <div className="flow-indicator">
          {audioFeatures.volume > 80 && <span className="pattern-vortex">🌪️ Vortex</span>}
          {audioFeatures.volume > 60 && audioFeatures.volume <= 80 && <span className="pattern-stream">🌊 Stream</span>}
          {audioFeatures.volume > 30 && audioFeatures.volume <= 60 && <span className="pattern-wave">〰️ Wave</span>}
          {audioFeatures.volume <= 30 && <span className="pattern-spiral">🌀 Spiral</span>}
        </div>
      </div>

      {/* 音楽統計 */}
      <div className="music-stats">
        <div className="stat">
          <label>Volume:</label>
          <div className="stat-bar">
            <div 
              className="stat-fill volume" 
              style={{ width: `${audioFeatures.volume}%` }}
            />
          </div>
          <span>{audioFeatures.volume.toFixed(1)}%</span>
        </div>
        
        <div className="stat">
          <label>BPM:</label>
          <div className="stat-bar">
            <div 
              className="stat-fill bpm" 
              style={{ width: `${(audioFeatures.bpm / 180) * 100}%` }}
            />
          </div>
          <span>{audioFeatures.bpm.toFixed(0)}</span>
        </div>
        
        <div className="stat">
          <label>Pitch:</label>
          <div className="stat-bar">
            <div 
              className="stat-fill pitch" 
              style={{ width: `${((audioFeatures.pitch - 220) / 660) * 100}%` }}
            />
          </div>
          <span>{audioFeatures.pitch.toFixed(0)}Hz</span>
        </div>
      </div>

      {/* 流れの強度 */}
      <div className="flow-intensity">
        <h4>Flow Intensity</h4>
        <div className="intensity-meter">
          <div 
            className="intensity-fill" 
            style={{ 
              height: `${(audioFeatures.volume + audioFeatures.bpm / 2) / 150 * 100}%`,
              background: `hsl(${(audioFeatures.pitch - 220) / 660 * 360}, 70%, 50%)`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LifeformManager;
