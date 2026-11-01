# Laporan Audit Kritis: PetHertz

**Panel:** Bioakustik & Audio DSP
**Status Akhir: 🔴 TIDAK LAYAK PRODUKSI (Red Flag)**

Arsitektur Anda saat ini adalah prototipe riset berbasis aturan (*rule-based heuristic*) yang menarik secara akademis, tetapi secara fundamental rapuh (*brittle*) untuk dunia nyata. Sistem ini akan bekerja mengesankan pada rekaman laboratorium yang bersih (kucing mengeong dekat mikrofon di ruangan sunyi), namun akan runtuh total saat menghadapi variabilitas akustik, perangkat keras konsumen, dan keragaman repertoar vokal hewan yang sebenarnya.

Berikut adalah bedah forensiknya.

---

## 1. Cacat Logika & Asumsi Kaku (Brittle Heuristics)

### 1.1. Dosa Arsitektural: Kaskade Veto Serial (The Serial Veto Fallacy)
Sistem Anda adalah rantai serial: `YIN -> LPC/Formant -> MFCC -> Gatekeeper -> Schötz/Pongrácz`.
Jika satu tahap gagal, seluruh sistem gagal. Tidak ada pemulihan.

Secara matematis, jika setiap modul Anda memiliki *recall* 90% (angka yang sangat optimis di dunia nyata), probabilitas suara hewan asli lolos dari 5 tahap adalah:
`0.90^5 = 59%`
Jika per modul 85%, anjlok menjadi `44%`. Anda mendesain sistem yang secara inheren membuang separuh suara hewan asli.

### 1.2. YIN Pitch Tracking (20–3500 Hz) + RMS
*   **[KRITIS] Bias Periodisitas Fatal:** YIN dirancang untuk sinyal *quasi-periodic monophonic* (seperti alat musik atau vokal manusia yang diucapkan). Repertoar anjing dan kucing didominasi sinyal **non-periodik, kaotik, dan bising**:
    *   Gonggongan (*bark*): Ledakan bising 50–150 ms, hampir tidak ada F0 stabil.
    *   Desisan (*hiss*), geraman (*growl*), dengkur (*purr*): Tidak memiliki pitch periodik yang dapat dilacak YIN. Sistem Anda buta terhadap 50% repertoar hewan.
    *   Fenomena *subharmonics* dan *biphonation* (sangat umum pada kucing sakit/tua dan anjing) akan menyebabkan YIN mengalami *octave error* masif (meloncat ke F0/2 atau 2F0).
*   **[TINGGI] Rentang Frekuensi Ilusif:** Menentukan rentang 20 Hz membutuhkan *window* analisis >100 ms (resolusi waktu hancur untuk *bark* pendek). Menentukan batas atas 3500 Hz pada *sample rate* 48 kHz berarti perioda hanya ~14 sampel — interpolasi parabolik YIN akan sangat rentan terhadap *jitter* dan *noise*.
*   **[TINGGI] Pembobotan RMS:** Mikrofon HP memiliki *Automatic Gain Control* (AGC) dan *Noise Suppression* (terutama via Web Audio API *browser*). RMS bukan indikator validitas vokal; suara kucing yang jauh akan memiliki RMS rendah dan dibuang, sementara ketukan meja di dekat HP akan mendominasi.

### 1.3. 13-Band MFCC & Wiener Spectral Flatness
*   **[KRITIS] Antropocentrism Akustik:** MFCC 13-koefisien dengan skala Mel dirancang murni untuk persepsi pendengaran dan saluran vokal **manusia**. Menggunakan 13 *band* untuk hewan yang struktur harmoniknya sangat berbeda (terutama anjing ras mainan dan anak kucing dengan F0 >1000 Hz) adalah resolusi spektral yang terlalu kasar. Anda membuang informasi temporal (Delta & Delta-Delta tidak disebutkan) yang justru krusial membedakan *bark* vs batuk.
*   **[TINGGI] Degenerasi Spectral Flatness:** *Wiener Entropy* (rasio rata-rata geometrik/aritmatik spektrum) sangat sensitif terhadap SNR. Di ruangan bergema (*reverb*), suara tonal murni akan terlihat "bising" (flatness naik). Sebaliknya, dengungan kulkas yang tonal akan terlihat seperti vokal periodik. Ini bukan fitur diskriminatif yang stabil tanpa normalisasi per-*subband*.

