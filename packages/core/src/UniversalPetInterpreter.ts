import {
  PetAcousticFeatures,
  PetAnalysisResult,
  PetInterpreter,
  SpeciesType,
} from './types/index.js';

/**
 * Universal Pet Interpreter with automatic bioacoustic species classification.
 * Infers species (Cat vs Dog) and affective intent using acoustic allometry (VTL),
 * formant dispersion (ΔF), fundamental frequency (F0), and temporal burst dynamics.
 */
export class UniversalPetInterpreter implements PetInterpreter<string, string> {
  readonly species: SpeciesType = 'uncertain';

  interpret(features: PetAcousticFeatures): PetAnalysisResult<string, string> {
    const {
      fundamentalFrequencyHz: f0,
      intonationContour,
      durationMs,
      burstCount,
      burstIntervalMs,
      spectralCentroidHz,
      zeroCrossingRate: zcr,
      estimatedVocalTractLengthCm: vtl = 0,
      morphologicalCategory,
    } = features;

    // 1. Biological Gatekeeper Check
    if (!features.gatekeeper?.isAnimalVocalization) {
      return {
        species: 'non-pet',
        vocalization: 'non_animal_sound',
        intent: 'ambient_or_artificial_sound',
        confidence: features.gatekeeper?.confidence ?? 0.2,
        isAnimalVocalization: false,
        affectiveDimensions: { valence: 0, arousal: 0.5, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation: 'Non-biological or non-pet environmental acoustic signal.',
        actionRecommendation: 'Verify audio source and ensure microphone is near the pet.',
      };
    }

    // 2. Comparative Allometric Species Arbitration (Cat vs Dog)
    let inferredSpecies: 'cat' | 'dog' = 'cat';
    let speciesConfidence = 0.80;

    // Anatomical Vocal Tract Length (VTL)
    if (vtl > 0) {
      if (vtl <= 6.8 || morphologicalCategory === 'feline') {
        inferredSpecies = 'cat';
        speciesConfidence = 0.90;
      } else if (vtl >= 7.2 || morphologicalCategory === 'canine_large' || morphologicalCategory === 'canine_small') {
        inferredSpecies = 'dog';
        speciesConfidence = 0.90;
      }
    }

    // Temporal Burst & Acoustic Form
    if (burstCount >= 2 && durationMs < 2000 && burstIntervalMs > 0 && burstIntervalMs < 500) {
      // Rhythmic staccato bouts are heavily characteristic of canine barking
      inferredSpecies = 'dog';
    } else if (f0 >= 20 && f0 <= 70 && spectralCentroidHz < 650) {
      // 20-70 Hz low vibrational hum is feline purring
      inferredSpecies = 'cat';
    } else if (f0 >= 70 && f0 <= 260 && durationMs >= 200) {
      // Guttural low-frequency resonance is canine growl
      inferredSpecies = 'dog';
    } else if (
      // Miniature dog whining / toy breed separation whine:
      // High pitch (650 - 1500 Hz) with flat or atonal intonation contour (lacking feline glissando) and duration >= 300ms
      (f0 >= 650 && (intonationContour === 'flat' || intonationContour === 'atonal') && durationMs >= 300) ||
      (f0 > 1100 && durationMs > 350)
    ) {
      inferredSpecies = 'dog';
    } else if (
      // Canine short staccato bark (< 250ms) in 200-950 Hz range
      durationMs < 250 && f0 >= 200 && f0 <= 950 && intonationContour !== 'fluctuating'
    ) {
      inferredSpecies = 'dog';
    } else if (f0 > 450 && durationMs >= 300 && (vtl === 0 || vtl <= 7.0)) {
      // Continuous harmonic glissando vowel without staccato bursts is typical feline meow
      inferredSpecies = 'cat';
    }

    // 3. Species-Specific Vocalization & Intent Interpretation
    if (inferredSpecies === 'cat') {
      return this.interpretCat(features, speciesConfidence);
    } else {
      return this.interpretDog(features, speciesConfidence);
    }
  }

  private interpretCat(
    features: PetAcousticFeatures,
    speciesConfidence: number
  ): PetAnalysisResult<string, string> {
    const {
      fundamentalFrequencyHz: f0,
      intonationContour,
      durationMs,
      spectralCentroidHz,
      zeroCrossingRate: zcr,
    } = features;

    // Low Purr (20 - 70 Hz)
    if ((f0 >= 20 && f0 <= 70 && spectralCentroidHz < 650) || (spectralCentroidHz < 120 && zcr < 0.15)) {
      return {
        species: 'cat',
        vocalization: 'purr',
        intent: 'comfort_purring',
        confidence: Math.min(0.95, speciesConfidence * 1.05),
        isAnimalVocalization: true,
        affectiveDimensions: { valence: 0.85, arousal: 0.15, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation: 'Rhythmic low-frequency purr indicating contentment, deep relaxation, or self-soothing.',
        actionRecommendation: 'Maintain a peaceful environment; offer gentle petting if desired.',
      };
    }

    // Defensive Hiss (turbulent friction)
    if (zcr > 0.22 && durationMs >= 150) {
      return {
        species: 'cat',
        vocalization: 'hiss',
        intent: 'defense_warning',
        confidence: 0.90,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: -0.80, arousal: 0.85, urgency: 'high' },
        acousticMetrics: features,
        humanExplanation: 'Defensive agonistic hiss signaling acute threat, fear, or territorial defense.',
        actionRecommendation: 'Give the cat immediate space. Do not attempt to touch or corner.',
      };
    }

    // Predatory Chatter
    if (features.burstCount >= 3 && durationMs < 500 && zcr > 0.15) {
      return {
        species: 'cat',
        vocalization: 'chatter',
        intent: 'hunting_frustration',
        confidence: 0.85,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: 0.20, arousal: 0.70, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation: 'Rapid teeth chattering observed when stalking unreachable prey.',
        actionRecommendation: 'Redirect predatory energy with an interactive feather wand or laser toy.',
      };
    }

    // Guard against miniature dog whines with flat intonation:
    if (f0 >= 700 && (intonationContour === 'flat' || intonationContour === 'atonal')) {
      return this.interpretDog(features, speciesConfidence);
    }

    // Feline Meow (Schötz 2023 intonation model)
    if (intonationContour === 'rising') {
      return {
        species: 'cat',
        vocalization: 'meow',
        intent: 'hunger_solicitation',
        confidence: 0.92,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: 0.30, arousal: 0.60, urgency: 'moderate' },
        acousticMetrics: features,
        humanExplanation: 'Solicitation meow with rising intonation, asking for food, treats, or attention.',
        actionRecommendation: 'Check food bowl, water supply, or meal schedule.',
      };
    }

    if (intonationContour === 'falling' || durationMs > 1200) {
      return {
        species: 'cat',
        vocalization: 'meow',
        intent: 'distress_isolation',
        confidence: 0.88,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: -0.65, arousal: 0.65, urgency: 'moderate' },
        acousticMetrics: features,
        humanExplanation: 'Distress or isolation meow with falling intonation, expressing anxiety or loneliness.',
        actionRecommendation: 'Locate the cat; confirm it is not trapped in a room or in physical distress.',
      };
    }

