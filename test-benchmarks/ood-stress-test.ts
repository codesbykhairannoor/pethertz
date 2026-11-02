import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PetHertz, decodeWav } from '@pethertz/core';

interface BenchmarkResult {
  file: string;
  expectedCategory: 'cat' | 'dog' | 'noise';
  subCategory: string;
  actualIsAnimal: boolean;
  predictedSpecies: string;
  predictedVocalization: string;
  predictedIntent: string;
  status: string;
  score: number;
  rejectionReason?: string;
  valence: number;
  arousal: number;
  f0: number;
  jitter: number;
  classification: 'TP' | 'TN' | 'FP' | 'FN';
}

async function runOodStressTest() {
  const datasetDir = path.resolve('test-benchmarks/ood-dataset');
  const files = (await readdir(datasetDir)).filter((f) => f.endsWith('.wav'));

  console.log('\n========================================================================');
  console.log('🔥 PETHERTZ OUT-OF-DISTRIBUTION (OOD) WILD STRESS-TEST');
  console.log(`⚡ Testing ${files.length} Brand New, Completely Unseen Audio Files`);
  console.log('   (Unseen Pets vs Wild Farm Animals, Nature, Human Laughing/Breathing, Urban Noises)');
  console.log('========================================================================\n');

  // Use zero-configuration Universal PetHertz engine
  const engine = new PetHertz();

  const results: BenchmarkResult[] = [];

  const noiseBreakdown: { [subCat: string]: { total: number; rejected: number; leaked: number } } = {};
  const petBreakdown: { [subCat: string]: { total: number; detected: number; rejected: number } } = {};

  let TP = 0;
  let TN = 0;
  let FP = 0;
  let FN = 0;

  for (const file of files) {
    const filePath = path.join(datasetDir, file);
    const wavBytes = await readFile(filePath);
    const decoded = decodeWav(wavBytes);

    let expectedCategory: 'cat' | 'dog' | 'noise';
    let subCategory: string;

    if (file.startsWith('cat_')) {
      expectedCategory = 'cat';
      subCategory = 'cat';
    } else if (file.startsWith('dog_')) {
      expectedCategory = 'dog';
      subCategory = 'dog';
    } else {
      expectedCategory = 'noise';
      const parts = file.replace('noise_', '').split('_');
      subCategory = parts.slice(0, parts.length - 1).join('_') || parts[0]!;
    }

    const res = await engine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });
    const isAnimal = res.isAnimalVocalization;
    const gatekeeper = res.acousticMetrics.gatekeeper;
    const reason = gatekeeper.rejectionReason;

    let classification: 'TP' | 'TN' | 'FP' | 'FN';

    if (expectedCategory === 'noise') {
      if (!noiseBreakdown[subCategory]) {
        noiseBreakdown[subCategory] = { total: 0, rejected: 0, leaked: 0 };
      }
      noiseBreakdown[subCategory]!.total++;

      if (!isAnimal) {
        TN++;
        classification = 'TN';
        noiseBreakdown[subCategory]!.rejected++;
      } else {
        FP++;
        classification = 'FP';
        noiseBreakdown[subCategory]!.leaked++;
      }
    } else {
      if (!petBreakdown[expectedCategory]) {
        petBreakdown[expectedCategory] = { total: 0, detected: 0, rejected: 0 };
      }
      petBreakdown[expectedCategory]!.total++;

      if (isAnimal) {
        TP++;
        classification = 'TP';
        petBreakdown[expectedCategory]!.detected++;
      } else {
        FN++;
        classification = 'FN';
        petBreakdown[expectedCategory]!.rejected++;
      }
    }

    results.push({
      file,
      expectedCategory,
      subCategory,
      actualIsAnimal: isAnimal,
      predictedSpecies: res.species,
      predictedVocalization: res.vocalization,
      predictedIntent: res.intent,
      status: gatekeeper.status,
      score: gatekeeper.biologicalPlausibilityScore,
      rejectionReason: reason,
      valence: res.affectiveDimensions?.valence ?? 0,
      arousal: res.affectiveDimensions?.arousal ?? 0,
      f0: res.acousticMetrics.fundamentalFrequencyHz,
      jitter: Math.round((res.acousticMetrics.pitchJitter ?? 0) * 1000) / 10,
      classification,
    });
  }

  // Print summary breakdown of hard negatives
  console.log('🛡️ OUT-OF-DISTRIBUTION NOISE BREAKDOWN:');
  console.log('| Distractor Category        | Total | Rejected (TN) | Leaked (FP) | Rejection Rate (%) |');
  console.log('| :---                       | :---: | :---: | :---: | :---: |');
  for (const [subCat, stats] of Object.entries(noiseBreakdown)) {
    const rate = ((stats.rejected / stats.total) * 100).toFixed(1);
    const icon = stats.leaked === 0 ? '✅' : '⚠️';
    console.log(`| ${subCat.padEnd(26)} | ${stats.total} | ${stats.rejected} | ${stats.leaked} | ${icon} ${rate}% |`);
  }

  // Print summary breakdown of real pets
  console.log('\n🐾 UNSEEN AUTHENTIC PET BREAKDOWN:');
  console.log('| Target Species | Total | Detected (TP) | False Rejection (FN) | Recall (%) |');
  console.log('| :---           | :---: | :---: | :---: | :---: |');
  for (const [subCat, stats] of Object.entries(petBreakdown)) {
    const rate = ((stats.detected / stats.total) * 100).toFixed(1);
    const icon = stats.rejected === 0 ? '✅' : '⚠️';
    console.log(`| ${subCat.padEnd(14)} | ${stats.total} | ${stats.detected} | ${stats.rejected} | ${icon} ${rate}% |`);
  }

  // Compute Scientific Metrics
  const total = TP + TN + FP + FN;
  const accuracy = total > 0 ? (TP + TN) / total : 0;
  const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
  const recall = TP + FN > 0 ? TP / (TP + FN) : 0;
  const specificity = TN + FP > 0 ? TN / (TN + FP) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log('\n========================================================================');
  console.log('📊 OFFICIAL OUT-OF-DISTRIBUTION SCORECARD (90 NEW AUDIO FILES):');
  console.log('========================================================================');
  console.log(`True Positives  (TP - Unseen pet correctly detected)     : ${TP} / 30`);
  console.log(`True Negatives  (TN - New noise successfully rejected)   : ${TN} / 60`);
  console.log(`False Positives (FP - Noise leaked as pet vocalization)  : ${FP}`);
  console.log(`False Negatives (FN - Unseen pet vocalization missed)    : ${FN}`);
  console.log('------------------------------------------------------------------------');
  console.log(`🎯 Overall Accuracy : ${(accuracy * 100).toFixed(2)}%`);
  console.log(`🎯 Precision        : ${(precision * 100).toFixed(2)}%`);
  console.log(`🎯 Sensitivity/Recall: ${(recall * 100).toFixed(2)}%`);
  console.log(`🎯 Specificity      : ${(specificity * 100).toFixed(2)}%`);
  console.log(`🎯 F1-Score         : ${(f1 * 100).toFixed(2)}%`);
  console.log('========================================================================\n');

  // Print any leaks or errors
  const errors = results.filter((r) => r.classification === 'FP' || r.classification === 'FN');
  if (errors.length > 0) {
    console.log(`⚠️ ANOMALIES / CLASSIFICATION ERRORS (${errors.length} files):`);
    for (const err of errors) {
      console.log(
        ` - [${err.classification}] File: ${err.file} | Expected: ${err.expectedCategory} | SubCat: ${err.subCategory} | F0: ${err.f0}Hz | Jitter: ${err.jitter}% | Score: ${err.score} | Reason: ${err.rejectionReason} | PredSpecies: ${err.predictedSpecies}`
      );
    }
  } else {
    console.log('🏆 INCREDIBLE! Zero False Positives and Zero False Negatives across all 90 brand new files!');
  }
}

runOodStressTest().catch(console.error);

