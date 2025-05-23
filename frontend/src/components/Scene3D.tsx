import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Color } from 'three';
import { EvolutionaryParticle } from '../engine/PhotonLife';

interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
}

interface Scene3DProps {
  audioFeatures: AudioFeatures;
}

const Scene3D: React.FC<Scene3DProps> = ({ audioFeatures }) => {
  const groupRef = useRef<Group>(null);
  const evolutionaryParticlesRef = useRef<EvolutionaryParticle[]>([]);
  const particleSystemRef = useRef<any>(null);
  const frameCountRef = useRef(0);
  const neighborCacheRef = useRef<Map<number, EvolutionaryParticle[]>>(new Map());

  const particleCount = 1200; // 最適化のため少し減らす
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const col = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      col[i * 3] = Math.random();
      col[i * 3 + 1] = Math.random();
      col[i * 3 + 2] = Math.random();
    }
    return col;
  }, []);

  // 進化型粒子を初期化
  useEffect(() => {
    evolutionaryParticlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = new EvolutionaryParticle([
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      ]);
      evolutionaryParticlesRef.current.push(particle);
    }
  }, []);

  useFrame((_, delta) => {
    frameCountRef.current++;
    
    if (groupRef.current) {
      // 音楽のBPMに同期した回転
      const rotationSpeed = (audioFeatures.bpm / 120) * 0.02;
      groupRef.current.rotation.y += delta * rotationSpeed;
    }

    updateEvolutionarySystem(delta);
  });

  const updateEvolutionarySystem = (delta: number) => {
    if (!particleSystemRef.current || evolutionaryParticlesRef.current.length === 0) return;

    const positionAttribute = particleSystemRef.current.geometry.attributes.position;
    const colorAttribute = particleSystemRef.current.geometry.attributes.color;
    const positions = positionAttribute.array;
    const colors = colorAttribute.array;

    // 近隣キャッシュを定期的にクリア（最適化）
    if (frameCountRef.current % 10 === 0) {
      neighborCacheRef.current.clear();
    }

    // 各粒子を更新
    evolutionaryParticlesRef.current.forEach((particle, index) => {
      // 近隣粒子をキャッシュから取得または計算
      let neighbors = neighborCacheRef.current.get(index);
      if (!neighbors || frameCountRef.current % 5 === 0) {
        neighbors = findEvolutionaryNeighbors(particle, 3.0);
        neighborCacheRef.current.set(index, neighbors);
      }
      
      // 粒子を更新
      particle.update(audioFeatures, neighbors, delta);
      
      // 位置と色をバッファに反映
      const i3 = index * 3;
      positions[i3] = particle.position[0];
      positions[i3 + 1] = particle.position[1];
      positions[i3 + 2] = particle.position[2];
      
      colors[i3] = particle.color[0];
      colors[i3 + 1] = particle.color[1];
      colors[i3 + 2] = particle.color[2];
    });

    positionAttribute.needsUpdate = true;
    // 色更新頻度を下げて最適化
    if (frameCountRef.current % 2 === 0) {
      colorAttribute.needsUpdate = true;
    }
  };

  const findEvolutionaryNeighbors = (particle: EvolutionaryParticle, radius: number): EvolutionaryParticle[] => {
    const neighbors: EvolutionaryParticle[] = [];
    const maxNeighbors = 15; // 最適化のため削減
    const radiusSq = radius * radius; // 平方根計算を避ける最適化

    for (let i = 0; i < evolutionaryParticlesRef.current.length && neighbors.length < maxNeighbors; i++) {
      const other = evolutionaryParticlesRef.current[i];
      if (other === particle) continue;

      const dx = other.position[0] - particle.position[0];
      const dy = other.position[1] - particle.position[1];
      const dz = other.position[2] - particle.position[2];
      const distanceSq = dx * dx + dy * dy + dz * dz;

      if (distanceSq < radiusSq) {
        neighbors.push(other);
      }
    }

    return neighbors;
  };

  return (
    <group ref={groupRef}>
      {/* 背景環境 - 音楽に反応 */}
      <mesh>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial 
          color={new Color().setHSL(
            (audioFeatures.pitch - 220) / 660,
            0.3,
            0.05 + (audioFeatures.volume / 100) * 0.05
          )} 
          transparent 
          opacity={0.03} 
        />
      </mesh>

      {/* 進化型粒子システム */}
      <points ref={particleSystemRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial 
          size={0.025 + (audioFeatures.volume / 100) * 0.02}
          vertexColors
          transparent 
          opacity={0.85}
          sizeAttenuation={true}
          blending={2}
        />
      </points>

      {/* 流動接続線 */}
      <FlowConnections 
        particles={evolutionaryParticlesRef.current}
        audioFeatures={audioFeatures}
        frameCount={frameCountRef.current}
      />

      {/* 音楽波動エフェクト */}
      <MusicWaveEffect 
        audioFeatures={audioFeatures}
        frameCount={frameCountRef.current}
      />
    </group>
  );
};

