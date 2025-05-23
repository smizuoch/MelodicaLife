interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
}

interface ParticleTraits {
  flowPattern: 'swarm' | 'spiral' | 'wave' | 'attractor';
  socialTendency: number; // 0-1: 群れたがる度合い
  energyEfficiency: number; // 0-1: エネルギー効率
  colorEvolution: number; // 0-1: 色変化の速度
  velocityInheritance: number; // 0-1: 近隣速度の継承度
}

class EvolutionaryParticle {
  public position: [number, number, number];
  public velocity: [number, number, number];
  public color: [number, number, number];
  public traits: ParticleTraits;
  public energy: number = 100;
  public age: number = 0;
  public generation: number = 1;
  
  private baseHue: number;
  private evolutionTimer: number = 0;
  private mutationRate: number = 0.02;
  private lastMusicUpdate: number = 0;
  private musicCache: {
    bassInfluence: number;
    midInfluence: number;
    trebleInfluence: number;
    rhythmPhase: number;
  } = { bassInfluence: 0, midInfluence: 0, trebleInfluence: 0, rhythmPhase: 0 };

  constructor(
    position: [number, number, number],
    velocity: [number, number, number] = [0, 0, 0],
    parentTraits?: Partial<ParticleTraits>
  ) {
    this.position = [...position];
    this.velocity = [...velocity];
    this.baseHue = Math.random() * 360;
    this.color = this.hslToRgb(this.baseHue, 0.8, 0.6);
    
    // 親の特性を継承しつつ変異
    this.traits = this.evolveTraits(parentTraits);
  }

  private evolveTraits(parentTraits?: Partial<ParticleTraits>): ParticleTraits {
    const baseTraits: ParticleTraits = parentTraits ? {
      flowPattern: parentTraits.flowPattern || 'swarm',
      socialTendency: parentTraits.socialTendency || 0.5,
      energyEfficiency: parentTraits.energyEfficiency || 0.5,
      colorEvolution: parentTraits.colorEvolution || 0.5,
      velocityInheritance: parentTraits.velocityInheritance || 0.5
    } : {
      flowPattern: ['swarm', 'spiral', 'wave', 'attractor'][Math.floor(Math.random() * 4)] as any,
      socialTendency: Math.random(),
      energyEfficiency: Math.random(),
      colorEvolution: Math.random(),
      velocityInheritance: Math.random()
    };

    // 変異を適用
    return {
      flowPattern: Math.random() < this.mutationRate ? 
        (['swarm', 'spiral', 'wave', 'attractor'][Math.floor(Math.random() * 4)] as any) : 
        baseTraits.flowPattern,
      socialTendency: this.mutateValue(baseTraits.socialTendency),
      energyEfficiency: this.mutateValue(baseTraits.energyEfficiency),
      colorEvolution: this.mutateValue(baseTraits.colorEvolution),
      velocityInheritance: this.mutateValue(baseTraits.velocityInheritance)
    };
  }

  private mutateValue(value: number): number {
    if (Math.random() < this.mutationRate) {
      const mutation = (Math.random() - 0.5) * 0.2;
      return Math.max(0, Math.min(1, value + mutation));
    }
    return value;
  }

  update(audioFeatures: AudioFeatures, neighbors: EvolutionaryParticle[], deltaTime: number): void {
    this.age += deltaTime;
    this.evolutionTimer += deltaTime;

    // 音楽分析を30FPSに制限（最適化）
    if (this.age - this.lastMusicUpdate > 0.033) {
      this.analyzeMusicFeatures(audioFeatures);
      this.lastMusicUpdate = this.age;
    }

    // 音楽に基づく進化
    this.evolveFromMusic(audioFeatures);
    
    // 流動パターンに基づく動き
    this.applyFlowPattern(audioFeatures, neighbors, deltaTime);
    
    // 色の進化（頻度を下げて最適化）
    if (Math.random() < 0.1) {
      this.evolveColor(audioFeatures, neighbors);
    }
    
    // エネルギー管理
    this.updateEnergy(audioFeatures);
    
    // 定期的な進化
    if (this.evolutionTimer > 5.0) {
      this.triggerEvolution();
      this.evolutionTimer = 0;
    }
  }

