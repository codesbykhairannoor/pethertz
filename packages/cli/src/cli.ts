#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { PetHertz, UniversalPetInterpreter, decodeWav } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
🐾 \x1b[1m\x1b[36mPetHertz CLI - Pet Bioacoustic Vocalization Interpreter\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  pethertz <command> [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[32manalyze <file.wav>\x1b[0m    Analyze a WAV audio file and interpret pet vocalization (auto-detects cat/dog)
  \x1b[32minspect <file.wav>\x1b[0m    Display raw bioacoustic metrics (F0, RMS, ZCR, STFT Centroid, Formants, VTL)
  \x1b[32mdemo [cat|dog]\x1b[0m        Run a synthetic audio simulation directly in the terminal

\x1b[1mOPTIONS:\x1b[0m
  --species <auto|cat|dog> Specify target pet species (default: 'auto')
  --json                Output clean JSON format
  --help, -h            Show this help message

\x1b[1mEXAMPLES:\x1b[0m
  $ pethertz analyze cat_meow.wav --species cat
  $ pethertz analyze dog_bark.wav --species dog --json
  $ pethertz inspect audio.wav
  $ pethertz demo cat
`);
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const command = args[0];
  const isJson = args.includes('--json');

  let species: 'auto' | 'cat' | 'dog' = 'auto';
  const speciesIdx = args.indexOf('--species');
  if (speciesIdx !== -1 && args[speciesIdx + 1]) {
    const s = args[speciesIdx + 1]?.toLowerCase();
    if (s === 'dog' || s === 'cat' || s === 'auto') {
      species = s as any;
    }
  }

  if (command === 'demo') {
    const targetSpecies = args[1]?.toLowerCase() === 'dog' ? 'dog' : 'cat';
    console.log(`\n\x1b[35m[PetHertz]\x1b[0m Running synthetic simulation for species: \x1b[1m${targetSpecies.toUpperCase()}\x1b[0m\n`);

    const sr = 44100;
    if (targetSpecies === 'cat') {
      const len = Math.floor(sr * 0.7);
      const buf = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 550 + (900 - 550) * (t / 0.7);
        buf[i] = 0.7 * Math.sin(2 * Math.PI * freq * t);
      }
      const engine = new PetHertz({ interpreter: new CatInterpreter(), defaultSampleRate: sr });
      const res = await engine.analyze(buf);
      printResult(res, isJson);
    } else {
      const b1Len = Math.floor(sr * 0.12);
      const pLen = Math.floor(sr * 0.08);
      const b2Len = Math.floor(sr * 0.12);
      const buf = new Float32Array(b1Len + pLen + b2Len);
      for (let i = 0; i < b1Len; i++) buf[i] = 0.8 * Math.sin((2 * Math.PI * 340 * i) / sr);
      for (let i = 0; i < b2Len; i++) buf[b1Len + pLen + i] = 0.8 * Math.sin((2 * Math.PI * 340 * i) / sr);
      const engine = new PetHertz({ interpreter: new DogInterpreter(), defaultSampleRate: sr });
      const res = await engine.analyze(buf);
      printResult(res, isJson);
    }
    return;
  }

  if (command === 'analyze' || command === 'inspect') {
    const filePath = args[1];
    if (!filePath || filePath.startsWith('--')) {
      console.error('\x1b[31mError: Please provide a valid WAV audio file path.\x1b[0m Example: pethertz analyze pet.wav');
      process.exit(1);
    }

    try {
      const fileBytes = await readFile(filePath);
      const decoded = decodeWav(fileBytes);
      const interpreter =
        species === 'dog'
          ? new DogInterpreter()
          : species === 'cat'
          ? new CatInterpreter()
          : new UniversalPetInterpreter();

      if (command === 'inspect') {
        const engine = new PetHertz({
          interpreter,
          defaultSampleRate: decoded.sampleRate,
        });
        const res = await engine.analyze(decoded.audioData);

        if (isJson) {
          console.log(JSON.stringify(res.acousticMetrics, null, 2));
        } else {
          console.log(`\n\x1b[1m\x1b[36m📊 BIOACOUSTIC METRICS REPORT (${filePath})\x1b[0m`);
          console.log(`-----------------------------------------------------`);
          console.log(`Sample Rate          : ${decoded.sampleRate} Hz`);
          console.log(`Duration             : ${decoded.durationSec} s`);
          console.log(`Fundamental (F0)     : \x1b[32m${res.acousticMetrics.fundamentalFrequencyHz} Hz\x1b[0m (Confidence: ${Math.round(res.acousticMetrics.pitchConfidence * 100)}%)`);
          console.log(`Intonation Contour   : \x1b[33m${res.acousticMetrics.intonationContour}\x1b[0m`);
          console.log(`Spectral Centroid    : ${res.acousticMetrics.spectralCentroidHz} Hz`);
          console.log(`RMS Energy           : ${res.acousticMetrics.rms}`);
          console.log(`Zero-Crossing Rate   : ${res.acousticMetrics.zeroCrossingRate}`);
          console.log(`Burst Count          : ${res.acousticMetrics.burstCount} (Interval: ${res.acousticMetrics.burstIntervalMs} ms)`);
          if (res.acousticMetrics.formants && res.acousticMetrics.formants.length > 0) {
            console.log(`Formant Resonances   : [${res.acousticMetrics.formants.join(', ')}] Hz`);
            console.log(`Formant Dispersion   : ${res.acousticMetrics.formantDispersionHz} Hz`);
            console.log(`Vocal Tract Length   : \x1b[35m${res.acousticMetrics.estimatedVocalTractLengthCm} cm\x1b[0m (${res.acousticMetrics.morphologicalCategory})`);
          }
          if (res.acousticMetrics.spectralFlatness !== undefined) {
            console.log(`Wiener Flatness      : ${res.acousticMetrics.spectralFlatness}`);
          }
          console.log(`-----------------------------------------------------\n`);
        }
        return;
      }

      // Analyze command
      const engine = new PetHertz({
        interpreter,
        defaultSampleRate: decoded.sampleRate,
      });

      const res = await engine.analyze(decoded.audioData);
      printResult(res, isJson);
    } catch (err: any) {
      console.error(`\x1b[31mError reading audio file '${filePath}':\x1b[0m`, err.message);
      process.exit(1);
    }
    return;
  }

  console.error(`\x1b[31mUnknown command: ${command}\x1b[0m`);
  printHelp();
  process.exit(1);
}

function printResult(res: any, isJson: boolean) {
  if (isJson) {
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (!res.isAnimalVocalization) {
    console.log(`\x1b[1m\x1b[31m🚫 GATEKEEPER REJECTION: NON-PET SOUND DETECTED\x1b[0m`);
    console.log(`=====================================================`);
    console.log(`Status        : \x1b[33m${res.vocalization}\x1b[0m`);
    console.log(`Filter Reason : \x1b[31m${res.acousticMetrics?.gatekeeper?.rejectionReason ?? 'Non-animal'}\x1b[0m`);
    console.log(`Explanation   : ${res.humanExplanation}`);
    console.log(`Recommendation: ${res.actionRecommendation}`);
    console.log(`=====================================================\n`);
    return;
  }

  const icon = res.species === 'cat' ? '🐱' : '🐶';
  console.log(`\x1b[1m\x1b[32m${icon} PETHERTZ BIOACOUSTIC INTERPRETATION REPORT\x1b[0m`);
  console.log(`=====================================================`);
  console.log(`Species          : \x1b[1m${res.species.toUpperCase()}\x1b[0m`);
  console.log(`Vocalization     : \x1b[36m${res.vocalization}\x1b[0m`);
  console.log(`Inferred Intent  : \x1b[1m\x1b[33m${res.intent}\x1b[0m (Confidence: ${Math.round(res.confidence * 100)}%)`);
  console.log(`Affective State  : Valence: \x1b[36m${res.affectiveDimensions?.valence}\x1b[0m | Arousal: \x1b[35m${res.affectiveDimensions?.arousal}\x1b[0m | Urgency: \x1b[31m${res.affectiveDimensions?.urgency?.toUpperCase()}\x1b[0m`);
  console.log(`Pitch F0         : ${res.acousticMetrics.fundamentalFrequencyHz} Hz [${res.acousticMetrics.intonationContour}] (Jitter: ${(res.acousticMetrics.pitchJitter * 100).toFixed(1)}%)`);
  console.log(`Signal Duration  : ${res.acousticMetrics.durationMs} ms (Bursts: ${res.acousticMetrics.burstCount})`);
  if (res.events && res.events.length > 1) {
    console.log(`-----------------------------------------------------`);
    console.log(`\x1b[1mEvent Timeline (${res.events.length} segmented bursts):\x1b[0m`);
    for (let idx = 0; idx < res.events.length; idx++) {
      const ev = res.events[idx];
      console.log(`  [#${idx + 1}] ${ev.startMs}ms - ${ev.endMs}ms (${ev.durationMs}ms): ${ev.vocalization} -> ${ev.intent}`);
    }
  }
  console.log(`-----------------------------------------------------`);
  console.log(`\x1b[1mExplanation:\x1b[0m`);
  console.log(`  ${res.humanExplanation}`);
  console.log(`\x1b[1mRecommended Action:\x1b[0m`);
  console.log(`  \x1b[35m${res.actionRecommendation}\x1b[0m`);
  console.log(`=====================================================\n`);
}

main().catch(console.error);
