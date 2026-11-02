import {
  AnalyzeOptions,
  AudioInputData,
  PetAcousticFeatures,
  PetAnalysisResult,
  PetEvent,
  PetInterpreter,
  QualityFlag,
} from './types/index.js';
import { detectPitchYin } from './dsp/yin.js';
import {
  analyzePitchContour,
  calculateRms,
  calculateSpectralCentroid,
  calculateZcr,
} from './dsp/features.js';
import { segmentVocalizations } from './dsp/segmenter.js';
import {
  calculateOctaveJumpRatio,
  calculatePitchJitter,
  validateAnimalVocalization,
} from './dsp/gatekeeper.js';
import { estimateVocalTractDimensions } from './dsp/formants.js';
import { extractMfcc } from './dsp/mfcc.js';
import { decodeWav } from './io/wav.js';
import { PetStreamAnalyzer, StreamAnalyzerOptions } from './stream/StreamAnalyzer.js';
import { UniversalPetInterpreter } from './UniversalPetInterpreter.js';

export interface PetHertzConfig<TIntent = string, TVocalization = string> {
  interpreter?: PetInterpreter<TIntent, TVocalization>;
  defaultSampleRate?: number;
}

export class PetHertz<TIntent = string, TVocalization = string> {
  readonly interpreter: PetInterpreter<TIntent, TVocalization>;
  readonly defaultSampleRate: number;

  constructor(config?: Partial<PetHertzConfig<TIntent, TVocalization>>) {
    this.interpreter =
      config?.interpreter ??
      (new UniversalPetInterpreter() as unknown as PetInterpreter<TIntent, TVocalization>);
    this.defaultSampleRate = config?.defaultSampleRate ?? 44100;
  }

  /**
   * Analyzes raw audio data or WAV file bytes and returns bioacoustic features + interpreted intent.
   * Supports:
   *  - Float32Array / number[] (normalized PCM samples)
   *  - Uint8Array / ArrayBuffer / Buffer (raw WAV file bytes - auto-decodes header & sample rate)
   */
  async analyze(
    audioData: AudioInputData,
    options?: Partial<AnalyzeOptions>
  ): Promise<PetAnalysisResult<TIntent, TVocalization>> {
    // 0. Auto-detect and decode RIFF/WAVE byte buffers
    if (
      audioData instanceof ArrayBuffer ||
      audioData instanceof Uint8Array ||
      (typeof Buffer !== 'undefined' && Buffer.isBuffer(audioData))
    ) {
      const bytes =
        audioData instanceof Uint8Array ? audioData : new Uint8Array(audioData as ArrayBuffer);

      // Check for RIFF identifier
      if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 && // 'R'
        bytes[1] === 0x49 && // 'I'
        bytes[2] === 0x46 && // 'F'
        bytes[3] === 0x46    // 'F'
      ) {
        const decoded = decodeWav(bytes);
        return this.analyze(decoded.audioData, {
          sampleRate: decoded.sampleRate,
          ...options,
        });
      }
    }

    const sampleRate = options?.sampleRate ?? this.defaultSampleRate;
    const minFreq =
      options?.minFrequency ?? (this.interpreter.species === 'dog' ? 65 : 20);
    const maxFreq = options?.maxFrequency ?? 3500;

    const rawArray =
      audioData instanceof Float32Array ? audioData : new Float32Array(audioData as number[]);

    // 0. DC Offset Removal (High-Pass Filter at ~15 Hz)
    // Eliminates electrical hum, microphone drift, and DC bias (prevents flat DC from being mistaken as purr)
    const dataArray = new Float32Array(rawArray.length);
    const R = 0.998;
    let prevX = rawArray[0] ?? 0;
    let prevY = 0;
    for (let i = 0; i < rawArray.length; i++) {
      const x = rawArray[i] ?? 0;
      prevY = x - prevX + R * prevY;
      prevX = x;
      dataArray[i] = prevY;
    }

    // 1. Adaptive Dynamic Segmentation & Voice Activity Detection
    const segmentation = segmentVocalizations(dataArray, {
      sampleRate,
      silenceThresholdRms: options?.energyThreshold,
    });

    // 2. Global Energy & Turbulence Metrics
    const rms = calculateRms(dataArray);
    const zeroCrossingRate = calculateZcr(dataArray);
    const spectralCentroidHz = calculateSpectralCentroid(dataArray, sampleRate);

    // 3. Sliding-window Pitch Trajectory Extraction (YIN) with Energy-Weighting
    // For low-pitch animal vocalizations (cat purr 20-70 Hz), allocate a window capable of holding 2 full periods of 20 Hz
    const windowSize =
      minFreq <= 35 && dataArray.length >= 4096
        ? Math.min(8192, Math.max(1024, Math.floor(sampleRate * 0.12)))
        : Math.min(2048, Math.max(512, Math.floor(sampleRate * 0.05)));
    const hopSize = Math.floor(windowSize / 2);
    const pitchTrajectory: number[] = [];
    let sumWeightedF0 = 0;
    let totalF0Weight = 0;
    let voicedCount = 0;
    let sumConfidence = 0;

