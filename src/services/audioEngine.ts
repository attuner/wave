import { RadioStation, PlaybackStatus } from '../types/radio';
import { mediaSessionService } from './mediaSession';
import { proceduralSynth } from './proceduralSynth';
import { broadcastSync } from './broadcastChannel';

export class AudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  // Broadcaster Nodes
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private broadcastCompressor: DynamicsCompressorNode | null = null;
  private broadcastMasterGain: GainNode | null = null;
  private broadcastAnalyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Ducking support
  private duckingGain: GainNode | null = null;
  private isDuckingEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private speechCheckInterval: number | null = null;

  // Status
  private currentStation: RadioStation | null = null;
  private playbackStatus: PlaybackStatus = 'idle';
  private onStatusChangeListeners: ((status: PlaybackStatus) => void)[] = [];
  private volume: number = 0.85;
  private isMuted: boolean = false;

  constructor() {
    this.initAudioElement();
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private initAudioElement(): void {
    if (typeof window === 'undefined') return;

    this.audioElement = new Audio();
    this.audioElement.preload = 'none';
    this.audioElement.crossOrigin = 'anonymous';
    // Essential for mobile background playback
    this.audioElement.setAttribute('playsinline', 'true');
    this.audioElement.setAttribute('webkit-playsinline', 'true');

    this.audioElement.addEventListener('playing', () => {
      this.setStatus('playing');
      mediaSessionService.setPlaybackState('playing');
      mediaSessionService.startBackgroundSession();
    });

    this.audioElement.addEventListener('pause', () => {
      if (this.playbackStatus !== 'loading') {
        this.setStatus('paused');
        mediaSessionService.setPlaybackState('paused');
      }
    });

    this.audioElement.addEventListener('waiting', () => {
      this.setStatus('loading');
    });

    this.audioElement.addEventListener('error', () => {
      console.warn('Audio stream error occurred');
      this.setStatus('error');
    });

    this.audioElement.volume = this.volume;
  }

  private connectWebAudioNodes(): void {
    if (!this.audioElement || this.sourceNode) return;
    try {
      const ctx = this.initAudioContext();
      this.sourceNode = ctx.createMediaElementSource(this.audioElement);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);

      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);
    } catch {
      // Browsers may block createMediaElementSource if CORS is restricted on external stream
      // We gracefully fallback to direct audio element output
    }
  }

  public onStatusChange(callback: (status: PlaybackStatus) => void): () => void {
    this.onStatusChangeListeners.push(callback);
    return () => {
      this.onStatusChangeListeners = this.onStatusChangeListeners.filter((c) => c !== callback);
    };
  }

  private setStatus(status: PlaybackStatus): void {
    this.playbackStatus = status;
    this.onStatusChangeListeners.forEach((fn) => fn(status));
  }

  public getStatus(): PlaybackStatus {
    return this.playbackStatus;
  }

  public getCurrentStation(): RadioStation | null {
    return this.currentStation;
  }

  // --- PLAYBACK CONTROLS ---

  public async playStation(station: RadioStation): Promise<void> {
    this.currentStation = station;
    this.setStatus('loading');

    // Update MediaSession lock screen metadata immediately
    mediaSessionService.updateMetadata({
      title: station.name,
      artist: station.tagline || 'WaveCast Live Radio',
      album: 'WaveCast Broadcast Network',
    });

    if (station.isProcedural) {
      // Procedural synthetic station
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
      }
      proceduralSynth.stopAmbientRadio();
      proceduralSynth.startAmbientRadio();
      this.setStatus('playing');
      mediaSessionService.setPlaybackState('playing');
      return;
    }

    // Stop procedural synth if it was running
    proceduralSynth.stopAmbientRadio();

    if (!this.audioElement) {
      this.initAudioElement();
    }

    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = station.streamUrl;
        this.audioElement.load();

        // Connect WebAudio graph for visualizer if possible
        this.connectWebAudioNodes();

        await this.audioElement.play();
        this.setStatus('playing');
        mediaSessionService.setPlaybackState('playing');
      }
    } catch (err) {
      console.warn('Playback error:', err);
      this.setStatus('error');
    }
  }

  public pause(): void {
    if (this.currentStation?.isProcedural) {
      proceduralSynth.stopAmbientRadio();
      this.setStatus('paused');
      mediaSessionService.setPlaybackState('paused');
      return;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.setStatus('paused');
      mediaSessionService.setPlaybackState('paused');
    }
  }

  public resume(): void {
    if (this.currentStation?.isProcedural) {
      proceduralSynth.startAmbientRadio();
      this.setStatus('playing');
      mediaSessionService.setPlaybackState('playing');
      return;
    }

    if (this.audioElement && this.currentStation) {
      this.audioElement.play().catch(() => {
        this.setStatus('error');
      });
    }
  }

  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    proceduralSynth.stopAmbientRadio();
    this.setStatus('idle');
    mediaSessionService.setPlaybackState('none');
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    proceduralSynth.setAmbientVolume(this.isMuted ? 0 : this.volume);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- VISUALIZER FREQUENCY DATA ---

  public getVisualizerData(freqArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(freqArray as unknown as Uint8Array<ArrayBuffer>);
    } else {
      // Simulate pleasant organic wave motion if audio analyser is not connected due to CORS
      const now = performance.now() / 1000;
      const isPlaying = this.playbackStatus === 'playing';
      for (let i = 0; i < freqArray.length; i++) {
        if (!isPlaying) {
          freqArray[i] = 0;
          continue;
        }
        const factor = 1 - i / freqArray.length;
        const wave = Math.sin(now * 4 + i * 0.3) * 0.5 + 0.5;
        const wave2 = Math.cos(now * 2.5 + i * 0.15) * 0.5 + 0.5;
        freqArray[i] = Math.floor((wave * 0.7 + wave2 * 0.3) * factor * 220);
      }
    }
  }

  // --- BROADCASTER STUDIO METHODS ---

  public async startMicrophoneBroadcast(options?: {
    ducking?: boolean;
    gain?: number;
  }): Promise<{ sampleRate: number }> {
    const ctx = this.initAudioContext();

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });

    this.micSource = ctx.createMediaStreamSource(this.micStream);

    // Highpass rumble filter
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(80, ctx.currentTime);

    // Mic Gain
    this.micGain = ctx.createGain();
    const initialGain = options?.gain ?? 1.2;
    this.micGain.gain.setValueAtTime(initialGain, ctx.currentTime);

    // Broadcast Limiter / Compressor
    this.broadcastCompressor = ctx.createDynamicsCompressor();
    this.broadcastCompressor.threshold.setValueAtTime(-18, ctx.currentTime);
    this.broadcastCompressor.knee.setValueAtTime(10, ctx.currentTime);
    this.broadcastCompressor.ratio.setValueAtTime(6, ctx.currentTime);
    this.broadcastCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
    this.broadcastCompressor.release.setValueAtTime(0.25, ctx.currentTime);

    // Broadcaster Analyser
    this.broadcastAnalyser = ctx.createAnalyser();
    this.broadcastAnalyser.fftSize = 256;

    // Master Broadcast Gain
    this.broadcastMasterGain = ctx.createGain();
    this.broadcastMasterGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Graph Connection
    this.micSource.connect(highpass);
    highpass.connect(this.micGain);
    this.micGain.connect(this.broadcastCompressor);
    this.broadcastCompressor.connect(this.broadcastAnalyser);
    this.broadcastAnalyser.connect(this.broadcastMasterGain);

    // Setup speech detector for auto-ducking
    this.isDuckingEnabled = options?.ducking ?? true;
    this.startSpeechDetection();

    return { sampleRate: ctx.sampleRate };
  }

  public stopMicrophoneBroadcast(): void {
    if (this.speechCheckInterval) {
      clearInterval(this.speechCheckInterval);
      this.speechCheckInterval = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // Ignored
      }
      this.micSource = null;
    }
  }

  public setMicGain(value: number): void {
    if (this.micGain && this.audioCtx) {
      this.micGain.gain.setValueAtTime(Math.max(0, Math.min(3, value)), this.audioCtx.currentTime);
    }
  }

  public getBroadcasterPeakDb(): { peakDb: number; rms: number } {
    if (!this.broadcastAnalyser) {
      return { peakDb: -60, rms: 0 };
    }

    const buffer = new Float32Array(this.broadcastAnalyser.fftSize);
    this.broadcastAnalyser.getFloatTimeDomainData(buffer);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
      const abs = Math.abs(buffer[i]);
      if (abs > peak) peak = abs;
      sum += abs * abs;
    }

    const rms = Math.sqrt(sum / buffer.length);
    const peakDb = peak > 0.0001 ? Math.max(-60, Math.min(0, 20 * Math.log10(peak))) : -60;

    return { peakDb, rms };
  }

  public getBroadcasterFrequencyData(outputArray: Uint8Array): void {
    if (this.broadcastAnalyser) {
      this.broadcastAnalyser.getByteFrequencyData(outputArray as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public playSoundEffectIntoBroadcast(effectId: string): void {
    const targetNode = this.broadcastCompressor || undefined;
    switch (effectId) {
      case 'jingle':
        proceduralSynth.playStationJingle(targetNode);
        break;
      case 'airhorn':
        proceduralSynth.playAirHorn(targetNode);
        break;
      case 'alert':
        proceduralSynth.playAlertStinger(targetNode);
        break;
      case 'chime':
        proceduralSynth.playChime(targetNode);
        break;
      case 'drop808':
        proceduralSynth.play808Drop(targetNode);
        break;
      case 'cheer':
        proceduralSynth.playCrowdCheer(targetNode);
        break;
      default:
        proceduralSynth.playStationJingle(targetNode);
    }
  }

  // --- RECORDING BROADCAST SHOW ---

  public startRecording(): boolean {
    if (!this.micStream) return false;
    try {
      this.recordedChunks = [];
      const options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        this.mediaRecorder = new MediaRecorder(this.micStream);
      } else {
        this.mediaRecorder = new MediaRecorder(this.micStream, options);
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000);
      return true;
    } catch (e) {
      console.error('Failed to start MediaRecorder', e);
      return false;
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return null;
    this.mediaRecorder.stop();
    const mime = this.mediaRecorder.mimeType || 'audio/webm';
    return new Blob(this.recordedChunks, { type: mime });
  }

  private startSpeechDetection(): void {
    if (this.speechCheckInterval) clearInterval(this.speechCheckInterval);

    this.speechCheckInterval = window.setInterval(() => {
      const { peakDb } = this.getBroadcasterPeakDb();
      // If mic level is above -35 dB, treat as speech
      const isVoiceActive = peakDb > -35;
      if (isVoiceActive !== this.isSpeaking) {
        this.isSpeaking = isVoiceActive;
        if (this.isDuckingEnabled) {
          // Duck background music
          proceduralSynth.setAmbientVolume(isVoiceActive ? 0.08 : 0.35);
        }
      }
    }, 100);
  }
}

export const audioEngine = new AudioEngine();
