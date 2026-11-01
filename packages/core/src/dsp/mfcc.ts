/**
 * Bioacoustic Mel-Frequency Cepstral Coefficients (MFCC) Extractor.
 * Zero-dependency pure TypeScript implementation based on Davis & Mermelstein (1980).
 * Standard 13-band cepstral analysis for acoustic timbre representation.
 */

export interface MfccOptions {
  numCoefficients?: number; // Defaults to 13 (c0 - c12)
  numFilters?: number;      // Defaults to 26 Mel triangular filters
  minFreqHz?: number;       // Defaults to 20 Hz
  maxFreqHz?: number;       // Defaults to 8000 Hz (or sampleRate / 2)
  frameSizeMs?: number;     // Defaults to 25ms
  hopSizeMs?: number;       // Defaults to 10ms
  preEmphasis?: number;     // Defaults to 0.97
}

export interface MfccResult {
  coefficients: number[];    // 13-element mean MFCC vector across active frames
  frames: number[][];        // Frame-by-frame MFCC matrix [numFrames x 13]
  spectralFlatness: number;  // Wiener entropy (0 = pure tone/harmonic, 1 = white noise)
  timbreCategory: 'tonal_harmonic' | 'vocal_formant' | 'turbulent_friction' | 'flat_noise';
}

/**
 * Radix-2 Cooley-Tukey FFT implementation in pure TypeScript.
 * Input length must be a power of 2.
 */
export function fftRadix2(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`FFT length must be a power of 2, got ${n}`);
  }

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i]!;
      real[i] = real[j]!;
      real[j] = tempR;

      const tempI = imag[i]!;
      imag[i] = imag[j]!;
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k >= 1 && k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Butterfly computations
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angleStep = (-2 * Math.PI) / len;

    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < halfLen; k++) {
        const theta = k * angleStep;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const uR = real[i + k]!;
        const uI = imag[i + k]!;
        const vR = real[i + k + halfLen]! * cosT - imag[i + k + halfLen]! * sinT;
        const vI = real[i + k + halfLen]! * sinT + imag[i + k + halfLen]! * cosT;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + halfLen] = uR - vR;
        imag[i + k + halfLen] = uI - vI;
      }
    }
  }
}

/**
 * Converts frequency in Hertz to Mel scale.
 * mel = 2595 * log10(1 + f / 700)
 */
export function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

/**
 * Converts frequency in Mel scale to Hertz.
 * hz = 700 * (10^(mel / 2595) - 1)
 */
export function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/**
 * Builds triangular Mel filterbank weights.
 */
export function createMelFilterbank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
  minFreqHz = 20,
  maxFreqHz = 8000
): Float32Array[] {
  const actualMaxFreq = Math.min(maxFreqHz, sampleRate / 2);
  const minMel = hzToMel(minFreqHz);
  const maxMel = hzToMel(actualMaxFreq);

  // Linearly spaced points in Mel scale
  const melPoints = new Float32Array(numFilters + 2);
  const melStep = (maxMel - minMel) / (numFilters + 1);
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints[i] = minMel + i * melStep;
  }

  // Convert back to FFT bin indices
  const binIndices = new Int32Array(numFilters + 2);
  const halfFft = fftSize / 2;
  for (let i = 0; i < numFilters + 2; i++) {
    const hz = melToHz(melPoints[i]!);
    binIndices[i] = Math.min(halfFft, Math.max(0, Math.round((hz / sampleRate) * fftSize)));
  }

  // Generate triangular filterbank matrix
  const filterbank: Float32Array[] = [];
  for (let m = 1; m <= numFilters; m++) {
    const filter = new Float32Array(halfFft + 1);
    const left = binIndices[m - 1]!;
    const center = binIndices[m]!;
    const right = binIndices[m + 1]!;

    for (let k = left; k < center; k++) {
      if (center > left) {
        filter[k] = (k - left) / (center - left);
      }
    }
    for (let k = center; k <= right; k++) {
      if (right > center) {
        filter[k] = (right - k) / (right - center);
      }
    }
    filterbank.push(filter);
  }

  return filterbank;
}

/**
 * Computes Discrete Cosine Transform type II (DCT-II).
 */
export function computeDct(logEnergies: Float32Array, numCoefficients: number): number[] {
  const numFilters = logEnergies.length;
  const coefficients: number[] = new Array(numCoefficients).fill(0);

  for (let i = 0; i < numCoefficients; i++) {
    let sum = 0;
    for (let m = 0; m < numFilters; m++) {
      sum += (logEnergies[m] ?? 0) * Math.cos((Math.PI * i * (m + 0.5)) / numFilters);
    }
    coefficients[i] = Math.round(sum * 1000) / 1000;
  }

  return coefficients;
}

/**
 * Calculates spectral flatness (Wiener entropy) from power spectrum.
 * Ratio of geometric mean to arithmetic mean: flat=1 (white noise), tonal < 0.05.
 */
