import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PetHertz, decodeWav } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';

interface TestResult {
  file: string;
  expectedCategory: 'cat' | 'dog' | 'noise';
  subCategory: string;
  actualIsAnimal: boolean;
  predictedSpecies: string;
  predictedVocalization: string;
  predictedIntent: string;
  score: number;
  rejectionReason?: string;
  classification: 'TP' | 'TN' | 'FP' | 'FN';
}

async function runExtremeStressTest() {
  const dir = path.resolve('test-benchmarks/extreme-dataset');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.wav'));

  console.log('\n========================================================================');
  console.log('⚡ PETHERTZ EXTREME REAL-WORLD BENCHMARK (DATASET 3)');
  console.log(`⚡ Testing ${files.length} Audio Files (Unseen Cats, Dogs, and Environmental Noises)`);
  console.log('========================================================================\n');

  const catEngine = new PetHertz({ interpreter: new CatInterpreter() });
  const dogEngine = new PetHertz({ interpreter: new DogInterpreter() });

  const results: TestResult[] = [];
  let TP = 0;
  let TN = 0;
  let FP = 0;
  let FN = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const buf = await readFile(fullPath);
    const decoded = decodeWav(buf);

    let expectedCategory: 'cat' | 'dog' | 'noise' = 'noise';
    let subCategory = 'noise';

    if (file.startsWith('cat_')) {
      expectedCategory = 'cat';
      subCategory = 'cat';
    } else if (file.startsWith('dog_')) {
      expectedCategory = 'dog';
      subCategory = 'dog';
    } else {
      expectedCategory = 'noise';
      subCategory = file.replace('noise_', '').split('.')[0] || 'noise';
    }

    let isAnimal = false;
    let res: any;

    if (expectedCategory === 'noise') {
      // Symmetrical Hard Negative Check: Both engines test the noise!
      const catRes = await catEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });
      const dogRes = await dogEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });
      isAnimal = catRes.isAnimalVocalization || dogRes.isAnimalVocalization;
      res = isAnimal ? (catRes.isAnimalVocalization ? catRes : dogRes) : catRes;

      if (!isAnimal) {
        TN++;
        results.push({
          file,
          expectedCategory,
          subCategory,
          actualIsAnimal: isAnimal,
          predictedSpecies: res.species,
          predictedVocalization: res.vocalization,
          predictedIntent: res.intent,
          score: res.acousticMetrics.gatekeeper.biologicalPlausibilityScore,
          rejectionReason: res.acousticMetrics.gatekeeper.rejectionReason,
          classification: 'TN',
        });
      } else {
        FP++;
        results.push({
          file,
          expectedCategory,
          subCategory,
          actualIsAnimal: isAnimal,
          predictedSpecies: res.species,
          predictedVocalization: res.vocalization,
          predictedIntent: res.intent,
          score: res.acousticMetrics.gatekeeper.biologicalPlausibilityScore,
          rejectionReason: res.acousticMetrics.gatekeeper.rejectionReason,
          classification: 'FP',
        });
      }
    } else {
      const activeEngine = expectedCategory === 'cat' ? catEngine : dogEngine;
      res = await activeEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });
      isAnimal = res.isAnimalVocalization;

      if (isAnimal) {
        TP++;
        results.push({
          file,
          expectedCategory,
          subCategory,
          actualIsAnimal: isAnimal,
          predictedSpecies: res.species,
          predictedVocalization: res.vocalization,
          predictedIntent: res.intent,
          score: res.acousticMetrics.gatekeeper.biologicalPlausibilityScore,
          rejectionReason: res.acousticMetrics.gatekeeper.rejectionReason,
          classification: 'TP',
        });
      } else {
        FN++;
        results.push({
          file,
          expectedCategory,
          subCategory,
          actualIsAnimal: isAnimal,
          predictedSpecies: res.species,
          predictedVocalization: res.vocalization,
          predictedIntent: res.intent,
          score: res.acousticMetrics.gatekeeper.biologicalPlausibilityScore,
          rejectionReason: res.acousticMetrics.gatekeeper.rejectionReason,
          classification: 'FN',
        });
      }
    }
  }

  const catTP = results.filter((r) => r.expectedCategory === 'cat' && r.classification === 'TP').length;
  const catTotal = results.filter((r) => r.expectedCategory === 'cat').length;
  const dogTP = results.filter((r) => r.expectedCategory === 'dog' && r.classification === 'TP').length;
  const dogTotal = results.filter((r) => r.expectedCategory === 'dog').length;
  const noiseTN = results.filter((r) => r.expectedCategory === 'noise' && r.classification === 'TN').length;
  const noiseTotal = results.filter((r) => r.expectedCategory === 'noise').length;

  console.log('🛡️ DISTRACTOR NOISE REJECTION:');
  console.log(` - Noises Tested   : ${noiseTotal}`);
  console.log(` - Noises Rejected : ${noiseTN} / ${noiseTotal} (${((noiseTN / noiseTotal) * 100).toFixed(1)}%)`);
  console.log(` - Noises Leaked   : ${FP}`);

  console.log('\n🐾 AUTHENTIC PET RECALL:');
  console.log(` - Cats Detected   : ${catTP} / ${catTotal} (${((catTP / catTotal) * 100).toFixed(1)}%)`);
  console.log(` - Dogs Detected   : ${dogTP} / ${dogTotal} (${((dogTP / dogTotal) * 100).toFixed(1)}%)`);
  console.log(` - Total Pet Recall: ${TP} / ${catTotal + dogTotal} (${((TP / (catTotal + dogTotal)) * 100).toFixed(1)}%)`);

  const total = TP + TN + FP + FN;
  const accuracy = total > 0 ? (TP + TN) / total : 0;
  const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
  const recall = TP + FN > 0 ? TP / (TP + FN) : 0;
  const specificity = TN + FP > 0 ? TN / (TN + FP) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log('\n========================================================================');
  console.log('📊 OFFICIAL EXTREME BENCHMARK SCORECARD:');
  console.log('========================================================================');
  console.log(`True Positives  (TP - Pet correctly detected)       : ${TP} / ${catTotal + dogTotal}`);
  console.log(`True Negatives  (TN - Noise successfully rejected)  : ${TN} / ${noiseTotal}`);
  console.log(`False Positives (FP - Noise leaked as pet)          : ${FP}`);
  console.log(`False Negatives (FN - Pet vocalization missed)      : ${FN}`);
  console.log('------------------------------------------------------------------------');
  console.log(`🎯 Overall Accuracy : ${(accuracy * 100).toFixed(2)}%`);
  console.log(`🎯 Precision        : ${(precision * 100).toFixed(2)}%`);
  console.log(`🎯 Recall / Sens.   : ${(recall * 100).toFixed(2)}%`);
  console.log(`🎯 Specificity      : ${(specificity * 100).toFixed(2)}%`);
  console.log(`🎯 F1-Score         : ${(f1 * 100).toFixed(2)}%`);
  console.log('========================================================================\n');

  const errors = results.filter((r) => r.classification === 'FP' || r.classification === 'FN');
  if (errors.length > 0) {
    console.log(`⚠️ ANOMALIES (${errors.length} files):`);
    for (const e of errors) {
      console.log(` - [${e.classification}] ${e.file} | Expected: ${e.expectedCategory} | Score: ${e.score} | Reason: ${e.rejectionReason}`);
    }
  } else {
    console.log('🏆 PERFECT SCORE! 100% Accuracy, Zero False Positives and Zero False Negatives!');
  }
}

runExtremeStressTest().catch(console.error);
