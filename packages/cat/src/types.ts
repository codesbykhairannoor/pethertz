export type CatVocalization =
  | 'purr'
  | 'meow'
  | 'chirp_trill'
  | 'yowl'
  | 'hiss'
  | 'chatter'
  | 'unknown';

export type CatIntent =
  | 'hunger_solicitation'   // Soliciting food, rising intonation (Schötz 2023)
  | 'greeting_social'       // Warm social greeting, short chirp/trill
  | 'distress_isolation'    // Distress or loneliness, falling intonation
  | 'comfort_purring'       // Contentment, low vibrational hum (20-40 Hz)
  | 'defense_warning'       // Defensive threat or turbulent hiss
  | 'pain_discomfort'       // Acute pain or distress yowl
  | 'hunting_frustration';  // Stalking unreachable prey (chatter)
