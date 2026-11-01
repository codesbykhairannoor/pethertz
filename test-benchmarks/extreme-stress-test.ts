import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PetHertz, decodeWav } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';

interface TestSampleResult {
  file: string;
  expectedCategory: 'cat' | 'dog' | 'noise';
  actualIsAnimal: boolean;
  predictedSpecies?: string;
  predictedIntent?: string;
  rejectionReason?: string;
  valence: number;
  arousal: number;
  f0: number;
  jitter: number;
  classification: 'TP' | 'TN' | 'FP' | 'FN';
}

async function runExtremeStressTest() {
  console.log('\n🔥 ==============================================================');
  console.log('⚡ PETHERTZ EXTREME STRESS-TEST (MASSIVE REAL-WORLD AUDIO SUITE)');
  console.log('🔥 ==============================================================\n');

  const dir = path.resolve('test-benchmarks/extreme-dataset');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.wav'));

  const catEngine = new PetHertz({ interpreter: new CatInterpreter() });
  const dogEngine = new PetHertz({ interpreter: new DogInterpreter() });

  const results: TestSampleResult[] = [];

  let TP = 0; // Real animal correctly recognized as animal
  let TN = 0; // Noise correctly rejected
  let FP = 0; // Noise mistakenly accepted as animal
  let FN = 0; // Real animal mistakenly rejected as noise

  const noiseBreakdown: { [reason: string]: number } = {};
  const intentDistribution: { [intent: string]: number } = {};

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const buf = await readFile(fullPath);
    const decoded = decodeWav(buf);

    let expectedCategory: 'cat' | 'dog' | 'noise' = 'noise';
    if (file.startsWith('cat_')) expectedCategory = 'cat';
    else if (file.startsWith('dog_')) expectedCategory = 'dog';

    const activeEngine = expectedCategory === 'dog' ? dogEngine : catEngine;
    const res = await activeEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });

    const isAnimal = res.isAnimalVocalization;
    const reason = res.acousticMetrics.gatekeeper?.rejectionReason;

    let classification: 'TP' | 'TN' | 'FP' | 'FN';

    if (expectedCategory === 'noise') {
      if (!isAnimal) {
        TN++;
        classification = 'TN';
        const r = reason ?? 'generic_noise';
        noiseBreakdown[r] = (noiseBreakdown[r] ?? 0) + 1;
      } else {
        FP++;
        classification = 'FP';
      }
    } else {
      // Expected animal
      if (isAnimal) {
        TP++;
        classification = 'TP';
        intentDistribution[res.intent] = (intentDistribution[res.intent] ?? 0) + 1;
      } else {
        FN++;
        classification = 'FN';
      }
    }

    results.push({
      file,
      expectedCategory,
      actualIsAnimal: isAnimal,
      predictedSpecies: res.species,
      predictedIntent: res.intent,
      rejectionReason: reason,
      valence: res.affectiveDimensions?.valence ?? 0,
      arousal: res.affectiveDimensions?.arousal ?? 0,
      f0: res.acousticMetrics.fundamentalFrequencyHz,
      jitter: Math.round((res.acousticMetrics.pitchJitter ?? 0) * 1000) / 10,
      classification,
    });
  }

  // Print Detailed Table Sample
  console.log('| File | Expected | Detected? | F0 (Hz) | Jitter | Valence | Arousal | Outcome | Notes |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |');

  for (const r of results) {
    const icon = r.classification === 'TP' || r.classification === 'TN' ? '✅' : '❌';
    const note =
      r.classification === 'TN'
        ? `Tolak: ${r.rejectionReason}`
        : r.classification === 'FP'
        ? `BOCOR: Dikira ${r.predictedSpecies} (${r.predictedIntent})`
        : r.classification === 'FN'
        ? `SALAH TOLAK: (${r.rejectionReason})`
        : `${r.predictedIntent}`;

    console.log(
      `| ${r.file} | ${r.expectedCategory.toUpperCase()} | ${r.actualIsAnimal ? 'YES' : 'NO'} | ${r.f0} | ${r.jitter}% | ${r.valence} | ${r.arousal} | ${icon} ${r.classification} | ${note} |`
    );
  }

  // Compute Scientific Metrics
  const total = TP + TN + FP + FN;
  const accuracy = total > 0 ? (TP + TN) / total : 0;
  const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
  const recall = TP + FN > 0 ? TP / (TP + FN) : 0;
  const specificity = TN + FP > 0 ? TN / (TN + FP) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log('\n==============================================================');
  console.log('📊 STATISTIK CONFUSION MATRIX RESMI:');
  console.log('==============================================================');
  console.log(`True Positives  (TP - Hewan asli terdeteksi benar) : ${TP}`);
  console.log(`True Negatives  (TN - Noise berhasil ditolak)      : ${TN}`);
  console.log(`False Positives (FP - Noise bocor disangka hewan)   : ${FP}`);
  console.log(`False Negatives (FN - Hewan asli tertolak noise)   : ${FN}`);
  console.log('--------------------------------------------------------------');
  console.log(`🎯 Overall Accuracy : ${(accuracy * 100).toFixed(2)}%`);
  console.log(`🎯 Precision        : ${(precision * 100).toFixed(2)}%`);
  console.log(`🎯 Sensitivity/Recall: ${(recall * 100).toFixed(2)}%`);
  console.log(`🎯 Specificity      : ${(specificity * 100).toFixed(2)}%`);
  console.log(`🎯 F1-Score         : ${(f1 * 100).toFixed(2)}%`);
  console.log('==============================================================\n');

  console.log('🛡️ ALASAN PENOLAKAN SUARA LINGKUNGAN / NOISE (TN Breakdown):');
  for (const [k, v] of Object.entries(noiseBreakdown)) {
    console.log(`  - ${k}: ${v} file`);
  }

  console.log('\n🐾 DISTRIBUSI INTENSI HEWAN YANG TERDETEKSI (TP Breakdown):');
  for (const [k, v] of Object.entries(intentDistribution)) {
    console.log(`  - ${k}: ${v} kali`);
  }
}

runExtremeStressTest().catch(console.error);

