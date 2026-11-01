import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PetHertz, decodeWav } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';

interface BenchmarkReport {
  file: string;
  expectedClass: 'cat' | 'dog' | 'noise';
  isAnimalVocalization: boolean;
  rejectionReason?: string;
  catIntent?: string;
  dogIntent?: string;
  confidence: number;
  valence: number;
  arousal: number;
  f0: number;
  jitter: number;
  bursts: number;
  passed: boolean;
  flawNote?: string;
}

async function runBenchmark() {
  console.log('\n🔬 ==============================================================');
  console.log('🐾 PETHERTZ BIOACOUSTIC BENCHMARK V2 (WITH GATEKEEPER & SNR)');
  console.log('🔬 ==============================================================\n');

  const dir = path.resolve('test-benchmarks/audio');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.wav'));

  const catEngine = new PetHertz({ interpreter: new CatInterpreter() });
  const dogEngine = new PetHertz({ interpreter: new DogInterpreter() });

  const reports: BenchmarkReport[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const buf = await readFile(fullPath);
    const decoded = decodeWav(buf);

    let expectedClass: 'cat' | 'dog' | 'noise' = 'noise';
    if (file.endsWith('-5.wav')) expectedClass = 'cat';
    else if (file.endsWith('-0.wav')) expectedClass = 'dog';

    const catRes = await catEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });
    const dogRes = await dogEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });

    const activeRes = expectedClass === 'dog' ? dogRes : catRes;
    const isAnimal = activeRes.isAnimalVocalization;
    const reason = activeRes.acousticMetrics.gatekeeper?.rejectionReason;

    let passed = true;
    let flawNote = '';

    if (expectedClass === 'noise') {
      if (isAnimal) {
        passed = false;
        flawNote = `FALSE POSITIVE: Suara non-hewan lolos sebagai ${activeRes.vocalization} (${activeRes.intent})!`;
      } else {
        flawNote = `Tolak Bersih: ${reason}`;
      }
    } else {
      // Expected animal
      if (!isAnimal) {
        passed = false;
        flawNote = `FALSE NEGATIVE: Suara ${expectedClass} asli ditolak oleh gatekeeper (${reason})!`;
      } else {
        flawNote = `Valid ${expectedClass.toUpperCase()}: ${activeRes.intent}`;
      }
    }

    reports.push({
      file,
      expectedClass,
      isAnimalVocalization: isAnimal,
      rejectionReason: reason,
      catIntent: catRes.intent,
      dogIntent: dogRes.intent,
      confidence: activeRes.confidence,
      valence: activeRes.affectiveDimensions?.valence ?? 0,
      arousal: activeRes.affectiveDimensions?.arousal ?? 0,
      f0: activeRes.acousticMetrics.fundamentalFrequencyHz,
      jitter: Math.round((activeRes.acousticMetrics.pitchJitter ?? 0) * 1000) / 10,
      bursts: activeRes.acousticMetrics.burstCount,
      passed,
      flawNote,
    });
  }

  // Print Summary Table
  console.log('| File | Target | Is Animal? | F0 (Hz) | Jitter | Bursts | Valence | Arousal | Evaluasi & Status |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |');

  let passedCount = 0;
  for (const r of reports) {
    if (r.passed) passedCount++;
    const icon = r.passed ? '✅' : '❌';
    console.log(
      `| ${r.file} | ${r.expectedClass.toUpperCase()} | ${r.isAnimalVocalization ? 'YES' : 'NO'} | ${r.f0} | ${r.jitter}% | ${r.bursts} | ${r.valence} | ${r.arousal} | ${icon} ${r.flawNote} |`
    );
  }

  const accuracy = Math.round((passedCount / reports.length) * 100);
  console.log(`\n==============================================================`);
  console.log(`📊 TOTAL BENCHMARK ACCURACY: ${passedCount} / ${reports.length} (${accuracy}%)`);
  console.log(`==============================================================\n`);
}

runBenchmark().catch(console.error);
