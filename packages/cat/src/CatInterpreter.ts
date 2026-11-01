import {
  PetAcousticFeatures,
  PetAnalysisResult,
  PetInterpreter,
} from '@pethertz/core';
import { CatIntent, CatVocalization } from './types.js';

export interface CatInterpreterOptions {
  dialect?: 'domestic_short_hair' | 'maine_coon' | 'general';
}

export class CatInterpreter implements PetInterpreter<CatIntent, CatVocalization> {
  readonly species = 'cat' as const;
  readonly options: CatInterpreterOptions;

  constructor(options: CatInterpreterOptions = {}) {
    this.options = { dialect: 'general', ...options };
  }

  interpret(
    features: PetAcousticFeatures
  ): PetAnalysisResult<CatIntent, CatVocalization> {
    const {
      fundamentalFrequencyHz: f0,
      pitchConfidence,
      intonationContour,
      rms,
      zeroCrossingRate: zcr,
      durationMs,
      burstCount,
    } = features;

    // 1. Purr Detection (Low frequency neural laryngeal rumble 20 - 75 Hz with low centroid < 650 Hz)
    // Grounded in YIN pitch tracking of 20-70 Hz glottal oscillation
    const isPurr =
      f0 >= 20 &&
      f0 <= 75 &&
      features.spectralCentroidHz < 650 &&
      rms > 0.005;

    if (isPurr) {
      return {
        species: 'cat',
        vocalization: 'purr',
        intent: 'comfort_purring',
        confidence: 0.92,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.85,
          arousal: 0.15,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Kucing mengeluarkan getaran purring tenang. Menandakan relaksasi tinggi, rasa aman, atau proses swa-penyembuhan.',
        actionRecommendation:
          'Pertahankan suasana nyaman, berikan belaian lembut jika kucing menginginkannya.',
      };
    }

    // 1b. Feline Bioacoustic Dead-Zone Check (75 Hz - 240 Hz)
    // Domestic cat vocal cords are 3-5mm and physically cannot produce sustained phonation between 75 Hz and 240 Hz.
    // Tones in this band are human snoring, coughing, vehicle motors, or appliance hums.
    if (f0 > 75 && f0 < 240) {
      return {
        species: 'unknown',
        vocalization: 'unknown' as any,
        intent: 'distress_isolation' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: {
          valence: 0,
          arousal: 0,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Frekuensi sinyal (70 - 180 Hz) berada di zona non-fonatori kucing (dead zone biologis). Suara ini berasal dari dengkuran manusia atau dengung motor listrik.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal bukan suara kucing.',
      };
    }

    // 1c. Adult & Adolescent Human Phonation Discrimination (Acoustic Allometry)
    // Domestic cat pharynx/vocal tract length is 3.8 - 6.8 cm; lowest formant F1 is always > 950 Hz.
    // Signals with low fundamental frequency (F0 < 450 Hz) and either adult human VTL (> 14.0 cm)
    // or human-scale lowest formant (F1 < 850 Hz with VTL > 9.0 cm) are human speech/cough/sneezes.
    const vtl = features.estimatedVocalTractLengthCm ?? 0;
    const f1 = features.formants?.[0] ?? 0;
    const isHumanVtlAndFormant =
      f0 < 450 &&
      ((vtl > 14.0 && features.morphologicalCategory === 'human_or_large_mammal') ||
        (f1 > 0 && f1 < 850 && vtl > 9.0));

    if (isHumanVtlAndFormant) {
      return {
        species: 'non-pet',
        vocalization: 'non_animal_sound' as any,
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
          'Karakteristik resonansi vokal (F1 < 850 Hz atau VTL > 14 cm pada F0 rendah) adalah anatomi saluran vokal manusia, bukan kucing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal berasal dari suara/batuk/bersin manusia.',
      };
    }

    // 1d. Infant crying sobbing bouts (convulsive spasms with burstCount >= 10 across > 2.0s)
    if (durationMs > 2000 && burstCount >= 10) {
      return {
        species: 'non-pet',
        vocalization: 'non_animal_sound' as any,
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: {
          valence: -0.5,
          arousal: 0.8,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal terdeteksi sebagai tangisan bayi manusia (sob bursts konvulsi >= 10), bukan vokalisasi kucing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal berasal dari suara tangisan bayi.',
      };
    }

    // 1e. Human sneeze whistle / ultrasonic squeak (F0 > 2000 Hz with centroid > 3500 Hz)
    if (f0 > 2000 && features.spectralCentroidHz > 3500) {
      return {
        species: 'non-pet',
        vocalization: 'non_animal_sound' as any,
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
          'Sinyal terdeteksi sebagai bunyi bersin frekuensi ultra-tinggi atau peluit buatan, bukan vokalisasi kucing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal bukan suara kucing.',
      };
    }

    // 1f. Electro-mechanical horn or toy resonator (VTL < 3.2 cm at F0 < 600 Hz)
    if (vtl > 0 && vtl < 3.2 && f0 < 600) {
      return {
        species: 'non-pet',
        vocalization: 'non_animal_sound' as any,
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
          'Estimasi resonator akustik (< 3.2 cm) tidak sesuai dengan anatomi mamalia kucing. Sinyal berasal dari klakson atau resonator mainan.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal bukan suara kucing.',
      };
    }

    // 2. Hissing Detection (Turbulent broadband noise: high ZCR, atonal, moderate duration)
    const isBiologicalHiss =
      zcr >= 0.20 &&
      durationMs >= 150 &&
      pitchConfidence < 0.40 &&
      (features.spectralCentroidHz === undefined || features.spectralCentroidHz >= 2000);

    if (isBiologicalHiss) {
      return {
        species: 'cat',
        vocalization: 'hiss',
        intent: 'defense_warning',
        confidence: 0.88,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: -0.8,
          arousal: 0.85,
          urgency: 'high',
        },
        acousticMetrics: features,
        humanExplanation:
          'Suara hissing terdeteksi (atonal turbulen). Kucing merasa terancam, terpojok, atau mempertahankan wilayahnya.',
        actionRecommendation:
          'Segera beri ruang/jarak. Jangan mencoba menyentuh atau mendekati secara mendadak.',
      };
    }

    // 3. Chatter / Chirp-Trill (Hunting excitement or seeing birds/prey)
    if (burstCount >= 3 && durationMs < 600 && features.burstIntervalMs < 150) {
      return {
        species: 'cat',
        vocalization: 'chatter',
        intent: 'hunting_frustration',
        confidence: 0.85,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.2,
          arousal: 0.7,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Suara chattering (ketukan gigi berulang). Menandakan rangsangan visual mangsa yang terhalang (misal melihat burung di luar jendela).',
        actionRecommendation:
          'Alihkan energinya dengan mainan berburu (seperti tongkat bulu atau laser mainan).',
      };
    }

    // 4. Pain / High-Arousal Yowl
    if (rms > 0.35 && durationMs > 1200 && f0 > 650) {
      return {
        species: 'cat',
        vocalization: 'yowl',
        intent: 'pain_discomfort',
        confidence: 0.86,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: -0.95,
          arousal: 0.95,
          urgency: 'critical',
        },
        acousticMetrics: features,
        humanExplanation:
          'Suara meraung tajam berkepanjangan terdeteksi. Mengindikasikan rasa sakit mendadak atau tingkat agresi tinggi.',
        actionRecommendation:
          'Periksa kondisi fisik kucing apakah ada luka, terjepit, atau gejala sakit.',
      };
    }

    // Plausible Feline Meow Timbre Filter:
    // Feline vocal folds cannot produce >50% chaotic pitch jitter or >5000 Hz centroid in a tonal call
    const isPlausibleMeowTimbre =
      (features.pitchJitter ?? 0) <= 0.50 &&
      features.spectralCentroidHz <= 5000 &&
      !((features.pitchJitter ?? 0) === 0 && durationMs > 500);

    // 5. Short Greeting / Trill
    if (
      durationMs < 400 &&
      features.spectralCentroidHz <= 5000 &&
      isPlausibleMeowTimbre &&
      vtl <= 8.0 &&
      (intonationContour === 'rising' || (f0 >= 400 && intonationContour !== 'atonal' && intonationContour !== 'falling'))
    ) {
      return {
        species: 'cat',
        vocalization: 'chirp_trill',
        intent: 'greeting_social',
        confidence: 0.87,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.7,
          arousal: 0.4,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Vokalisasi meong singkat bernada riang. Merupakan salam sapaan hangat kepada pemilik.',
        actionRecommendation:
          'Sapa balik dengan suara ramah dan ajak berinteraksi santai.',
      };
    }

    // 6. Food Solicitation Meow (Susanne Schötz 2023 - Rising F0 contour)
    const isRisingMeow =
      isPlausibleMeowTimbre &&
      intonationContour === 'rising' &&
      durationMs >= 200 &&
      durationMs <= 1800 &&
      burstCount <= 3 &&
      f0 >= 200 &&
      f0 <= 1600;
    const isDurationMeow =
      isPlausibleMeowTimbre &&
      f0 >= 450 &&
      durationMs >= 350 &&
      durationMs <= 1200 &&
      burstCount <= 3;

    if (isRisingMeow || isDurationMeow) {
      return {
        species: 'cat',
        vocalization: 'meow',
        intent: 'hunger_solicitation',
        confidence: 0.91,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.3,
          arousal: 0.6,
          urgency: 'moderate',
        },
        acousticMetrics: features,
        humanExplanation:
          'Meong dengan intonasi naik di akhir nada (rising intonation). Karakteristik kuat dari permintaan makanan atau perhatian spesifik.',
        actionRecommendation:
          'Periksa jadwal makan dan mangkuk makan/minum kucing.',
      };
    }