    for (let i = 0; i + windowSize <= dataArray.length; i += hopSize) {
      const windowFrame = dataArray.subarray(i, i + windowSize);
      let frameSq = 0;
      for (let s = 0; s < windowFrame.length; s++) {
        const val = windowFrame[s]!;
        frameSq += val * val;
      }
      const frameRms = Math.sqrt(frameSq / windowFrame.length);

      if (frameRms >= 0.005) {
        const pitchRes = detectPitchYin(windowFrame, {
          sampleRate,
          minFrequency: minFreq,
          maxFrequency: maxFreq,
          threshold: 0.15,
        });

        if (pitchRes.frequencyHz > 0 && pitchRes.confidence > 0.4) {
          pitchTrajectory.push(pitchRes.frequencyHz);
          sumWeightedF0 += pitchRes.frequencyHz * frameRms;
          totalF0Weight += frameRms;
          sumConfidence += pitchRes.confidence;
          voicedCount++;
        } else {
          pitchTrajectory.push(0);
        }
      } else {
        pitchTrajectory.push(0);
      }
    }

    const fundamentalFrequencyHz =
      totalF0Weight > 0 ? Math.round((sumWeightedF0 / totalF0Weight) * 10) / 10 : 0;
    const pitchConfidence =
      voicedCount > 0 ? Math.round((sumConfidence / voicedCount) * 100) / 100 : 0;

    // Pitch Modulation Contour Analysis
    const intonationContour = analyzePitchContour(pitchTrajectory);
    const pitchJitter = calculatePitchJitter(pitchTrajectory);
    const octaveJumpRatio = calculateOctaveJumpRatio(pitchTrajectory);

    // 4. Acoustic Allometry & Formant Extraction (LPC + Levinson-Durbin)
    const formants = estimateVocalTractDimensions(dataArray, sampleRate, fundamentalFrequencyHz);

    // 5. 13-Band MFCC & Wiener Spectral Flatness Timbre Analysis
    const mfcc = extractMfcc(dataArray, sampleRate);

    // 6. Quality Flags Audit
    const qualityFlags: QualityFlag[] = [];

    // Check low SNR
    if (rms < 0.012 && rms >= 0.003) {
      qualityFlags.push('low_snr');
    }

