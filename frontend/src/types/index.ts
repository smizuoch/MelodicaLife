export interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
  spectralCentroid?: number;
  mfcc?: number[];
  chroma?: number[];
}

export interface LifeTraits {
  color: [number, number, number];
  size: number;
  speed: number;
  pattern: 'wave' | 'spiral' | 'pulse';
  energy: number;
}

export interface PhotonLifeConfig {
  position: [number, number, number];
  color: [number, number, number];
  traits?: Partial<LifeTraits>;
  id?: string;
  generation?: number;
}

export interface EvolutionNode {
  id: string;
  parent?: string;
  generation: number;
  traits: LifeTraits;
  birthTime: number;
  children?: EvolutionNode[];
}

export interface LifeformStats {
  count: number;
  averageEnergy: number;
  generations: number;
  dominantColor: string;
}

export interface SimulationSettings {
  maxLifeforms: number;
  energyThreshold: number;
  evolutionRate: number;
  interactionStrength: number;
}
