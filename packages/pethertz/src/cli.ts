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
    const demoSpecies = args[1]?.toLowerCase() === 'dog' ? 'dog' : 'cat';
    console.log(`\n\x1b[36m[PetHertz]\x1b[0m Running synthetic simulation for species: \x1b[1m${demoSpecies.toUpperCase()}\x1b[0m\n`);

    const engine = new PetHertz({
      interpreter: demoSpecies === 'dog' ? new DogInterpreter() : new CatInterpreter(),
    });

    // Generate synthetic audio
    const sampleRate = 16000;
    const durSec = demoSpecies === 'dog' ? 0.35 : 0.7;
    const nSamples = Math.floor(sampleRate * durSec);
    const audio = new Float32Array(nSamples);
    const f0Base = demoSpecies === 'dog' ? 420 : 800;

    for (let i = 0; i < nSamples; i++) {
      const t = i / sampleRate;
      const f0 = demoSpecies === 'cat' ? f0Base + 120 * (t / durSec) : f0Base - 50 * (t / durSec);
      const env = Math.sin((Math.PI * t) / durSec);
      audio[i] = (0.25 * Math.sin(2 * Math.PI * f0 * t) + 0.12 * Math.sin(4 * Math.PI * f0 * t)) * env;
    }

    const res = await engine.analyze(audio, { sampleRate });

    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      printReport(res);
    }
    return;
  }

  if (command === 'analyze') {
    const filePath = args[1];
    if (!filePath || filePath.startsWith('-')) {
      console.error('\x1b[31mError:\x1b[0m Please provide a path to a WAV file: pethertz analyze <file.wav>');
      process.exit(1);
    }

    let wavBytes: Buffer;
    try {
      wavBytes = await readFile(filePath);
    } catch (err: any) {
      console.error(`\x1b[31mError reading audio file '${filePath}':\x1b[0m ${err.message}`);
      process.exit(1);
    }

    const decoded = decodeWav(wavBytes);
    const interpreter =
      species === 'cat'
        ? new CatInterpreter()
        : species === 'dog'
        ? new DogInterpreter()
        : new UniversalPetInterpreter();

    const engine = new PetHertz({ interpreter });
    const res = await engine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });

    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      printReport(res);
    }
    return;
  }

  if (command === 'inspect') {
    const filePath = args[1];
    if (!filePath || filePath.startsWith('-')) {
      console.error('\x1b[31mError:\x1b[0m Please provide a path to a WAV file: pethertz inspect <file.wav>');
      process.exit(1);
    }

    const wavBytes = await readFile(filePath);
    const decoded = decodeWav(wavBytes);
    const engine = new PetHertz();
    const res = await engine.analyze(decoded.audioData, { sampleRate: decoded.sampleRate });

    console.log(JSON.stringify(res.acousticMetrics, null, 2));
    return;
  }

  console.error(`\x1b[31mUnknown command: ${command}\x1b[0m`);
  printHelp();
  process.exit(1);
}

function printReport(res: any) {
  const m = res.acousticMetrics;
  const emo = res.affectiveDimensions;
  const isDog = res.species === 'dog';
  const icon = isDog ? '🐶' : res.species === 'cat' ? '🐱' : '🐾';

  console.log(`${icon} \x1b[1m\x1b[36mPETHERTZ BIOACOUSTIC INTERPRETATION REPORT\x1b[0m`);
  console.log('=====================================================');
  console.log(`Species          : \x1b[1m${res.species.toUpperCase()}\x1b[0m`);
  console.log(`Vocalization     : \x1b[33m${res.vocalization}\x1b[0m`);
  console.log(`Inferred Intent  : \x1b[32m${res.intent}\x1b[0m (Confidence: ${Math.round(res.confidence * 100)}%)`);

  if (emo) {
    console.log(
      `Affective State  : Valence: ${emo.valence >= 0 ? '+' : ''}${emo.valence} | Arousal: ${emo.arousal} | Urgency: ${emo.urgency.toUpperCase()}`
    );
  }

  console.log(
    `Pitch F0         : ${m.fundamentalFrequencyHz.toFixed(1)} Hz [${m.pitchContour}] (Jitter: ${(m.pitchJitter * 100).toFixed(1)}%)`
  );
  console.log(`Signal Duration  : ${m.durationMs} ms (Bursts: ${m.burstCount})`);

  if (res.segmentedEvents && res.segmentedEvents.length > 1) {
    console.log('-----------------------------------------------------');
    console.log(`Event Timeline (${res.segmentedEvents.length} segmented bursts):`);
    res.segmentedEvents.forEach((ev: any, idx: number) => {
      console.log(
        `  [#${idx + 1}] ${ev.startMs}ms - ${ev.endMs}ms (${ev.durationMs}ms): ${ev.vocalization} -> ${ev.intent}`
      );
    });
  }

  console.log('-----------------------------------------------------');
  console.log('Explanation:');
  console.log(`  ${res.humanExplanation}`);
  console.log('Recommended Action:');
  console.log(`  \x1b[36m${res.actionRecommendation}\x1b[0m`);
  console.log('=====================================================\n');
}

main().catch(console.error);
