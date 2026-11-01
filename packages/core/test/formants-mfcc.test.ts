import { describe, it, expect } from 'vitest';
import {
  levinsonDurbin,
  extractFormantsFromLpc,
  estimateVocalTractDimensions,
  fftRadix2,
  hzToMel,
  melToHz,
  extractMfcc,
  calculateSpectralFlatness,
} from '../src/index.js';

describe('Acoustic Allometry & Formant Dispersion (LPC)', () => {
  it('solves Levinson-Durbin recursion for simple autocorrelation vector', () => {
    // Autocorrelation of an AR(1) process with a1 = -0.8: R[0]=1.0, R[1]=0.8, R[2]=0.64
    const r = new Float32Array([1.0, 0.8, 0.64]);
    const a = levinsonDurbin(r, 2);

    expect(a.length).toBe(3);
    expect(a[0]).toBe(1.0);
    // a1 should be close to -0.8
    expect(a[1]).toBeCloseTo(-0.8, 1);
  });

  it('calculates Formant Dispersion and Vocal Tract Length for synthetic resonances', () => {
    const sampleRate = 16000;
    const duration = 0.5; // 500ms
    const numSamples = Math.floor(sampleRate * duration);
    const audio = new Float32Array(numSamples);

    // Synthesize vocal tract resonances at F1=800Hz, F2=2400Hz, F3=4000Hz (Delta F ~ 1600Hz, VTL ~ 10.75cm)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-3 * t);
      audio[i] =
        decay *
        (0.6 * Math.sin(2 * Math.PI * 800 * t) +
          0.4 * Math.sin(2 * Math.PI * 2400 * t) +
          0.2 * Math.sin(2 * Math.PI * 4000 * t));
    }

    const analysis = estimateVocalTractDimensions(audio, sampleRate);
    expect(analysis.formants.length).toBeGreaterThan(0);
    expect(analysis.formantDispersionHz).toBeGreaterThan(500);
    expect(analysis.estimatedVocalTractLengthCm).toBeGreaterThan(2);
    expect(analysis.estimatedVocalTractLengthCm).toBeLessThan(25);
  });
});

describe('MFCC & Spectral Timbre Analysis', () => {
  it('converts between Hz and Mel scale reversibly', () => {
    const testFrequencies = [100, 440, 1000, 2500, 5000, 8000];
    for (const hz of testFrequencies) {
      const mel = hzToMel(hz);
      const recoveredHz = melToHz(mel);
      expect(recoveredHz).toBeCloseTo(hz, 1);
    }
  });

  it('computes FFT Radix-2 accurately on a pure sine wave', () => {
    const fftSize = 512;
    const sampleRate = 16000;
    const freq = 1000; // 1000 Hz bin
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);

    for (let i = 0; i < fftSize; i++) {
      real[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
      imag[i] = 0;
    }

    fftRadix2(real, imag);

    // Find peak magnitude bin
    let maxMag = 0;
    let peakBin = 0;
    for (let k = 0; k < fftSize / 2; k++) {
      const mag = Math.sqrt(real[k]! * real[k]! + imag[k]! * imag[k]!);
      if (mag > maxMag) {
        maxMag = mag;
        peakBin = k;
      }
    }

    const detectedFreq = (peakBin * sampleRate) / fftSize;
    expect(detectedFreq).toBeCloseTo(1000, -2); // Within 50 Hz bin resolution
  });

  it('extracts 13-band MFCC coefficients and measures spectral flatness', () => {
    const sampleRate = 16000;
    const duration = 0.5;
    const numSamples = Math.floor(sampleRate * duration);
    const audio = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      audio[i] = 0.5 * Math.sin(2 * Math.PI * 440 * t);
    }

    const mfcc = extractMfcc(audio, sampleRate);
    expect(mfcc.coefficients.length).toBe(13);
    expect(mfcc.frames.length).toBeGreaterThan(0);
    // A pure sine tone has very low spectral flatness (< 0.05)
    expect(mfcc.spectralFlatness).toBeLessThan(0.05);
    expect(mfcc.timbreCategory).toBe('tonal_harmonic');
  });

  it('identifies turbulent noise as having high spectral flatness', () => {
    const sampleRate = 16000;
    const duration = 0.5;
    const numSamples = Math.floor(sampleRate * duration);
    const whiteNoise = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      whiteNoise[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const mfcc = extractMfcc(whiteNoise, sampleRate);
    expect(mfcc.spectralFlatness).toBeGreaterThan(0.2);
  });
});