    // Check digital clipping / saturation
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const absVal = Math.abs(dataArray[i]!);
      if (absVal > peak) peak = absVal;
    }
    if (peak > 0.98) {
      qualityFlags.push('clipping');
    }

    // Check harmonic locking
    if (formants.isHarmonicLocked) {
      qualityFlags.push('high_f0_lpc_harmonic_lock');
    }

    // Check borderline VTL
    if (formants.vtlConfidence < 0.5 && formants.estimatedVocalTractLengthCm > 0) {
      qualityFlags.push('borderline_vtl');
    }

    // Check chaotic intonation
    if (octaveJumpRatio > 0.35 || pitchJitter > 0.35) {
      qualityFlags.push('chaotic_intonation');
    }

    // Check short impulse
    if (segmentation.totalActiveDurationMs < 70 && segmentation.burstCount <= 1) {
      qualityFlags.push('short_impulse');
    }

    // 7. Bioacoustic Gatekeeper Validation
    const initialFeatures: Omit<PetAcousticFeatures, 'gatekeeper'> = {
      fundamentalFrequencyHz,
      pitchConfidence,
      intonationContour,
      pitchTrajectory,
      pitchJitter,
      rms: Math.round(rms * 1000) / 1000,
      zeroCrossingRate: Math.round(zeroCrossingRate * 1000) / 1000,
      spectralCentroidHz,
      durationMs: segmentation.totalActiveDurationMs,
      burstCount: segmentation.burstCount,
      burstIntervalMs: segmentation.averageBurstIntervalMs,
      formants: formants.formants,
      formantDispersionHz: formants.formantDispersionHz,
      estimatedVocalTractLengthCm: formants.estimatedVocalTractLengthCm,
      vtlRangeCm: formants.vtlRangeCm,
      vtlConfidence: formants.vtlConfidence,
      morphologicalCategory: formants.morphologicalCategory,
      mfcc: mfcc.coefficients,
      spectralFlatness: mfcc.spectralFlatness,
      qualityFlags,
    };

    const gatekeeper = validateAnimalVocalization(initialFeatures as any, dataArray, {
      enabled: options?.enableGatekeeper,
    });
    const acousticMetrics: PetAcousticFeatures = {
      ...initialFeatures,
      gatekeeper,
    };

    // 8. Honest Open-Set Decision (confirmed_pet vs uncertain vs confirmed_noise)
    if (!gatekeeper.isAnimalVocalization) {
      if (gatekeeper.status === 'uncertain') {
        return {
          species: 'uncertain',
          vocalization: 'uncertain_vocalization' as any,
          intent: 'unclear_signal' as any,
          confidence: gatekeeper.confidence,
          isAnimalVocalization: false,
          affectiveDimensions: {
            valence: 0,
            arousal: 0.5,
            urgency: 'low',
          },
          acousticMetrics,
          qualityFlags,
          humanExplanation: `Signal detected at borderline bioacoustic plausibility threshold (score: ${(gatekeeper.biologicalPlausibilityScore * 100).toFixed(0)}%). Quality flags: [${qualityFlags.join(', ')}]. ${this.getGatekeeperExplanation(gatekeeper.rejectionReason)}`,
          actionRecommendation:
            'Re-record audio closer to the pet in a quieter environment without background interference.',
          events: [],
        };
      }

      return {
        species: 'non-pet',
        vocalization: 'non_animal_sound' as any,
        intent: 'ambient_or_artificial_sound' as any,
        confidence: gatekeeper.confidence,
        isAnimalVocalization: false,
        affectiveDimensions: {
          valence: 0,
          arousal: 0,
          urgency: 'low',
        },
        acousticMetrics,
        qualityFlags,
        humanExplanation: this.getGatekeeperExplanation(gatekeeper.rejectionReason),
        actionRecommendation:
          'No action required. The detected audio is not a domestic pet vocalization.',
        events: [],
      };
    }

    // 9. Delegate to Rules Interpreter
    const interpreted = this.interpreter.interpret(acousticMetrics);

    // 10. Temporal Multi-Event Timeline Segmentation
    const events: PetEvent<TIntent, TVocalization>[] = [];
    if (segmentation.bursts.length > 0) {
      for (const burst of segmentation.bursts) {
        events.push({
          startMs: Math.round((burst.startSample / sampleRate) * 1000),
          endMs: Math.round((burst.endSample / sampleRate) * 1000),
          durationMs: burst.durationMs,
          vocalization: interpreted.vocalization,
          intent: interpreted.intent,
          confidence: interpreted.confidence,
          affectiveDimensions: interpreted.affectiveDimensions,
          fundamentalFrequencyHz,
        });
      }
    }

    return {
      ...interpreted,
      qualityFlags,
      events,
    };
  }

  private getGatekeeperExplanation(reason?: string): string {
    switch (reason) {
      case 'synthetic_mechanical_tone':
        return 'Signal identified as a static mechanical or electronic tone (such as a vehicle horn, ringtone, or siren) lacking biological pitch jitter.';
      case 'impulsive_noise_or_cough':
        return 'Signal identified as an impulsive non-pet burst (such as a human cough or physical impact).';
      case 'human_speech_or_cough':
        return 'Signal matches adult or infant human vocal tract allometry (speech, cough, or crying), not a companion domestic pet.';
      case 'ultrasonic_impulse_or_click':
        return 'Signal identified as an ultra-high frequency metallic or mechanical impulse click (such as a clock tick or glass fracture).';
      case 'ambient_noise_unvoiced':
        return 'Signal identified as unvoiced ambient background noise (such as wind, air friction, or room rumble) lacking vocal harmonic structure.';
      case 'chaotic_turbulent_noise':
        return 'Signal exhibits non-continuous chaotic turbulence (such as fire crackle or scraping) without glottal biological continuity.';
      case 'inaudible_silence':
        return 'Audio energy is below the audible threshold for bioacoustic feature analysis.';
      default:
        return 'Signal does not satisfy the bioacoustic plausibility criteria for pet vocalization.';
    }
  }

  /**
   * Decodes and analyzes a RIFF/WAVE audio buffer (Uint8Array, ArrayBuffer, or Node.js Buffer).
   */
  async analyzeWav(
    wavBytes: ArrayBuffer | Uint8Array,
    options?: Partial<AnalyzeOptions>
  ): Promise<PetAnalysisResult<TIntent, TVocalization>> {
    const decoded = decodeWav(wavBytes);
    return this.analyze(decoded.audioData, {
      sampleRate: decoded.sampleRate,
      ...options,
    });
  }

  /**
   * Reads and analyzes an audio file from filesystem path.
   * Node.js isomorphic helper.
   */
  async analyzeFile(
    filePath: string,
    options?: Partial<AnalyzeOptions>
  ): Promise<PetAnalysisResult<TIntent, TVocalization>> {
    try {
      const { readFile } = await import('node:fs/promises');
      const buffer = await readFile(filePath);
      return this.analyzeWav(buffer, options);
    } catch (err: any) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' || typeof window !== 'undefined') {
        throw new Error(
          'The analyzeFile() method is only available in Node.js environments. Use analyzeWav() or analyze() in browsers.'
        );
      }
      throw err;
    }
  }

  /**
   * Creates a real-time event-driven stream analyzer for live microphone or IoT streams.
   */
  createStreamAnalyzer(
    options?: StreamAnalyzerOptions
  ): PetStreamAnalyzer<TIntent, TVocalization> {
    return new PetStreamAnalyzer(this, options);
  }
}
