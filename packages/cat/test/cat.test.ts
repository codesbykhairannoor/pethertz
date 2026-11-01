import { describe, expect, it } from 'vitest';
import { PetHertz } from '@pethertz/core';
import { CatInterpreter } from '../src/CatInterpreter.js';

function createSineSweep(
  startFreq: number,
  endFreq: number,
  sampleRate: number,
  durationSec: number
): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const currentFreq = startFreq + (endFreq - startFreq) * (t / durationSec);
    buffer[i] = 0.7 * Math.sin(2 * Math.PI * currentFreq * t);
  }
  return buffer;
}

describe('Cat Vocalization Interpretation (@pethertz/cat)', () => {
  const sampleRate = 44100;
  const engine = new PetHertz({
    interpreter: new CatInterpreter(),
    defaultSampleRate: sampleRate,
  });

  it('classifies rising intonation meow as hunger_solicitation (Schötz 2023)', async () => {
    // Rising sweep from 520 Hz to 850 Hz over 0.7s
    const audio = createSineSweep(520, 850, sampleRate, 0.7);
    const result = await engine.analyze(audio);

    expect(result.species).toBe('cat');
    expect(result.vocalization).toBe('meow');
    expect(result.intent).toBe('hunger_solicitation');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('classifies low-frequency purr (30 Hz) as comfort_purring', async () => {
    const numSamples = Math.floor(sampleRate * 0.5);
    const purrAudio = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      purrAudio[i] = 0.2 * Math.sin((2 * Math.PI * 30 * i) / sampleRate);
    }

    const result = await engine.analyze(purrAudio);
    expect(result.species).toBe('cat');
    expect(result.vocalization).toBe('purr');
    expect(result.intent).toBe('comfort_purring');
  });

  it('classifies noisy turbulent audio as defense_warning hiss', async () => {
    const numSamples = Math.floor(sampleRate * 0.4);
    const hissAudio = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      hissAudio[i] = (Math.random() - 0.5) * 0.5;
    }

    const result = await engine.analyze(hissAudio);
    expect(result.species).toBe('cat');
    expect(result.vocalization).toBe('hiss');
    expect(result.intent).toBe('defense_warning');
  });

  it('classifies short chirp (<400ms) as greeting_social', async () => {
    const chirp = createSineSweep(500, 600, sampleRate, 0.25);
    const result = await engine.analyze(chirp);

    expect(result.species).toBe('cat');
    expect(result.vocalization).toBe('chirp_trill');
    expect(result.intent).toBe('greeting_social');
  });
});

