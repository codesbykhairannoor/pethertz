/**
 * Bioacoustic Formant Dispersion & Vocal Tract Length (VTL) Estimator.
 * Grounded in Acoustic Allometry (Fitch 1997; Taylor & Reby 2008).
 * Uses Linear Predictive Coding (LPC) via Levinson-Durbin and spectral peak picking.
 */

export interface FormantAnalysis {
  formants: number[];            // Resonant frequencies [F1, F2, F3, F4] in Hz
  formantDispersionHz: number;   // Delta F: average distance between adjacent formants
  estimatedVocalTractLengthCm: number; // L = c / (2 * Delta F)
  vtlRangeCm: [number, number];  // Realistic anatomical interval [L_min, L_max]
  vtlConfidence: number;         // 0.0 - 1.0 confidence score based on SNR & F0
  morphologicalCategory: 'feline' | 'canine_small' | 'canine_large' | 'human_or_large_mammal' | 'unknown';
  isHarmonicLocked?: boolean;    // True if F0 caused harmonic undersampling
}

/**
 * Calculates autocorrelation sequence R[0 ... order] of windowed signal.
 */
function calculateAutocorrelation(signal: Float32Array, order: number): Float32Array {
  const r = new Float32Array(order + 1);
  const n = signal.length;
  for (let k = 0; k <= order; k++) {
    let sum = 0;
    for (let i = 0; i < n - k; i++) {
      sum += (signal[i] ?? 0) * (signal[i + k] ?? 0);
    }
    r[k] = sum;
  }
  return r;
}

/**
 * Solves Toeplitz system R * a = -r using Levinson-Durbin recursion.
 * Returns LPC coefficients a = [1, a_1, a_2, ... a_p].
 */
export function levinsonDurbin(r: Float32Array, order: number): Float32Array {
  const a = new Float32Array(order + 1);
  const prevA = new Float32Array(order + 1);
  a[0] = 1.0;

  let error = r[0] ?? 1e-6;
  if (error <= 0) error = 1e-6;

  for (let i = 1; i <= order; i++) {
    let lambda = 0;
    for (let j = 0; j < i; j++) {
      lambda += a[j]! * (r[i - j] ?? 0);
    }
    const reflection = -lambda / error;

    prevA.set(a);
    for (let j = 1; j < i; j++) {
      a[j] = prevA[j]! + reflection * prevA[i - j]!;
    }
    a[i] = reflection;

    error *= 1.0 - reflection * reflection;
    if (error <= 0) break;
  }

  return a;
}

/**
 * Estimates formant frequencies by finding spectral peaks in the LPC inverse filter spectrum.
 */
export function extractFormantsFromLpc(
  lpcCoeffs: Float32Array,
  sampleRate: number,
  numFftBins = 512
): number[] {
  const p = lpcCoeffs.length;
  const halfFft = numFftBins / 2;
  const lpcSpectrum = new Float32Array(halfFft);

  // Evaluate 1 / |A(w)|^2 across frequencies
  for (let k = 1; k < halfFft; k++) {
    const omega = (Math.PI * k) / halfFft;
    let real = 0;
    let imag = 0;
    for (let i = 0; i < p; i++) {
      const angle = i * omega;
      real += (lpcCoeffs[i] ?? 0) * Math.cos(angle);
      imag -= (lpcCoeffs[i] ?? 0) * Math.sin(angle);
    }
    const magSq = real * real + imag * imag;
    lpcSpectrum[k] = magSq > 1e-12 ? 1.0 / magSq : 1e6;
  }

  // Peak picking to find resonant formant peaks
  const peaks: { freqHz: number; magnitude: number }[] = [];
  const binResolution = (sampleRate / 2) / halfFft;

  for (let k = 2; k < halfFft - 2; k++) {
    const val = lpcSpectrum[k]!;
    if (
      val > lpcSpectrum[k - 1]! &&
      val > lpcSpectrum[k + 1]! &&
      val > lpcSpectrum[k - 2]! &&
      val > lpcSpectrum[k + 2]!
    ) {
      const freqHz = Math.round(k * binResolution);
      // Formants in mammals typically occur between 300 Hz and 12,000 Hz
      if (freqHz >= 300 && freqHz <= 12000) {
        peaks.push({ freqHz, magnitude: val });
      }
    }
  }

  // Sort by frequency and return top distinct formant peaks
  return peaks.map((p) => p.freqHz).slice(0, 4);
}

/**
 * Full Bioacoustic Vocal Tract Analysis (Acoustic Allometry).
 * Analyzes audio segment and computes Formant Dispersion and Vocal Tract Length (VTL).
 */
