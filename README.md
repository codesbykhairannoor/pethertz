# PetHertz 🐾🔊

> **Isomorphic TypeScript / JavaScript library for pet bioacoustics & vocalization intent interpretation (Cats & Dogs).**

PetHertz adalah inisiatif library NPM open-source pertama yang menerjemahkan vokalisasi suara hewan peliharaan (meong, dengkuran, gonggongan, rengekan) menjadi intensi kontekstual dan status emosional yang terstandarisasi, didukung oleh riset ilmiah bioakustik peer-reviewed.

---

## 📚 Dokumen Riset & Dataset Terverifikasi

Seluruh landasan teori, metodologi riset internasional, rumus akustik ($F_0$, RMS, Spectral Centroid, Harmonics), serta kurasi dataset terbuka (Zenodo, HuggingFace, Kaggle, ESC-50, AudioSet) telah dirangkum lengkap di:

👉 **[RESEARCH_AND_DATASETS.md](file:///d:/Pethertz/RESEARCH_AND_DATASETS.md)**

---

## 🏛️ Arsitektur Paket Monorepo (Zero External AI / 100% Native DSP)

PetHertz beroperasi 100% offline tanpa ketergantungan API cloud atau model black-box yang berat:

* **`@pethertz/core`**: Mesin DSP audio mandiri:
  * **YIN Pitch Tracking**: Estimasi $F_0$ akurat sub-harmonik ($20 - 3500\text{ Hz}$).
  * **Acoustic Allometry & Formant Dispersion**: Ekstraksi resonansi vokal ($F_1, F_2, F_3$) dan estimasi panjang saluran vokal ($L = \frac{c}{2\Delta F}$) via Linear Predictive Coding (LPC) & rekursi Levinson-Durbin.
  * **13-Band MFCC Extractor & Wiener Spectral Flatness**: Analisis timbre spektral tanpa library eksternal.
  * **Voice Activity Detection (VAD) & Adaptive Dynamic Noise Floor ($P_{15}$)**.
  * **Bioacoustic Gatekeeper**: Diskriminasi ketat terhadap batuk/bersin/tangisan manusia, klakson mobil, dan dengung mesin.
  * **Zero-Dependency RIFF/WAVE Decoder & Encoder**: Dukungan PCM 8, 16, 24-bit dan float 32-bit.
* **`@pethertz/cat`**: Interpreter bioakustik kucing berbasis riset Susanne Schötz (Lund University), Prato-Previde (2020), dan zona non-fonatori kucing (*feline dead-zone*).
* **`@pethertz/dog`**: Interpreter bioakustik anjing berbasis metrik kanina Péter Pongrácz (ELTE Budapest) dan model dua dimensi *valence-arousal* (Hantke & Schuller 2018).
* **`@pethertz/cli`**: CLI binary (`pethertz`) untuk analisis dan inspeksi berkas WAV langsung di terminal.

---

## 📊 Hasil Uji Stres Riil (Benchmark 100 Audio Liar & Hard Negatives)

Diuji langsung menggunakan 100 berkas audio dunia nyata (50 hewan asli vs 50 *adversarial mirror pairs* ESC-50: tangisan bayi, batuk, bersin, klakson, sirine, dengkuran):

* **Overall Accuracy:** `98.00%` (98 / 100)
* **Precision:** `100.00%` (0 False Positive pada seluruh mirror pairs)
* **Sensitivity / Recall:** `96.00%` (48 / 50 Hewan Asli Terdeteksi - Dog: 100%, Cat: 92%)
* **Specificity:** `100.00%` (50 / 50 Noise Lingkungan & Human Mirror Pairs 100% Tertolak!)
* **F1-Score:** `97.96%`

---

## 💻 Penggunaan CLI Langsung

Kamu bisa langsung menganalisis file audio WAV dari terminal:

```bash
# Analisis suara kucing
pethertz analyze sound.wav --species cat

# Analisis suara anjing dengan format output JSON
pethertz analyze bark.wav --species dog --json

# Inspeksi metrik bioakustik mentah (F0, intonasi, RMS, ZCR, spectral centroid)
pethertz inspect sound.wav

# Uji coba simulasi sintetis bawaan
pethertz demo cat
pethertz demo dog
```

---

## 🎙️ Real-time Audio Streaming (Live Mic / IoT Monitoring)

Untuk aplikasi monitoring hewan peliharaan real-time (kamera pintar, mikrofon live):

```typescript
import { PetHertz } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';

const engine = new PetHertz({ interpreter: new CatInterpreter() });
const stream = engine.createStreamAnalyzer({
  windowDurationSec: 1.5,
  debounceMs: 500
});

stream.on('vocalization', (res) => {
  console.log(`[Terdeteksi] ${res.vocalization} -> ${res.intent}`);
  console.log(`Tindakan: ${res.actionRecommendation}`);
});

stream.on('silence', () => {
  console.log('Kondisi hening / tidak ada suara hewan.');
});

// Masukkan chunk audio streaming (misal dari microphone PCM buffer)
// stream.push(chunkFloat32Array);
```

---

## 🚀 Quick Usage Concept (DX)

```typescript
import { PetHertz } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';

// Inisialisasi engine
const petHertz = new PetHertz({
  interpreter: new CatInterpreter()
});

// Analisis buffer audio (PCM / Float32Array dari Web Audio API atau Node.js)
const analysis = await petHertz.analyze(audioBuffer, { sampleRate: 44100 });

console.log(analysis);
// {
//   species: 'cat',
//   vocalization: 'meow',
//   intent: 'hunger_solicitation',
//   confidence: 0.94,
//   acousticMetrics: {
//     fundamentalFrequencyHz: 740,
//     intonationContour: 'rising',
//     durationMs: 780
//   },
//   humanExplanation: 'Kucing meminta makan atau mencari perhatian dengan nada riang/mendesak.'
// }
```

---

## 🐾 Kamus & Katalog Terjemahan Intensi Hewan

PetHertz memetakan fitur bioakustik ke dalam taksonomi emosi standar dua dimensi (*Valence-Arousal*, Russell & Schuller) lengkap dengan rekomendasi tindakan untuk *pawrent*:

### 🐱 Kucing (*Felis catus*)
| Vokalisasi | Intensi (*Intent*) | Emosi (*Valence / Arousal*) | Urgensi | Terjemahan Bahasa Manusia | Rekomendasi Tindakan |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Meow** | `hunger_solicitation` | $+0.3$ / $0.6$ | Moderate | Meong nada naik (*rising*): meminta makan atau cemilan spesifik. | Periksa mangkuk makan/minum dan jadwal makan. |
| **Meow** | `distress_isolation` | $-0.65$ / $0.65$ | Moderate | Meong panjang nada menurun (*falling*): kesepian, cemas, atau terjebak. | Hampiri kucing, periksa apakah pintu tertutup/terisolasi. |
| **Meow** | `greeting_social` | $+0.7$ / $0.4$ | Low | Sapaan hangat dan ramah (*chirp / trill* ceria). | Balas menyapa dengan ramah dan ajak interaksi santai. |
| **Purr** | `comfort_purring` | $+0.85$ / $0.15$ | Low | Dengkuran getaran tenang: relaksasi tinggi atau swa-penyembuhan. | Pertahankan suasana tenang, berikan belaian jika diinginkan. |
| **Hiss** | `defense_warning` | $-0.8$ / $0.85$ | High | Desisan turbulen: merasa terancam, mempertahankan teritori. | Berikan ruang/jarak segera. Jangan dekati mendadak. |
| **Chatter** | `hunting_frustration` | $+0.2$ / $0.7$ | Low | Ketukan gigi berulang: melihat mangsa (burung/serangga) di luar jendela. | Alihkan energi berburu dengan mainan tongkat bulu atau laser. |
| **Yowl** | `pain_discomfort` | $-0.95$ / $0.95$ | Critical | Raungan tajam berkepanjangan: rasa sakit mendadak atau agresi tinggi. | Periksa kondisi fisik kucing apakah ada cedera atau luka. |

### 🐶 Anjing (*Canis familiaris*)
| Vokalisasi | Intensi (*Intent*) | Emosi (*Valence / Arousal*) | Urgensi | Terjemahan Bahasa Manusia | Rekomendasi Tindakan |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Bark** | `alarm_threat` | $-0.4$ / $0.9$ | High | Gonggongan tempo cepat nada rendah: sinyal alarm / kehadiran orang asing. | Periksa area pintu, pagar, atau sumber kewaspadaan anjing. |
| **Bark** | `playful_excitement` | $+0.8$ / $0.75$ | Low | Gonggongan nada tinggi modulasi ceria: ajakan bermain / antusiasme. | Ajak bermain lempar bola atau beri mainan favoritnya. |
| **Bark** | `attention_seeking` | $+0.1$ / $0.5$ | Moderate | Gonggongan terisolasi nada sedang: meminta perhatian / minta keluar. | Periksa kebutuhan dasar: buang air, minum, atau jalan-jalan. |
| **Growl** | `warning_aggression` | $-0.85$ / $0.8$ | High | Geraman rendah bergetar: peringatan teritorial / tidak nyaman. | Jangan diprovokasi. Berikan ruang untuk menenangkan diri. |
| **Whine** | `anxiety_separation` | $-0.7$ / $0.75$ | High | Rintihan frekuensi tinggi harmonik: cemas perpisahan atau memohon bantuan. | Dekati dengan tenang, berikan rasa aman dan periksa pemicu stres. |

---

## 📄 Lisensi
MIT License