    // Short social greeting
    return {
      species: 'cat',
      vocalization: 'meow',
      intent: 'greeting_social',
      confidence: 0.85,
      isAnimalVocalization: true,
      affectiveDimensions: { valence: 0.70, arousal: 0.40, urgency: 'low' },
      acousticMetrics: features,
      humanExplanation: 'Friendly social greeting vocalization acknowledging human presence.',
      actionRecommendation: 'Respond warmly with verbal acknowledgment or gentle interaction.',
    };
  }

  private interpretDog(
    features: PetAcousticFeatures,
    speciesConfidence: number
  ): PetAnalysisResult<string, string> {
    const {
      fundamentalFrequencyHz: f0,
      durationMs,
      burstCount,
      burstIntervalMs,
    } = features;

    // Growl (70 - 250 Hz)
    if (f0 >= 70 && f0 <= 260) {
      return {
        species: 'dog',
        vocalization: 'growl',
        intent: 'warning_aggression',
        confidence: 0.90,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: -0.85, arousal: 0.80, urgency: 'high' },
        acousticMetrics: features,
        humanExplanation: 'Low guttural growl signaling territorial warning, guarded possessiveness, or discomfort.',
        actionRecommendation: 'Do not confront or punish. Give physical space and remove provocative stimuli.',
      };
    }

    // High Whine (whimpering / isolation)
    if (f0 > 1100 || (f0 > 650 && durationMs >= 350 && burstCount <= 1)) {
      return {
        species: 'dog',
        vocalization: 'whine',
        intent: 'anxiety_separation',
        confidence: 0.88,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: -0.70, arousal: 0.75, urgency: 'high' },
        acousticMetrics: features,
        humanExplanation: 'High-frequency tonal whine reflecting separation anxiety, frustration, or begging.',
        actionRecommendation: 'Provide calm reassurance and check for underlying physical or emotional stressors.',
      };
    }

    // Barking (Pongrácz 2005 canine acoustic model)
    if (f0 < 450 || (burstIntervalMs > 0 && burstIntervalMs < 180)) {
      return {
        species: 'dog',
        vocalization: 'bark',
        intent: 'alarm_threat',
        confidence: 0.90,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: -0.40, arousal: 0.90, urgency: 'high' },
        acousticMetrics: features,
        humanExplanation: 'Fast-tempo, low-pitch alarm bark indicating perceived intruder or environmental threat.',
        actionRecommendation: 'Inspect doors, yard, or surrounding area to identify the alert trigger.',
      };
    }

    if (f0 > 750) {
      return {
        species: 'dog',
        vocalization: 'bark',
        intent: 'playful_excitement',
        confidence: 0.88,
        isAnimalVocalization: true,
        affectiveDimensions: { valence: 0.80, arousal: 0.75, urgency: 'low' },
        acousticMetrics: features,
        humanExplanation: 'High-pitch modulated bark signaling play invitation, enthusiasm, and positive excitement.',
        actionRecommendation: 'Engage in active play with a toy, ball, or outdoor exercise.',
      };
    }

    // Attention seeking bark
    return {
      species: 'dog',
      vocalization: 'bark',
      intent: 'attention_seeking',
      confidence: 0.82,
      isAnimalVocalization: true,
      affectiveDimensions: { valence: 0.10, arousal: 0.50, urgency: 'moderate' },
      acousticMetrics: features,
      humanExplanation: 'Moderately-spaced barking requesting attention, a walk, or bathroom break.',
      actionRecommendation: 'Check essential routines: bathroom needs, fresh water, or mealtime.',
    };
  }
}

