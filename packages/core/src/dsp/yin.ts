/**
 * Implementation of the YIN Pitch Detection Algorithm (de Cheveigné & Kawahara, 2002).
 * Highly optimized for animal bioacoustics fundamental frequency (F0) extraction.
 */

export interface YinResult {
  frequencyHz: number;
  confidence: number;
}

export interface YinOptions {
  sampleRate: number;
  minFrequency?: number; // Defaults to 20 Hz (e.g. cat purring)
  maxFrequency?: number; // Defaults to 3500 Hz (e.g. dog high whine)
  threshold?: number;    // Tolerance for dip detection (default 0.15)
}

export function detectPitchYin(
  audioData: Float32Array | number[],
  options: YinOptions
): YinResult {
  const sampleRate = options.sampleRate;
  const minFreq = Math.max(10, options.minFrequency ?? 20);
  const maxFreq = Math.min(sampleRate / 2, options.maxFrequency ?? 3500);
  const threshold = options.threshold ?? 0.15;

  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.min(Math.floor(sampleRate / minFreq), Math.floor(audioData.length / 2));

  if (maxPeriod <= minPeriod || audioData.length < maxPeriod * 2) {
    return { frequencyHz: 0, confidence: 0 };
  }

  const bufferSize = maxPeriod;
  const yinBuffer = new Float32Array(maxPeriod);

  // Step 1: Squared difference function
  for (let tau = 0; tau < maxPeriod; tau++) {
    let sum = 0;
    for (let i = 0; i < bufferSize; i++) {
      const delta = (audioData[i] ?? 0) - (audioData[i + tau] ?? 0);
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference function
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < maxPeriod; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum > 0 ? (yinBuffer[tau] * tau) / runningSum : 1;
  }

  // Step 3: Absolute thresholding
  let tauCandidate = -1;
  for (let tau = minPeriod; tau < maxPeriod; tau++) {
    if (yinBuffer[tau] < threshold) {
      // Find the local minimum within this dip
      while (tau + 1 < maxPeriod && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauCandidate = tau;
      break;
    }
  }

  // If no tau was under the threshold, find the global minimum in range
  if (tauCandidate === -1) {
    let minVal = 1.0;
    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        tauCandidate = tau;
      }
    }
    // If the best minimum is still too noisy (> 0.5), classify as unvoiced/atonal
    if (minVal > 0.55 || tauCandidate === -1) {
      return { frequencyHz: 0, confidence: 0 };
    }
  }

  // Step 4: Parabolic interpolation for sub-sample precision
  let betterTau = tauCandidate;
  if (tauCandidate > 0 && tauCandidate < maxPeriod - 1) {
    const s0 = yinBuffer[tauCandidate - 1];
    const s1 = yinBuffer[tauCandidate];
    const s2 = yinBuffer[tauCandidate + 1];
    const bottom = 2 * (2 * s1 - s2 - s0);
    if (Math.abs(bottom) > 1e-6) {
      betterTau = tauCandidate + (s2 - s0) / bottom;
    }
  }

  const confidence = Math.max(0, Math.min(1, 1 - yinBuffer[tauCandidate]));
  const frequencyHz = sampleRate / betterTau;

  if (frequencyHz < minFreq || frequencyHz > maxFreq) {
    return { frequencyHz: 0, confidence: 0 };
  }

  return {
    frequencyHz: Math.round(frequencyHz * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
  };
}

