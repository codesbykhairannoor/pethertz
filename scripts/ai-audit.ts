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
Anda adalah Pakar Bioakustik Senior, Spesialis Audio DSP (Digital Signal Processing), dan Lead Architect Machine Learning.
Tugas Anda adalah melakukan ADVERSARIAL AUDIT & PEER REVIEW secara kritis, skeptis, dan tanpa kompromi (no sugar-coating) terhadap logika dan algoritma library pet bioacoustics bernama "PetHertz".

Proyek ini dibangun murni menggunakan TypeScript (zero-dependency) tanpa model Neural Network eksternal, bertujuan menginterpretasikan vokalisasi kucing dan anjing serta menolak suara lingkungan manusia/mesin.

Berikut adalah kode sumber inti implementasi kami:

=== 1. GATEKEEPER (Penyaring Noise Lingkungan & Suara Manusia) ===
\`\`\`typescript
${gatekeeperCode}
\`\`\`

=== 2. ACOUSTIC ALLOMETRY & FORMANTS (Levinson-Durbin LPC & Vocal Tract Length) ===
\`\`\`typescript
${formantsCode}
\`\`\`

=== 3. 13-BAND MFCC & SPECTRAL FLATNESS (Davis & Mermelstein 1980) ===
\`\`\`typescript
${mfccCode}
\`\`\`

=== 4. CAT INTERPRETER (Susanne Schötz 2023 Rules & Dead-Zone) ===
\`\`\`typescript
${catCode}
\`\`\`

=== 5. DOG INTERPRETER (Pongrácz Canine Rules & Valence-Arousal) ===
\`\`\`typescript
${dogCode}
\`\`\`

=== 6. CORE ENGINE ORCHESTRATOR ===
\`\`\`typescript
${engineCode}
\`\`\`

----------------------------------------------------------------------
PERTANYAAN AUDIT UTAMA YANG HARUS ANDA JAWAB DENGAN TAJAM & MENDALAM:

1. Di mana saja letak cacat logika, asumsi yang terlalu kaku (brittle heuristics), atau kelemahan fatal dalam arsitektur aturan di atas?
2. Apakah formula fisika Formant Dispersion (Delta F) dan Vocal Tract Length (L = c / (2 * Delta F)) via LPC Levinson-Durbin akurat untuk kucing dan anjing, atau ada potensi jebakan/kegagalan saat diaplikasikan ke audio di dunia nyata (misal saat F0 tinggi atau rekaman bising)?
3. Sebutkan minimal 5 skenario audio dunia nyata yang paling berpotensi "menipu" sistem ini:
   - Skenario yang berpotensi lolos sebagai hewan padahal bukan (False Positive).
   - Skenario suara hewan asli yang berpotensi salah ditolak sebagai noise (False Negative).
4. Bagaimana mitigasi dan rekomendasi arsitektur perbaikannya agar library ini benar-benar tangguh untuk produksi dan rilis ke publik (NPM)?

Berikan jawaban terstruktur, teknis, berbasis matematika sinyal dan literatur bioakustik resmi!
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
          content: 'Anda adalah Reviewer Bioakustik & Audio DSP Tingkat PhD. Berikan evaluasi kritis, ilmiah, objektif, dan tanpa ampun. Tunjukkan di mana saja kelemahan tersembunyi, celah logika, dan potensi salah deteksi.'
        },
        {
          role: 'user',
          content: auditPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 8192,
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ HTTP Error ${res.status}:`, errorText);
    process.exit(1);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const choice = data.choices?.[0];
  const auditResult = choice?.message?.content || choice?.message?.reasoning_content || 'Tidak ada teks respon yang diterima.';

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
