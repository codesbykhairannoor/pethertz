export type CatVocalization =
  | 'purr'
  | 'meow'
  | 'chirp_trill'
  | 'yowl'
  | 'hiss'
  | 'chatter'
  | 'unknown';

export type CatIntent =
  | 'hunger_solicitation'   // Meminta makan, nada naik (Schötz 2023)
  | 'greeting_social'       // Sapaan ramah, durasi pendek
  | 'distress_isolation'    // Cemas / kesepian, nada turun
  | 'comfort_purring'       // Nyaman, tenang, getaran 20-40 Hz
  | 'defense_warning'       // Mengancam / hissing
  | 'pain_discomfort'       // Sakit / terluka
  | 'hunting_frustration';  // Mengintai mangsa tapi tidak tergapai

