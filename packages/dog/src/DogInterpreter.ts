import {
  PetAcousticFeatures,
  PetAnalysisResult,
  PetInterpreter,
} from '@pethertz/core';
import { DogIntent, DogVocalization } from './types.js';

export interface DogInterpreterOptions {
  sizeCategory?: 'toy' | 'medium' | 'large';
}

export class DogInterpreter implements PetInterpreter<DogIntent, DogVocalization> {
  readonly species = 'dog' as const;
  readonly options: DogInterpreterOptions;

  constructor(options: DogInterpreterOptions = {}) {
    this.options = { sizeCategory: 'medium', ...options };
  }

  interpret(
    features: PetAcousticFeatures
  ): PetAnalysisResult<DogIntent, DogVocalization> {
    const {
      fundamentalFrequencyHz: f0,
      pitchConfidence,
      rms,
      durationMs,
      burstCount,
      burstIntervalMs,
    } = features;

    // Adjust frequency thresholds slightly by dog size category
    const pitchOffset =
      this.options.sizeCategory === 'toy'
        ? 150
        : this.options.sizeCategory === 'large'
          ? -80
          : 0;

    // 1. High Tonal Whine / Whimper (Separation Anxiety / Pain)
    if (f0 >= 1100 + pitchOffset && pitchConfidence > 0.55 && durationMs > 350) {
      return {
        species: 'dog',
        vocalization: 'whine',
        intent: 'anxiety_separation',
        confidence: 0.92,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: -0.7,
          arousal: 0.75,
          urgency: 'high',
        },
        acousticMetrics: features,
        humanExplanation:
          'Rintihan frekuensi tinggi harmonik terdeteksi (whining). Mengindikasikan kecemasan perpisahan, ketakutan, atau memohon bantuan.',
        actionRecommendation:
          'Dekati anjing dengan tenang, berikan rasa aman, dan periksa apakah ada penyebab stres di sekitarnya.',
      };
    }

    // 2. Low-Frequency Growl (Warning / Defensive Aggression)
    if (f0 > 0 && f0 <= 250 + pitchOffset && rms > 0.015) {
      return {
        species: 'dog',
        vocalization: 'growl',
        intent: 'warning_aggression',
        confidence: 0.9,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: -0.85,
          arousal: 0.8,
          urgency: 'high',
        },
        acousticMetrics: features,
        humanExplanation:
          'Geraman rendah bergetar (growling) terdeteksi. Peringatan teritorial atau rasa tidak nyaman dengan situasi sekitar.',
        actionRecommendation:
          'Jangan melakukan gerakan mendadak atau memprovokasi. Berikan anjing ruang untuk menenangkan diri.',
      };
    }

    // 3. Alarm / Threat Bark (Péter Pongrácz: Low F0 + Rapid Bursts)
    if (
      (f0 < 480 + pitchOffset || f0 === 0) &&
      burstCount >= 2 &&
      burstIntervalMs <= 280 &&
      rms > 0.05
    ) {
      return {
        species: 'dog',
        vocalization: 'bark',
        intent: 'alarm_threat',
        confidence: 0.93,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: -0.4,
          arousal: 0.9,
          urgency: 'high',
        },
        acousticMetrics: features,
        humanExplanation:
          'Gonggongan beruntun bertempo cepat dengan pitch rendah. Karakteristik sinyal alarm / kehadiran orang asing / ancaman potensial.',
        actionRecommendation:
          'Periksa area pintu, pagar, atau luar rumah untuk melihat objek atau orang yang menarik kewaspadaan anjing.',
      };
    }

    // 4. Playful / Excitement Bark (High F0 + Variable Intervals)
    if (f0 >= 850 + pitchOffset || (features.intonationContour === 'rising' && burstIntervalMs > 300)) {
      return {
        species: 'dog',
        vocalization: 'bark',
        intent: 'playful_excitement',
        confidence: 0.88,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.8,
          arousal: 0.75,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Gonggongan bernada tinggi dengan modulasi ceria. Menandakan ajakan bermain atau antusiasme tinggi.',
        actionRecommendation:
          'Ajak anjing berinteraksi, bermain lempar bola, atau beri mainan kesukaannya.',
      };
    }

    // 5. Attention-Seeking Bark (Moderate F0, Single/Double Bursts)
    if (burstCount <= 2 && durationMs < 600) {
      return {
        species: 'dog',
        vocalization: 'bark',
        intent: 'attention_seeking',
        confidence: 0.84,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.1,
          arousal: 0.5,
          urgency: 'moderate',
        },
        acousticMetrics: features,
        humanExplanation:
          'Gonggongan terisolasi bernada sedang. Sinyal meminta perhatian (misal: minta dibukakan pintu, minta makan, atau menyapa).',
        actionRecommendation:
          'Periksa kebutuhan dasarnya: mangkuk air, waktu buang air kecil, atau ingin diajak jalan.',
      };
    }

    // Default Fallback
    return {
      species: 'dog',
      vocalization: 'bark',
      intent: 'attention_seeking',
      confidence: 0.7,
      isAnimalVocalization: true,
      affectiveDimensions: {
        valence: 0.0,
        arousal: 0.4,
        urgency: 'low',
      },
      acousticMetrics: features,
      humanExplanation:
        'Vokalisasi gonggongan umum terdeteksi.',
      actionRecommendation:
        'Perhatikan konteks lingkungan dan bahasa tubuh anjing (kibasan ekor, postur telinga).',
    };
  }
}
