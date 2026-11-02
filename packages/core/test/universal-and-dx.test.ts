import { describe, it, expect } from 'vitest';
import { PetHertz, UniversalPetInterpreter, encodeWav } from '../src/index.js';

describe('UniversalPetInterpreter & Developer Experience (DX)', () => {
  const sampleRate = 44100;

  it('initializes PetHertz with zero arguments and auto-detects feline meow', async () => {
    // 0-argument constructor: new PetHertz()
    const engine = new PetHertz();

    // Synthetic feline meow: 550 Hz -> 850 Hz rising pitch (0.6s)
    const len = Math.floor(sampleRate * 0.6);
    const audio = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const f = 550 + (850 - 550) * (t / 0.6);
      audio[i] = 0.6 * Math.sin(2 * Math.PI * f * t);
    }

    const res = await engine.analyze(audio, { sampleRate });
    expect(res.isAnimalVocalization).toBe(true);
    expect(res.species).toBe('cat');
    expect(res.vocalization).toBe('meow');
    expect(res.intent).toBe('hunger_solicitation');
    expect(res.events).toBeDefined();
    expect(res.events!.length).toBeGreaterThan(0);
  });

  it('auto-detects canine barking from staccato acoustic bursts', async () => {
    const engine = new PetHertz();

    // Synthetic dog bark: 2 short low bursts (320 Hz, 100ms each, 60ms pause)
    const b1 = Math.floor(sampleRate * 0.1);
    const pause = Math.floor(sampleRate * 0.06);
    const b2 = Math.floor(sampleRate * 0.1);
    const audio = new Float32Array(b1 + pause + b2);

    for (let i = 0; i < b1; i++) {
      audio[i] = 0.7 * Math.sin((2 * Math.PI * 320 * i) / sampleRate);
    }
    for (let i = 0; i < b2; i++) {
      audio[b1 + pause + i] = 0.7 * Math.sin((2 * Math.PI * 320 * i) / sampleRate);
    }

    const res = await engine.analyze(audio, { sampleRate });
    expect(res.isAnimalVocalization).toBe(true);
    expect(res.species).toBe('dog');
    expect(res.vocalization).toBe('bark');
    expect(res.intent).toBe('alarm_threat');
  });

  it('accepts raw WAV Uint8Array bytes directly in analyze() without manual decoding', async () => {
    const engine = new PetHertz();

    // Create a 400ms 600 Hz tone and encode to WAV
    const len = Math.floor(sampleRate * 0.4);
    const pcm = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      pcm[i] = 0.5 * Math.sin((2 * Math.PI * 600 * i) / sampleRate);
    }
    const wavBytes = encodeWav(pcm, sampleRate);

    // Pass WAV bytes directly into analyze!
    const res = await engine.analyze(wavBytes);
    expect(res.acousticMetrics.fundamentalFrequencyHz).toBeGreaterThan(580);
    expect(res.acousticMetrics.fundamentalFrequencyHz).toBeLessThan(620);
    expect(res.events).toBeDefined();
  });

  it('StreamAnalyzer supports pause(), resume(), and confidenceThreshold', async () => {
    const engine = new PetHertz();
    const stream = engine.createStreamAnalyzer({
      windowDurationSec: 0.5,
      hopDurationSec: 0.1,
      confidenceThreshold: 0.85,
    });

    expect(stream.isPaused).toBe(false);
    stream.pause();
    expect(stream.isPaused).toBe(true);

    let triggered = false;
    stream.on('vocalization', () => {
      triggered = true;
    });

    // Push while paused -> should be ignored
    const chunk = new Float32Array(1000).fill(0.5);
    await stream.push(chunk);
    expect(triggered).toBe(false);

    stream.resume();
    expect(stream.isPaused).toBe(false);
  });

  it('accurately evaluates multi-event timeline with distinct vocalizations (Bark followed by Growl)', async () => {
    const engine = new PetHertz();

    // Event 1: High Bark (750 Hz, 120ms)
    const b1Len = Math.floor(sampleRate * 0.12);
    const b1 = new Float32Array(b1Len);
    for (let i = 0; i < b1Len; i++) {
      b1[i] = 0.7 * Math.sin((2 * Math.PI * 780 * i) / sampleRate);
    }

    // Inter-burst pause (350ms silence)
    const pauseLen = Math.floor(sampleRate * 0.35);
    const pause = new Float32Array(pauseLen);

    // Event 2: Low Growl (150 Hz, 400ms) with harmonic roughness
    const gLen = Math.floor(sampleRate * 0.4);
    const growl = new Float32Array(gLen);
    for (let i = 0; i < gLen; i++) {
      growl[i] =
        0.5 * Math.sin((2 * Math.PI * 150 * i) / sampleRate) +
        0.18 * Math.sin((2 * Math.PI * 300 * i) / sampleRate);
    }

    const multiEventAudio = new Float32Array(b1Len + pauseLen + gLen);
    multiEventAudio.set(b1, 0);
    multiEventAudio.set(pause, b1Len);
    multiEventAudio.set(growl, b1Len + pauseLen);

    const res = await engine.analyze(multiEventAudio, { sampleRate });
    expect(res.isAnimalVocalization).toBe(true);
    expect(res.events).toBeDefined();
    expect(res.events!.length).toBe(2);

    // Verify per-segment independent evaluation (NOT duplicate global intent!)
    expect(res.events![0]!.vocalization).toBe('bark');
    expect(res.events![1]!.vocalization).toBe('growl');
    expect(res.events![1]!.intent).toBe('warning_aggression');
  });

  it('correctly classifies miniature dog whine (flat 900 Hz, high centroid) as canine whine, not cat meow', async () => {
    const engine = new PetHertz();

    // High flat whine (900 Hz, 500ms) with high centroid noise (typical toy breed whine)
    const len = Math.floor(sampleRate * 0.5);
    const audio = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      audio[i] =
        0.5 * Math.sin((2 * Math.PI * 900 * i) / sampleRate) +
        0.1 * Math.sin((2 * Math.PI * 3600 * i) / sampleRate);
    }

    const res = await engine.analyze(audio, { sampleRate });
    expect(res.isAnimalVocalization).toBe(true);
    expect(res.species).toBe('dog');
    expect(res.vocalization).toBe('whine');
    expect(res.intent).toBe('anxiety_separation');
  });
});

