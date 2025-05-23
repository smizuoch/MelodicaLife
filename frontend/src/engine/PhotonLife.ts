interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
}

interface LifeTraits {
  color: [number, number, number];
  size: number;
  speed: number;
  pattern: string;
}

interface LifeConfig {
  position: [number, number, number];
  color: [number, number, number];
  traits?: Partial<LifeTraits>;
}

class PhotonLife {
  public position: [number, number, number];
  public color: [number, number, number];
  public size: number = 1.0;
  public brightness: number = 0.5;
  public speed: number = 1.0;
  public energy: number = 100.0;
  public generation: number = 1;
  public traits: LifeTraits;
  
  private basePosition: [number, number, number];
  private time: number = 0;
  private influenceRadius: number = 3.0;
  private particleAttraction: number = 0.001;

  constructor(config: LifeConfig) {
    this.position = [...config.position];
    this.basePosition = [...config.position];
    this.color = [...config.color];
    
    this.traits = {
      color: [...config.color],
      size: 1.0,
      speed: 1.0,
      pattern: 'wave',
      ...config.traits
    };
  }

  update(audioFeatures: AudioFeatures, deltaTime: number): void {
    this.time += deltaTime;
    
    // BPMに基づく動作速度調整
    const bpmFactor = Math.max(0.1, audioFeatures.bpm / 120);
    this.speed = this.traits.speed * bpmFactor;
    
    // 音量に基づくサイズと輝度
    const volumeFactor = Math.max(0.1, audioFeatures.volume / 100);
    this.size = this.traits.size * (0.8 + volumeFactor * 1.2);
    this.brightness = volumeFactor * 0.8;
    
    // ピッチに基づく色調整
    this.updateColorFromPitch(audioFeatures.pitch);
    
    // より複雑な波動運動パターン
    this.updateComplexMovement(audioFeatures);
    
    // エネルギー管理
    this.updateEnergy(audioFeatures);
  }

  private updateColorFromPitch(pitch: number): void {
    // ピッチを色相に変換 (A4 = 440Hz を基準)
    const normalizedPitch = (pitch - 220) / 660; // 220Hz-880Hz範囲を0-1に正規化
    const hue = (normalizedPitch * 360) % 360;
    
    // HSVからRGBに変換（簡易版）
    const c = 1; // 彩度
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = 0.5; // 明度調整
    
    let r = 0, g = 0, b = 0;
    if (hue >= 0 && hue < 60) { r = c; g = x; b = 0; }
    else if (hue >= 60 && hue < 120) { r = x; g = c; b = 0; }
    else if (hue >= 120 && hue < 180) { r = 0; g = c; b = x; }
    else if (hue >= 180 && hue < 240) { r = 0; g = x; b = c; }
    else if (hue >= 240 && hue < 300) { r = x; g = 0; b = c; }
    else if (hue >= 300 && hue < 360) { r = c; g = 0; b = x; }
    
    this.color = [r + m, g + m, b + m];
  }

  private updateComplexMovement(audioFeatures: AudioFeatures): void {
    const amplitude = this.size * 0.8;
    const frequency = this.speed * 0.5;
    
    // 複数の波の重ね合わせ
    const wave1 = Math.sin(this.time * frequency) * amplitude;
    const wave2 = Math.cos(this.time * frequency * 1.618) * amplitude * 0.5; // 黄金比
    const wave3 = Math.sin(this.time * frequency * 0.382) * amplitude * 0.3;
    
    // 音楽特徴による変調
    const volumeModulation = audioFeatures.volume / 100;
    const pitchModulation = (audioFeatures.pitch - 440) / 440;
    
    switch (this.traits.pattern) {
      case 'wave':
        this.position[1] = this.basePosition[1] + (wave1 + wave2) * volumeModulation;
        this.position[0] = this.basePosition[0] + wave3 * pitchModulation;
        break;
      case 'spiral':
        const radius = amplitude * volumeModulation;
        const spiralSpeed = frequency * (1 + pitchModulation);
        this.position[0] = this.basePosition[0] + Math.cos(this.time * spiralSpeed) * radius;
        this.position[2] = this.basePosition[2] + Math.sin(this.time * spiralSpeed) * radius;
        this.position[1] = this.basePosition[1] + wave1 * 0.5;
        break;
      default:
        // アトラクター風の動き
        const attractorX = Math.sin(this.time * frequency * 0.7) * amplitude;
        const attractorY = Math.sin(this.time * frequency * 1.1) * amplitude;
        const attractorZ = Math.cos(this.time * frequency * 0.9) * amplitude;
        
        this.position[0] = this.basePosition[0] + attractorX * volumeModulation;
        this.position[1] = this.basePosition[1] + attractorY * volumeModulation;
        this.position[2] = this.basePosition[2] + attractorZ * volumeModulation;
    }
  }

  // 粒子群への影響を計算
  getParticleInfluence(particlePosition: [number, number, number]): [number, number, number] {
    const dx = this.position[0] - particlePosition[0];
    const dy = this.position[1] - particlePosition[1];
    const dz = this.position[2] - particlePosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance > this.influenceRadius) return [0, 0, 0];
    
    const influence = this.particleAttraction * this.energy / 100 / (distance + 0.1);
    return [
      (dx / distance) * influence,
      (dy / distance) * influence,
      (dz / distance) * influence
    ];
  }

  private updateEnergy(audioFeatures: AudioFeatures): void {
    // 音楽エネルギーからライフエネルギーを計算
    const musicEnergy = (audioFeatures.volume + audioFeatures.bpm / 2) / 100;
    this.energy = Math.min(200, this.energy + musicEnergy - 0.1); // 徐々にエネルギー消費
    
    if (this.energy <= 0) {
      this.energy = 10; // 最小エネルギーを保持
    }
  }

  // 他の生命体との相互作用
  interactWith(other: PhotonLife): void {
    const distance = this.getDistanceTo(other);
    
    if (distance < 2.0) {
      // 共鳴効果
      this.resonateWith(other);
    }
  }

  private getDistanceTo(other: PhotonLife): number {
    const dx = this.position[0] - other.position[0];
    const dy = this.position[1] - other.position[1];
    const dz = this.position[2] - other.position[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private resonateWith(other: PhotonLife): void {
    // 色の平均化
    this.color[0] = (this.color[0] + other.color[0]) / 2;
    this.color[1] = (this.color[1] + other.color[1]) / 2;
    this.color[2] = (this.color[2] + other.color[2]) / 2;
    
    // エネルギー交換
    const energyExchange = (this.energy - other.energy) * 0.1;
    this.energy -= energyExchange;
    other.energy += energyExchange;
  }
}

export default PhotonLife;