  private analyzeMusicFeatures(audioFeatures: AudioFeatures): void {
    // 周波数帯域分析
    if (audioFeatures.frequency && audioFeatures.frequency.length >= 8) {
      // 低音域 (0-2): ベース、キック
      this.musicCache.bassInfluence = (audioFeatures.frequency[0] + audioFeatures.frequency[1]) / 2;
      // 中音域 (3-5): メロディ、ボーカル
      this.musicCache.midInfluence = (audioFeatures.frequency[3] + audioFeatures.frequency[4] + audioFeatures.frequency[5]) / 3;
      // 高音域 (6-7): シンバル、ハイハット
      this.musicCache.trebleInfluence = (audioFeatures.frequency[6] + audioFeatures.frequency[7]) / 2;
    } else {
      // フォールバック: 音量とピッチから推定
      this.musicCache.bassInfluence = audioFeatures.volume * (audioFeatures.pitch < 300 ? 1 : 0.3);
      this.musicCache.midInfluence = audioFeatures.volume * (audioFeatures.pitch >= 300 && audioFeatures.pitch <= 800 ? 1 : 0.5);
      this.musicCache.trebleInfluence = audioFeatures.volume * (audioFeatures.pitch > 800 ? 1 : 0.2);
    }

    // BPMに基づくリズムフェーズ
    const bpmNormalized = audioFeatures.bpm / 120;
    this.musicCache.rhythmPhase = (this.age * bpmNormalized * 2) % (Math.PI * 2);
  }

  private evolveFromMusic(audioFeatures: AudioFeatures): void {
    const musicIntensity = (audioFeatures.volume + audioFeatures.bpm / 2) / 100;
    
    // 音楽の強度に応じて特性を調整
    if (musicIntensity > 0.7) {
      this.traits.socialTendency = Math.min(1, this.traits.socialTendency + 0.01);
      this.traits.colorEvolution = Math.min(1, this.traits.colorEvolution + 0.01);
    } else if (musicIntensity < 0.3) {
      this.traits.energyEfficiency = Math.min(1, this.traits.energyEfficiency + 0.01);
    }
  }

  private applyFlowPattern(audioFeatures: AudioFeatures, neighbors: EvolutionaryParticle[], deltaTime: number): void {
    const musicForce = this.calculateMusicForce(audioFeatures);
    const socialForce = this.calculateSocialForce(neighbors);
    const flowForce = this.calculateFlowForce(audioFeatures);

    // 力を合成
    const totalForce = [
      musicForce[0] + socialForce[0] + flowForce[0],
      musicForce[1] + socialForce[1] + flowForce[1],
      musicForce[2] + socialForce[2] + flowForce[2]
    ];

    // 速度更新
    this.velocity[0] += totalForce[0] * deltaTime;
    this.velocity[1] += totalForce[1] * deltaTime;
    this.velocity[2] += totalForce[2] * deltaTime;

    // 速度制限
    const maxSpeed = 0.1 * (1 + audioFeatures.volume / 100);
    const speed = Math.sqrt(this.velocity[0]**2 + this.velocity[1]**2 + this.velocity[2]**2);
    if (speed > maxSpeed) {
      const factor = maxSpeed / speed;
      this.velocity[0] *= factor;
      this.velocity[1] *= factor;
      this.velocity[2] *= factor;
    }

    // 位置更新
    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];
    this.position[2] += this.velocity[2];

