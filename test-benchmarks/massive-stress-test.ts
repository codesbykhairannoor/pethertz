import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PetHertz, decodeWav } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';

interface TestSampleResult {
  file: string;
  expectedCategory: 'cat' | 'dog' | 'noise';
  subCategory: string;
  actualIsAnimal: boolean;
  predictedSpecies?: string;
  predictedIntent?: string;
  status: string;
  score: number;
  rejectionReason?: string;
  valence: number;
  arousal: number;
  f0: number;
  jitter: number;
  classification: 'TP' | 'TN' | 'FP' | 'FN';
}

async function runMassiveStressTest() {
  console.log('\n========================================================================');
  console.log('🔥 PETHERTZ MASSIVE ADVERSARIAL STRESS-TEST (100 REAL-WORLD AUDIO SUITE)');
  console.log('⚡ 50 Real Pets (Cats & Dogs) vs 50 Hard Negatives (ESC-50 Mirror Pairs)');
  console.log('========================================================================\n');

  const dir = path.resolve('test-benchmarks/massive-dataset');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.wav'));

  const catEngine = new PetHertz({ interpreter: new CatInterpreter() });
  const dogEngine = new PetHertz({ interpreter: new DogInterpreter() });

  const results: TestSampleResult[] = [];

  let TP = 0; // Real animal correctly recognized
  let TN = 0; // Hard negative correctly rejected
  let FP = 0; // Hard negative falsely classified as animal
  let FN = 0; // Real animal falsely rejected as noise

  const noiseBreakdown: { [subCat: string]: { total: number; rejected: number; leaked: number } } = {};
  const petBreakdown: { [subCat: string]: { total: number; detected: number; rejected: number } } = {};

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
      // Extract subcategory like noise_crying_baby_... -> crying_baby
      const match = file.match(/^noise_([a-z_]+?)_\d/);
      subCategory = match ? match[1]! : 'general_noise';
    }

    let isAnimal = false;
    let res: any;

    if (expectedCategory === 'noise') {
      // Symmetrical Hard Negative Evaluation: Both engines are tested!
      // A noise is ONLY a true negative if NEITHER catEngine NOR dogEngine falsely detects it as a pet.
      const catRes = await catEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });
      const dogRes = await dogEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });

      isAnimal = catRes.isAnimalVocalization || dogRes.isAnimalVocalization;
      res = isAnimal ? (catRes.isAnimalVocalization ? catRes : dogRes) : catRes;
    } else {
      const activeEngine = expectedCategory === 'dog' ? dogEngine : catEngine;
      res = await activeEngine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });
      isAnimal = res.isAnimalVocalization;
    }

    const gatekeeper = res.acousticMetrics.gatekeeper;
    const reason = gatekeeper?.rejectionReason;

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
  console.log('🛡️ BREAKDOWN EVALUASI HARD NEGATIVES (PASANGAN CERMIN):');
  console.log('| Sub-Kategori Hard Negative | Total | Tertolak (TN) | Bocor (FP) | Penahanan (%) |');
  console.log('| :--- | :---: | :---: | :---: | :---: |');
  for (const [subCat, stats] of Object.entries(noiseBreakdown)) {
    const rate = ((stats.rejected / stats.total) * 100).toFixed(1);
    const icon = stats.leaked === 0 ? '✅' : '⚠️';
    console.log(`| ${subCat.padEnd(26)} | ${stats.total} | ${stats.rejected} | ${stats.leaked} | ${icon} ${rate}% |`);
  }

  // Print summary breakdown of real pets
  console.log('\n🐾 BREAKDOWN EVALUASI SUARA HEWAN ASLI (TP vs FN):');
  console.log('| Spesies Hewan | Total | Terdeteksi (TP) | Salah Tolak (FN) | Recall (%) |');
  console.log('| :--- | :---: | :---: | :---: | :---: |');
  for (const [subCat, stats] of Object.entries(petBreakdown)) {
    const rate = ((stats.detected / stats.total) * 100).toFixed(1);
    const icon = stats.rejected === 0 ? '✅' : '⚠️';
    console.log(`| ${subCat.padEnd(13)} | ${stats.total} | ${stats.detected} | ${stats.rejected} | ${icon} ${rate}% |`);
  }

  // Compute Scientific Metrics
  const total = TP + TN + FP + FN;
  const accuracy = total > 0 ? (TP + TN) / total : 0;
  const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
  const recall = TP + FN > 0 ? TP / (TP + FN) : 0;
  const specificity = TN + FP > 0 ? TN / (TN + FP) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log('\n========================================================================');
  console.log('📊 STATISTIK CONFUSION MATRIX RESMI (100 AUDIO DATASET):');
  console.log('========================================================================');
  console.log(`True Positives  (TP - Hewan asli terdeteksi benar) : ${TP} / 50`);
  console.log(`True Negatives  (TN - Noise berhasil ditolak)      : ${TN} / 50`);
  console.log(`False Positives (FP - Noise bocor disangka hewan)   : ${FP}`);
  console.log(`False Negatives (FN - Hewan asli tertolak noise)   : ${FN}`);
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
    console.log('⚠️ DETAIL ANOMALI / KESALAHAN KLASIFIKASI:');
    for (const err of errors) {
      console.log(
        ` - [${err.classification}] File: ${err.file} | Expected: ${err.expectedCategory} | SubCat: ${err.subCategory} | F0: ${err.f0}Hz | Jitter: ${err.jitter}% | Score: ${err.score} | Reason: ${err.rejectionReason}`
      );
    }
  } else {
    console.log('🏆 SEMPURNA! Nol False Positive dan Nol False Negative di seluruh 100 file!');
  }
}

runMassiveStressTest().catch(console.error);

