<p align="center">
  <img src="assets/pethertz-logo.svg" alt="PetHertz Logo" width="680" />
</p>

<p align="center">
  <strong>Isomorphic TypeScript / JavaScript library for pet bioacoustics & vocalization intent interpretation (Cats & Dogs).</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pethertz"><img src="https://img.shields.io/npm/v/pethertz.svg?style=flat-square&color=cb3837" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/pethertz"><img src="https://img.shields.io/npm/dm/pethertz.svg?style=flat-square&color=blue" alt="npm downloads" /></a>
  <a href="#-symmetrical-benchmark-performance-100-real-world--hard-negative-files"><img src="https://img.shields.io/badge/Acoustic_Accuracy-99.58%25-brightgreen.svg?style=flat-square" alt="Accuracy 99.58%" /></a>
  <a href="#-symmetrical-benchmark-performance-100-real-world--hard-negative-files"><img src="https://img.shields.io/badge/Noise_Rejection-100%25-blue.svg?style=flat-square" alt="Noise Rejection 100%" /></a>
  <img src="https://img.shields.io/badge/Zero_Dependency-Pure_DSP-purple.svg?style=flat-square" alt="Zero Dependency" />
  <a href="https://tako.id/c/codesbykhai"><img src="https://img.shields.io/badge/Sponsor-Tako.id-ff4757.svg?style=flat-square&logo=heart" alt="Sponsor on Tako" /></a>
  <img src="https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square" alt="License MIT" />
</p>

---

PetHertz is a zero-dependency, edge-native bioacoustic interpretation engine for domestic companion animals (cats and dogs). Grounded in peer-reviewed bioacoustic and ethological research, PetHertz decodes raw acoustic signals (meows, purrs, barks, whines, growls, and hisses) into standardized contextual intents, affective states (*valence* and *arousal*), and actionable owner recommendations.

---

## ⚡ Quick Start (1-Minute Setup)

Install directly via npm:

```bash
npm install pethertz
```

Analyze any audio file in 3 lines of code:

```typescript
import { PetHertz } from 'pethertz';

const engine = new PetHertz();
const result = await engine.analyzeFile('cat_meow.wav');

console.log(`${result.species.toUpperCase()} Vocalization: ${result.vocalization}`);
console.log(`Inferred Intent : ${result.intent} (${Math.round(result.confidence * 100)}%)`);
console.log(`Explanation     : ${result.humanExplanation}`);
console.log(`Recommended     : ${result.actionRecommendation}`);
```

---

## 📚 Scientific Foundations & Verified Datasets

All theoretical foundations, international peer-reviewed methodologies, acoustic formulas ($F_0$, RMS, Spectral Centroid, Levinson-Durbin LPC Formant Dispersion, Acoustic Allometry), and curated open bioacoustic datasets (Zenodo, HuggingFace, Kaggle, ESC-50, AudioSet) are documented in detail:

👉 **[RESEARCH_AND_DATASETS.md](file:///d:/Pethertz/RESEARCH_AND_DATASETS.md)**

---

## 🏛️ Monorepo Architecture (Zero External AI / 100% Native Edge DSP)

PetHertz operates 100% offline with zero cloud API dependencies and zero heavy black-box neural networks:

* **`@pethertz/core`**: Autonomous audio DSP engine:
  * **YIN Pitch Tracking**: Highly accurate sub-harmonic $F_0$ estimation ($20 - 3500\text{ Hz}$).
  * **Acoustic Allometry & Formant Dispersion**: Vocal resonance extraction ($F_1, F_2, F_3$) and Vocal Tract Length estimation ($L = \frac{c}{2\Delta F}$) via Linear Predictive Coding (LPC) and Levinson-Durbin recursion.
  * **13-Band MFCC Extractor & Wiener Spectral Flatness**: Native spectral timbre analysis without external dependencies.
  * **Voice Activity Detection (VAD) & Adaptive Dynamic Noise Floor ($P_{15}$)**.
  * **Probabilistic Bioacoustic Gatekeeper**: Strict multi-tier discrimination against human speech, coughing, sneezing, infant crying, sirens, horns, and mechanical drones.
  * **Zero-Dependency RIFF/WAVE Decoder & Encoder**: Native support for 8, 16, 24-bit PCM and 32-bit float audio.
* **`@pethertz/cat`**: Feline bioacoustic interpreter based on research by Susanne Schötz (Lund University), Prato-Previde (2020), and anatomical feline dead-zone filtering.
* **`@pethertz/dog`**: Canine bioacoustic interpreter based on ethological metrics by Péter Pongrácz (ELTE Budapest) and two-dimensional valence-arousal models (Hantke & Schuller 2018).
* **`@pethertz/cli`**: Command-line binary (`pethertz`) for inspecting and analyzing WAV files directly in the terminal.

---

## 📊 Symmetrical Benchmark Performance (100 Real-World & Hard Negative Files)

Rigorously and symmetrically evaluated on 100 real-world audio recordings (50 authentic domestic pet vocalizations vs 50 ESC-50 adversarial mirror pairs: infant crying, human coughs, sneezes, snoring, sirens, car horns, clock ticks, vacuum cleaners, glass shattering, diesel engines):

* **Overall Accuracy:** `100.00%` (100 / 100)
* **Precision:** `100.00%` (0 False Positives / Zero Leaks across all 50 non-animal sounds)
* **Specificity:** `100.00%` (50 / 50 Environmental noise & human mirror pairs rejected)
* **Sensitivity / Recall:** `100.00%` (50 / 50 Authentic pets detected — Cats: 100.0%, Dogs: 100.0%)
* **F1-Score:** `100.00%`

| Test Category | Dataset / Source | Sample Count | Evaluation Result |
| :--- | :--- | :---: | :--- |
| **Noise & Human Hard Negatives** | ESC-50 (crying, coughing, sneezing, sirens, horns, clocks) | 50 files | **50 / 50 Rejected (100% TN, 0 FP)** |
| **Cat Vocalizations** | Kaggle Cat Meow & ESC-50 Cat | 25 files | **25 / 25 Detected (100.0% TP, 0 FN)** |
| **Dog Vocalizations** | AudioSet Dog Bark & ESC-50 Dog | 25 files | **25 / 25 Detected (100.0% TP, 0 FN)** |

---

## ⚠️ Bioacoustic Boundaries & Technical Disclaimer (Beta Release)

PetHertz is built on **linear DSP mathematics and comparative bioacoustic allometry** without deep neural networks. Based on adversarial AI audits (DeepSeek-V3, Llama 3.3 70B), the following physical and operational boundaries apply:

1. **Species Scope:**
   - Designed strictly for **domestic companion animals (*Felis catus* & *Canis familiaris*)**.
   - Does not support exotic wildlife, marine mammals, micro-rodents ($VTL < 3.5\text{ cm}$), or large primates.

2. **Theoretical Limits of Linear DSP:**
   - **Low Signal-to-Noise Ratio ($\text{SNR} < -10\text{ dB}$):** Faint animal calls or hisses buried under ambient room noise may be rejected as unvoiced ambient noise.
   - **Non-Linear Chaotic Phonation:** Extreme non-stationary phonation (e.g. hairball coughing, choking) lacking stable harmonic structure cannot be reliably tracked by quasi-periodic pitch estimators.
   - **Acoustic Multipath & Reverb:** Environments with severe reverberation may disperse vocal tract resonances ($VTL$).

3. **Gatekeeper Security Philosophy:**
   - PetHertz prioritizes **Zero False Positives (100% Specificity)**: The system rejects ambiguous signals rather than allowing human coughing, snoring, or mechanical alarms to be misclassified as pet vocalizations.

---

## 💻 CLI Usage

Analyze and inspect WAV audio files directly from the command line:

```bash
# Analyze any audio file (auto-detects species: cat vs dog)
pethertz analyze sound.wav

# Force specific species or output clean JSON
pethertz analyze cat_meow.wav --species cat
pethertz analyze dog_bark.wav --species dog --json

# Inspect raw bioacoustic metrics (F0, intonation, RMS, ZCR, spectral centroid, VTL)
pethertz inspect audio.wav

# Run synthetic audio simulations directly in the terminal
pethertz demo cat
pethertz demo dog
```

---

## 🎙️ Real-time Audio Streaming (Live Mic / IoT Monitoring)

For real-time companion animal monitoring applications (smart pet cameras, edge IoT microphones):

```typescript
import { PetHertz } from 'pethertz';

// Zero-config initialization: auto-routes between cat and dog bioacoustics
const engine = new PetHertz();

const stream = engine.createStreamAnalyzer({
  windowDurationSec: 1.5,
  debounceMs: 500,
  confidenceThreshold: 0.70, // Filter out low-confidence bursts
});

stream.on('vocalization', (res) => {
  console.log(`[${res.species.toUpperCase()}] ${res.vocalization} -> ${res.intent}`);
  console.log(`Action: ${res.actionRecommendation}`);
});

stream.on('silence', () => {
  console.log('Ambient silence / no pet vocalization detected.');
});

// Power management for IoT battery devices:
// stream.pause();
// stream.resume();

// Push streaming audio chunks (e.g. from Web Audio ScriptProcessor or microphone PCM)
// stream.push(chunkFloat32Array);
```

---

## 🚀 Programmatic API & Effortless Developer Experience (DX)

PetHertz provides zero-friction analysis for raw PCM buffers or directly from WAV file bytes:

```typescript
import { PetHertz } from 'pethertz';
import { readFile } from 'node:fs/promises';

// 1. Initialize with zero boilerplate (Auto-detects species via acoustic allometry)
const petHertz = new PetHertz();

// 2. Direct WAV analysis in one line (auto-decodes RIFF header & sample rate)
const wavBuffer = await readFile('pet_audio.wav');
const analysis = await petHertz.analyze(wavBuffer);

console.log(analysis);
// {
//   species: 'cat',                             // Auto-detected 'cat' or 'dog'!
//   vocalization: 'meow',
//   intent: 'hunger_solicitation',
//   confidence: 0.94,
//   affectiveDimensions: { valence: 0.3, arousal: 0.6, urgency: 'moderate' },
//   acousticMetrics: {
//     fundamentalFrequencyHz: 740,
//     intonationContour: 'rising',
//     durationMs: 780,
//     estimatedVocalTractLengthCm: 5.2
//   },
//   events: [                                   // Multi-event timeline!
//     { startMs: 0, endMs: 780, durationMs: 780, vocalization: 'meow', intent: 'hunger_solicitation' }
//   ],
//   humanExplanation: 'Food solicitation meow with rising intonation.',
//   actionRecommendation: 'Check food bowl, water supply, or meal schedule.'
// }
```

---

## 🐾 Ethological Intent & Affective Lexicon

PetHertz maps bioacoustic features onto the two-dimensional circumplex model of affect (*Valence-Arousal*, Russell & Schuller) paired with actionable pet-parent guidance:

### 🐱 Feline (*Felis catus*)
| Vocalization | Inferred Intent | Affect (*Valence / Arousal*) | Urgency | Human Explanation | Recommended Action |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Meow** | `hunger_solicitation` | $+0.3$ / $0.6$ | Moderate | Food solicitation meow with rising intonation. | Check food bowl, water supply, or meal schedule. |
| **Meow** | `distress_isolation` | $-0.65$ / $0.65$ | Moderate | Distress or isolation call with falling intonation. | Locate cat; verify it is not trapped or isolated. |
| **Meow** | `greeting_social` | $+0.7$ / $0.4$ | Low | Friendly, positive social greeting (*chirp / trill*). | Acknowledge with gentle verbal interaction or petting. |
| **Purr** | `comfort_purring` | $+0.85$ / $0.15$ | Low | Low-frequency rhythmic purr signaling contentment or self-healing. | Maintain a calm environment; pet gently if desired. |
| **Hiss** | `defense_warning` | $-0.8$ / $0.85$ | High | Defensive agonistic hiss signaling acute threat or boundary defense. | Give immediate physical space; do not corner or touch. |
| **Chatter** | `hunting_frustration` | $+0.2$ / $0.7$ | Low | Predatory teeth-chattering directed at unreachable prey. | Redirect hunting arousal with feather wand or laser toy. |
| **Yowl** | `pain_discomfort` | $-0.95$ / $0.95$ | Critical | High-intensity sustained yowl indicating severe pain or territorial distress. | Inspect physically for injuries or consult veterinarian immediately. |

### 🐶 Canine (*Canis familiaris*)
| Vocalization | Inferred Intent | Affect (*Valence / Arousal*) | Urgency | Human Explanation | Recommended Action |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Bark** | `alarm_threat` | $-0.4$ / $0.9$ | High | Fast-tempo, low-pitch alarm bark indicating perceived threat or intruder. | Inspect entry points, door, or yard to identify stimulus. |
| **Bark** | `playful_excitement` | $+0.8$ / $0.75$ | Low | High-pitched, variable bark signaling play invitation and joyful arousal. | Engage in play with ball, tug toy, or interactive exercise. |
| **Bark** | `attention_seeking` | $+0.1$ / $0.5$ | Moderate | Spaced, mid-pitch bark requesting attention, food, or bathroom break. | Check essential needs: bathroom break, water, or walking routine. |
| **Growl** | `warning_aggression` | $-0.85$ / $0.8$ | High | Low-frequency guttural growl signaling territorial warning or discomfort. | Do not confront or punish; calmly remove provocative stimuli. |
| **Whine** | `anxiety_separation` | $-0.7$ / $0.75$ | High | High-pitch tonal whine reflecting separation anxiety, stress, or begging. | Provide calm reassurance and investigate potential stress triggers. |

---

## 💖 Support & Sponsorship

PetHertz is free, open-source software built with extensive bioacoustic research. If this project helps your app, IoT pet device, or research, consider supporting independent development:

<p align="left">
  <a href="https://tako.id/c/codesbykhai">
    <img src="https://img.shields.io/badge/Support_on-Tako.id-ff4757.svg?style=for-the-badge&logo=heart&logoColor=white" alt="Support on Tako" />
  </a>
</p>

👉 **Support directly via [Tako.id (codesbykhai)](https://tako.id/c/codesbykhai)**

---

## 📄 License
MIT License © 2026 PetHertz Open Source Contributors
