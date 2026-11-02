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

// Cuplikan kode esensial terbaru (< 3000 tokens input per call)
const gatekeeperSnippet = fs.readFileSync('packages/core/src/dsp/gatekeeper.ts', 'utf-8').slice(0, 3500);
const formantsSnippet = fs.readFileSync('packages/core/src/dsp/formants.ts', 'utf-8').slice(0, 3200);
const catSnippet = fs.readFileSync('packages/cat/src/CatInterpreter.ts', 'utf-8').slice(0, 3500);
const dogSnippet = fs.readFileSync('packages/dog/src/DogInterpreter.ts', 'utf-8').slice(0, 3500);

const prompt = `
JANGAN BASA-BASI. JANGAN MEMUJI. JANGAN ADA POSITIVITY BIAS.
Anda adalah Reviewer Bioakustika & Senior Open Source Software Architect dengan standar peer-review IEEE/ACM dan standar NPM internasional.
Ini adalah AUDIT TAHAP 3 (RE-EVALUATION & LOCALIZATION ARCHITECTURE) untuk library TypeScript open-source bernama "PetHertz".

APA YANG SUDAH KAMI PERBAIKI DARI AUDIT SEBELUMNYA:
1. FORMANT & VTL ALLOMETRY:
   - Batas VTL canine_large dinaikkan ke 17.0 cm (menyelamatkan anjing ras giant seperti Mastiff & Labrador).
   - Filter saluran vokal manusia kini mewajibkan hukum fonetik akustik Gunnar Fant (1960): formant pertama manusia F1 < 850 Hz dengan VTL > 9.0 cm. Karena kucing memiliki F1 > 950 Hz (1000-2500 Hz), kucing tidak lagi terbunuh secara salah!
2. DIGITAL CLIPPING GUARD:
   - Reject otomatis jika RMS > 0.95 untuk mencegah distorsi square-wave yang menghasilkan harmonik dan formasi palsu.
3. CAT & DOG INTERPRETER:
   - Dead-zone 75-140 Hz kucing kini memiliki toleransi stress-purr (F0 75-135 Hz dengan jitter < 0.15 & centroid < 650 Hz).
   - Rhythmic barking sequence Pongrácz (2005) dan multi-meow bouts Schötz (2023) didukung hingga 4000ms (burstCount <= 10), sehingga vokalisasi hewan berulang tidak lagi salah divonis sebagai tangisan bayi.
   - Tangisan bayi manusia diisolasi secara presisi: durasi > 2800ms dengan treble centroid > 3400 Hz atau VTL > 10.5 cm.
   - Batuk manusia diisolasi dengan VTL > 10.5 cm, centroid > 2100 Hz, dan pitch jitter > 0.45.

HASIL BENCHMARK TERBARU PADA 100 AUDIO DUNIA NYATA (50 Pets vs 50 ESC-50 Hard Negatives):
- True Positives (Hewan asli terdeteksi): 50 / 50 (100.00% Recall! Cat Recall 100%, Dog Recall 100%).
- True Negatives (Noise ditolak): 50 / 50 (100.00% Specificity pada 10 kategori: klakson, detak jam, batuk, bayi nangis, mesin, kaca pecah, sirine, bersin, dengkuran, vacuum cleaner).
- False Positives: 0 (Zero leaks!).
- False Negatives: 0 (Zero false alarms!).
- Overall Accuracy: 100.00%, Precision: 100.00%, F1-Score: 100.00%.

Berikut cuplikan kode logika kami saat ini:

=== 1. FORMANT & VTL ===
\`\`\`typescript
${formantsSnippet}
\`\`\`

=== 2. GATEKEEPER ===
\`\`\`typescript
${gatekeeperSnippet}
\`\`\`

=== 3. CAT INTERPRETER ===
\`\`\`typescript
${catSnippet}
\`\`\`

=== 4. DOG INTERPRETER ===
\`\`\`typescript
${dogSnippet}
\`\`\`

PERTANYAAN AUDIT TAHAP 3 (WAJIB DIJAWAB TEGAS, TEKNIS, DAN BRUTAL):

1. VALIDITAS TEORETIS VS OVERFITTING BENCHMARK:
Apakah skor 100% pada 100 audio suite kami mencerminkan generalisasi bioakustika yang kokoh, ataukah ada risiko bahaya over-tuning/overfitting terhadap parameter dataset uji? Di kondisi audio riil seperti apa sistem ini pasti akan jebol?

2. MASALAH HARDCODED BAHASA INDONESIA DI SOURCE CODE & ADOPSI GLOBAL NPM:
Pengembang kami menyadari bahwa di dalam return object (\`humanExplanation\`, \`actionRecommendation\`), pesan error gatekeeper, dan beberapa komentar kode, saat ini MASIH MENGGUNAKAN TEKS HARDCODED BAHASA INDONESIA (contoh: "Meong dengan intonasi naik di akhir nada...", "Periksa jadwal makan...").
- Mengapa hardcoded string Bahasa Indonesia di dalam source code library NPM adalah RED FLAG / BAD PRACTICE besar untuk library open-source yang ditargetkan rilis publik internasional?
- Apa standar arsitektur internasional yang wajib diterapkan? (Misal: default English, semantic intent enum/code, dan pemisahan arsitektur i18n / locale dictionary \`{ locale: 'en' | 'id' }\`).

3. ROADMAP MENUJU PRODUCTION-GRADE OPEN SOURCE RELEASE:
Sebutkan 3 langkah konkret yang harus kami lakukan sebelum \`npm publish\` agar library ini dipandang profesional dan berkelas dunia oleh komunitas global.

Tulis langsung ke poin masalah tanpa kata-kata manis pembuka!
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
      'X-Title': 'PetHertz Adversarial Audit Round 3',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 3000
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Gagal query model ${modelId}: ${res.status} ${res.statusText}`);
    console.error(errorText);
    return;
  }

  const json = await res.json() as any;
  const reply = json.choices?.[0]?.message?.content ?? '';
  const usage = json.usage;

  console.log(`✅ Selesai dalam ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  if (usage) {
    console.log(`📊 Token Usage: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`);
  }

  fs.writeFileSync(outputFilename, reply, 'utf-8');
  console.log(`💾 Laporan tersimpan di: ${outputFilename}`);
}

async function main() {
  // Model 1: DeepSeek-V3
  await queryModel('deepseek/deepseek-chat', 'AUDIT_ROUND3_DEEPSEEK.md');

  // Model 2: Llama 3.3 70B Instruct
  await queryModel('meta-llama/llama-3.3-70b-instruct', 'AUDIT_ROUND3_LLAMA33.md');

  console.log('\n🎉 Audit adversarial Tahap 3 selesai untuk 2 model OpenRouter!');
}

main().catch(console.error);
