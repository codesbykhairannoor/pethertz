import { describe, expect, it } from 'vitest';
import { PetHertz } from '@pethertz/core';
import { DogInterpreter } from '../src/DogInterpreter.js';

function createToneBurst(
  freqHz: number,
  sampleRate: number,
  durationSec: number,
  amplitude = 0.8
): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return buffer;
}

describe('Dog Vocalization Interpretation (@pethertz/dog)', () => {
  const sampleRate = 44100;
  const engine = new PetHertz({
    interpreter: new DogInterpreter(),
    defaultSampleRate: sampleRate,
  });

  it('classifies high tonal whining (1400 Hz) as anxiety_separation', async () => {
    const audio = createToneBurst(1400, sampleRate, 0.6);
    const result = await engine.analyze(audio);

    expect(result.species).toBe('dog');
    expect(result.vocalization).toBe('whine');
    expect(result.intent).toBe('anxiety_separation');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('classifies low-pitch growl (120 Hz) as warning_aggression', async () => {
    const numSamples = Math.floor(sampleRate * 0.5);
    const audio = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      // 120 Hz fundamental with harmonic roughness (Pongrácz canine growl model)
      audio[i] =
        0.5 * Math.sin((2 * Math.PI * 120 * i) / sampleRate) +
        0.18 * Math.sin((2 * Math.PI * 240 * i) / sampleRate) +
        0.08 * Math.sin((2 * Math.PI * 360 * i) / sampleRate);
    }

    const result = await engine.analyze(audio);
    expect(result.species).toBe('dog');
    expect(result.vocalization).toBe('growl');
    expect(result.intent).toBe('warning_aggression');
  });

  it('classifies low F0 rapid-burst barking as alarm_threat (Pongrácz canine metrics)', async () => {
    // 2 rapid low bursts (350 Hz, 120ms burst, 80ms silence)
    const burst1 = createToneBurst(350, sampleRate, 0.12, 0.7);
    const pause = new Float32Array(Math.floor(sampleRate * 0.08));
    const burst2 = createToneBurst(350, sampleRate, 0.12, 0.7);

    const audio = new Float32Array(burst1.length + pause.length + burst2.length);
    audio.set(burst1, 0);
    audio.set(pause, burst1.length);
    audio.set(burst2, burst1.length + pause.length);

    const result = await engine.analyze(audio);
    expect(result.species).toBe('dog');
    expect(result.vocalization).toBe('bark');
    expect(result.intent).toBe('alarm_threat');
  });

  it('classifies high F0 barking as playful_excitement', async () => {
    const audio = createToneBurst(950, sampleRate, 0.25, 0.6);
    const result = await engine.analyze(audio);

    expect(result.species).toBe('dog');
    expect(result.vocalization).toBe('bark');
    expect(result.intent).toBe('playful_excitement');
  });
});

