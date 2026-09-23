export type StationGenre = 'ambient' | 'lofi' | 'electronic' | 'indie' | 'classical' | 'talk' | 'custom' | 'broadcast';

export interface RadioStation {
  id: string;
  name: string;
  tagline: string;
  genre: StationGenre;
  streamUrl: string;
  isBroadcastChannel?: boolean;
  isProcedural?: boolean;
  bitrate: number; // kbps
  location?: string;
  logoBg?: string;
  description?: string;
}

export type VisualizerTheme = 'cyan' | 'violet' | 'amber' | 'emerald' | 'crimson';

export interface SoundEffect {
  id: string;
  name: string;
  iconName: string;
  category: 'jingle' | 'fx' | 'stinger' | 'ambience';
  color: string;
}

export interface BroadcastMetadata {
  stationName: string;
  showTitle: string;
  djName: string;
  tickerMessage: string;
  isLive: boolean;
  listenerCount: number;
  startedAt: number | null;
  peakDb: number;
  sampleRate: number;
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
