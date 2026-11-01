export type DogVocalization =
  | 'bark'
  | 'whine'
  | 'growl'
  | 'howl'
  | 'pant'
  | 'unknown';

export type DogIntent =
  | 'alarm_threat'         // Gonggongan waspada / orang asing (Pongrácz)
  | 'playful_excitement'   // Mengajak bermain / gembira
  | 'attention_seeking'    // Mencari perhatian / minta keluar/makan
  | 'anxiety_separation'   // Cemas berpisah / merengek (whining)
  | 'warning_aggression'   // Geraman peringatan teritorial
  | 'greeting_submissive'; // Menyapa ramah / tunduk

