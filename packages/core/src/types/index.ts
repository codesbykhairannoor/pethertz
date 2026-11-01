export type SpeciesType = 'cat' | 'dog' | 'custom' | 'unknown' | 'uncertain' | 'non-pet';

export type QualityFlag =
  | 'low_snr'
  | 'clipping'
  | 'high_f0_lpc_harmonic_lock'
  | 'borderline_vtl'
  | 'chaotic_intonation'
  | 'short_impulse';

export type IntonationContour =
  | 'rising'
  | 'falling'
  | 'flat'
  | 'fluctuating'
  | 'atonal';

export type UrgencyLevel = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Ethological Valence-Arousal Model (Russell's Circumplex Model for Mammals).
 * Scientifically validated alternative to rigid human words.
 */
export interface AffectiveDimensions {
  /**
   * Valence: Pleasure vs Discomfort (-1.0 to +1.0).
   * -1.0 = Intense pain, fear, territorial aggression.
   * +1.0 = Deep contentment, playful joy, relaxed purring.
   */
  valence: number;

  /**
   * Arousal: Energy / Activation level (0.0 to 1.0).
   * 0.0 = Low activation, sleeping, resting.
   * 1.0 = Acute panic, shrieking yowl, frenzy alarm bark.
   */
  arousal: number;

  /**
   * Practical urgency indicator for the pet owner.
   */
  urgency: UrgencyLevel;
}

export interface GatekeeperValidation {
  isAnimalVocalization: boolean;
  confidence: number;
  status: 'confirmed_pet' | 'confirmed_noise' | 'uncertain';
  rejectionReason?:
  | 'synthetic_mechanical_tone'
  | 'ambient_noise_unvoiced'
  | 'impulsive_noise_or_cough'
  | 'inaudible_silence'
  | 'chaotic_turbulent_noise'
  | 'ultrasonic_impulse_or_click'
  | 'human_speech_or_cough';
  biologicalPlausibilityScore: number;
  evidenceBreakdown?: {
    voicingScore: number;
    spectralScore: number;
    temporalScore: number;
    anatomicalScore: number;
  };
}

export interface PetAcousticFeatures {
  fundamentalFrequencyHz: number;
  pitchConfidence: number;
  intonationContour: IntonationContour;
  pitchTrajectory: number[];
  pitchJitter: number;
  rms: number;
  zeroCrossingRate: number;
  spectralCentroidHz: number;
  durationMs: number;
  burstCount: number;
  burstIntervalMs: number;
  gatekeeper: GatekeeperValidation;
  formants?: number[];
  formantDispersionHz?: number;
  estimatedVocalTractLengthCm?: number;
  vtlRangeCm?: [number, number];
  vtlConfidence?: number;
  morphologicalCategory?: 'feline' | 'canine_small' | 'canine_large' | 'human_or_large_mammal' | 'unknown';
  mfcc?: number[];
  spectralFlatness?: number;
  qualityFlags?: QualityFlag[];
}

export interface PetAnalysisResult<TIntent = string, TVocalization = string> {
  species: SpeciesType;
  vocalization: TVocalization;
  intent: TIntent;
  confidence: number;
  isAnimalVocalization: boolean;
  affectiveDimensions: AffectiveDimensions;
  acousticMetrics: PetAcousticFeatures;
  humanExplanation: string;
  actionRecommendation: string;
  qualityFlags?: QualityFlag[];
}

export interface PetInterpreter<TIntent = string, TVocalization = string> {
  readonly species: SpeciesType;
  interpret(features: PetAcousticFeatures): PetAnalysisResult<TIntent, TVocalization>;
}

export type AudioInputData = Float32Array | number[];

export interface AnalyzeOptions {
  sampleRate: number;
  minFrequency?: number;
  maxFrequency?: number;
  energyThreshold?: number;
  enableGatekeeper?: boolean;
}
