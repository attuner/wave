/**
 * Background Audio & Media Session API integration
 * Handles lock screen controls, notification center playback widgets,
 * and background audio persistence.
 */

export interface MediaSessionCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
}

export class MediaSessionService {
  private isSupported: boolean = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  private silentAudio: HTMLAudioElement | null = null;
  private isKeepingAlive: boolean = false;

  constructor() {
    this.initSilentAudio();
  }

  // Pre-generate a 1-second silent WAV data URI to keep mobile audio subsystems awake if needed
  private initSilentAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      // 1-second base64 silent WAV
      const silentWavBase64 =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      this.silentAudio = new Audio(silentWavBase64);
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.001; // nearly silent
    } catch {
      // ignored
    }
  }

  public updateMetadata(params: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string;
  }): void {
    if (!this.isSupported || !navigator.mediaSession) return;

    try {
      const artwork = params.artworkUrl
        ? [
            { src: params.artworkUrl, sizes: '96x96', type: 'image/png' },
            { src: params.artworkUrl, sizes: '128x128', type: 'image/png' },
            { src: params.artworkUrl, sizes: '192x192', type: 'image/png' },
            { src: params.artworkUrl, sizes: '512x512', type: 'image/png' },
          ]
        : [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          ];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: params.title || 'WaveCast Live Stream',
        artist: params.artist || 'WaveCast Broadcaster',
        album: params.album || 'WaveCast Live Radio PWA',
        artwork,
      });

      // Set playback state to playing
      navigator.mediaSession.playbackState = 'playing';
    } catch (e) {
      console.warn('Failed to update MediaSession metadata', e);
    }
  }

  public setPlaybackState(state: 'none' | 'paused' | 'playing'): void {
    if (!this.isSupported || !navigator.mediaSession) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch {
      // Ignored
    }
  }

  public registerHandlers(callbacks: MediaSessionCallbacks): void {
    if (!this.isSupported || !navigator.mediaSession) return;

    const actionHandlers: [MediaSessionAction, (() => void) | undefined][] = [
      ['play', callbacks.onPlay],
      ['pause', callbacks.onPause],
      ['stop', callbacks.onStop],
      ['previoustrack', callbacks.onPreviousTrack],
      ['nexttrack', callbacks.onNextTrack],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        if (handler) {
          navigator.mediaSession.setActionHandler(action, () => {
            handler();
          });
        } else {
          navigator.mediaSession.setActionHandler(action, null);
        }
      } catch {
        // Some browsers do not support specific actions
      }
    }
  }

  /**
   * Mobile background audio helper: starts background keep-alive audio session
   */
  public startBackgroundSession(): void {
    if (this.isKeepingAlive) return;
    this.isKeepingAlive = true;
    if (this.silentAudio) {
      this.silentAudio.play().catch(() => {
        // Autoplay policy may catch here, ignored
      });
    }
  }

  public stopBackgroundSession(): void {
    this.isKeepingAlive = false;
    if (this.silentAudio) {
      this.silentAudio.pause();
    }
    this.setPlaybackState('paused');
  }
}

export const mediaSessionService = new MediaSessionService();
