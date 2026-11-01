import fs from 'node:fs';
import path from 'node:path';

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
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
  return env;
}

const env = loadEnv();
const apiKey = env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error('❌ Error: OPENROUTER_API_KEY tidak ditemukan di .env!');
  process.exit(1);
}

// Cuplikan kode esensial terbaru setelah perbaikan (< 3000 tokens input)
const gatekeeperSnippet = fs.readFileSync('packages/core/src/dsp/gatekeeper.ts', 'utf-8').slice(0, 3500);
const formantsSnippet = fs.readFileSync('packages/core/src/dsp/formants.ts', 'utf-8').slice(0, 3200);
const catSnippet = fs.readFileSync('packages/cat/src/CatInterpreter.ts', 'utf-8').slice(0, 3200);
const dogSnippet = fs.readFileSync('packages/dog/src/DogInterpreter.ts', 'utf-8').slice(0, 3200);

const prompt = `
JANGAN BASA-BASI. JANGAN MEMUJI. JANGAN ADA POSITIVITY BIAS.
Anda adalah Reviewer Bioakustika & Audio DSP Senior dengan standar peer-review IEEE/ACM yang kejam dan sinis.
Ini adalah AUDIT TAHAP 2 (RE-EVALUATION) setelah kami merombak kode kami berdasarkan kritik keras Anda sebelumnya.

APA YANG SUDAH KAMI PERBAIKI BERDASARKAN KRITIK ANDA:
1. FORMANT & VTL:
   - Jika F0 > 700 Hz, ditandai isHarmonicLocked = true, vtlConfidence = 0.25 (tidak memaksakan vonis VTL).
   - NaN protection: safeVtl divalidasi ketat terhadap NaN dan nilai tak-hingga.
   - Ambang VTL manusia dinaikkan ke > 15.5 cm sehingga anjing besar (12-15 cm) tidak lagi terbunuh!
2. CAT INTERPRETER:
   - Dead-zone 75-240 Hz dipisah: 75-140 Hz tetap dead-zone (dengkuran manusia), sedangkan 140-240 Hz secara resmi mengenali Cat Agonistic Growl jika VTL <= 8.5 cm dan centroid <= 1200 Hz.
   - Batas meow dinaikkan dari burstCount <= 3 menjadi burstCount <= 6, dengan toleransi jitter hingga 1.25 pada F0 tinggi.
   - Sneeze friction manusia ditolak jika centroid > 3200 Hz dan jitter > 0.45.
3. DOG INTERPRETER:
   - Batuk manusia disempurnakan dengan kombinasi allometri: VTL > 10.5 cm pada F0 rendah atau centroid > 2200 Hz pada F0 < 300 Hz dengan jitter tinggi.
   - Clock ticks repetitif ditolak jika burstCount >= 7 dan jitter > 0.65.
   - Emergency siren diisolasi dengan syarat burstCount <= 2 dan jitter < 0.04.

HASIL BENCHMARK BARU PADA 100 AUDIO DUNIA NYATA (50 Pets vs 50 ESC-50 Hard Negatives):
- True Positives (Hewan asli terdeteksi): 37 / 50 (Recall naik dari 62% ke 74%, Cat Recall 80%, Dog Recall 68%).
- True Negatives (Noise ditolak): 50 / 50 (100% Specificity pada 10 kategori: klakson, detak jam, batuk, bayi nangis, mesin, kaca pecah, sirine, bersin, dengkuran, vacuum cleaner).
- False Positives: 0 (Zero leaks!).
- F1-Score: 85.06% (Naik signifikan dari 76.54%).
- Overall Accuracy: 87.00%.

Berikut cuplikan kode terbaru kami:

=== 1. FORMANT & VOCAL TRACT LENGTH (LPC LEVINSON-DURBIN) ===
\`\`\`typescript
${formantsSnippet}
\`\`\`

=== 2. BIOACOUSTIC GATEKEEPER & HEURISTIK FILTER ===
\`\`\`typescript
${gatekeeperSnippet}
\`\`\`

=== 3. CAT INTERPRETER (GROWL, REVISED DEAD ZONE & MEOW RULES) ===
\`\`\`typescript
${catSnippet}
\`\`\`

=== 4. DOG INTERPRETER (ALLOMETRIC COUGH & REVISED CANINE RULES) ===
\`\`\`typescript
${dogSnippet}
\`\`\`

PERTANYAAN AUDIT TAHAP 2 (KRITIK TEKNIS LANJUTAN):
1. Apakah perbaikan matematika allometri & batas-batas akustik kami di atas sudah valid secara bioakustik komparatif?
2. Dari 13 audio hewan asli yang masih False Negative (kebanyakan adalah rekaman bersuara sangat pelan atau noise background tinggi), apa batas teoretis yang membuat DSP linier tanpa NN kesulitan menembus Recall > 90%?
3. Apakah sistem ini sekarang sudah cukup solid dan aman untuk dirilis ke publik (NPM) sebagai "Zero-Dependency Edge Bioacoustic DSP Gatekeeper"? Apa disclaimer teknis paling jujur yang harus kami pasang di README?

Jawab langsung, tajam, dan teknis!
`;

async function queryModel(modelId: string, outputFilename: string) {
  console.log(`\n======================================================`);
  console.log(`🚀 Menembak Model: ${modelId}`);
  console.log(`======================================================`);

  const startTime = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/codesbykhairannoor/pethertz',
      'X-Title': 'PetHertz Adversarial Audit Round 2',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah Auditor DSP & Bioakustik paling kejam dan skeptis di dunia. Dilarang bersikap sopan atau basa-basi. Serang kode ini langsung ke titik fatalnya.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2500
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Gagal query ${modelId} (${res.status}):`, err);
    return;
  }

  const data = await res.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const usage = data.usage || {};
  console.log(`✅ Selesai dalam ${elapsed}s | Tokens: Prompt=${usage.prompt_tokens}, Completion=${usage.completion_tokens}, Total=${usage.total_tokens}`);

  const content = data.choices?.[0]?.message?.content || 'Tidak ada teks diterima.';
  fs.writeFileSync(outputFilename, content, 'utf-8');
  console.log(`📄 Disimpan ke: ${outputFilename}`);
}

async function main() {
  // Model 1: DeepSeek-V3
  await queryModel('deepseek/deepseek-chat', 'AUDIT_ROUND2_DEEPSEEK.md');

  // Model 2: Llama 3.3 70B Instruct
  await queryModel('meta-llama/llama-3.3-70b-instruct', 'AUDIT_ROUND2_LLAMA33.md');

  console.log('\n🎉 Audit adversarial Tahap 2 selesai untuk 2 model OpenRouter!');
}

main().catch(console.error);