    // 7. Distress / Isolation Meow (Susanne Schötz 2023 - Falling F0 contour)
    if (
      isPlausibleMeowTimbre &&
      (intonationContour === 'falling' || durationMs > 1100) &&
      durationMs <= 2200 &&
      burstCount <= 3 &&
      f0 >= 200
    ) {
      return {
        species: 'cat',
        vocalization: 'meow',
        intent: 'distress_isolation',
        confidence: 0.89,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: -0.65,
          arousal: 0.65,
          urgency: 'moderate',
        },
        acousticMetrics: features,
        humanExplanation:
          'Meong panjang dengan intonasi menurun (falling intonation). Mengindikasikan kesepian, cemas, atau ketidaknyamanan lingkungan.',
        actionRecommendation:
          'Hampiri kucing, periksa apakah pintu tertutup atau kucing terisolasi dari area favoritnya.',
      };
    }

    // Default Fallback: Only classify as meow if contour is non-chaotic and F0 >= 240 Hz and duration <= 2000ms
    if (
      isPlausibleMeowTimbre &&
      f0 >= 240 &&
      burstCount <= 3 &&
      durationMs <= 2000 &&
      intonationContour !== 'fluctuating' &&
      intonationContour !== 'atonal'
    ) {
      return {
        species: 'cat',
        vocalization: 'meow',
        intent: 'greeting_social',
        confidence: 0.72,
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.2,
          arousal: 0.4,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Vokalisasi meong standar dalam rentang nada netral.',
        actionRecommendation:
          'Perhatikan bahasa tubuh kucing (posisi ekor dan telinga) untuk konfirmasi kontekstual tambahan.',
      };
    }

    // Prolonged infant cry / human scream discriminator:
    // Human infant crying bouts typically last > 2800ms with high spectral centroid > 3000 Hz.
    // Feline meows never exceed 2200ms in domestic bioacoustic literature (Schötz 2023).
    if (durationMs > 2800 && features.spectralCentroidHz > 3000) {
      return {
        species: 'non-pet',
        vocalization: 'non_animal_sound' as any,
        intent: 'ambient_or_artificial_sound' as any,
        confidence: 0,
        isAnimalVocalization: false,
        affectiveDimensions: {
          valence: -0.5,
          arousal: 0.8,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Sinyal terdeteksi sebagai tangisan bayi manusia atau jeritan berdurasi panjang (> 2.8s dengan spektrum tinggi), bukan vokalisasi kucing.',
        actionRecommendation:
          'Tidak ada tindakan diperlukan. Sinyal berasal dari suara tangisan manusia.',
      };
    }

    // Graceful Bioacoustic Fallback:
    // If the Gatekeeper confirmed this as a legitimate animal vocalization,
    // do not commit the Serial Veto Fallacy by discarding real cats due to minor acoustic variations.
    if (
      features.gatekeeper?.isAnimalVocalization &&
      isPlausibleMeowTimbre &&
      f0 >= 240 &&
      burstCount <= 3 &&
      intonationContour !== 'atonal' &&
      intonationContour !== 'fluctuating'
    ) {
      return {
        species: 'cat',
        vocalization: 'meow',
        intent: 'greeting_social',
        confidence: Math.max(0.70, features.gatekeeper.confidence),
        isAnimalVocalization: true,
        affectiveDimensions: {
          valence: 0.1,
          arousal: 0.5,
          urgency: 'low',
        },
        acousticMetrics: features,
        humanExplanation:
          'Vokalisasi kucing terdeteksi dengan variasi modulasi atau resonansi akustik alami.',
        actionRecommendation:
          'Perhatikan bahasa tubuh kucing (posisi ekor dan telinga) untuk konfirmasi kontekstual tambahan.',
      };
    }

    return {
      species: 'unknown',
      vocalization: 'unknown' as any,
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
        'Sinyal akustik tidak cocok dengan pola vokalisasi kucing yang valid.',
      actionRecommendation:
        'Tidak ada tindakan diperlukan. Sinyal bukan vokalisasi kucing.',
    };
  }
}
