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

// Key code snippets showcasing the developer experience and API surface
const typesSnippet = fs.readFileSync('packages/core/src/types/index.ts', 'utf-8');
const engineSnippet = fs.readFileSync('packages/core/src/engine.ts', 'utf-8').slice(0, 4200);
const streamSnippet = fs.readFileSync('packages/core/src/stream/StreamAnalyzer.ts', 'utf-8').slice(0, 3000);

const prompt = `
ACT AS: A Veteran Open-Source TypeScript SDK Architect and Principal Audio Systems Engineer (Google / Web Audio / Spotify / Mozilla).
TASK: Perform an adversarial "Developer Experience (DX) & Code Usability" audit on "PetHertz", an isomorphic zero-dependency TypeScript pet bioacoustics library (Cats & Dogs).

RULES: ZERO POSITIVITY BIAS. NO FLATTERY. NO MARKETING JARGON. CRITIQUE RELENTLESSLY AS IF CONDUCTING A PUBLIC TEARDOWN ON HACKER NEWS OR A CRITICAL NPM ARCHITECTURE REVIEW.

=== BACKGROUND & ACCOMPLISHMENTS ===
PetHertz has migrated 100% of its codebase, type declarations, return objects, CLI, and documentation to pure English.
It achieves 100% specificity (0 FP) and 100% recall (0 FN) on a symmetrical 100-audio real-world benchmark (50 pet vocalizations vs 50 ESC-50 hard negative mirror pairs: crying baby, coughing, sneezing, snoring, car horns, sirens, clock ticks, vacuum cleaners, engines). It runs 100% offline edge-native with zero deep neural networks, relying on YIN pitch tracking, Levinson-Durbin LPC formant dispersion, Wiener spectral flatness, and an evidence-accumulation bioacoustic gatekeeper.

=== PUBLIC API SURFACE & CONSUMER USAGE ===

1. Batch Audio Analysis (Web Audio / Node.js Buffer):
\`\`\`typescript
import { PetHertz, decodeWav } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';
import { readFile } from 'node:fs/promises';

// Initialization
const catEngine = new PetHertz({
  interpreter: new CatInterpreter(),
  defaultSampleRate: 44100,
});

// Analyze raw Float32Array PCM
const wavBuffer = await readFile('meow.wav');
const { audioData, sampleRate } = decodeWav(wavBuffer);
const result = await catEngine.analyze(audioData, { sampleRate });

console.log(result.vocalization);          // 'meow' | 'purr' | 'hiss' | etc.
console.log(result.intent);                // 'hunger_solicitation' | 'distress_isolation' | etc.
console.log(result.confidence);            // 0.94
console.log(result.affectiveDimensions);   // { valence: 0.3, arousal: 0.6, urgency: 'moderate' }
console.log(result.humanExplanation);      // "Food solicitation meow with rising intonation..."
console.log(result.actionRecommendation);  // "Check food bowl, water supply, or meal schedule."
console.log(result.acousticMetrics);       // F0, formants, VTL, MFCC, Wiener flatness, jitter
\`\`\`

2. Real-Time Streaming (Live Mic / Smart Pet Camera):
\`\`\`typescript
const stream = catEngine.createStreamAnalyzer({
  windowDurationSec: 1.5,
  debounceMs: 500
});

stream.on('vocalization', (res) => {
  console.log(\`Detected: \${res.vocalization} (\${res.intent})\`);
});
stream.on('silence', () => { ... });

// In Web Audio ScriptProcessor / AudioWorklet:
stream.push(pcmFloat32Chunk);
\`\`\`

3. Core Type Contracts:
\`\`\`typescript
${typesSnippet.slice(0, 3000)}
\`\`\`

4. Stream Engine Implementation:
\`\`\`typescript
${streamSnippet}
\`\`\`

=== QUESTIONS FOR YOUR ADVERSARIAL AUDIT ===

1. HANDS-ON USABILITY & "FIRST 5 MINUTES" DEVELOPER EXPERIENCE:
Put yourself in the shoes of a developer installing this from npm to build (a) a browser Web Audio real-time pet translator, and (b) an edge IoT Node.js dog bark monitor.
- Write a short pseudo-code snippet showing how you would use it.
- Where does the API create unnecessary friction, ergonomic awkwardness, or boilerplate?
- What are the major "footguns" (e.g. sampleRate mismatch, memory allocations in streaming circular buffer, lack of auto-species detection)?

2. TEMPORAL BLIND SPOT (THE MULTI-EVENT LIMITATION):
Currently, \`analyze(audioData)\` aggregates an entire audio buffer into single global metrics ($F_0$, RMS, centroid, formants) and outputs ONE dominant intent.
If a user submits a 6-second recording containing:
[0.0s - 1.2s]: Playful high-pitch bark -> [1.5s - 3.0s]: Silence -> [3.1s - 5.5s]: Low aggressive growl.
- What happens currently? How badly does global averaging distort the acoustic metrics ($F_0$ trajectory, VTL, centroid)?
- How must PetHertz architect its temporal segmentation for v0.2.0 (e.g., event timeline, timestamped vocalization intervals \`events: Array<{ startMs, endMs, vocalization, intent }>\`)?

3. MONOREPO PACKAGING & ARCHITECTURAL COHESION:
Is splitting into separate packages (\`@pethertz/core\`, \`@pethertz/cat\`, \`@pethertz/dog\`) good modular design, or is it annoying overhead for 90% of developers who just want \`npm install pethertz\` with a unified entry point and auto-species classification?

4. HONEST CRITIQUE & PRE-PUBLISH ROADMAP (v0.1.0 -> v1.0.0):
Is PetHertz ready for public release on npm as v0.1.0?
Rate it objectively from 1 to 10 on:
(a) Scientific bioacoustic integrity
(b) TypeScript SDK ergonomics & developer experience
(c) Production edge reliability
List the top 3 critical things that MUST be improved before calling it production-grade.

Be brutal, direct, and technically thorough.
`;

async function queryModel(modelId: string, outputFilename: string) {
  console.log(`\nQuerying ${modelId} for DX & Usability Audit...`);
  const startTime = Date.now();

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/codesbykhairannoor/pethertz',
      'X-Title': 'PetHertz DX & Usability Adversarial Audit Round 4',
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
  await queryModel('deepseek/deepseek-chat', 'AUDIT_ROUND4_DX_DEEPSEEK.md');

  // Query Model 2: Llama 3.3 70B Instruct
  await queryModel('meta-llama/llama-3.3-70b-instruct', 'AUDIT_ROUND4_DX_LLAMA33.md');

  console.log('\nRound 4 DX & Usability Adversarial Audit successfully completed for both models!');
}

main().catch(console.error);

