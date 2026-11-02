import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const targetDir = resolve(__dirname, '../dist');
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

const dtsContent = `/**
 * PetHertz - Autonomous Pet Bioacoustics and Vocalization Interpretation Engine
 * (C) 2026 PetHertz Open Source Contributors - MIT License
 */

export type SpeciesType = 'cat' | 'dog' | 'custom' | 'unknown' | 'uncertain' | 'non-pet';
export type QualityFlag = 'low_snr' | 'clipping' | 'high_f0_lpc_harmonic_lock' | 'borderline_vtl' | 'chaotic_intonation' | 'short_impulse';
export type IntonationContour = 'rising' | 'falling' | 'flat' | 'fluctuating' | 'atonal';
export type UrgencyLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface AffectiveDimensions {
  valence: number;
  arousal: number;
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

export interface PetEvent<TIntent = string, TVocalization = string> {
  startMs: number;
  endMs: number;
  durationMs: number;
  vocalization: TVocalization;
  intent: TIntent;
  confidence: number;
  affectiveDimensions?: AffectiveDimensions;
  fundamentalFrequencyHz?: number;
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
  events?: PetEvent<TIntent, TVocalization>[];
}

export interface PetInterpreter<TIntent = string, TVocalization = string> {
  readonly species: SpeciesType;
  interpret(features: PetAcousticFeatures): PetAnalysisResult<TIntent, TVocalization>;
}

export type AudioInputData = Float32Array | number[] | Uint8Array | ArrayBuffer;

export interface AnalyzeOptions {
  sampleRate: number;
  minFrequency?: number;
  maxFrequency?: number;
  energyThreshold?: number;
  enableGatekeeper?: boolean;
}

// DSP - YIN Pitch Detection
export interface YinResult {
  frequencyHz: number;
  confidence: number;
}

export interface YinOptions {
  sampleRate: number;
  minFrequency?: number;
  maxFrequency?: number;
  threshold?: number;
}

export declare function detectPitchYin(audioData: Float32Array | number[], options: YinOptions): YinResult;

// DSP - Acoustic Features
export declare function calculateRms(audioData: Float32Array | number[]): number;
export declare function calculateZcr(audioData: Float32Array | number[]): number;
export declare function calculateSpectralCentroid(audioData: Float32Array | number[], sampleRate: number): number;
export declare function analyzePitchContour(pitchTrajectory: number[]): IntonationContour;

// DSP - Temporal Segmentation
export interface BurstSegment {
  startSample: number;
  endSample: number;
  durationMs: number;
}

export interface SegmenterOptions {
  sampleRate: number;
  frameSizeMs?: number;
  hopSizeMs?: number;
  silenceThresholdRms?: number;
  minBurstDurationMs?: number;
}

export interface SegmentationAnalysis {
  bursts: BurstSegment[];
  burstCount: number;
  averageBurstIntervalMs: number;
  totalActiveDurationMs: number;
  estimatedNoiseFloorRms: number;
  adaptiveThresholdRms: number;
}

export declare function segmentVocalizations(audioData: Float32Array | number[], options: SegmenterOptions): SegmentationAnalysis;

// DSP - Bioacoustic Gatekeeper
export type GatekeeperResult = GatekeeperValidation;

export interface GatekeeperOptions {
  enabled?: boolean;
}

export declare function maxContiguousVoicedFrames(pitchTrajectory: number[]): number;
export declare function calculatePitchJitter(pitchTrajectory: number[]): number;
export declare function calculateOctaveJumpRatio(pitchTrajectory: number[]): number;
export declare function validateAnimalVocalization(
  features: PetAcousticFeatures,
  rawAudio: Float32Array | number[],
  options?: GatekeeperOptions
): GatekeeperResult;

// DSP - Formants & Vocal Tract Length (VTL)
export interface FormantAnalysis {
  formants: number[];
  formantDispersionHz: number;
  estimatedVocalTractLengthCm: number;
  vtlRangeCm: [number, number];
  vtlConfidence: number;
  morphologicalCategory: 'feline' | 'canine_small' | 'canine_large' | 'human_or_large_mammal' | 'unknown';
  isHarmonicLocked?: boolean;
}

export declare function levinsonDurbin(r: Float32Array, order: number): Float32Array;
export declare function extractFormantsFromLpc(lpcCoeffs: Float32Array, sampleRate: number, numFftBins?: number): number[];
export declare function estimateVocalTractDimensions(
  audioData: Float32Array | number[],
  sampleRate: number,
  f0Hint?: number
): FormantAnalysis;

// DSP - MFCC
export interface MfccOptions {
  numCoefficients?: number;
  numFilters?: number;
  minFreqHz?: number;
  maxFreqHz?: number;
  frameSizeMs?: number;
  hopSizeMs?: number;
  preEmphasis?: number;
}

export interface MfccResult {
  coefficients: number[];
  frames: number[][];
  spectralFlatness: number;
  timbreCategory: 'tonal_harmonic' | 'vocal_formant' | 'turbulent_friction' | 'flat_noise';
}

export declare function fftRadix2(real: Float32Array, imag: Float32Array): void;
export declare function hzToMel(hz: number): number;
export declare function melToHz(mel: number): number;
export declare function createMelFilterbank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
  minFreqHz?: number,
  maxFreqHz?: number
): Float32Array[];
export declare function computeDct(logEnergies: Float32Array, numCoefficients: number): number[];
export declare function calculateSpectralFlatness(powerSpectrum: Float32Array): number;
export declare function extractMfcc(audioData: Float32Array | number[], sampleRate: number, options?: MfccOptions): MfccResult;

// IO - WAV Decoder & Encoder
export interface DecodedAudio {
  audioData: Float32Array;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  durationSec: number;
}

export declare function decodeWav(buffer: ArrayBuffer | Uint8Array): DecodedAudio;
export declare function encodeWav(samples: Float32Array | number[], sampleRate?: number): Uint8Array;

// Stream Analyzer
export type StreamEventListener<T> = (data: T) => void;

export interface StreamAnalyzerOptions {
  windowDurationSec?: number;
  hopDurationSec?: number;
  silenceThresholdRms?: number;
  debounceMs?: number;
  confidenceThreshold?: number;
}

export declare class PetStreamAnalyzer<TIntent = string, TVocalization = string> {
  constructor(engine: PetHertz<TIntent, TVocalization>, options?: StreamAnalyzerOptions);
  on(event: 'vocalization', listener: StreamEventListener<PetAnalysisResult<TIntent, TVocalization>>): this;
  on(event: 'silence', listener: StreamEventListener<void>): this;
  on(event: 'metrics', listener: StreamEventListener<PetAcousticFeatures>): this;
  pause(): void;
  resume(): void;
  get isPaused(): boolean;
  push(chunk: Float32Array | number[]): Promise<void>;
  reset(): void;
}

// Universal Interpreter
export declare class UniversalPetInterpreter implements PetInterpreter<string, string> {
  readonly species: SpeciesType;
  interpret(features: PetAcousticFeatures): PetAnalysisResult<string, string>;
}

// Engine
export interface PetHertzConfig<TIntent = string, TVocalization = string> {
  interpreter?: PetInterpreter<TIntent, TVocalization>;
  defaultSampleRate?: number;
}

export declare class PetHertz<TIntent = string, TVocalization = string> {
  readonly interpreter: PetInterpreter<TIntent, TVocalization>;
  readonly defaultSampleRate: number;
  constructor(config?: Partial<PetHertzConfig<TIntent, TVocalization>>);
  analyze(audioData: AudioInputData, options?: Partial<AnalyzeOptions>): Promise<PetAnalysisResult<TIntent, TVocalization>>;
  analyzeWav(wavBytes: ArrayBuffer | Uint8Array, options?: Partial<AnalyzeOptions>): Promise<PetAnalysisResult<TIntent, TVocalization>>;
  analyzeFile(filePath: string, options?: Partial<AnalyzeOptions>): Promise<PetAnalysisResult<TIntent, TVocalization>>;
  createStreamAnalyzer(options?: StreamAnalyzerOptions): PetStreamAnalyzer<TIntent, TVocalization>;
}

// Cat Bioacoustic Interpreter
export type CatVocalization = 'purr' | 'meow' | 'chirp_trill' | 'yowl' | 'hiss' | 'chatter' | 'unknown';
export type CatIntent =
  | 'hunger_solicitation'
  | 'greeting_social'
  | 'distress_isolation'
  | 'comfort_purring'
  | 'defense_warning'
  | 'pain_discomfort'
  | 'hunting_frustration';

export interface CatInterpreterOptions {
  dialect?: 'domestic_short_hair' | 'maine_coon' | 'general';
}

export declare class CatInterpreter implements PetInterpreter<CatIntent, CatVocalization> {
  readonly species: 'cat';
  readonly options: CatInterpreterOptions;
  constructor(options?: CatInterpreterOptions);
  interpret(features: PetAcousticFeatures): PetAnalysisResult<CatIntent, CatVocalization>;
}

// Dog Bioacoustic Interpreter
export type DogVocalization = 'bark' | 'whine' | 'growl' | 'howl' | 'pant' | 'unknown';
export type DogIntent =
  | 'alarm_threat'
  | 'playful_excitement'
  | 'attention_seeking'
  | 'anxiety_separation'
  | 'warning_aggression'
  | 'greeting_submissive';

export interface DogInterpreterOptions {
  sizeCategory?: 'toy' | 'medium' | 'large';
}

export declare class DogInterpreter implements PetInterpreter<DogIntent, DogVocalization> {
  readonly species: 'dog';
  readonly options: DogInterpreterOptions;
  constructor(options?: DogInterpreterOptions);
  interpret(features: PetAcousticFeatures): PetAnalysisResult<DogIntent, DogVocalization>;
}
`;

writeFileSync(resolve(targetDir, 'index.d.ts'), dtsContent, 'utf8');
writeFileSync(resolve(targetDir, 'cli.d.ts'), 'export {};\n', 'utf8');

console.log('Successfully generated standalone dist/index.d.ts and dist/cli.d.ts');
