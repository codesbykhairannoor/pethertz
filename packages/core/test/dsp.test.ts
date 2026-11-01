import { describe, expect, it } from 'vitest';
import { detectPitchYin } from '../src/dsp/yin.js';
import {
  analyzePitchContour,
  calculateRms,
  calculateSpectralCentroid,
  calculateZcr,
} from '../src/dsp/features.js';
import { segmentVocalizations } from '../src/dsp/segmenter.js';

function generateSineWave(
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

describe('DSP Pitch & Feature Extraction', () => {
  const sampleRate = 44100;

  it('accurately estimates fundamental frequency (F0) with YIN at 440 Hz', () => {
    const wave = generateSineWave(440, sampleRate, 0.1);
    const result = detectPitchYin(wave, { sampleRate });

    expect(result.frequencyHz).toBeGreaterThan(435);
    expect(result.frequencyHz).toBeLessThan(445);
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('detects low-frequency purr pitch at 30 Hz', () => {
    const wave = generateSineWave(30, sampleRate, 0.3);
    const result = detectPitchYin(wave, { sampleRate, minFrequency: 20 });

    expect(result.frequencyHz).toBeGreaterThan(25);
    expect(result.frequencyHz).toBeLessThan(35);
  });

  it('detects high whine pitch at 1500 Hz', () => {
    const wave = generateSineWave(1500, sampleRate, 0.1);
    const result = detectPitchYin(wave, { sampleRate, maxFrequency: 3000 });

    expect(result.frequencyHz).toBeGreaterThan(1480);
    expect(result.frequencyHz).toBeLessThan(1520);
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('correctly calculates RMS energy', () => {
    const silence = new Float32Array(1000);
    expect(calculateRms(silence)).toBe(0);

    const wave = generateSineWave(440, sampleRate, 0.1, 1.0);
    const rms = calculateRms(wave);
    // Sine wave RMS of unit amplitude is 1/sqrt(2) ≈ 0.707
    expect(rms).toBeGreaterThan(0.68);
    expect(rms).toBeLessThan(0.73);
  });

  it('distinguishes tonal wave ZCR vs random noise ZCR', () => {
    const tonal = generateSineWave(200, sampleRate, 0.1);
    const tonalZcr = calculateZcr(tonal);

    const noise = new Float32Array(1000);
    for (let i = 0; i < noise.length; i++) {
      noise[i] = (Math.random() - 0.5) * 2;
    }
    const noiseZcr = calculateZcr(noise);

    expect(noiseZcr).toBeGreaterThan(0.35);
    expect(tonalZcr).toBeLessThan(0.05);
  });

  it('calculates spectral centroid for low vs high frequency', () => {
    const lowWave = generateSineWave(150, sampleRate, 0.1);
    const highWave = generateSineWave(2000, sampleRate, 0.1);

    const lowCentroid = calculateSpectralCentroid(lowWave, sampleRate);
    const highCentroid = calculateSpectralCentroid(highWave, sampleRate);

    expect(highCentroid).toBeGreaterThan(lowCentroid);
  });

  it('classifies rising and falling intonation contours (Schötz 2023)', () => {
    const rising = [500, 550, 620, 700, 780];
    const falling = [780, 700, 620, 550, 500];
    const flat = [600, 605, 598, 602, 600];

    expect(analyzePitchContour(rising)).toBe('rising');
    expect(analyzePitchContour(falling)).toBe('falling');
    expect(analyzePitchContour(flat)).toBe('flat');
  });

  it('segments vocal bursts and calculates intervals (Pongrácz canine metrics)', () => {
    const burst1 = generateSineWave(300, sampleRate, 0.1, 0.5);
    const silence = new Float32Array(Math.floor(sampleRate * 0.1)); // 100ms silence
    const burst2 = generateSineWave(300, sampleRate, 0.1, 0.5);

    const combined = new Float32Array(burst1.length + silence.length + burst2.length);
    combined.set(burst1, 0);
    combined.set(silence, burst1.length);
    combined.set(burst2, burst1.length + silence.length);

    const seg = segmentVocalizations(combined, {
      sampleRate,
      silenceThresholdRms: 0.05,
    });

    expect(seg.burstCount).toBe(2);
    expect(seg.averageBurstIntervalMs).toBeGreaterThan(70);
    expect(seg.averageBurstIntervalMs).toBeLessThan(130);
  });
});

