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
  console.error('Error: OPENROUTER_API_KEY not found in .env!');
  process.exit(1);
}

// Key code snippets of the latest implemented improvements
const universalSnippet = fs.readFileSync('packages/core/src/UniversalPetInterpreter.ts', 'utf-8').slice(0, 3800);
const engineSnippet = fs.readFileSync('packages/core/src/engine.ts', 'utf-8').slice(0, 3600);
const streamSnippet = fs.readFileSync('packages/core/src/stream/StreamAnalyzer.ts', 'utf-8').slice(0, 3000);

const prompt = `
ACT AS: A Veteran Principal Audio DSP Engineer & Open-Source TypeScript SDK Architect (Google / Mozilla / Spotify).
TASK: Perform Round 5 Adversarial Code & Architecture Review on "PetHertz", an isomorphic zero-dependency TypeScript pet bioacoustics library (Cats & Dogs).

RULES: ZERO POSITIVITY BIAS. NO FLATTERY. ATTACK THE IMPLEMENTATION RELENTLESSLY TO UNCOVER HIDDEN CORNER CASES, RUNTIME BUGS, AND SYSTEM DEFECTS.

=== WHAT WE JUST IMPLEMENTED IN RESPONSE TO YOUR ROUND 4 AUDIT ===

1. Zero-Config Initialization with Auto-Species Arbitration (\`UniversalPetInterpreter\`):
   Developers can now simply run \`const engine = new PetHertz();\` without passing any interpreter.
   It automatically arbitrates between Feline and Canine using:
   - Vocal Tract Length ($VTL$): $\\le 6.8\\text{ cm}$ = Cat, $\\ge 7.0\\text{ cm}$ = Dog.
   - Low vibrational hum (20-70 Hz with centroid < 650 Hz) = Cat Purr.
   - Rhythmic staccato bouts (burstCount >= 2 with intervals < 500ms) = Dog Bark.
   - Low guttural resonance (70-260 Hz with high centroid) = Dog Growl.
   - Single long continuous vowel (F0 > 450 Hz, duration >= 350ms) = Cat Meow.

2. Zero-Boilerplate Direct WAV Input:
   \`engine.analyze(input)\` now accepts \`Uint8Array\`, \`ArrayBuffer\`, or Node \`Buffer\` directly. If a RIFF header is detected, it automatically decodes the sample rate and PCM audio data seamlessly without manual \`decodeWav()\` plumbing.

3. Temporal Multi-Event Timeline (\`result.events: PetEvent[]\`):
   \`analyze()\` now returns a segmented timeline of events:
   \`\`\`typescript
   result.events: Array<{
     startMs: number;
     endMs: number;
     durationMs: number;
     vocalization: string;
     intent: string;
     confidence: number;
   }>
   \`\`\`

4. Stream Controls & Optimization:
   - Added \`pause()\` and \`resume()\` with \`isPaused\` for IoT battery preservation.
   - Added \`confidenceThreshold\` filter (default 0.60) to suppress low-confidence false triggers.
   - Pre-allocated \`sequentialBuffer\` to eliminate per-window garbage collection churn.

5. CLI & Test Suite:
   - CLI defaults to \`--species auto\`.
   - 29/29 unit tests pass.
   - 100/100 symmetrical benchmark: 100% precision, 100% recall (0 FP, 0 FN across 50 real pets vs 50 ESC-50 hard negative mirror pairs).

=== CODE IMPLEMENTATION SNIPPETS ===

1. UniversalPetInterpreter:
\`\`\`typescript
${universalSnippet}
\`\`\`

2. Engine analyze() with direct WAV & Event Timeline:
\`\`\`typescript
${engineSnippet}
\`\`\`

3. StreamAnalyzer with pause/resume:
\`\`\`typescript
${streamSnippet}
\`\`\`

=== TARGETED ADVERSARIAL QUESTIONS ===

1. ACOUSTIC CORNER CASES & SPECIES CONFUSION:
   - Consider a miniature dog (toy breed: Chihuahua, Pomeranian, Toy Poodle) with skull length yielding estimated $VTL \\approx 6.0 - 7.0\\text{ cm}$ emitting a high-pitch whining vocalization ($F_0 \\approx 800 - 1200\\text{ Hz}$) with a single continuous burst (> 400ms).
   - How vulnerable is \`UniversalPetInterpreter\` to misclassifying this toy dog whine as a feline meow? What exact acoustic features (e.g. harmonicity, spectral centroid, formants) could prevent this confusion?

2. MULTI-EVENT SEGMENTATION DEFECTS:
   - In \`engine.ts\` lines 230-245, look at how \`events\` is populated:
     \`events.push({ startMs, endMs, durationMs, vocalization: interpreted.vocalization, intent: interpreted.intent, ... })\`
   - Notice that every segmented event is currently assigned the GLOBAL \`interpreted.vocalization\` and \`interpreted.intent\`!
   - If an audio clip contains a bark at 0-1s followed by a growl at 2-4s, does the current loop actually evaluate each burst individually, or does it just duplicate the global intent across both burst intervals? Expose the exact flaw here!

3. ISOMORPHIC BROWSER & BUNDLER COMPATIBILITY (ESM vs CJS / Node vs Web Audio):
   - In \`packages/core/src/engine.ts\`, we have dynamic \`import('node:fs/promises')\` inside \`analyzeFile()\`, and checks like \`typeof Buffer !== 'undefined'\`.
   - Will modern client-side bundlers (Vite, Webpack 5, Next.js Turbopack) complain or fail to bundle \`@pethertz/core\` when imported in client-side React/Vue/Svelte? How should bundler-safe isomorphic separation be structured?

4. UPDATED SCORECARD & VERDICT FOR NPM RELEASE (v0.1.0):
   - Re-rate PetHertz from 1 to 10 on:
     (a) Scientific bioacoustic integrity
     (b) TypeScript SDK ergonomics & developer experience
     (c) Production edge reliability
   - Compared to your Round 4 review, did we solve your DX complaints? What is your final verdict for publishing v0.1.0 to npm?

Be ruthless, direct, and technically precise.
`;

async function queryModel(modelId: string, outputFilename: string) {
  console.log(`\nQuerying ${modelId} for Round 5 Adversarial Audit...`);
  const startTime = Date.now();

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/codesbykhairannoor/pethertz',
      'X-Title': 'PetHertz Adversarial Audit Round 5',
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
    console.error(`Failed querying ${modelId}: ${res.status} ${res.statusText}`);
    console.error(errorText);
    return;
  }

  const json = (await res.json()) as any;
  const reply = json.choices?.[0]?.message?.content ?? 'No response received.';
  const usage = json.usage;

  console.log(`Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  if (usage) {
    console.log(`Token Usage: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`);
  }

  fs.writeFileSync(outputFilename, reply, 'utf-8');
  console.log(`Saved report to: ${outputFilename}`);
}

async function main() {
  // Query Model 1: DeepSeek-V3
  await queryModel('deepseek/deepseek-chat', 'AUDIT_ROUND5_DEEPSEEK.md');

  // Query Model 2: Llama 3.3 70B Instruct
  await queryModel('meta-llama/llama-3.3-70b-instruct', 'AUDIT_ROUND5_LLAMA33.md');

  console.log('\nRound 5 Adversarial Audit completed successfully for both models!');
}

main().catch(console.error);

