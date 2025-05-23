import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, Color } from 'three';
import PhotonLife from '../engine/PhotonLife';

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
  const photonLifeRef = useRef<PhotonLife[]>([]);
  const particleSystemRef = useRef<any>(null);

  // 大量の粒子を生成
  const particleCount = 2000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;     // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const col = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      col[i * 3] = Math.random();     // r
      col[i * 3 + 1] = Math.random(); // g
      col[i * 3 + 2] = Math.random(); // b
    }
    return col;
  }, []);

  const velocities = useMemo(() => {
    const vel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      vel[i * 3] = (Math.random() - 0.5) * 0.02;     // vx
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02; // vy
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02; // vz
    }
    return vel;
  }, []);

  // 初期生命体を作成
  useEffect(() => {
    photonLifeRef.current = [
      new PhotonLife({ position: [0, 0, 0], color: [1, 1, 1] }),
      new PhotonLife({ position: [2, 0, 0], color: [1, 0.5, 0.5] }),
      new PhotonLife({ position: [-2, 0, 0], color: [0.5, 1, 0.5] })
    ];
  }, []);

  // フレームごとの更新
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }

    // 粒子システムの更新
    updateParticleSystem(delta);

    // 生命体を更新
    photonLifeRef.current.forEach(life => {
      life.update(audioFeatures, delta);
    });
  });

  const updateParticleSystem = (delta: number) => {
    if (!particleSystemRef.current) return;

    const positionAttribute = particleSystemRef.current.geometry.attributes.position;
    const colorAttribute = particleSystemRef.current.geometry.attributes.color;
    const positions = positionAttribute.array;
    const colors = colorAttribute.array;

    // 音楽特徴から影響を計算
    const volumeInfluence = audioFeatures.volume / 100;
    const bpmInfluence = audioFeatures.bpm / 120;
    const pitchInfluence = (audioFeatures.pitch - 220) / 660;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // 現在位置
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // 近隣粒子との相互作用
      const neighbors = findNearbyParticles(i, positions, 2.0);
      let forceX = 0, forceY = 0, forceZ = 0;

      // 引力・斥力の計算
      neighbors.forEach(neighborIndex => {
        const ni3 = neighborIndex * 3;
        const dx = positions[ni3] - x;
        const dy = positions[ni3 + 1] - y;
        const dz = positions[ni3 + 2] - z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance > 0 && distance < 2.0) {
          const force = distance < 1.0 ? -0.001 : 0.0005; // 近いと斥力、遠いと引力
          forceX += (dx / distance) * force;
          forceY += (dy / distance) * force;
          forceZ += (dz / distance) * force;
        }
      });

      // 音楽による外力
      const musicForceX = Math.sin(Date.now() * 0.001 + i * 0.1) * volumeInfluence * 0.01;
      const musicForceY = Math.cos(Date.now() * 0.002 + i * 0.1) * bpmInfluence * 0.01;
      const musicForceZ = Math.sin(Date.now() * 0.0015 + i * 0.1) * pitchInfluence * 0.01;

      // 速度更新
      velocities[i3] += (forceX + musicForceX) * delta;
      velocities[i3 + 1] += (forceY + musicForceY) * delta;
      velocities[i3 + 2] += (forceZ + musicForceZ) * delta;

      // 減衰
      velocities[i3] *= 0.99;
      velocities[i3 + 1] *= 0.99;
      velocities[i3 + 2] *= 0.99;

      // 位置更新
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];

      // 境界での反射
      if (Math.abs(positions[i3]) > 10) {
        velocities[i3] *= -0.8;
        positions[i3] = Math.sign(positions[i3]) * 10;
      }
      if (Math.abs(positions[i3 + 1]) > 10) {
        velocities[i3 + 1] *= -0.8;
        positions[i3 + 1] = Math.sign(positions[i3 + 1]) * 10;
      }
      if (Math.abs(positions[i3 + 2]) > 10) {
        velocities[i3 + 2] *= -0.8;
        positions[i3 + 2] = Math.sign(positions[i3 + 2]) * 10;
      }

      // 色の更新（音楽に基づく）
      const hue = (pitchInfluence + 1) * 0.5; // 0-1
      const saturation = volumeInfluence;
      const brightness = 0.5 + bpmInfluence * 0.5;
      
      const color = new Color().setHSL(hue, saturation, brightness);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  };

  const findNearbyParticles = (index: number, positions: Float32Array, radius: number): number[] => {
    const neighbors: number[] = [];
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];
    const z = positions[index * 3 + 2];

    // 効率化のため、近隣の粒子のみチェック
    const checkCount = Math.min(50, particleCount);
    for (let i = 0; i < checkCount; i++) {
      const otherIndex = (index + i + 1) % particleCount;
      const dx = positions[otherIndex * 3] - x;
      const dy = positions[otherIndex * 3 + 1] - y;
      const dz = positions[otherIndex * 3 + 2] - z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < radius) {
        neighbors.push(otherIndex);
      }
    }
    
    return neighbors;
  };

  return (
    <group ref={groupRef}>
      {/* 背景環境 */}
      <mesh>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial color={0x000008} transparent opacity={0.05} />
      </mesh>

      {/* 粒子システム */}
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
          size={0.02}
          vertexColors
          transparent 
          opacity={0.8}
          sizeAttenuation={true}
          blending={2} // AdditiveBlending
        />
      </points>

      {/* 接続線（近隣粒子間） */}
      <ConnectionLines 
        positions={positions} 
        audioFeatures={audioFeatures}
        particleCount={particleCount}
      />

      {/* 光子生命体（中心的な存在） */}
      {photonLifeRef.current.map((life, index) => (
        <mesh key={index} position={life.position}>
          <sphereGeometry args={[life.size * 0.5, 8, 8]} />
          <meshBasicMaterial 
            color={life.color} 
            transparent 
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
};

// 粒子間の接続線を描画するコンポーネント
const ConnectionLines: React.FC<{
  positions: Float32Array;
  audioFeatures: AudioFeatures;
  particleCount: number;
}> = ({ positions, audioFeatures, particleCount }) => {
  const linesRef = useRef<any>(null);
  
  const linePositions = useMemo(() => {
    const linePos: number[] = [];
    const maxConnections = 500; // パフォーマンス制限
    let connectionCount = 0;

    for (let i = 0; i < particleCount && connectionCount < maxConnections; i++) {
      const x1 = positions[i * 3];
      const y1 = positions[i * 3 + 1];
      const z1 = positions[i * 3 + 2];

      // 近隣5粒子との接続線
      for (let j = i + 1; j < Math.min(i + 6, particleCount) && connectionCount < maxConnections; j++) {
        const x2 = positions[j * 3];
        const y2 = positions[j * 3 + 1];
        const z2 = positions[j * 3 + 2];

        const distance = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
        
        if (distance < 1.5) { // 一定距離内のみ接続
          linePos.push(x1, y1, z1, x2, y2, z2);
          connectionCount++;
        }
      }
    }

    return new Float32Array(linePos);
  }, [positions, particleCount]);

  useFrame(() => {
    if (linesRef.current) {
      const opacity = (audioFeatures.volume / 100) * 0.3;
      linesRef.current.material.opacity = opacity;
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
        color={0x44ccff}
        transparent
        opacity={0.1}
        blending={2} // AdditiveBlending
      />
    </lineSegments>
  );
};

export default Scene3D;
