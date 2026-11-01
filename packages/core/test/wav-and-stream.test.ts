import { describe, expect, it } from 'vitest';
import { PetHertz, decodeWav, encodeWav } from '../src/index.js';
import { PetStreamAnalyzer } from '../src/stream/StreamAnalyzer.js';
import { CatInterpreter } from '@pethertz/cat';

function generateSineWave(freq: number, sampleRate: number, durationSec: number): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buf = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buf[i] = 0.8 * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buf;
}

describe('WAV Encoding, Decoding & Real-Time Streaming', () => {
  const sampleRate = 44100;

  it('correctly encodes and decodes WAV PCM data without quality loss', () => {
    const original = generateSineWave(500, sampleRate, 0.2);
    const wavBytes = encodeWav(original, sampleRate);

    expect(wavBytes.length).toBeGreaterThan(44);

    const decoded = decodeWav(wavBytes);
    expect(decoded.sampleRate).toBe(sampleRate);
    expect(decoded.channels).toBe(1);
    expect(decoded.bitsPerSample).toBe(16);
    expect(decoded.audioData.length).toBe(original.length);

    // Verify sample amplitude correlation
    let maxDiff = 0;
    for (let i = 0; i < original.length; i++) {
      const diff = Math.abs((original[i] ?? 0) - (decoded.audioData[i] ?? 0));
      if (diff > maxDiff) maxDiff = diff;
    }
    // 16-bit quantization error should be < 0.0001
    expect(maxDiff).toBeLessThan(0.0002);
  });

  it('allows PetHertz.analyzeWav() directly on WAV byte buffers', async () => {
    const engine = new PetHertz({
      interpreter: new CatInterpreter(),
      defaultSampleRate: sampleRate,
    });

    const risingAudio = new Float32Array(sampleRate * 0.7);
    for (let i = 0; i < risingAudio.length; i++) {
      const t = i / sampleRate;
      const freq = 550 + (900 - 550) * (t / 0.7);
      risingAudio[i] = 0.7 * Math.sin(2 * Math.PI * freq * t);
    }

    const wavBytes = encodeWav(risingAudio, sampleRate);
    const result = await engine.analyzeWav(wavBytes);

    expect(result.species).toBe('cat');
    expect(result.intent).toBe('hunger_solicitation');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('streams audio chunks through PetStreamAnalyzer and fires events', async () => {
    const engine = new PetHertz({
      interpreter: new CatInterpreter(),
      defaultSampleRate: sampleRate,
    });

    const stream = new PetStreamAnalyzer(engine, {
      windowDurationSec: 0.5,
      hopDurationSec: 0.1,
      silenceThresholdRms: 0.01,
      debounceMs: 50,
    });

    let vocalizationDetected = false;
    let detectedIntent = '';

    stream.on('vocalization', (res) => {
      vocalizationDetected = true;
      detectedIntent = res.intent;
    });

    // 1. Feed 0.2s silence
    const silence = new Float32Array(Math.floor(sampleRate * 0.2));
    await stream.push(silence);
    expect(vocalizationDetected).toBe(false);

    // 2. Feed rising meow sound in chunks of 50ms
    const chunkSize = Math.floor(sampleRate * 0.05);
    const totalVocalSamples = Math.floor(sampleRate * 0.6);

    for (let offset = 0; offset < totalVocalSamples; offset += chunkSize) {
      const chunk = new Float32Array(chunkSize);
      for (let i = 0; i < chunkSize; i++) {
        const t = (offset + i) / sampleRate;
        const freq = 550 + (900 - 550) * (t / 0.6);
        chunk[i] = 0.7 * Math.sin(2 * Math.PI * freq * t);
      }
      await stream.push(chunk);
    }

    expect(vocalizationDetected).toBe(true);
    expect(detectedIntent).toBe('hunger_solicitation');
  });
});

