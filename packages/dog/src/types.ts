export type DogVocalization =
  | 'bark'
  | 'whine'
  | 'growl'
  | 'howl'
  | 'pant'
  | 'unknown';

export type DogIntent =
  | 'alarm_threat'         // Territorial alarm / stranger warning (Pongrácz)
  | 'playful_excitement'   // High-pitched playful invitation or enthusiasm
  | 'attention_seeking'    // Demanding attention, bathroom break, or food
  | 'anxiety_separation'   // Separation distress / high-frequency whining
  | 'warning_aggression'   // Agonistic territorial growl
  | 'greeting_submissive'; // Submissive greeting or affiliative response
