import { BroadcastMetadata } from '../types/radio';

export type BroadcastChannelMessage =
  | { type: 'BROADCAST_STATE'; payload: BroadcastMetadata }
  | { type: 'AUDIO_CHUNK'; payload: { chunkId: number; base64: string; mimeType: string } }
  | { type: 'CHAT_OR_ALERT'; payload: { text: string; time: number; author: string } }
  | { type: 'BROADCAST_STOPPED' };

export class BroadcastSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: ((msg: BroadcastChannelMessage) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('wavecast_live_channel');
      this.channel.onmessage = (event) => {
        const msg = event.data as BroadcastChannelMessage;
        this.notify(msg);
      };
    }
  }

  public subscribe(fn: (msg: BroadcastChannelMessage) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(msg: BroadcastChannelMessage): void {
    this.listeners.forEach((fn) => {
      try {
        fn(msg);
      } catch (err) {
        console.error('Error in broadcast listener', err);
      }
    });
  }

  public send(msg: BroadcastChannelMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        console.warn('Failed to send broadcast channel message', e);
      }
    }
    // Also notify local listeners in the current tab
    this.notify(msg);
  }
}

export const broadcastSync = new BroadcastSyncService();
