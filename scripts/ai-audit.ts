import fs from 'node:fs';
import path from 'node:path';

// Parse .env manually without external dependencies
function loadEnv(): Record<string, string> {
  const envPath = path.resolve('.env');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

async function runAiAudit() {
  const env = loadEnv();
  const apiKey = env.META_API_KEY || env.LLAMA_API_KEY || env.META_LLAMA_API_KEY;
  const baseUrl = env.META_BASE_URL || 'https://api.meta.ai/v1';

  if (!apiKey) {
    console.error('❌ Error: API Key tidak ditemukan di .env!');
    process.exit(1);
  }

  console.log('🤖 Mengirimkan seluruh arsitektur dan logika PetHertz ke External AI untuk Adversarial Audit...');
  console.log(`🔗 Endpoint : ${baseUrl}/chat/completions`);
  console.log(`🔑 Key Model: ${apiKey.slice(0, 15)}...`);

  // Read the core files
  const gatekeeperCode = fs.readFileSync('packages/core/src/dsp/gatekeeper.ts', 'utf-8');
  const formantsCode = fs.readFileSync('packages/core/src/dsp/formants.ts', 'utf-8');
  const mfccCode = fs.readFileSync('packages/core/src/dsp/mfcc.ts', 'utf-8');
  const catCode = fs.readFileSync('packages/cat/src/CatInterpreter.ts', 'utf-8');
  const dogCode = fs.readFileSync('packages/dog/src/DogInterpreter.ts', 'utf-8');
  const engineCode = fs.readFileSync('packages/core/src/engine.ts', 'utf-8');

  const auditPrompt = `
Anda adalah Pakar Bioakustik Senior, Spesialis Audio DSP (Digital Signal Processing), dan Lead Architect Machine Learning yang sangat skeptis, galak, dan tanpa kompromi (no sugar-coating).
Tugas Anda adalah MEMBANTAH, MENYERANG, DAN MENGULITI KELEMAHAN FATAL dari arsitektur library bioakustika bernama "PetHertz" (zero-dependency pure TypeScript DSP tanpa deep learning neural network).

Sistem kami mengklaim berhasil menolak 100% noise ESC-50 (klakson, batuk, bayi nangis, sirine, mesin, vacuum), tetapi kami ingin Anda BONGKAR SEMUA CACAT LOGIKA, ASUMSI RAPUH, DAN HALU-NYA!

Berikut adalah arsitektur dan formula matematis yang kami gunakan:

1. ESTIMASI NADA DASAR (F0):
   - YIN algorithm (de Cheveigné & Kawahara 2002) dengan buffer 2048/4096 sampel, parabolic interpolation, dan adaptive threshold 0.10 - 0.15.
   - Rentang deteksi: 20 Hz (feline purr infrasound) hingga 3500 Hz (whine/squeak).

2. ACOUSTIC ALLOMETRY & VOCAL TRACT LENGTH (VTL):
   - Menggunakan Linear Predictive Coding (LPC) ordo 12-16 via algoritma Levinson-Durbin.
   - Formant extraction: mencari akar polinomial LPC yang berada di kuadran frekuensi resonansi vokal.
   - Estimasi panjang saluran vokal: L = c / (2 * Delta F) di mana c = 35000 cm/s dan Delta F adalah dispersi rata-rata forman.
   - Klasifikasi:
     * Faring Manusia: VTL > 14.5 cm atau F1 < 850 Hz pada F0 rendah (< 450 Hz) -> DITOLAK SEBAGAI SUARA MANUSIA.
     * Kucing Domestik: VTL 3.8 - 6.8 cm, F1 selalu > 950 Hz.
     * Feline Biological Dead-Zone: F0 antara 75 Hz - 240 Hz DITOLAK (karena pita suara kucing 3-5mm tidak bisa berfonasi di rentang ini).

3. BIOACOUSTIC GATEKEEPER & HARMONIC SHIELD:
   - Zero Crossing Rate (ZCR), Spectral Centroid, Wiener Spectral Flatness, Pitch Jitter, Pitch Shimmer, Burst Count, Dynamic Noise Floor (persentil 15).
   - Penolakan klakson: spectral centroid > 2500 Hz, F0 < 300 Hz, ZCR < 0.03.
   - Penolakan batuk/tenggorokan manusia: jitter > 0.55 atau VTL > 11 cm.
   - Penolakan tangisan bayi: durasi > 2200 ms dengan F0 > 450 Hz.
   - Penolakan dengkuran manusia: F0 70-135 Hz dengan durasi > 1800 ms.
   - Penolakan detak jam: burstCount >= 7 dengan pitchConfidence < 0.35.

4. EMOSI & INTENSI:
   - Bukan kategori diskrit, melainkan 2D Affective Space (Valence [-1, 1], Arousal [0, 1], Urgency) berbasis kontur intonasi F0 (rising, falling, flat, arch) berdasarkan riset Susanne Schötz 2023 dan Péter Pongrácz.

----------------------------------------------------------------------
TUGAS ADVERSARIAL ANDA (KRITIK SEPEDAS MUNGKIN & AJAK BERANTEM SECARA TEKNIS):

1. Mengapa formula LPC Levinson-Durbin L = c / (2 * Delta F) bisa menjadi BENCANA di rekaman smartphone nyata (SNR rendah, background noise, mikrofon terdistorsi, atau pitch tinggi F0 > 800 Hz)?
2. Di mana saja letak "BRITTLE HEURISTICS" (aturan ambang batas kaku) yang sangat mudah dieksploitasi oleh suara non-hewan dunia nyata? Berikan minimal 5 contoh suara spesifik yang PASTI AKAN MENGECOH sistem ini (False Positive).
3. Mengapa di stress test kami, 19 dari 50 audio hewan asli salah ditolak (False Negative)? Cacat logika apa dalam filter kami yang "membunuh" suara hewan asli?
4. Apa halusinasi terbesar dari pengembang yang mengira DSP heuristik murni bisa menggantikan Neural Network di era 2026?
5. Berikan rekomendasi mitigasi arsitektural yang radikal dan konkret!

Jawab secara komprehensif, berbasis fisika akustik, matematika sinyal, dan literatur bioakustik resmi!
`;

  const startTime = Date.now();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'muse-wonder-1.0',
      messages: [
        {
          role: 'system',
          content: 'Anda adalah Reviewer Bioakustik & Audio DSP Tingkat PhD yang sangat kritis, tajam, skeptis, dan agresif dalam membongkar celah logika sistem.'
        },
        {
          role: 'user',
          content: auditPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 16384,
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ HTTP Error ${res.status}:`, errorText);
    process.exit(1);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('Usage:', data.usage);
  console.log('Finish reason:', data.choices?.[0]?.finish_reason);

  const choice = data.choices?.[0];
  const auditResult = choice?.message?.content || choice?.message?.reasoning_content || JSON.stringify(choice?.message) || 'Tidak ada teks respon yang diterima.';

  console.log(`\n✅ Respon Audit Diterima dalam ${elapsed} detik!\n`);
  console.log('======================================================================');
  console.log('🔍 LAPORAN ADVERSARIAL AUDIT DARI EXTERNAL AI:');
  console.log('======================================================================\n');
  console.log(auditResult);

  // Save audit report to markdown
  fs.writeFileSync('AI_ADVERSARIAL_AUDIT_REPORT.md', auditResult, 'utf-8');
  console.log('\n📄 Laporan audit lengkap telah disimpan ke: AI_ADVERSARIAL_AUDIT_REPORT.md');
}

runAiAudit().catch(console.error);
