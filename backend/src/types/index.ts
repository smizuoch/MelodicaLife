export interface AudioFeatures {
  bpm: number;
  pitch: number;
  volume: number;
  frequency: number[];
  timestamp: number;
  userId?: string;
}

export interface LifeformData {
  id: string;
  position: [number, number, number];
  color: [number, number, number];
  size: number;
  energy: number;
  generation: number;
  traits: {
    speed: number;
    pattern: string;
  };
  timestamp: number;
}

export interface EvolutionEvent {
  type: 'birth' | 'death' | 'mutation' | 'interaction';
  lifeformId: string;
  parentId?: string;
  timestamp: number;
  audioInfluence: AudioFeatures;
}

export interface ClientMessage {
  type: 'audio-features' | 'lifeform-update' | 'evolution-event';
  data: any;
  timestamp: number;
}