    // 境界処理
    this.applyBoundaries();
  }

  private calculateMusicForce(audioFeatures: AudioFeatures): [number, number, number] {
    const bass = this.musicCache.bassInfluence / 100;
    const mid = this.musicCache.midInfluence / 100;
    const treble = this.musicCache.trebleInfluence / 100;
    const rhythmPhase = this.musicCache.rhythmPhase;

    // ベースによる低周波な大きな動き
    const bassForceX = Math.sin(rhythmPhase * 0.5) * bass * 0.008;
    const bassForceY = Math.cos(rhythmPhase * 0.3) * bass * 0.006;

    // 中音域による流動的な動き
    const midForceX = Math.sin(rhythmPhase + this.position[0] * 0.15) * mid * 0.004;
    const midForceY = Math.cos(rhythmPhase + this.position[1] * 0.15) * mid * 0.004;
    const midForceZ = Math.sin(rhythmPhase * 1.2 + this.position[2] * 0.1) * mid * 0.003;

    // 高音域による細かい振動
    const trebleForceX = Math.sin(rhythmPhase * 4 + this.position[0] * 0.5) * treble * 0.002;
    const trebleForceY = Math.cos(rhythmPhase * 4 + this.position[1] * 0.5) * treble * 0.002;
    const trebleForceZ = Math.sin(rhythmPhase * 3 + this.position[2] * 0.5) * treble * 0.002;

    return [
      bassForceX + midForceX + trebleForceX,
      bassForceY + midForceY + trebleForceY,
      midForceZ + trebleForceZ
    ];
  }

  private calculateSocialForce(neighbors: EvolutionaryParticle[]): [number, number, number] {
    if (neighbors.length === 0) return [0, 0, 0];

    let separationForce = [0, 0, 0];
    let alignmentForce = [0, 0, 0];
    let cohesionForce = [0, 0, 0];

    neighbors.forEach(neighbor => {
      const dx = neighbor.position[0] - this.position[0];
      const dy = neighbor.position[1] - this.position[1];
      const dz = neighbor.position[2] - this.position[2];
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance > 0) {
        // 分離力 (近すぎる場合)
        if (distance < 1.0) {
          const factor = (1.0 - distance) * 0.001;
          separationForce[0] -= dx * factor;
          separationForce[1] -= dy * factor;
          separationForce[2] -= dz * factor;
        }

        // 整列力 (速度を合わせる)
        if (distance < 2.0) {
          const factor = this.traits.velocityInheritance * 0.0001;
          alignmentForce[0] += neighbor.velocity[0] * factor;
          alignmentForce[1] += neighbor.velocity[1] * factor;
          alignmentForce[2] += neighbor.velocity[2] * factor;
        }

        // 結束力 (群れの中心に向かう)
        if (distance < 3.0) {
          const factor = this.traits.socialTendency * 0.0005;
          cohesionForce[0] += dx * factor;
          cohesionForce[1] += dy * factor;
          cohesionForce[2] += dz * factor;
        }
      }
    });

    return [
      separationForce[0] + alignmentForce[0] + cohesionForce[0],
      separationForce[1] + alignmentForce[1] + cohesionForce[1],
      separationForce[2] + alignmentForce[2] + cohesionForce[2]
    ];
  }

  private calculateFlowForce(audioFeatures: AudioFeatures): [number, number, number] {
    const bass = this.musicCache.bassInfluence / 100;
    const mid = this.musicCache.midInfluence / 100;
    const treble = this.musicCache.trebleInfluence / 100;
    const rhythmPhase = this.musicCache.rhythmPhase;
    
    switch (this.traits.flowPattern) {
      case 'spiral':
        const spiralRadius = 0.15 * (bass + mid * 0.5);
        const spiralSpeed = 1 + treble * 2;
        return [
          Math.cos(rhythmPhase * spiralSpeed) * spiralRadius,
          Math.sin(rhythmPhase * spiralSpeed) * spiralRadius,
          Math.sin(rhythmPhase * 0.3) * spiralRadius * 0.3
        ];
      
      case 'wave':
        const waveLength = 3 - mid * 2; // 中音域で波長変化
        const waveSpeed = 1 + bass * 1.5; // ベースで波速変化
        return [
          Math.sin(this.position[0] / waveLength + rhythmPhase * waveSpeed) * mid * 0.003,
          Math.cos(this.position[1] / waveLength + rhythmPhase * waveSpeed) * treble * 0.002,
          Math.sin(this.position[2] / (waveLength * 2) + rhythmPhase * 0.7) * bass * 0.002
        ];
      
      case 'attractor':
        // 複数のアトラクターをBPMで切り替え
        const attractorIndex = Math.floor(rhythmPhase / (Math.PI * 0.5)) % 3;
        const attractors = [
          [Math.sin(rhythmPhase * 0.2) * 6, Math.cos(rhythmPhase * 0.3) * 6, Math.sin(rhythmPhase * 0.15) * 4],
          [Math.cos(rhythmPhase * 0.25) * 5, Math.sin(rhythmPhase * 0.4) * 5, Math.cos(rhythmPhase * 0.2) * 3],
          [Math.sin(rhythmPhase * 0.3) * 4, Math.cos(rhythmPhase * 0.2) * 7, Math.sin(rhythmPhase * 0.25) * 5]
        ];
        
        const [attractorX, attractorY, attractorZ] = attractors[attractorIndex];
        const dx = attractorX - this.position[0];
        const dy = attractorY - this.position[1];
        const dz = attractorZ - this.position[2];
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const factor = (bass + mid) * 0.00015 / (distance + 1);
        return [dx * factor, dy * factor, dz * factor];
      
      default: // swarm - 音楽的な群れ行動
        const swarmX = Math.sin(rhythmPhase + this.generation * 0.1) * bass * 0.003;
        const swarmY = Math.cos(rhythmPhase * 1.3 + this.generation * 0.1) * mid * 0.003;
        const swarmZ = Math.sin(rhythmPhase * 0.8) * treble * 0.002;
        return [swarmX, swarmY, swarmZ];
    }
  }

  private evolveColor(audioFeatures: AudioFeatures, neighbors: EvolutionaryParticle[]): void {
    const bass = this.musicCache.bassInfluence / 100;
    const mid = this.musicCache.midInfluence / 100;
    const treble = this.musicCache.trebleInfluence / 100;

    // 音楽帯域による色相変化
    const bassHue = 240; // 青系
    const midHue = 120;  // 緑系
    const trebleHue = 0; // 赤系

    // 主要な帯域に基づいて色相を決定
    let targetHue = bassHue;
    let maxInfluence = bass;
    
    if (mid > maxInfluence) {
      targetHue = midHue;
      maxInfluence = mid;
    }
    if (treble > maxInfluence) {
      targetHue = trebleHue;
      maxInfluence = treble;
    }

    // 段階的に色相を変更
    const hueDiff = targetHue - this.baseHue;
    this.baseHue += hueDiff * this.traits.colorEvolution * 0.02;
    
    // 近隣粒子からの色影響（頻度を下げて最適化）
    if (neighbors.length > 0 && Math.random() < 0.005) {
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      const neighborHue = this.rgbToHsl(randomNeighbor.color)[0];
      this.baseHue = this.baseHue * 0.98 + neighborHue * 0.02;
    }
    
    // 音楽強度に基づく彩度と明度
    const saturation = 0.6 + maxInfluence * 0.4;
    const lightness = 0.3 + (bass * 0.2 + mid * 0.3 + treble * 0.2);
    
    this.color = this.hslToRgb(this.baseHue % 360, saturation, lightness);
  }

  private triggerEvolution(): void {
    // 生存選択圧に基づく進化
    if (this.energy > 150) {
      // エネルギーが高い場合、より社会性を高める
      this.traits.socialTendency = Math.min(1, this.traits.socialTendency + 0.05);
    } else if (this.energy < 50) {
      // エネルギーが低い場合、効率を高める
      this.traits.energyEfficiency = Math.min(1, this.traits.energyEfficiency + 0.05);
    }
    
    this.generation++;
  }

  private updateEnergy(audioFeatures: AudioFeatures): void {
    const musicEnergy = audioFeatures.volume / 100;
    const efficiency = this.traits.energyEfficiency;
    
    this.energy += musicEnergy * efficiency * 2;
    this.energy -= 0.1; // 基本消費
    this.energy = Math.max(10, Math.min(200, this.energy));
  }

  private applyBoundaries(): void {
    const bounds = 10;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(this.position[i]) > bounds) {
        this.position[i] = Math.sign(this.position[i]) * bounds;
        this.velocity[i] *= -0.8;
      }
    }
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [r + m, g + m, b + m];
  }

  private rgbToHsl(rgb: [number, number, number]): [number, number, number] {
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;

    if (diff === 0) return [0, 0, l];

    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    let h = 0;

    if (max === r) h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / diff + 2) / 6;
    else h = ((r - g) / diff + 4) / 6;

    return [h * 360, s, l];
  }
}

// 後方互換性のためのエイリアス
class PhotonLife extends EvolutionaryParticle {}

export default PhotonLife;
export { EvolutionaryParticle };