export function calculateSpectralFlatness(powerSpectrum: Float32Array): number {
  let logSum = 0;
  let linearSum = 0;
  let count = 0;

  for (let i = 1; i < powerSpectrum.length; i++) {
    const val = powerSpectrum[i]!;
    if (val > 1e-12) {
      logSum += Math.log(val);
      linearSum += val;
      count++;
    }
  }

  if (count === 0 || linearSum <= 0) return 0;
  const geometricMean = Math.exp(logSum / count);
  const arithmeticMean = linearSum / count;

  return arithmeticMean > 0 ? Math.min(1.0, geometricMean / arithmeticMean) : 0;
}

/**
 * Extracts 13-band MFCC feature representation from audio.
 */
export function extractMfcc(
  audioData: Float32Array | number[],
  sampleRate: number,
  options: MfccOptions = {}
): MfccResult {
  const numCoeffs = options.numCoefficients ?? 13;
  const numFilters = options.numFilters ?? 26;
  const minFreq = options.minFreqHz ?? 20;
  const maxFreq = options.maxFreqHz ?? Math.min(8000, sampleRate / 2);
  const preEmphFactor = options.preEmphasis ?? 0.97;

  const n = audioData.length;
  if (n < 256) {
    return {
      coefficients: new Array(numCoeffs).fill(0),
      frames: [],
      spectralFlatness: 0,
      timbreCategory: 'flat_noise',
    };
  }

  // Pre-emphasis
  const preEmph = new Float32Array(n);
  preEmph[0] = audioData[0] ?? 0;
  for (let i = 1; i < n; i++) {
    preEmph[i] = (audioData[i] ?? 0) - preEmphFactor * (audioData[i - 1] ?? 0);
  }

  const frameSize = Math.max(256, Math.pow(2, Math.ceil(Math.log2((sampleRate * (options.frameSizeMs ?? 25)) / 1000))));
  const hopSize = Math.max(64, Math.floor((sampleRate * (options.hopSizeMs ?? 10)) / 1000));
  const filterbank = createMelFilterbank(numFilters, frameSize, sampleRate, minFreq, maxFreq);

  const hamming = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    hamming[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
  }

  const frames: number[][] = [];
  const halfFft = frameSize / 2;
  const real = new Float32Array(frameSize);
  const imag = new Float32Array(frameSize);
  const powerSpectrum = new Float32Array(halfFft + 1);
  let totalSpectralFlatness = 0;
  let activeFrameCount = 0;

  for (let start = 0; start + frameSize <= n; start += hopSize) {
    // Windowing
    let frameEnergy = 0;
    for (let i = 0; i < frameSize; i++) {
      const sample = preEmph[start + i]! * hamming[i]!;
      real[i] = sample;
      imag[i] = 0;
      frameEnergy += sample * sample;
    }

    // Skip silent/inaudible frames
    if (frameEnergy / frameSize < 1e-6) continue;

    fftRadix2(real, imag);

    for (let k = 0; k <= halfFft; k++) {
      const r = real[k]!;
      const im = imag[k]!;
      powerSpectrum[k] = (r * r + im * im) / frameSize;
    }

    // Calculate Mel filterbank energies
    const logEnergies = new Float32Array(numFilters);
    for (let m = 0; m < numFilters; m++) {
      const filter = filterbank[m]!;
      let filterEnergy = 0;
      for (let k = 0; k <= halfFft; k++) {
        filterEnergy += powerSpectrum[k]! * filter[k]!;
      }
      logEnergies[m] = Math.log(Math.max(filterEnergy, 1e-10));
    }

    const cepstrum = computeDct(logEnergies, numCoeffs);
    frames.push(cepstrum);

    totalSpectralFlatness += calculateSpectralFlatness(powerSpectrum);
    activeFrameCount++;
  }

  // Mean MFCC vector across active frames
  const meanCoeffs = new Array(numCoeffs).fill(0);
  if (frames.length > 0) {
    for (const frame of frames) {
      for (let i = 0; i < numCoeffs; i++) {
        meanCoeffs[i] += frame[i]!;
      }
    }
    for (let i = 0; i < numCoeffs; i++) {
      meanCoeffs[i] = Math.round((meanCoeffs[i]! / frames.length) * 1000) / 1000;
    }
  }

  const avgFlatness = activeFrameCount > 0 ? totalSpectralFlatness / activeFrameCount : 0;

  let timbreCategory: MfccResult['timbreCategory'] = 'flat_noise';
  if (avgFlatness < 0.08) {
    timbreCategory = 'tonal_harmonic'; // Pure sine, mechanical horn, clean harmonic whistle
  } else if (avgFlatness >= 0.08 && avgFlatness < 0.35) {
    timbreCategory = 'vocal_formant';  // Mammalian vocalization (meow, bark, whine)
  } else if (avgFlatness >= 0.35 && avgFlatness < 0.65) {
    timbreCategory = 'turbulent_friction'; // Hiss, growl turbulence
  } else {
    timbreCategory = 'flat_noise';     // White noise, water, rain, combustion drone
  }

  return {
    coefficients: meanCoeffs,
    frames,
    spectralFlatness: Math.round(avgFlatness * 1000) / 1000,
    timbreCategory,
  };
}
