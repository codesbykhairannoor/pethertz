import { GatekeeperValidation, PetAcousticFeatures } from '../types/index.js';

export type GatekeeperResult = GatekeeperValidation;

export interface GatekeeperOptions {
  enabled?: boolean;
}

/**
 * Counts the maximum continuous length of voiced frames without silence drops.
 * Mammal vocalizations (meows, barks, whines) require sustained phonation (>= 3 contiguous frames / ~60-80ms).
 */
export function maxContiguousVoicedFrames(pitchTrajectory: number[]): number {
  let maxRun = 0;
  let currentRun = 0;
  for (const p of pitchTrajectory) {
    if (p > 30) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}

/**
 * Calculates natural biological pitch jitter on contiguous voiced frames.
 */
export function calculatePitchJitter(pitchTrajectory: number[]): number {
  let contiguousPairs = 0;
  let totalDiff = 0;
  let sumVoiced = 0;

  for (let i = 1; i < pitchTrajectory.length; i++) {
    const prev = pitchTrajectory[i - 1]!;
    const curr = pitchTrajectory[i]!;
    if (prev > 30 && curr > 30) {
      contiguousPairs++;
      totalDiff += Math.abs(curr - prev);
      sumVoiced += curr;
    }
  }

  if (contiguousPairs < 2) return 0;
  const meanF0 = sumVoiced / contiguousPairs;
  const meanDiff = totalDiff / contiguousPairs;

  return meanF0 > 0 ? meanDiff / meanF0 : 0;
}

/**
 * Calculates erratic octave jumps strictly between adjacent voiced frames.
 */
export function calculateOctaveJumpRatio(pitchTrajectory: number[]): number {
  let contiguousVoicedPairs = 0;
  let erraticJumps = 0;

  for (let i = 1; i < pitchTrajectory.length; i++) {
    const prev = pitchTrajectory[i - 1]!;
    const curr = pitchTrajectory[i]!;

    if (prev > 30 && curr > 30) {
      contiguousVoicedPairs++;
      const jumpMagnitude = Math.abs(curr - prev) / Math.min(prev, curr);
      if (jumpMagnitude > 0.7) {
        erraticJumps++;
      }
    }
  }

  return contiguousVoicedPairs > 0 ? erraticJumps / contiguousVoicedPairs : 0;
}

/**
 * Probabilistic Bioacoustic Gatekeeper (Evidence Accumulation Fusion).
 * Eliminates brittle serial vetoes by computing 4 orthogonal evidence axes:
 * 1. Voicing Evidence (S_voicing)
 * 2. Spectral Timbre Evidence (S_spectral)
 * 3. Temporal Dynamics Evidence (S_temporal)
 * 4. Anatomical Formant/VTL Evidence (S_anatomical)
 */
export function validateAnimalVocalization(
  features: PetAcousticFeatures,
  rawAudio: Float32Array | number[],
  options?: GatekeeperOptions
): GatekeeperResult {
  if (options?.enabled === false) {
    return {
      isAnimalVocalization: true,
      confidence: 1.0,
      status: 'confirmed_pet',
      biologicalPlausibilityScore: 1.0,
      evidenceBreakdown: {
        voicingScore: 1.0,
        spectralScore: 1.0,
        temporalScore: 1.0,
        anatomicalScore: 1.0,
      },
    };
  }

  const {
    fundamentalFrequencyHz: f0,
    pitchConfidence,
    rms,
    zeroCrossingRate: zcr,
    durationMs,
    pitchTrajectory,
    spectralCentroidHz,
    burstCount,
    spectralFlatness,
  } = features;

  // 1. Inaudible / Silence Gate (Definitive physical lower bound)
  if (rms < 0.003 || durationMs < 40) {
    return {
      isAnimalVocalization: false,
      confidence: 0,
      status: 'confirmed_noise',
      rejectionReason: 'inaudible_silence',
      biologicalPlausibilityScore: 0,
      evidenceBreakdown: {
        voicingScore: 0,
        spectralScore: 0,
        temporalScore: 0,
        anatomicalScore: 0,
      },
    };
  }

  // 2. High-Confidence Bioacoustic Archetype Fast Passes
  // 2a. Cat Hiss Archetype (Defensive broadband turbulent friction)
  const isHissCandidate = zcr > 0.22 && rms > 0.015 && durationMs >= 150;
  if (isHissCandidate) {
    return {
      isAnimalVocalization: true,
      confidence: 0.88,
      status: 'confirmed_pet',
      biologicalPlausibilityScore: 0.9,
      evidenceBreakdown: {
        voicingScore: 0.85,
        spectralScore: 0.88,
        temporalScore: 0.92,
        anatomicalScore: 0.85,
      },
    };
  }

  // 2b. Cat Purr Archetype (Neural laryngeal oscillator: 20-70 Hz with low centroid < 650 Hz)
  const isPurrCandidate =
    (f0 >= 20 && f0 <= 70 && spectralCentroidHz < 650 && zcr < 0.15) ||
    (spectralCentroidHz < 120 && zcr < 0.15 && rms > 0.005);
  if (isPurrCandidate) {
    return {
      isAnimalVocalization: true,
      confidence: 0.92,
      status: 'confirmed_pet',
      biologicalPlausibilityScore: 0.95,
      evidenceBreakdown: {
        voicingScore: 0.95,
        spectralScore: 0.92,
        temporalScore: 0.92,
        anatomicalScore: 0.88,
      },
    };
  }

  const jitter = calculatePitchJitter(pitchTrajectory);
  const maxVoicedRun = maxContiguousVoicedFrames(pitchTrajectory);
  const octaveJumpRatio = calculateOctaveJumpRatio(pitchTrajectory);

  let sVoicing = 0.50;
  let sSpectral = 0.60;
  let sTemporal = 0.60;
  let sAnatomical = 0.65;

  // =========================================================================
  // AXIS 1: VOICING EVIDENCE (S_voicing)
  // Sustained glottal oscillation vs unvoiced ambient noise or chaotic pulses
  // =========================================================================

  if (pitchConfidence >= 0.60) {
    sVoicing += 0.25;
  } else if (pitchConfidence >= 0.40) {
    sVoicing += 0.10;
  } else if (pitchConfidence < 0.25) {
    sVoicing -= 0.30;
  }

  if (maxVoicedRun >= 4) {
    sVoicing += 0.20;
  } else if (maxVoicedRun >= 2) {
    sVoicing += 0.05;
  } else {
    sVoicing -= 0.35; // Isolated non-continuous spike
  }

  if (f0 >= 80 && f0 <= 2500) {
    sVoicing += 0.15;
  } else if (f0 > 2500) {
    sVoicing -= 0.25;
  } else if (f0 === 0 && pitchConfidence < 0.4) {
    sVoicing -= 0.35;
  }

  // Canine growl phonation: authentic canine growls in 70-250 Hz with duration <= 2200ms
  if (
    f0 >= 70 &&
    f0 <= 250 &&
    durationMs <= 2200 &&
    rms > 0.02
  ) {
    sVoicing += 0.20;
    sTemporal += 0.15;
    sSpectral += 0.15;
  }

  // Engine combustion / low mechanical drone: 20-70 Hz with centroid > 650 Hz (Purr is strictly < 650 Hz)
  if (f0 >= 20 && f0 <= 70 && spectralCentroidHz > 650) {
    sVoicing -= 0.45;
  }

  // Prolonged human snoring or appliance drone in 70 - 180 Hz band (duration > 2000ms)
  if (f0 > 70 && f0 < 180 && durationMs > 2000) {
    sVoicing -= 0.40;
    sTemporal -= 0.40;
    sSpectral -= 0.30;
  }

  // Human sneezes / violent atonal treble friction: Centroid > 3600 Hz while F0 < 600 Hz
  if (spectralCentroidHz > 3600 && f0 > 0 && f0 < 600) {
    sVoicing -= 0.35;
  }

  // Mechanical clock ticking / fast pulses (burstCount >= 7 in < 2000ms with chaotic jitter > 0.50, or short click < 100ms)
  if (
    (burstCount >= 7 && durationMs < 2000 && jitter > 0.50) ||
    (durationMs < 100 && (f0 === 0 || jitter > 0.50))
  ) {
    sVoicing -= 0.55;
    sTemporal -= 0.55;
    sSpectral -= 0.40;
  }

  const isCanineVtl =
    (features.estimatedVocalTractLengthCm ?? 0) >= 7.0 &&
    (features.estimatedVocalTractLengthCm ?? 0) <= 13.5;

  // Prolonged human cough / throat clearing (duration >= 500ms with chaotic jitter > 0.40 and high centroid & ZCR)
  if (
    durationMs >= 500 &&
    jitter > 0.40 &&
    spectralCentroidHz > 2200 &&
    zcr > 0.12 &&
    !isCanineVtl
  ) {
    sVoicing -= 0.35;
  }

  sVoicing = Math.max(0.0, Math.min(1.0, sVoicing));

  // =========================================================================
  // AXIS 2: SPECTRAL TIMBRE EVIDENCE (S_spectral)
  // Organic harmonic tissue resonance vs mechanical oscillator / metallic click
  // =========================================================================

  // Ultrasonic glass breaking, metallic keys, screeching brakes (centroid > 6000 Hz without voiced pitch)
  if (spectralCentroidHz > 6000 && (f0 === 0 || pitchConfidence < 0.65)) {
    sSpectral -= 0.70;
    sVoicing -= 0.40;
  } else if (spectralCentroidHz > 6500) {
    sSpectral -= 0.60;
  } else if (spectralCentroidHz >= 100 && spectralCentroidHz <= 4200) {
    sSpectral += 0.15;
  }

  // Engine combustion & jet drone: low F0 with high spectral centroid (> 650 Hz)
  if (f0 >= 20 && f0 <= 70 && spectralCentroidHz > 650) {
    sSpectral -= 0.70;
  }

  // Human sneezes / violent atonal treble friction: Centroid > 3600 Hz while F0 < 600 Hz
  if (spectralCentroidHz > 3600 && f0 > 0 && f0 < 600) {
    sSpectral -= 0.60;
  }

  // Sneeze squeak / whistle: F0 > 2000 Hz in short burst < 600ms with centroid > 3500 Hz
  if (f0 > 2000 && durationMs < 600 && spectralCentroidHz > 3500) {
    sSpectral -= 0.60;
    sVoicing -= 0.50;
    sTemporal -= 0.40;
  }

  // Emergency Sirens / Electronic Sweeps: prolonged continuous tone (> 3200ms with F0 > 450 Hz and low synthetic jitter < 0.06)
  if (durationMs > 3200 && f0 > 450 && jitter < 0.06) {
    sSpectral -= 0.70;
    sTemporal -= 0.70;
    sVoicing -= 0.50;
  }

  // Pure digital white noise (flatness > 0.40 or ZCR > 0.45 with no voiced pitch)
  if (
    (spectralFlatness !== undefined && spectralFlatness > 0.40 && (f0 === 0 || pitchConfidence < 0.35)) ||
    (zcr > 0.45 && pitchConfidence < 0.30)
  ) {
    sVoicing -= 0.60;
    sSpectral -= 0.60;
  }

  // Wiener Spectral Flatness: pure synthetic delta tones vs natural harmonic resonance
  if (spectralFlatness !== undefined) {
    if (spectralFlatness < 0.002 && durationMs > 3500) {
      sSpectral -= 0.60; // Continuous synthetic oscillator / car horn
      sTemporal -= 0.60;
      sVoicing -= 0.30;
    } else if (spectralFlatness >= 0.005 && spectralFlatness <= 0.35) {
      sSpectral += 0.15; // Realistic harmonic timbre
    }
  }

  // Biological vocal cord micro-jitter (typically 1% - 25% in mammals)
  if (jitter >= 0.005 && jitter <= 0.25) {
    sSpectral += 0.15;
  } else if (
    jitter === 0 &&
    f0 > 0 &&
    durationMs > 500 &&
    (spectralFlatness === undefined || spectralFlatness < 0.005)
  ) {
    sSpectral -= 0.45; // Unnatural zero-jitter electronic pure sine generator
  } else if (f0 > 0 && jitter > 0.50) {
    sSpectral -= 0.60; // Erratic impulse noise / chaotic jitter (clock ticks, horns)
    sVoicing -= 0.40;
  } else if (jitter > 0.40 && spectralCentroidHz > 1800) {
    sSpectral -= 0.50; // Human cough, sneeze, or atonal friction
    sVoicing -= 0.30;
  }

  sSpectral = Math.max(0.0, Math.min(1.0, sSpectral));

  // =========================================================================
  // AXIS 3: TEMPORAL DYNAMICS EVIDENCE (S_temporal)
  // Mammal call envelope & burst dynamics vs appliance drones & clock pulses
  // =========================================================================

  // Continuous appliance motor drone (washing machines, air compressors, vacuum cleaners)
  if (durationMs > 3000 && burstCount <= 2 && f0 < 180 && spectralCentroidHz > 1000) {
    sTemporal -= 0.65;
  } else if (durationMs > 4500 && burstCount <= 2) {
    sTemporal -= 0.40; // Endless stationary sound
  }

  // Emergency Sirens / Electronic Sweeps: prolonged continuous tone (> 3200ms with F0 > 450 Hz and low synthetic jitter < 0.06)
  if (durationMs > 3200 && f0 > 450 && jitter < 0.06) {
    sTemporal -= 0.70;
  }

  // Infant crying repeated sobbing bouts / shrieks (burstCount >= 7 across > 2000ms with high F0)
  if (
    (durationMs > 2000 && burstCount >= 7 && f0 > 400) ||
    (durationMs > 2500 && burstCount >= 5 && f0 > 480)
  ) {
    sTemporal -= 0.60;
    sVoicing -= 0.40;
    sSpectral -= 0.40;
  }

  // Car Horns / Alarms: prolonged tone (> 2800ms) with burstCount <= 2
  if (
    durationMs > 2800 &&
    burstCount <= 2 &&
    (f0 < 400 || (features.spectralFlatness !== undefined && features.spectralFlatness < 0.015))
  ) {
    sTemporal -= 0.80;
    sVoicing -= 0.50;
    sSpectral -= 0.60;
  }

  // Mechanical clock ticking / fast pulses (burstCount >= 7 in < 2000ms with chaotic jitter > 0.50)
  if (burstCount >= 7 && durationMs < 2000 && jitter > 0.50) {
    sTemporal -= 0.65;
  }

  // Impulsive prolonged human cough (hacking cough with high jitter > 0.40 and treble centroid > 2200 Hz & ZCR > 0.12)
  if (
    spectralCentroidHz > 2200 &&
    jitter > 0.40 &&
    durationMs >= 400 &&
    zcr > 0.12
  ) {
    sTemporal -= 0.60;
    sVoicing -= 0.40;
    sSpectral -= 0.40;
  }

  // Typical mammal call duration envelope (60ms - 2500ms)
  if (durationMs >= 60 && durationMs <= 2500) {
    sTemporal += 0.20;
  }

  sTemporal = Math.max(0.0, Math.min(1.0, sTemporal));

  // =========================================================================
  // AXIS 4: ANATOMICAL FORMANT / VTL EVIDENCE (S_anatomical)
  // Acoustic allometry: Vocal Tract Length & morphological plausibility
  // =========================================================================
  const vtl = features.estimatedVocalTractLengthCm ?? 0;

  // Adult human vocal tract filter (VTL > 14.5 cm with F0 < 450 Hz)
  if (
    f0 < 450 &&
    vtl > 14.5 &&
    features.morphologicalCategory === 'human_or_large_mammal'
  ) {
    sAnatomical -= 0.60;
  } else if (vtl > 0 && vtl < 3.2 && f0 < 600 && (jitter > 0.35 || durationMs > 1000)) {
    // Mechanical horn or toy resonator: an impossible 2.3cm acoustic cavity with abnormal jitter or duration
    sAnatomical -= 0.80;
    sSpectral -= 0.40;
    sVoicing -= 0.30;
  } else if (vtl >= 3.5 && vtl <= 14.0) {
    // Valid pet range (cat: ~4-6.5 cm, small dog: ~7-10 cm, large dog: ~11-14 cm)
    // But human sneezes with VTL > 9.0 and high centroid > 3200 should NOT receive bonus
    if (spectralCentroidHz > 3200 && vtl > 9.0) {
      sAnatomical -= 0.60;
      sSpectral -= 0.50;
    } else {
      sAnatomical += 0.25;
    }
  }

  // Note from Meta AI Audit: When F0 > 600 Hz, LPC is prone to harmonic locking.
  // We do not penalize anatomical score when harmonic lock is suspected!
  if (f0 > 600) {
    sAnatomical = Math.max(sAnatomical, 0.60);
  }

  sAnatomical = Math.max(0.0, Math.min(1.0, sAnatomical));

  // =========================================================================
  // MULTI-EVIDENCE SOFT FUSION
  // =========================================================================
  const biologicalPlausibilityScore =
    Math.round(
      (0.35 * sVoicing +
        0.25 * sSpectral +
        0.25 * sTemporal +
        0.15 * sAnatomical) *
      100
    ) / 100;

  const evidenceBreakdown = {
    voicingScore: Math.round(sVoicing * 100) / 100,
    spectralScore: Math.round(sSpectral * 100) / 100,
    temporalScore: Math.round(sTemporal * 100) / 100,
    anatomicalScore: Math.round(sAnatomical * 100) / 100,
  };

  // Honest 4-way decision thresholds
  const CONFIRMED_THRESHOLD = 0.55;
  const UNCERTAIN_THRESHOLD = 0.40;

  let status: GatekeeperResult['status'];
  let isAnimalVocalization: boolean;
  let rejectionReason: GatekeeperResult['rejectionReason'] | undefined;

  if (biologicalPlausibilityScore >= CONFIRMED_THRESHOLD) {
    status = 'confirmed_pet';
    isAnimalVocalization = true;
  } else if (biologicalPlausibilityScore >= UNCERTAIN_THRESHOLD) {
    status = 'uncertain';
    isAnimalVocalization = false;
  } else {
    status = 'confirmed_noise';
    isAnimalVocalization = false;
  }

  // Pinpoint primary diagnostic rejection reason if not confirmed pet
  if (!isAnimalVocalization) {
    const minScore = Math.min(sVoicing, sSpectral, sTemporal, sAnatomical);

    if (minScore === sAnatomical && vtl > 14.5) {
      rejectionReason = 'human_speech_or_cough';
    } else if (
      spectralCentroidHz > 5000 ||
      (burstCount >= 7 && durationMs < 2000 && jitter > 0.50)
    ) {
      rejectionReason = 'ultrasonic_impulse_or_click';
    } else if (f0 >= 20 && f0 <= 70 && spectralCentroidHz > 650) {
      rejectionReason = 'synthetic_mechanical_tone';
    } else if (
      (durationMs > 3200 && f0 > 450 && jitter < 0.08) ||
      (durationMs > 2800 && burstCount <= 2) ||
      (spectralFlatness !== undefined && spectralFlatness < 0.002)
    ) {
      rejectionReason = 'synthetic_mechanical_tone';
    } else if (
      (spectralCentroidHz > 3600 && f0 > 0 && f0 < 600) ||
      ((minScore === sTemporal || minScore === sSpectral) && jitter > 0.40)
    ) {
      rejectionReason = 'impulsive_noise_or_cough';
    } else if (minScore === sVoicing && maxVoicedRun < 2 && octaveJumpRatio > 0.3) {
      rejectionReason = 'chaotic_turbulent_noise';
    } else if (minScore === sVoicing && f0 === 0) {
      rejectionReason = 'ambient_noise_unvoiced';
    } else {
      rejectionReason = 'ambient_noise_unvoiced';
    }
  }

  return {
    isAnimalVocalization,
    confidence: biologicalPlausibilityScore,
    status,
    rejectionReason,
    biologicalPlausibilityScore,
    evidenceBreakdown,
  };
}