### 1.4. Gatekeeper (Penolak Klakson, Mesin, Batuk, Bayi)
*   **[KRITIS] Asumsi Dunia Tertutup (Closed-World Fallacy):** Anda mendaftar 5 kelas negatif. Dunia nyata memiliki ribuan kelas negatif (TV, YouTube, burung, engsel pintu, mainan, alarm, musik). Sistem biner Anda akan memaksa suara asing yang tidak dikenal masuk ke kelas "Hewan" karena tidak mirip dengan 5 penolak tersebut.
*   **[KRITIS] Pasangan Cermin (Mirror Pairs):** Kelas negatif Anda secara akustik *konvergen* dengan suara hewan. Gatekeeper Anda pasti akan membunuh hewan asli:
    *   Batuk manusia $\approx$ Gonggongan anjing (keduanya ledakan bising *broadband* pendek).
    *   Tangisan bayi $\approx$ Meongan kucing (Kucing secara evolusioner mengembangkan *solicitation cry* yang meniru frekuensi tangis bayi manusia).
    *   Lolongan anjing (*howl*) $\approx$ Sirine (keduanya sapuan tonal panjang naik/turun).
    *   Dengkuran kucing (*purr* ~25 Hz) $\approx$ Dengungan mesin idle.

### 1.5. Penyalahgunaan Literatur (Schötz & Pongrácz)
Ini adalah cacat logika akademis yang fatal.
*   Aturan melodi Schötz (2023) untuk kucing dan parameter konteks Pongrácz untuk anjing adalah **statistik deskriptif fonetik**, bukan batas keputusan (*decision boundary*) untuk klasifikasi spesies.
*   Menerapkan tren populasi menjadi aturan deterministik biner adalah *Ecological Fallacy*. Kontur F0 "naik" pada kucing juga ditemukan pada intonasi bertanya manusia, burung, dan tangisan bayi. Variasi individu, ras (Siamese vs Persia), usia, dan status emosi menenggelamkan aturan umum ini.

---

## 2. Jebakan Fisika: Formant Dispersion & VTL via LPC

Formula yang Anda gunakan diturunkan dari model tabung ideal:
$$ F_n = \frac{(2n-1)c}{4L} \implies \Delta F = \frac{c}{2L} \implies L = \frac{c}{2 \cdot \Delta F} $$

Formula ini **hanya valid** jika: (1) Saluran vokal adalah tabung lurus berpenampang seragam (*uniform tube*), (2) Tertutup sempurna di glotis dan terbuka di bibir, (3) Hewan memproduksi vokal netral mirip vokal manusia /ə/ (schwa) yang statis.

### Mengapa ini gagal total pada kucing & anjing riil:

1.  **Saluran Vokal Bukan Tabung:** Anjing ras *brachycephalic* (Pug, Bulldog) memiliki tengkorak memendek yang melanggar allometri total. Saat kucing mengeong, mulutnya membuka secara dinamis (membentuk transisi diftong mirip /i-au/). Forman F1/F2 bergerak ratusan Hertz **di tengah satu panggilan**. Mengambil satu nilai $\Delta F$ statis adalah fiksi matematis.
2.  **Bencana *Undersampling* Harmonik (High F0 Problem):** LPC Levinson-Durbin membutuhkan spektrum yang terisi padat untuk menemukan puncak forman. Kucing memiliki VTL $\approx$ 9 cm, artinya $\Delta F \approx 1900$ Hz (Formannya di $\approx$ 950, 2850, 4750 Hz). Namun F0 kucing bisa mencapai 800–1200 Hz. Jarak antar-harmonik yang begitu lebar menyebabkan **LPC "mengunci" (*locking*) pada harmonik individu, bukan pada forman sebenarnya**. Anda akan mendapatkan angka VTL yang terlihat presisi (misal: 9.24 cm) padahal itu artefak acak.
3.  **Sensitivitas Levinson-Durbin:** LPC metode autokorelasi ini mengasumsikan sinyal *stationary* dalam jendela 20–30 ms. Gonggongan anjing bersifat sangat non-stasioner. Selain itu, LPC adalah model *all-pole*; ia gagal total memodelkan *zeros* dari suara nasal dan frikatif (*hiss*). Pilihan orde LPC (misal p=14 vs p=18) akan mengubah jumlah forman yang terdeteksi secara drastis, mengubah VTL Anda hingga 50% dalam sekejap.
4.  **Ilusi Presisi:** Menggunakan $c=343$ m/s (kecepatan suara di udara kering 20°C) padahal di saluran napas hangat/lembap $c \approx 350$ m/s memang hanya memberi error 2%. Tapi error ini tidak ada artinya dibanding error 40% akibat pelanggaran asumsi tabung seragam.

