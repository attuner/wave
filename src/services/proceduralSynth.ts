/**
 * Procedural Web Audio API sound generator for:
 * 1. Offline ambient radio bed / chord progressions
 * 2. Studio Soundboard effects (air horn, jingle, chime, siren, vinyl crackle, 808 drop)
 * 3. Broadcaster background music loop
 */

export class ProceduralSynth {
  private ctx: AudioContext | null = null;
  private isPlayingAmbient: boolean = false;
  private ambientGain: GainNode | null = null;
  private chordInterval: number | null = null;
  private vinylNode: AudioNode | null = null;

  private initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getContext(): AudioContext {
    return this.initContext();
  }

  // --- AMBIENT LO-FI CHORDS GENERATOR ---
  public startAmbientRadio(targetNode?: AudioNode): void {
    if (this.isPlayingAmbient) return;
    const ctx = this.initContext();

    this.isPlayingAmbient = true;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.35, ctx.currentTime);

    if (targetNode) {
      this.ambientGain.connect(targetNode);
    } else {
      this.ambientGain.connect(ctx.destination);
    }

    // Warm Lo-Fi chords (Fmaj7, Cmaj7, Dm7, Am7 frequencies)
    const progressions: number[][] = [
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [130.81, 196.0, 261.63, 329.63], // Cmaj7
      [146.83, 220.0, 261.63, 349.23], // Dm7
      [110.00, 164.81, 220.0, 261.63], // Am7
    ];

    let chordIndex = 0;

    const playChord = () => {
      if (!this.isPlayingAmbient || !this.ambientGain || !this.ctx) return;
      const notes = progressions[chordIndex];
      chordIndex = (chordIndex + 1) % progressions.length;
      const now = this.ctx.currentTime;
      const duration = 4.2;

      // Filter for warm lo-fi tape sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(650, now + duration);
      filter.connect(this.ambientGain);

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        // Slight detune for analog warmth
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.08 / notes.length, now + 1.2);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(noteGain);
        noteGain.connect(filter);

        osc.start(now);
        osc.stop(now + duration + 0.1);
      });
    };

    playChord();
    this.chordInterval = window.setInterval(playChord, 4000);
  }

  public stopAmbientRadio(): void {
    this.isPlayingAmbient = false;
    if (this.chordInterval) {
      clearInterval(this.chordInterval);
      this.chordInterval = null;
    }
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          this.ambientGain?.disconnect();
          this.ambientGain = null;
        }, 350);
      } catch {
        // Ignored
      }
    }
  }

  public setAmbientVolume(vol: number): void {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  // --- SOUNDBOARD EFFECTS GENERATORS ---

  // 1. Station ID Jingle (Signature synth chime arpeggio)
  public playStationJingle(targetNode?: AudioNode): void {
    const ctx = this.initContext();
    const dest = targetNode || ctx.destination;
    const now = ctx.currentTime;

    const jingleNotes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C E G C5 E5 G5
    jingleNotes.forEach((freq, idx) => {
      const startTime = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.4);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  }

  // 2. Air Horn (Classic radio DJ sound effect)
  public playAirHorn(targetNode?: AudioNode): void {
    const ctx = this.initContext();
    const dest = targetNode || ctx.destination;
    const now = ctx.currentTime;

    const bursts = [0, 0.22, 0.44];
    bursts.forEach((offset) => {
      const t = now + offset;
      const fundamental = 310;
      // Horn frequencies
      const freqs = [fundamental, fundamental * 1.25, fundamental * 1.5, fundamental * 1.875];

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.96, t + 0.18);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(t);
        osc.stop(t + 0.2);
      });
    });
  }

  // 3. Breaking News / Emergency Stinger Alert
  public playAlertStinger(targetNode?: AudioNode): void {
    const ctx = this.initContext();
    const dest = targetNode || ctx.destination;
    const now = ctx.currentTime;

    const pulses = [0, 0.18, 0.36, 0.54];
    pulses.forEach((offset) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1174.66, t + 0.08);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // 4. Bell Chime / Studio Ding
  public playChime(targetNode?: AudioNode): void {
    const ctx = this.initContext();
    const dest = targetNode || ctx.destination;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318.51, now); // E6
    osc.frequency.exponentialRampToValueAtTime(1310, now + 1.5);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 2.1);
  }

  // 5. 808 Sub Drop (deep bass sweep)
  public play808Drop(targetNode?: AudioNode): void {
    const ctx = this.initContext();
    const dest = targetNode || ctx.destination;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  // 6. Crowd Cheer / Noise applause simulation
  public playCrowdCheer(targetNode?: AudioNode): void {
    const ctx = this.initContext();
    const dest = targetNode || ctx.destination;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 2.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink/filtered noise for crowd applause
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.08;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
    noise.stop(now + 2.5);
  }
}

export const proceduralSynth = new ProceduralSynth();
