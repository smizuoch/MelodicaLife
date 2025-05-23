import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import Scene3D from './components/Scene3D';
import MusicPlayer from './components/MusicPlayer';
import AudioAnalyzer from './components/AudioAnalyzer';
import EvolutionTree from './components/EvolutionTree';
import LifeformManager from './components/LifeformManager';
import './App.css';

interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
}

function App() {
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({
    bpm: 0,
    pitch: 440,
    volume: 0,
    frequency: []
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const handleAudioContextChange = (context: AudioContext | null, analyserNode: AnalyserNode | null) => {
    setAudioContext(context);
    setAnalyser(analyserNode);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 MelodicaLife</h1>
        <p>音楽による光子生命体進化シミュレーター - Music Player Edition</p>
      </header>

      <main className="app-main">
        {/* 3D Canvas */}
        <div className="canvas-container">
          <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Scene3D audioFeatures={audioFeatures} />
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
            {/* 開発環境でのみFPS表示 */}
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </div>

        {/* Control Panel */}
        <aside className="control-panel">
          <MusicPlayer 
            onPlayStateChange={setIsPlaying}
            onAudioContextChange={handleAudioContextChange}
          />
          <AudioAnalyzer 
            isPlaying={isPlaying}
            audioContext={audioContext}
            analyser={analyser}
            onFeaturesUpdate={setAudioFeatures}
          />
          <LifeformManager audioFeatures={audioFeatures} />
          <EvolutionTree />
        </aside>
      </main>
    </div>
  );
}

export default App;
