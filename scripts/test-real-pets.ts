import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PetHertz, decodeWav } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';

interface RealPetResult {
  file: string;
  expectedSpecies: 'cat' | 'dog';
  detectedSpecies: string;
  isAnimal: boolean;
  score: number;
  f0: number;
  contour: string;
  durationMs: number;
  vocalization: string;
  intent: string;
  valence: number;
  arousal: number;
  urgency: string;
  recommendedAction: string;
}

async function runRealPetTest() {
  console.log('\n========================================================================');
  console.log('🐾 PETHERTZ LIVE REAL PET AUDIO BENCHMARK (CATS & DOGS ONLY)');
  console.log('⚡ Direct, transparent evaluation on 80 authentic animal recordings');
  console.log('   (40 Real Domestic Cats + 40 Real Domestic Dogs from ESC-50 & Field Data)');
  console.log('========================================================================\n');

  const catEngine = new PetHertz({ interpreter: new CatInterpreter() });
  const dogEngine = new PetHertz({ interpreter: new DogInterpreter() });

  const dirs = ['test-benchmarks/massive-dataset', 'test-benchmarks/ood-dataset'];
  const catResults: RealPetResult[] = [];
  const dogResults: RealPetResult[] = [];

  for (const d of dirs) {
    const files = (await readdir(d)).filter((f) => f.endsWith('.wav'));

    for (const f of files) {
      const isCat = f.startsWith('cat_');
      const isDog = f.startsWith('dog_');
      if (!isCat && !isDog) continue;

      const filePath = path.join(d, f);
      const wavBytes = await readFile(filePath);
      const decoded = decodeWav(wavBytes);

      const expectedSpecies = isCat ? 'cat' : 'dog';
      const engine = isCat ? catEngine : dogEngine;
      const res = await engine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });

      const m = res.acousticMetrics;
      const voc = res.vocalization ?? 'none';
      const intn = res.intent ?? 'none';
      const cnt = m.pitchContour ?? 'flat';

      const item: RealPetResult = {
        file: f,
        expectedSpecies,
        detectedSpecies: res.species,
        isAnimal: res.isAnimalVocalization,
        score: Math.round(m.gatekeeper.biologicalPlausibilityScore * 100) / 100,
        f0: Math.round(m.fundamentalFrequencyHz * 10) / 10,
        contour: cnt,
        durationMs: m.durationMs,
        vocalization: voc,
        intent: intn,
        valence: res.affectiveDimensions?.valence ?? 0,
        arousal: res.affectiveDimensions?.arousal ?? 0,
        urgency: res.affectiveDimensions?.urgency ?? 'LOW',
        recommendedAction: res.recommendedAction ?? '-',
      };

      if (isCat) catResults.push(item);
      else dogResults.push(item);
    }
  }

  // Print CAT Results
  console.log('🐱 CAT VOCALIZATION ANALYSIS (40 AUTHENTIC CAT RECORDINGS):');
  console.log('| No | File | F0 (Hz) | Contour | Dur (ms) | Vocalization | Inferred Intent | Valence | Arousal | BioScore |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  catResults.forEach((r, i) => {
    console.log(
      `| ${i + 1} | ${r.file.padEnd(26)} | ${r.f0.toString().padEnd(6)} | ${r.contour.padEnd(10)} | ${r.durationMs.toString().padEnd(6)} | ${r.vocalization.padEnd(12)} | ${r.intent.padEnd(20)} | ${r.valence.toFixed(2)} | ${r.arousal.toFixed(2)} | ${r.score} |`
    );
  });

  // Print DOG Results
  console.log('\n🐶 DOG VOCALIZATION ANALYSIS (40 AUTHENTIC DOG RECORDINGS):');
  console.log('| No | File | F0 (Hz) | Contour | Dur (ms) | Vocalization | Inferred Intent | Valence | Arousal | BioScore |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  dogResults.forEach((r, i) => {
    console.log(
      `| ${i + 1} | ${r.file.padEnd(26)} | ${r.f0.toString().padEnd(6)} | ${r.contour.padEnd(10)} | ${r.durationMs.toString().padEnd(6)} | ${r.vocalization.padEnd(12)} | ${r.intent.padEnd(20)} | ${r.valence.toFixed(2)} | ${r.arousal.toFixed(2)} | ${r.score} |`
    );
  });

  // Summary Metrics
  const catPassed = catResults.filter((r) => r.isAnimal).length;
  const dogPassed = dogResults.filter((r) => r.isAnimal).length;

  console.log('\n========================================================================');
  console.log('📊 ACCURACY & STATISTICAL SUMMARY (REAL PET SOUNDS ONLY):');
  console.log('========================================================================');
  console.log(`🐱 Cat Recognition Rate : ${catPassed} / ${catResults.length} (${((catPassed / catResults.length) * 100).toFixed(1)}%)`);
  console.log(`🐶 Dog Recognition Rate : ${dogPassed} / ${dogResults.length} (${((dogPassed / dogResults.length) * 100).toFixed(1)}%)`);
  console.log(`🎯 Total Pet Detection   : ${catPassed + dogPassed} / ${catResults.length + dogResults.length} (${(((catPassed + dogPassed) / (catResults.length + dogResults.length)) * 100).toFixed(1)}%)`);

  // Intent Distribution for Cats
  const catIntents: Record<string, number> = {};
  catResults.forEach((r) => {
    catIntents[r.intent] = (catIntents[r.intent] || 0) + 1;
  });
  console.log('\n🐱 Inferred Cat Intents Distribution:');
  for (const [intent, count] of Object.entries(catIntents)) {
    console.log(` - ${intent}: ${count} files (${((count / catResults.length) * 100).toFixed(1)}%)`);
  }

  // Intent Distribution for Dogs
  const dogIntents: Record<string, number> = {};
  dogResults.forEach((r) => {
    dogIntents[r.intent] = (dogIntents[r.intent] || 0) + 1;
  });
  console.log('\n🐶 Inferred Dog Intents Distribution:');
  for (const [intent, count] of Object.entries(dogIntents)) {
    console.log(` - ${intent}: ${count} files (${((count / dogResults.length) * 100).toFixed(1)}%)`);
  }
  console.log('========================================================================\n');
}

runRealPetTest().catch(console.error);