**Kesimpulan Fisika:** $\Delta F$ dan VTL **tidak boleh** digunakan sebagai gerbang (*hard gate*) klasifikasi spesies. Tumpang tindih VTL antara kucing besar dan anjing kecil (Chihuahua) terlalu besar. Gunakan hanya sebagai fitur probabilistik lunak (*soft feature*) dengan interval kepercayaan, dan hanya pada segmen vokal tonal berkelanjutan ber-SNR tinggi.

---

## 3. Skenario Dunia Nyata yang Menipu Sistem

### False Positives (Bukan Hewan, Terdeteksi Hewan)

| Skenario | Mekanisme Penipuan |
| :--- | :--- |
| **1. Tangisan Bayi / Rengetan Balita** | F0 400–600 Hz, harmonik kaya, kontur naik-turun Schötz cocok sempurna. LPC membaca saluran vokal pendek bayi sebagai VTL kucing. Gatekeeper bayi Anda akan gagal pada tangisan pendek/tertahan napas. |
| **2. Engsel Pintu Berderit / Gesekan Kaca / Biola** | Menghasilkan sapuan tonal murni 1000–2500 Hz dengan *spectral flatness* sangat rendah. YIN melacaknya sebagai F0, LPC menciptakan forman semu yang Konsisten. Lolos sebagai *meow*. |
| **3. Mainan *Squeaky Toy* Anjing** | Dirancang pabrikan untuk meniru jeritan mangsa di 2–4 kHz dalam ledakan pendek berulang. Pola temporalnya identik dengan *yelp/bark* anak anjing. |
| **4. Playback TV/YouTube & Manusia Meniru** | Manusia yang meniru "meong" dengan *falsetto* memanipulasi formannya. Speaker HP memotong frekuensi rendah sehingga VTL manusia (17 cm) terbaca menyusut seperti hewan. |
| **5. Peluit Ketel / Alarm Asap / Theremin** | Sapuan frekuensi periodik atau *beep* berulang dengan interval teratur meniru struktur *bout* gonggongan atau lolongan tonal. |

### False Negatives (Hewan Asli, Ditolak sebagai Noise)

| Skenario | Mekanisme Penolakan Salah |
| :--- | :--- |
| **1. Gonggongan Anjing Dewasa Asli** | Sinyal kaotik, *harsh*, tanpa F0 stabil, durasi <100 ms. YIN menandainya *unvoiced*. *Spectral Flatness*-nya tinggi. Sistem membuangnya sebagai "Batuk Manusia" atau "Noise Mesin". |
| **2. Kucing Mendengkur (Purr), Mendesis (Hiss), Menggeram** | *Purr* berfrekuensi 25 Hz (di bawah batas efektif mikrofon HP & tertutup filter *high-pass browser*). *Hiss* adalah noise *broadband* murni. Keduanya gagal di tahap YIN. |
| **3. Suara dari Balik Pintu/Ruangan Lain** | Dinding bertindak sebagai *low-pass filter*, menghancurkan forman frekuensi tinggi. Gema ruangan menciptakan forman palsu dari pantulan. SNR anjlok, Gatekeeper membuangnya sebagai dengungan mesin/TV. |
| **4. Anak Kucing (Kitten) & Anjing Toy Breed** | F0 sangat tinggi (>1500 Hz) menyebabkan kelangkaan harmonik ekstrem. LPC gagal total mengestimasi forman, VTL terbaca tidak masuk akal (misal 3 cm), sistem menolaknya. |
| **5. Kucing Tua/Sakit (Raspy Meow)** | Pita suara tidak bergetar sempurna (*biphonation*, suara serak). YIN mengalami *octave error* terus-menerus, kontur F0 terbaca acak, gagal aturan Schötz. |

---

## 4. Mitigasi & Rekomendasi Arsitektur Produksi (NPM)

