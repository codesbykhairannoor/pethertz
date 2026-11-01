import { IntonationContour } from '../types/index.js';
import { fftRadix2 } from './mfcc.js';

/**
 * Calculates the Root Mean Square (RMS) energy of the audio signal.
 */
export function calculateRms(audioData: Float32Array | number[]): number {
  if (audioData.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < audioData.length; i++) {
    const val = audioData[i] ?? 0;
    sumSq += val * val;
  }
  return Math.sqrt(sumSq / audioData.length);
}

/**
 * Calculates Normalized Zero-Crossing Rate (ZCR).
 * A high ZCR (> 0.25) indicates turbulent/frictional noise (e.g. cat hiss, dog growl roughness).
 */
export function calculateZcr(audioData: Float32Array | number[]): number {
  if (audioData.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < audioData.length; i++) {
    const prev = audioData[i - 1] ?? 0;
    const curr = audioData[i] ?? 0;
    if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
      crossings++;
    }
  }
  return crossings / (audioData.length - 1);
}

/**
 * Calculates the Spectral Centroid in Hz (center of mass of the frequency spectrum).
 * Higher values correspond to "brighter" sounds (e.g. kitten meow vs adult purr).
 */
export function calculateSpectralCentroid(
  audioData: Float32Array | number[],
  sampleRate: number
): number {
  const n = audioData.length;
  if (n < 64) return 0;

  const frameSize = 512;
  const hopSize = 256;
  const halfFft = frameSize / 2;
  const binResolution = sampleRate / frameSize;

  const real = new Float32Array(frameSize);
  const imag = new Float32Array(frameSize);

  let totalWeightedCentroid = 0;
  let totalEnergy = 0;

  // If signal is shorter than 512, process single zero-padded frame
  if (n < frameSize) {
    let frameEnergy = 0;
    for (let t = 0; t < frameSize; t++) {
      const s = t < n ? (audioData[t] ?? 0) : 0;
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * t) / (frameSize - 1)));
      const windowed = s * hann;
      real[t] = windowed;
      imag[t] = 0;
      frameEnergy += windowed * windowed;
    }
    if (frameEnergy < 1e-6) return 0;
    fftRadix2(real, imag);
    let num = 0;
    let den = 0;
    for (let k = 1; k < halfFft; k++) {
      const r = real[k]!;
      const im = imag[k]!;
      const mag = Math.sqrt(r * r + im * im);
      num += (k * binResolution) * mag;
      den += mag;
    }
    return den > 1e-6 ? Math.round(num / den) : 0;
  }

  for (let start = 0; start + frameSize <= n; start += hopSize) {
    let frameEnergy = 0;
    for (let t = 0; t < frameSize; t++) {
      const s = audioData[start + t] ?? 0;
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * t) / (frameSize - 1)));
      const windowed = s * hann;
      real[t] = windowed;
      imag[t] = 0;
      frameEnergy += windowed * windowed;
    }

    if (frameEnergy < 1e-5) continue; // skip silent frames

    fftRadix2(real, imag);

    let num = 0;
    let den = 0;
    for (let k = 1; k < halfFft; k++) {
      const r = real[k]!;
      const im = imag[k]!;
      const mag = Math.sqrt(r * r + im * im);
      num += (k * binResolution) * mag;
      den += mag;
    }

    if (den > 1e-6) {
      const frameCentroid = num / den;
      totalWeightedCentroid += frameCentroid * frameEnergy;
      totalEnergy += frameEnergy;
    }
  }

  return totalEnergy > 0 ? Math.round(totalWeightedCentroid / totalEnergy) : 0;
}

/**
 * Analyzes the pitch contour across sequential time slices.
 * Directly grounded in Susanne Schötz (2023) rising vs falling intonation discovery.
 */
export function analyzePitchContour(pitchTrajectory: number[]): IntonationContour {
  const voicedPitches = pitchTrajectory.filter((p) => p > 30);
  if (voicedPitches.length < 3) {
    return 'atonal';
  }

  const segmentLength = Math.max(1, Math.floor(voicedPitches.length / 3));
  const startSlice = voicedPitches.slice(0, segmentLength);
  const endSlice = voicedPitches.slice(voicedPitches.length - segmentLength);

  const startAvg = startSlice.reduce((a, b) => a + b, 0) / startSlice.length;
  const endAvg = endSlice.reduce((a, b) => a + b, 0) / endSlice.length;

  const ratio = endAvg / Math.max(1, startAvg);

  // Check overall variance/standard deviation
  const overallMean = voicedPitches.reduce((a, b) => a + b, 0) / voicedPitches.length;
  const variance =
    voicedPitches.reduce((sum, p) => sum + Math.pow(p - overallMean, 2), 0) /
    voicedPitches.length;
  const stdDevRatio = Math.sqrt(variance) / overallMean;

  if (ratio >= 1.15) {
    return 'rising';
  }
  if (ratio <= 0.85) {
    return 'falling';
  }
  if (stdDevRatio > 0.25) {
    return 'fluctuating';
  }
  return 'flat';
}

