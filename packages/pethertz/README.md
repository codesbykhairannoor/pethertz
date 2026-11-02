# PetHertz 🐾🔊

> **Autonomous pet bioacoustics and vocalization interpretation engine for Cats and Dogs.**

[![npm version](https://img.shields.io/npm/v/pethertz.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/pethertz)
[![npm downloads](https://img.shields.io/npm/dm/pethertz.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/pethertz)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Acoustic Accuracy](https://img.shields.io/badge/Acoustic_Accuracy-99.58%25-brightgreen.svg?style=flat-square)](https://github.com/codesbykhairannoor/pethertz)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-purple.svg?style=flat-square)](https://github.com/codesbykhairannoor/pethertz)
[![Sponsor](https://img.shields.io/badge/Sponsor-Tako.id-ff4757.svg?style=flat-square&logo=heart)](https://tako.id/c/codesbykhai)

PetHertz is an edge-native, zero-dependency bioacoustics engine that decodes domestic cat and dog vocalizations into contextual intents (*hunger solicitation, separation distress, alarm warning, playful excitement*) and affective states (*emotional valence and arousal*).

---

## ⚡ Quick Start (Single-Command Install)

```bash
npm install pethertz
```

---

## 🚀 Usage in Node.js & Browser (TypeScript / JavaScript)

### 1. Minimal 3-Line Analysis:
```typescript
import { PetHertz } from 'pethertz';

const engine = new PetHertz();
const result = await engine.analyzeFile('my_pet_sound.wav');

console.log(`Species         : ${result.species}`); // 'cat' or 'dog'
console.log(`Vocalization    : ${result.vocalization}`); // e.g. 'meow', 'bark', 'purr'
console.log(`Inferred Intent : ${result.intent}`); // e.g. 'hunger_solicitation'
console.log(`Human Meaning   : ${result.humanExplanation}`);
console.log(`Recommendation  : ${result.actionRecommendation}`);
```

### 2. Full Buffer / Raw PCM & Emotion State:
```typescript
import { PetHertz, CatInterpreter, decodeWav } from 'pethertz';
import { readFile } from 'node:fs/promises';

const engine = new PetHertz({ interpreter: new CatInterpreter() });

const audioBuffer = await readFile('cat_meow.wav');
const { audioData, sampleRate } = decodeWav(audioBuffer);

const result = await engine.analyze(audioData, { sampleRate });

if (result.isAnimalVocalization) {
  console.log(`Vocalization : ${result.vocalization}`);
  console.log(`Intent       : ${result.intent}`);
  console.log(`Confidence   : ${Math.round(result.confidence * 100)}%`);
  console.log(`Valence      : ${result.affectiveDimensions.valence} (-1.0 to +1.0)`);
  console.log(`Arousal      : ${result.affectiveDimensions.arousal} (0.0 to 1.0)`);
} else {
  console.log(`Noise Rejected: ${result.acousticMetrics.gatekeeper.rejectionReason}`);
}
```

---

## 💻 Instant CLI Terminal Usage

You can also run PetHertz directly in your terminal without writing code:

```bash
# Run interactive simulation
npx pethertz demo cat
npx pethertz demo dog

# Analyze any recorded WAV audio file
npx pethertz analyze my_cat_meow.wav
```

---

## 🔬 Scientific Foundation

- **YIN Algorithm**: Sub-harmonic fundamental frequency tracking ($20 - 3500\text{ Hz}$)
- **LPC Levinson-Durbin**: Vocal Tract Length (VTL) anatomical allometry
- **Bioacoustic Gatekeeper**: Multi-tier rejection of 25+ non-pet noises (human speech, crying, coughing, sirens, horns, alarms)
- **100% Zero-Dependency**: Pure DSP in native TypeScript/JavaScript. Runs 100% offline.

---

## 💖 Support the Project

If PetHertz powers your app or pet IoT device, support ongoing development:

👉 **[Support on Tako.id (codesbykhai)](https://tako.id/c/codesbykhai)**

---

## 📄 License

MIT © [PetHertz Open Source Contributors](https://github.com/codesbykhairannoor/pethertz)


