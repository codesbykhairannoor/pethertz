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

// Cuplikan kode esensial agar hemat token (< 2500 tokens input per call)
const gatekeeperSnippet = fs.readFileSync('packages/core/src/dsp/gatekeeper.ts', 'utf-8').slice(0, 3500);
const formantsSnippet = fs.readFileSync('packages/core/src/dsp/formants.ts', 'utf-8').slice(0, 3000);
const catSnippet = fs.readFileSync('packages/cat/src/CatInterpreter.ts', 'utf-8').slice(0, 3000);
const dogSnippet = fs.readFileSync('packages/dog/src/DogInterpreter.ts', 'utf-8').slice(0, 3000);

const prompt = `
JANGAN BASA-BASI. JANGAN MEMUJI. JANGAN ADA POSITIVITY BIAS.
Anda adalah Reviewer Bioakustika & Audio DSP Senior dengan standar peer-review IEEE/ACM yang kejam dan sinis.
Tugas Anda adalah MEMBONGKAR DAN MENYERANG SEMUA CACAT LOGIKA, HALUSINASI, DAN ASUMSI RAPUH dalam kode library TypeScript bernama "PetHertz" berikut.

Klaim pengembang: "Library ini zero-dependency, tanpa neural network, berhasil 100% menolak noise ESC-50 (klakson, batuk, bayi, mesin, dengkuran)."
FAKTA DI UJI STRES KAMI:
- Noise ESC-50 memang ditolak 50/50 (100% Specificity).
- TETAPI 19 dari 50 suara hewan asli (anjing & kucing) IKUT TERBUNUH (False Negative 38%, Recall cuma 62%)!

Berikut cuplikan kode logika kami:

=== 1. FORMANT & VOCAL TRACT LENGTH (LPC LEVINSON-DURBIN) ===
\`\`\`typescript
${formantsSnippet}
\`\`\`

=== 2. BIOACOUSTIC GATEKEEPER & HEURISTIK FILTER ===
\`\`\`typescript
${gatekeeperSnippet}
\`\`\`

=== 3. CAT INTERPRETER (DEAD ZONE & MEOW RULES) ===
\`\`\`typescript
${catSnippet}
\`\`\`

=== 4. DOG INTERPRETER (GROWL, BARK, WHINE RULES) ===
\`\`\`typescript
${dogSnippet}
\`\`\`

PERTANYAAN AUDIT WAJIB DIJAWAB SECARA BRUTAL & TO THE POINT:
1. Mengapa formula L = c / (2 * Delta F) via LPC Levinson-Durbin itu cacat/halu pada audio nyata (terutama saat F0 kucing > 800 Hz atau pada nada murni)? Apakah ada bug NaN fail-open?
2. Mengapa 19 suara hewan asli di uji coba kami terbunuh (False Negative)? Tunjukkan baris kode/kondisi if mana saja yang menjadi "mesin pembunuh" hewan asli tersebut!
3. Sebutkan 3 suara dunia nyata yang PASTI LOLOS sebagai hewan (False Positive) karena kelemahan logika di kode di atas!
4. Berikan solusinya secara teknis tanpa harus merusak filosofi zero-dependency/edge-native!

Tulis langsung ke inti masalah, tanpa pendahuluan ramah tamah!
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
      'X-Title': 'PetHertz Adversarial Audit',
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
  // Model 1: DeepSeek-V3 (Super tajam, brutal, mathematical analysis)
  await queryModel('deepseek/deepseek-chat', 'AUDIT_DEEPSEEK.md');

  // Model 2: Llama 3.3 70B Instruct (Meta's best, rigorous DSP reasoning)
  await queryModel('meta-llama/llama-3.3-70b-instruct', 'AUDIT_LLAMA33.md');

  console.log('\n🎉 Audit adversarial selesai untuk 2 model OpenRouter!');
}

main().catch(console.error);

