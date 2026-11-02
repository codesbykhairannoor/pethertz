**AUDIT TAHAP 2 - PENILAIAN KEJAM & TEKNIS**

### 1. VALIDASI BIOAKUSTIK & ALLOMETRI
- **Masih ada kebocoran anatomis**: Batas VTL 15.5 cm untuk manusia masih bisa menjebak spesies seperti **kucing besar (Panthera) atau anjing ras giant (Mastiff)**. Rekomendasi: **Naikkan threshold ke 17.0 cm** dan tambahkan pengecekan **formant dispersion > 150 Hz** untuk mamalia besar.
- **Harmonic locking masih prematur**: Flag `isHarmonicLocked` pada F0 > 700 Hz berisiko **false positive pada burung kecil**. Tambahkan syarat tambahan: **spectral centroid > 3.5 kHz** dan **burstCount < 2**.
- **Dead zone 75-140 Hz terlalu kaku**: Getaran **kucing stres (stress purr)** bisa mencapai 90-120 Hz. Beri toleransi jika **jitter < 0.15** dan **burst interval reguler (CV < 0.3)**.

### 2. BATAS TEORETIS DSP LINIER
- **13 False Negative** menunjukkan limitasi fundamental:
  - **SNR < -12dB**: Sinyal vokal hewan pelan (e.g., kitten mews) hilang dalam noise floor.
  - **Non-stasioner ekstrim**: Vokalisasi dengan **modulasi F0 > 50%/ms** (e.g., distress calls) gagal dilacak pitch tracker.
  - **Artifak non-linear**: Suara seperti **kucing memuntahkan hairball** memiliki karakteristik **non-harmonic chaos** yang sulit dibedakan dari noise.
  
  **Solusi tanpa NN mustahil**: Untuk mencapai recall > 90%, diperlukan **adaptif noise suppression berbasis Cepstral Flux** atau **non-linear oscillator matching**.

### 3. KESIAPAN RELEASE & DISCLAIMER
**Masih ada 3 lubang kritis**:
1. **Vulnerabilitas terhadap synthetic sweeps**: Sinyal chirp 140-240 Hz dengan VTL 8.5 cm bisa memicu false positive cat growl.
2. **Aliasing RFI**: Interferensi radio frekuensi tinggi (>18kHz) bisa mengacaukan formant tracking.
3. **Keterbatasan real-time**: Proses LPC order-12 pada sample rate 44.1kHz memakan **4.2ms/frame** di Raspberry Pi 3.

**Disclaimer wajib di README**:
```markdown
⚠️ PERINGATAN BIOAKUSTIK TERKERAS ⚠️
1. Sistem ini TIDAK bisa mendeteksi:
   - Hewan dengan VTL < 3.5 cm (tikus, hamster) atau > 40 cm (paus)
   - Vokalisasi non-linear (kucing marah, burung mimicry)
   - Sinyal dengan SNR < -10dB atau durasi < 40ms

2. False positive akan terjadi pada:
   - Alat musik berdawai (gitar, biola) dengan formant dispersi mirip mamalia
   - Mesin diesel idle dengan resonansi 80-120Hz
   - Suara manusia menirukan hewan (pitch shifting, vocal fry)

3. Kinerja menurun drastis pada:
   - Sample rate < 16kHz (aliasing destruktif)
   - Environment dengan multipath acoustic reflection (kamar gema)
   - Perangkat tanpa dukungan FPU (hanya integer arithmetic)
```

**REKOMENDASI RELEASE**:
- Beri label **"BETA"** dan batasi scope ke **companion animals (kucing/anjing domestik)**.
- Tambahkan **hard limiter** untuk reject otomatis jika **RMS > 0.95** (avoid clipping distortion).
- Open benchmark dataset untuk validasi komunitas.