Jangan buang riset Anda, tetapi **pensiunkan aturan kaku sebagai pengambil keputusan**. Gunakan arsitektur Hibrida Probabilistik:

### 4.1. Redain Arsitektur (Hybrid ML + DSP)
```text
Input (AudioWorklet, matikan AGC/NS bila memungkinkan)
  -> Quality Control (Deteksi clipping, estimasi SNR -> output "Uncertain" jika buruk)
  -> Segmentasi Event (VAD berbasis energi + onset, jendela konteks 1–3 detik)
  -> [Jalur Paralel]
       A. Neural Classifier: Log-Mel Spectrogram (64-band, 100Hz-12kHz) -> CNN Ringan (MobileNet/EfficientNet-Lite via ONNX Runtime Web/WASM)
       B. Ekstraktor DSP: pYIN (probabilistik) + HNR + Forman LPC (sebagai fitur lunak + CI)
       C. Negative Experts: Model multi-kelas (Manusia, Bayi, Kendaraan, Burung, Musik, Lainnya)
  -> Temporal Fusion (Agrupasi level 'bout'/urutan, bukan voting per-frame)
  -> Kalibrasi Probabilitas + Open-Set Rejection (Kelas "Tidak Diketahui")
```

### 4.2. Perbaikan Spesifik Segera
1.  **Ganti YIN** dengan pYIN atau model *deep learning* mikro (seperti CREPE-tiny) yang mengeluarkan probabilitas *voiced/unvoiced*, dan tangani repertoar atonal secara terpisah.
2.  **LPC hanya untuk fitur:** Turunkan *sample rate* ke 16 kHz sebelum LPC, gunakan metode Burg (lebih stabil untuk *frame* pendek), lacak forman antar-waktu dengan *Viterbi tracking*, dan laporkan VTL sebagai rentang (misal: "8–12 cm"), bukan angka tunggal.
3.  **Ganti 13-MFCC** dengan 64 Log-Mel Filterbank + turunan Delta. Lakukan *Cepstral Mean Variance Normalization* (CMVN) per rekaman untuk kekebalan terhadap perbedaan mikrofon HP.
4.  **Aturan Schötz/Pongrácz** jadikan fitur penjelas (*explainability layer*) di UI ("Terdeteksi pola kontur naik khas meow"), **bukan** sebagai filter penentu.

### 4.3. Data & Evaluasi (Faktor Penentu Sesungguhnya)
Model sehebat apapun akan gagal tanpa data yang benar:
*   **Cegah Kebocoran Data (Data Leakage):** Lakukan *split* dataset berdasarkan **individu hewan + rumah + perangkat**, bukan acak per file audio. Jika tidak, model Anda hanya menghafal gema ruangan.
*   **Metrik Produksi:** Lupakan "Akurasi 95%". Gunakan metrik **False Positives per Hour (FP/hour)** pada *streaming* negatif 24 jam non-stop, dan *Event-based F1* dengan toleransi 200 ms.
*   **Hard Negative Mining:** Kumpulkan secara agresif data engsel pintu, mainan *squeaky*, tangisan bayi, dan video YouTube hewan dari speaker HP. Ini adalah data terpenting Anda.

### 4.4. Kesiapan Rilis NPM
*   **Tiga Status Output:** API Anda tidak boleh memaksa biner. Kembalikan `{ label: 'cat' | 'dog' | 'non-pet' | 'uncertain', confidence: 0.87, qualityFlags: ['low_snr', 'clipping'] }`.
*   **Arsitektur Web:** Gunakan `AudioWorklet` + WASM SIMD (bukan `ScriptProcessor` yang usang). Model ML harus <10 MB (kuantisasi INT8) dan di-*lazy-load*.
*   **Kejujuran Klaim:** Jangan pernah mengklaim library dapat mengukur ukuran tubuh pasti, ras, atau diagnosa emosi/kesehatan hewan dari VTL/F0. Ini berisiko penolakan ilmiah dan keluhan pengguna.

### Putusan Akhir
Pertahankan modul DSP Anda sebagai ekstraktor fitur riset yang solid, tetapi **cabut wewenang veto mereka**. Untuk rilis publik yang tangguh, keputusan akhir harus berada di tangan model klasifikasi probabilistik yang dilatih pada data dunia nyata yang kotor, bising, dan beragam perangkat.