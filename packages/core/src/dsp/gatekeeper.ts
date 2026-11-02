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

  const vtl = features.estimatedVocalTractLengthCm ?? 0;
  const isCanineVtl = vtl >= 7.0 && vtl <= 13.5;
  const isFelineVtl = vtl >= 3.8 && vtl <= 7.5;

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

  // 1b. Severe Digital Clipping Distortion Guard (DeepSeek Audit Recommendation)
  // Extreme square-wave saturation produces non-biological harmonics and false formants
  if (rms > 0.95) {
    return {
      isAnimalVocalization: false,
      confidence: 0,
      status: 'confirmed_noise',
      rejectionReason: 'synthetic_mechanical_tone',
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

  // 2b. Cat Purr Archetype (Neural laryngeal oscillator: 20-45 Hz with low centroid < 180 Hz)
  const isPurrCandidate =
    (f0 >= 20 && f0 <= 45 && spectralCentroidHz < 180 && zcr < 0.10) ||
    (spectralCentroidHz < 100 && zcr < 0.10 && rms > 0.005);
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
  const voicedFraction =
    pitchTrajectory.length > 0
      ? pitchTrajectory.filter((p) => p > 0).length / pitchTrajectory.length
      : 0;

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

  // Canine growl phonation: authentic canine growls in 70-250 Hz with duration <= 2200ms and low centroid <= 650 Hz
  if (
    f0 >= 70 &&
    f0 <= 250 &&
    durationMs <= 2200 &&
    spectralCentroidHz <= 650 &&
    rms > 0.02
  ) {
    sVoicing += 0.20;
    sTemporal += 0.15;
    sSpectral += 0.15;
  }

  // Avian Syringeal Phonation: Bird chirping has extreme F0 (> 2100 Hz) with treble centroid (> 3200 Hz)
  if (f0 > 2100 && spectralCentroidHz > 3200) {
    sVoicing -= 0.50;
    sSpectral -= 0.70;
    sTemporal -= 0.45;
  }

  // Human Respiration / Breathing friction:
  // Low energy breathing puff (rms < 0.025 with F0 < 300 Hz and treble centroid > 3000 Hz)
  // or breath whistle artifact (duration > 2500ms, burstCount >= 4, pitchConfidence <= 0.60, and jitter < 0.025)
  if (
    (rms < 0.025 && f0 < 300 && spectralCentroidHz > 3000) ||
    (durationMs > 2500 && burstCount >= 4 && pitchConfidence <= 0.60 && jitter < 0.025 && f0 > 450)
  ) {
    sVoicing -= 0.55;
    sSpectral -= 0.50;
    sTemporal -= 0.40;
  }

  // Low mechanical drone / percussive thump: 20-70 Hz with centroid > 200 Hz (Purr is strictly < 180 Hz)
  if (f0 >= 20 && f0 <= 70 && spectralCentroidHz > 200) {
    sVoicing -= 0.55;
    sSpectral -= 0.60;
    sTemporal -= 0.50;
  }

  // Sheep / Ovine Bleating: Formant shift with high centroid (> 1500 Hz) at low fundamental (100-300 Hz)
  if (f0 >= 100 && f0 <= 300 && spectralCentroidHz > 1500) {
    sVoicing -= 0.50;
    sSpectral -= 0.55;
    sTemporal -= 0.45;
  }

  // Ambient low rumble / thunderstorm: low RMS (< 0.015) in low frequency band with weak pitch confidence
  if (rms < 0.015 && f0 < 200 && pitchConfidence < 0.65) {
    sVoicing -= 0.45;
    sSpectral -= 0.45;
    sTemporal -= 0.45;
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

  // Mechanical clock ticking / fast pulses (burstCount >= 7 in < 2000ms with unvoiced pitch confidence < 0.35, or short click < 100ms)
  if (
    (burstCount >= 7 && durationMs < 2000 && jitter > 0.50 && pitchConfidence < 0.35) ||
    (durationMs < 100 && (f0 === 0 || jitter > 0.50) && pitchConfidence < 0.40)
  ) {
    sVoicing -= 0.55;
    sTemporal -= 0.55;
    sSpectral -= 0.40;
  }


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
    if (spectralFlatness < 0.002 && durationMs > 3500 && jitter < 0.25) {
      sSpectral -= 0.60; // Continuous synthetic oscillator / car horn
      sTemporal -= 0.60;
      sVoicing -= 0.30;
    } else if (spectralFlatness >= 0.005 && spectralFlatness <= 0.35) {
      sSpectral += 0.15; // Realistic harmonic timbre
    }
  }

  // Crow cawing / avian screech: harsh grating syrinx sound (low pitch confidence <= 0.62 with high ZCR)
  if (
    (burstCount >= 4 && f0 > 1200 && f0 <= 1800 && zcr >= 0.10 && spectralCentroidHz > 2800 && pitchConfidence <= 0.62) ||
    (durationMs > 4500 && burstCount >= 7 && f0 >= 550 && spectralCentroidHz > 2600 && pitchConfidence <= 0.60)
  ) {
    sSpectral -= 0.60;
    sVoicing -= 0.50;
    sTemporal -= 0.50;
  }

  // Ovine Tremolo / Sheep bleating with violent vibrato (jitter > 0.60 with centroid > 2500 Hz)
  if (f0 >= 200 && f0 <= 550 && jitter > 0.60 && spectralCentroidHz > 2500) {
    sSpectral -= 0.60;
    sVoicing -= 0.50;
    sTemporal -= 0.45;
  }

  // Human Laughter / Spasmodic Phonation:
  // Characterized by spasmodic unvoiced pauses (voicedFraction < 0.50) with high pitch jitter (> 0.38) and centroid > 1350 Hz
  if (
    f0 >= 120 &&
    f0 <= 650 &&
    jitter > 0.38 &&
    spectralCentroidHz > 1350 &&
    voicedFraction < 0.50 &&
    ((rms <= 0.06 && durationMs > 1500) || (burstCount <= 5 && durationMs > 3500))
  ) {
    sVoicing -= 0.55;
    sTemporal -= 0.50;
    sSpectral -= 0.45;
  }

  // Metallic chime / church bell resonance: continuous reverberant decay (> 2500ms, burstCount >= 7, chaotic jitter > 0.65)
  if (durationMs > 2500 && burstCount >= 7 && jitter > 0.65) {
    sSpectral -= 0.60;
    sTemporal -= 0.60;
    sVoicing -= 0.40;
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
  } else if (f0 > 0 && jitter > 0.60 && pitchConfidence < 0.45) {
    sSpectral -= 0.50; // Erratic impulse noise without coherent pitch (clock ticks, mechanical clicks)
    sVoicing -= 0.35;
  } else if (jitter > 0.50 && spectralCentroidHz > 3200 && pitchConfidence < 0.50) {
    sSpectral -= 0.45; // Human violent sneeze or cough friction
    sVoicing -= 0.25;
  }

  sSpectral = Math.max(0.0, Math.min(1.0, sSpectral));

  // =========================================================================
  // AXIS 3: TEMPORAL DYNAMICS EVIDENCE (S_temporal)
  // Mammal call envelope & burst dynamics vs appliance drones & clock pulses
  // =========================================================================

  // Continuous appliance motor drone (washing machines, air compressors, vacuum cleaners)
  if (durationMs > 3000 && burstCount <= 2 && f0 < 180 && spectralCentroidHz > 1000) {
    sTemporal -= 0.65;
  } else if (durationMs >= 4500 && burstCount <= 2) {
    sTemporal -= 0.65; // Endless stationary sound / continuous siren sweep
    sSpectral -= 0.50;
    sVoicing -= 0.35;
  }

  // Engine combustion / low mechanical drone: 20-70 Hz with centroid > 650 Hz (Purr is strictly < 180 Hz)
  if (f0 >= 20 && f0 <= 70 && spectralCentroidHz > 650) {
    sTemporal -= 0.50;
  }

  // Emergency Sirens / Electronic Sweeps: prolonged continuous tone (> 3200ms with F0 > 450 Hz and low synthetic jitter < 0.06)
  if (durationMs > 3200 && f0 > 450 && jitter < 0.06) {
    sTemporal -= 0.70;
  }

  // Infant crying repeated sobbing bouts / shrieks or distress shriek with human child VTL > 10.5 cm
  if (
    (f0 >= 400 && f0 <= 650 && vtl > 10.5 && durationMs > 2500 && spectralCentroidHz > 1500) ||
    (!isCanineVtl &&
      !isFelineVtl &&
      features.morphologicalCategory !== 'feline' &&
      ((durationMs > 2500 && burstCount >= 7 && f0 > 400 && spectralCentroidHz > 2500) ||
        (durationMs > 2800 && burstCount >= 4 && f0 > 480 && spectralCentroidHz > 3000)))
  ) {
    sTemporal -= 0.60;
    sAnatomical -= 0.60;
    sVoicing -= 0.40;
    sSpectral -= 0.35;
  }

  // Car Horns / Alarms: prolonged automotive horn tone (> 2800ms) with burstCount <= 2 in the automotive horn pitch band (F0 < 420 Hz)
  // or dual-tone / multi-burst repetitive honking (> 3500ms with pure spectral flatness < 0.003 and F0 in 200-420 Hz)
  if (
    (durationMs > 2800 && burstCount <= 2 && f0 >= 80 && f0 < 420) ||
    (durationMs > 3500 && spectralFlatness !== undefined && spectralFlatness < 0.003 && f0 >= 200 && f0 <= 420 && jitter < 0.38)
  ) {
    sTemporal -= 0.80;
    sVoicing -= 0.50;
    sSpectral -= 0.60;
  }

  // Two-stroke engine drone / chainsaw: prolonged motor sound (> 3000ms with F0 in 90-250 Hz and low mechanical jitter < 0.05)
  if (durationMs > 3000 && f0 >= 90 && f0 <= 250 && jitter < 0.05) {
    sTemporal -= 0.70;
    sSpectral -= 0.60;
    sVoicing -= 0.50;
  }

  // Rooster crowing: sustained high-pitch avian crow (> 1600ms, burstCount <= 2, F0 in 680-2000 Hz with treble centroid > 1450 Hz and steady jitter < 0.35)
  if (
    f0 >= 680 &&
    f0 <= 2000 &&
    durationMs >= 1600 &&
    burstCount <= 2 &&
    spectralCentroidHz > 1450 &&
    jitter < 0.35 &&
    (!isFelineVtl || spectralCentroidHz > 1800)
  ) {
    sTemporal -= 0.60;
    sSpectral -= 0.50;
    sVoicing -= 0.35;
  }

  // Amphibian / Frog vocalization:
  // Rapid pulsed croak trains (burstCount >= 14 with F0 in 1150-2200 Hz, low pitch confidence <= 0.68)
  // or synthetic-like rigid high pitch (F0 in 1900-2300 Hz with jitter < 0.035 and duration > 800ms)
  if (
    (burstCount >= 14 && f0 >= 1150 && f0 <= 2200 && pitchConfidence <= 0.68) ||
    (f0 >= 1900 && f0 <= 2300 && jitter < 0.035 && durationMs > 800)
  ) {
    sVoicing -= 0.60;
    sSpectral -= 0.55;
    sTemporal -= 0.50;
  }

  // Bovine (Cow) lowing / Large Ungulate phonation:
  // Cattle produce prolonged low-frequency moos (> 2100ms in 80-320 Hz) or impossible micro-VTL (< 4.2cm at < 320 Hz)
  if (
    (f0 >= 80 && f0 <= 320 && durationMs >= 2100) ||
    (f0 >= 80 && f0 <= 320 && vtl > 0 && vtl < 4.2)
  ) {
    sTemporal -= 0.60;
    sVoicing -= 0.40;
    sAnatomical -= 0.50;
  }

  // Percussive wood knocking / mechanical door tap (zero jitter or ZCR < 0.010 with non-sustained pitch, or very short isolated hit)
  if (
    (zcr < 0.010 && f0 < 200 && (pitchConfidence < 0.75 || maxVoicedRun <= 3)) ||
    (durationMs < 450 && f0 < 160 && (jitter === 0 || jitter > 0.40) && pitchConfidence < 0.65)
  ) {
    sVoicing -= 0.55;
    sTemporal -= 0.50;
    sSpectral -= 0.40;
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
    zcr > 0.12 &&
    !isCanineVtl &&
    ((features.estimatedVocalTractLengthCm ?? 0) > 10.5 || features.morphologicalCategory === 'human_or_large_mammal')
  ) {
    sTemporal -= 0.60;
    sVoicing -= 0.40;
    sSpectral -= 0.40;
  }

  // Mammal call duration envelope (single call or rhythmic multi-burst bouts up to 4000ms)
  if ((durationMs >= 60 && durationMs <= 2500) || (burstCount >= 2 && durationMs <= 4000)) {
    sTemporal += 0.20;
  }

  sTemporal = Math.max(0.0, Math.min(1.0, sTemporal));

  // =========================================================================
  // AXIS 4: ANATOMICAL FORMANT / VTL EVIDENCE (S_anatomical)
  // Acoustic allometry: Vocal Tract Length & morphological plausibility
  // =========================================================================

  // Adult human vocal tract filter (VTL > 17.0 cm with F0 < 450 Hz)
  if (
    f0 < 450 &&
    vtl > 17.0 &&
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
    if (spectralCentroidHz > 3200 && vtl > 9.0 && (f0 < 600 || zcr > 0.15)) {
      sAnatomical -= 0.60;
      sSpectral -= 0.50;
    } else {
      sAnatomical += 0.25;
    }
  }

  // Note from Meta AI Audit: When F0 > 600 Hz, LPC is prone to harmonic locking.
  // We do not penalize anatomical score when harmonic lock is suspected, but ONLY for genuine domestic pet registers
  // (F0 <= 2000 Hz, centroid <= 3600 Hz, and duration <= 3000ms; excludes avian chirps & prolonged roosters)
  if (f0 > 600 && f0 <= 2000 && spectralCentroidHz <= 3600 && durationMs <= 3000) {
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
      (durationMs > 2800 && burstCount <= 2 && jitter < 0.05) ||
      (spectralFlatness !== undefined && spectralFlatness < 0.002 && jitter < 0.05)
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