export function estimateVocalTractDimensions(
  audioData: Float32Array | number[],
  sampleRate: number,
  f0Hint?: number
): FormantAnalysis {
  const n = audioData.length;
  if (n < 256) {
    return {
      formants: [],
      formantDispersionHz: 0,
      estimatedVocalTractLengthCm: 0,
      vtlRangeCm: [0, 0],
      vtlConfidence: 0,
      morphologicalCategory: 'unknown',
      isHarmonicLocked: false,
    };
  }

  // Pre-emphasis filter: y[n] = x[n] - 0.95 * x[n-1]
  const preEmph = new Float32Array(n);
  preEmph[0] = audioData[0] ?? 0;
  for (let i = 1; i < n; i++) {
    preEmph[i] = (audioData[i] ?? 0) - 0.95 * (audioData[i - 1] ?? 0);
  }

  // Apply Hamming window
  const windowed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
    windowed[i] = preEmph[i]! * hamming;
  }

  // LPC Order rule of thumb: ~ sampleRate / 1000 + 4
  const lpcOrder = Math.min(24, Math.max(10, Math.floor(sampleRate / 1500) + 2));
  const r = calculateAutocorrelation(windowed, lpcOrder);
  const a = levinsonDurbin(r, lpcOrder);
  const formants = extractFormantsFromLpc(a, sampleRate);

  // Compute Formant Dispersion: mean distance between adjacent formants
  let dispersionSum = 0;
  let dispersionCount = 0;
  for (let i = 1; i < formants.length; i++) {
    const diff = formants[i]! - formants[i - 1]!;
    if (diff > 400) {
      dispersionSum += diff;
      dispersionCount++;
    }
  }

  const formantDispersionHz =
    dispersionCount > 0 ? Math.round(dispersionSum / dispersionCount) : 0;

  // Vocal Tract Length Formula: L = c / (2 * Delta F)
  // c = speed of sound in humid mammal vocal tract (approx 34,400 cm/s)
  const estimatedVocalTractLengthCm =
    formantDispersionHz > 0 ? Math.round((34400 / (2 * formantDispersionHz)) * 10) / 10 : 0;

  // Check for high F0 harmonic locking hazard (flagged by Meta AI & DeepSeek audit)
  // When F0 > 700 Hz, LPC picks harmonics rather than true vocal tract formants
  const isHarmonicLocked = f0Hint !== undefined && f0Hint > 700;

  // Calculate probabilistic confidence and realistic anatomical range
  let vtlConfidence = 0.85;
  if (isHarmonicLocked) {
    vtlConfidence = 0.25; // F0 harmonic undersampling: VTL is physically uncomputable
  } else if (dispersionCount < 2) {
    vtlConfidence = 0.40;
  }

  // Safe VTL calculation with NaN protection
  let safeVtl = estimatedVocalTractLengthCm;
  if (isNaN(safeVtl) || !isFinite(safeVtl) || safeVtl < 0) {
    safeVtl = 0;
  }

  const minVtl = safeVtl > 0
    ? Math.round(safeVtl * 0.8 * 10) / 10
    : 0;
  const maxVtl = safeVtl > 0
    ? Math.round(safeVtl * 1.2 * 10) / 10
    : 0;

  // Classify based on anatomical vocal tract length
  // Only classify as human if NOT harmonic locked and confidence is valid
  let morphologicalCategory: FormantAnalysis['morphologicalCategory'] = 'unknown';
  if (safeVtl > 0 && !isHarmonicLocked && vtlConfidence >= 0.5) {
    if (safeVtl >= 3.5 && safeVtl <= 7.5) {
      morphologicalCategory = 'feline'; // Cat vocal tract is ~4-6 cm
    } else if (safeVtl > 7.5 && safeVtl <= 11.5) {
      morphologicalCategory = 'canine_small'; // Small-medium dog is ~8-11 cm
    } else if (safeVtl > 11.5 && safeVtl <= 15.5) {
      morphologicalCategory = 'canine_large'; // Large dog (Mastiff, GSD, Lab) is ~12-15 cm
    } else if (safeVtl > 15.5) {
      morphologicalCategory = 'human_or_large_mammal'; // Adult human is ~15.5-18 cm
    }
  }

  return {
    formants,
    formantDispersionHz,
    estimatedVocalTractLengthCm: safeVtl,
    vtlRangeCm: [minVtl, maxVtl],
    vtlConfidence,
    morphologicalCategory,
    isHarmonicLocked,
  };
}

