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
      zeroCrossingRate: zcr,
      spectralCentroidHz: centroid,
      pitchJitter: jitter,
    } = features;

    const vtl = features.estimatedVocalTractLengthCm ?? 0;
    const f1 = features.formants?.[0] ?? 0;

    // Adjust frequency thresholds slightly by dog size category
    const pitchOffset =
      this.options.sizeCategory === 'toy'
        ? 150
        : this.options.sizeCategory === 'large'
          ? -80
          : 0;

    // =========================================================================
    // 1. BIOACOUSTIC DISCRIMINATION & ANTI-NOISE SHIELD
    // =========================================================================

    // 1a. Adult & Adolescent Human Phonation Discrimination (Acoustic Allometry)
    // Long human VTL (> 15.0 cm) with lower fundamental frequency (f0 < 450 Hz) or human vowel resonance
    const isHumanPhonation =
      f0 < 450 &&
      ((vtl > 15.5 && features.morphologicalCategory === 'human_or_large_mammal') ||
        (f1 > 0 && f1 < 800 && vtl > 15.0));

    if (isHumanPhonation) {
      return {
        species: 'non-pet',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Karakteristik resonansi vokal (F1 < 800 Hz atau VTL > 15.0 cm pada F0 rendah) adalah anatomi saluran vokal manusia (batuk/percakapan/dengkuran), bukan anjing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal berasal dari suara saluran napas/vokal manusia.',
      };
    }

    // 1b. Human coughing / throat clearing:
    // Adult human cough bouts exhibit adult vocal tract resonance (VTL > 10.5 cm) combined with elevated pitch jitter (> 0.45),
    // prolonged throat clearing in the adult male F0 range (140-250 Hz, duration > 1200ms),
    // or violent hacking friction (low F0 < 300 Hz with high centroid > 2200 Hz and high jitter).
    const isHumanCough =
      (f0 < 800 && vtl > 10.5 && jitter > 0.45) ||
      (f0 >= 140 && f0 <= 250 && durationMs > 1200 && burstCount <= 2) ||
      (f0 < 300 && centroid > 2200 && jitter > 0.45) ||
      (jitter > 0.70 && vtl > 13.0 && durationMs < 1500);

    if (isHumanCough) {
      return {
        species: 'non-pet',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal terdeteksi sebagai suara batuk atau pembersihan tenggorokan manusia (resonansi saluran vokal manusia pada F0 rendah), bukan suara anjing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal berasal dari batuk/suara pernapasan manusia.',
      };
    }

    // 1c. Human sneezing / treble friction (violent friction with centroid > 3200 Hz and high jitter, or low human vowel F1)
    const isHumanSneeze =
      (centroid > 4800 && zcr > 0.08 && f0 > 0 && f0 < 600) ||
      (centroid > 3200 && jitter > 0.45 && durationMs < 1200) ||
      (f1 > 0 && f1 <= 650 && f0 > 350 && durationMs > 1200);

    if (isHumanSneeze) {
      return {
        species: 'non-pet',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal terdeteksi sebagai bunyi bersin frekuensi tinggi manusia, bukan vokalisasi anjing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal bukan suara anjing.',
      };
    }

    // 1d. Infant crying & emergency sirens:
    // Sirens: pure synthetic pitch (jitter < 0.04 or spectralFlatness < 0.002) with duration > 2800ms.
    // Infant crying: prolonged high pitch (> 3000ms) with piercing high centroid > 3200 Hz.
    const isElectronicSiren =
      durationMs > 2800 &&
      f0 > 450 &&
      burstCount <= 2 &&
      (jitter < 0.04 || (features.spectralFlatness !== undefined && features.spectralFlatness < 0.002));
    const isProlongedInfantCry =
      durationMs > 3000 &&
      f0 > 450 &&
      centroid > 3200;

    if (isElectronicSiren || isProlongedInfantCry) {
      return {
        species: 'non-pet',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: -0.5, arousal: 0.8, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal bernada tinggi berkepanjangan terdeteksi sebagai tangisan bayi manusia atau sirine buatan, bukan gonggongan anjing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal berasal dari suara non-hewan.',
      };
    }

    // 1e. Human snoring (70 - 135 Hz vibration > 1000ms with prolonged duration > 1800ms, or allometric mismatch: low F0 with small vocal tract 3.5 - 9.0 cm)
    if (
      f0 >= 70 &&
      f0 <= 135 &&
      durationMs > 1000 &&
      (durationMs > 1800 || (vtl >= 3.5 && vtl <= 9.0) || jitter > 0.35)
    ) {
      return {
        species: 'non-pet',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal terdeteksi sebagai dengkuran manusia saat tidur (frekuensi 70-135 Hz tidak sesuai dengan ukuran saluran vokal anjing kecil/sedang).',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal berasal dari dengkuran manusia.',
      };
    }

    // 1f. Electro-mechanical horn, siren, or vehicle warning
    if (
      (vtl > 0 && vtl < 3.2 && f0 < 600 && (durationMs > 1000 || jitter > 0.35)) ||
      (durationMs > 3200 && f0 > 450 && jitter < 0.08) ||
      (durationMs > 2800 && burstCount <= 2 && (f0 < 400 || (features.spectralFlatness !== undefined && features.spectralFlatness < 0.015))) ||
      (centroid > 2500 && f0 < 300 && zcr < 0.03)
    ) {
      return {
        species: 'non-pet',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal terdeteksi sebagai nada mekanis/elektronik sintetis (klakson kendaraan/sirine/resonator buatan), bukan vokalisasi anjing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal bukan suara anjing.',
      };
    }

    // 1g. Clock ticking / mechanical impulses (ultra-short click < 100ms or unvoiced high burst count without dog phonation)
    if (
      (durationMs < 100 && (f0 === 0 || jitter > 0.45)) ||
      (burstCount >= 7 && (f0 === 0 || pitchConfidence < 0.35 || jitter > 0.65 || (f0 < 200 && jitter > 0.40)))
    ) {
      return {
        species: 'non-pet',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal terdeteksi sebagai detak jam mekanis berulang atau letupan impulsif pendek, bukan vokalisasi anjing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal bukan suara anjing.',
      };
    }

    // 1h. Atonal turbulent noise or pure white noise (Canines do not hiss or output white noise)
    if (
      (zcr > 0.22 && pitchConfidence < 0.35) ||
      (features.spectralFlatness !== undefined && features.spectralFlatness > 0.38 && pitchConfidence < 0.35)
    ) {
      return {
        species: 'unknown',
        vocalization: 'unknown',
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal atonal turbulen atau derau putih terdeteksi. Anjing tidak memiliki vokalisasi desisan (hissing) seperti kucing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal bukan vokalisasi anjing.',
      };
    }

    // =========================================================================
    // 2. CANINE ETHOLOGICAL VOCALIZATION PROFILES (Pongrácz / Faragó)
    // =========================================================================

    // 2a. High Tonal Whine / Whimper (Separation Anxiety / Pain)
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

    // 2b. Cross-Species Separation: Feline Meow / Purr Detection
    // Domestic cat vocal tract is 3.8 - 6.8 cm with F0 typically 450 - 1050 Hz for single long meow
    const isCatPurr = f0 >= 20 && f0 <= 75 && centroid < 650 && rms > 0.005;
    const isCatMeow =
      f0 >= 450 &&
      f0 <= 1050 &&
      vtl > 0 &&
      vtl <= 6.8 &&
      durationMs >= 350 &&
      burstCount <= 2 &&
      features.morphologicalCategory === 'feline';

    if (isCatPurr || isCatMeow) {
      return {
        species: 'cat' as any,
        vocalization: (isCatPurr ? 'purr' : 'meow') as any,
        intent: (isCatPurr ? 'comfort_purring' : 'greeting_social') as any,
        confidence: 0.90,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.5,
          arousal: 0.4,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Resonansi akustik saluran vokal (VTL feline 4-6.8 cm) dan pola frekuensi mengindikasikan suara kucing (bukan anjing).',
        actionRecommendation:
          'Gunakan CatEngine (@pethertz/cat) untuk analisis emosi dan intensitas kucing yang komprehensif.',
      };
    }

    // 2c. Low-Frequency Growl (Warning / Defensive Aggression - Pongrácz 2005)
    if (
      f0 >= 70 &&
      f0 <= 250 + pitchOffset &&
      durationMs >= 200 &&
      durationMs <= 2000 &&
      burstCount <= 2 &&
      jitter <= 0.45 &&
      rms >= 0.02 &&
      (vtl === 0 || vtl <= 14.5) &&
      zcr < 0.20
    ) {
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

    // 2d. Alarm / Threat Bark (Péter Pongrácz: Low F0 + Rapid Bursts)
    if (
      (f0 < 550 + pitchOffset || f0 === 0) &&
      burstCount >= 2 &&
      burstIntervalMs <= 350 &&
      rms > 0.03 &&
      durationMs >= 100 &&
      durationMs <= 3500
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

    // 2e. Playful / Excitement Bark (High F0 + Variable Intervals)
    if (
      (f0 >= 750 + pitchOffset || (features.intonationContour === 'rising' && burstIntervalMs > 250)) &&
      durationMs >= 100 &&
      durationMs <= 2500 &&
      pitchConfidence > 0.35
    ) {
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

    // 2f. Attention-Seeking Bark (Moderate F0, Single/Double Bursts)
    if (
      burstCount <= 3 &&
      durationMs >= 100 &&
      durationMs < 900 &&
      f0 >= 200 &&
      f0 <= 850 + pitchOffset &&
      pitchConfidence > 0.30 &&
      rms >= 0.02 &&
      zcr < 0.20
    ) {
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

    // =========================================================================
    // 3. GRACEFUL BIOACOUSTIC FALLBACK / REJECTION
    // =========================================================================
    if (
      features.gatekeeper?.isAnimalVocalization &&
      durationMs >= 100 &&
      rms >= 0.015
    ) {
      return {
        species: 'dog',
        vocalization: 'bark',
        intent: 'attention_seeking',
        confidence: Math.max(0.70, features.gatekeeper.confidence),
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.0,
          arousal: 0.4,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Vokalisasi gonggongan umum terdeteksi dengan modulasi bioakustik valid.',
        actionRecommendation:
          'Perhatikan konteks lingkungan dan bahasa tubuh anjing (kibasan ekor, postur telinga).',
      };
    }

    return {
      species: 'unknown',
      vocalization: 'unknown',
      intent: 'ambient_or_artificial_sound' as any,
      confidence: 0,
      isAnimalVocalization: false,
      affectiveDimensions: {
        valence: 0,
        arousal: 0,
        urgency: 'low',
      },
      acousticMetrics: features,
      humanExplanation:
        'Sinyal akustik tidak cocok dengan pola vokalisasi anjing yang valid.',
      actionRecommendation:
        'Tidak ada tindakan diperlukan. Sinyal bukan vokalisasi anjing.',
    };
  }
}