// 流動接続線コンポーネント - 最適化版
const FlowConnections: React.FC<{
  particles: EvolutionaryParticle[];
  audioFeatures: AudioFeatures;
  frameCount: number;
}> = ({ particles, audioFeatures, frameCount }) => {
  const linesRef = useRef<any>(null);
  
  const linePositions = useMemo(() => {
    // 更新頻度を下げて最適化
    if (frameCount % 3 !== 0) return new Float32Array(0);

    const linePos: number[] = [];
    const maxConnections = 600; // 最適化
    let connectionCount = 0;

    for (let i = 0; i < particles.length && connectionCount < maxConnections; i++) {
      const particle = particles[i];
      if (!particle) continue;

      const connectionThreshold = 1.8 - particle.traits.socialTendency * 0.5;
      
      for (let j = i + 1; j < Math.min(i + 10, particles.length) && connectionCount < maxConnections; j++) {
        const other = particles[j];
        if (!other) continue;

        const dx = other.position[0] - particle.position[0];
        const dy = other.position[1] - particle.position[1];
        const dz = other.position[2] - particle.position[2];
        const distanceSq = dx*dx + dy*dy + dz*dz;
        
        if (distanceSq < connectionThreshold * connectionThreshold) {
          linePos.push(
            particle.position[0], particle.position[1], particle.position[2],
            other.position[0], other.position[1], other.position[2]
          );
          connectionCount++;
        }
      }
    }

    return new Float32Array(linePos);
  }, [particles, frameCount]);

  useFrame(() => {
    if (linesRef.current) {
      const opacity = (audioFeatures.volume / 100) * 0.5;
      linesRef.current.material.opacity = Math.max(0.03, opacity);
      
      // 音楽に合わせて色変化
      const hue = (audioFeatures.pitch - 220) / 660;
      linesRef.current.material.color.setHSL(hue, 0.8, 0.6);
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={linePositions.length / 3}
          array={linePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color={0x66aaff}
        transparent
        opacity={0.1}
        blending={2}
      />
    </lineSegments>
  );
};

// 音楽波動エフェクト
const MusicWaveEffect: React.FC<{
  audioFeatures: AudioFeatures;
  frameCount: number;
}> = ({ audioFeatures, frameCount }) => {
  const waveRef = useRef<any>(null);
  const smoothedVolumeRef = useRef(0);
  const smoothedBPMRef = useRef(120);
  const baseScaleRef = useRef(0.8);

  useFrame((_, delta) => {
    if (waveRef.current) {
      // 音楽データの適度な平滑化（良いバランス）
      const smoothingFactor = 0.85; // 適度な平滑化
      smoothedVolumeRef.current = smoothedVolumeRef.current * smoothingFactor + 
                                  (audioFeatures.volume / 100) * (1 - smoothingFactor);
      smoothedBPMRef.current = smoothedBPMRef.current * smoothingFactor + 
                               audioFeatures.bpm * (1 - smoothingFactor);

      const bpmFactor = smoothedBPMRef.current / 120;
      const volumeFactor = smoothedVolumeRef.current;
      
      // 位置を中心に固定
      waveRef.current.position.set(0, 0, 0);
      
      // 音楽に反応する脈動パターン
      const time = frameCount * 0.02; // 時間進行を適度に
      const rhythmPulse = Math.sin(time * bpmFactor * 0.8) * 0.2; // 適度な振幅
      const subtlePulse = Math.sin(time * bpmFactor * 2.1) * 0.08; // 微細な脈動
      const volumePulse = volumeFactor * 0.3; // 音量による反応
      
      // ベーススケールの適度な変更
      const targetBaseScale = 0.6 + volumeFactor * 0.25; // 音楽に応じてサイズ変化
      baseScaleRef.current += (targetBaseScale - baseScaleRef.current) * 0.02; // 適度な速度
      
      // 最終的な脈動ファクター
      const finalPulseFactor = baseScaleRef.current + rhythmPulse + subtlePulse + volumePulse;
      
      // スケールを適用（音楽に敏感に反応）
      const currentScale = waveRef.current.scale.x;
      const targetScale = Math.max(0.4, Math.min(1.3, finalPulseFactor)); // 広めの範囲
      const interpolatedScale = currentScale + (targetScale - currentScale) * 0.08; // 適度な補間速度
      
      waveRef.current.scale.setScalar(interpolatedScale);
      
      // 透明度も音楽に合わせて変化
      const currentOpacity = waveRef.current.material.opacity;
      const targetOpacity = volumeFactor * 0.15 + 0.05; // 適度な透明度変化
      const interpolatedOpacity = currentOpacity + (targetOpacity - currentOpacity) * 0.05;
      waveRef.current.material.opacity = interpolatedOpacity;
      
      // 音楽に合わせて色相も変化
      const hue = (audioFeatures.pitch - 220) / 660 * 360;
      waveRef.current.material.color.setHSL(hue / 360, 0.6, 0.8);
    }
  });

  return (
    <mesh ref={waveRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1.2, 16, 16]} />
      <meshBasicMaterial 
        color={0xffffff}
        transparent
        opacity={0.08}
        wireframe
      />
    </mesh>
  );
};

export default Scene3D;
