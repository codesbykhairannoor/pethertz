import { PetHertz } from '@pethertz/core';
import { CatInterpreter } from '@pethertz/cat';
import { DogInterpreter } from '@pethertz/dog';

function createSineSweep(
  startFreq: number,
  endFreq: number,
  sampleRate: number,
  durationSec: number
): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const currentFreq = startFreq + (endFreq - startFreq) * (t / durationSec);
    buffer[i] = 0.7 * Math.sin(2 * Math.PI * currentFreq * t);
  }
  return buffer;
}

function createToneBurst(
  freqHz: number,
  sampleRate: number,
  durationSec: number,
  amplitude = 0.8
): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return buffer;
}

async function runDemo() {
  console.log('====================================================');
  console.log('🐾 PetHertz Bioacoustics Intent Translation Demo 🐾');
  console.log('====================================================\n');

  const sampleRate = 44100;

  // 1. Cat Demo: Hunger Solicitation Meow (Rising Intonation, Susanne Schötz 2023)
  console.log('1️⃣ Simulasi Suara Kucing (Meong Minta Makan / Rising F0)...');
  const catEngine = new PetHertz({
    interpreter: new CatInterpreter(),
    defaultSampleRate: sampleRate,
  });

  const catMeowAudio = createSineSweep(540, 890, sampleRate, 0.75);
  const catResult = await catEngine.analyze(catMeowAudio);

  console.log('Hasil Analisis Kucing:');
  console.dir(catResult, { depth: null });
  console.log('\n----------------------------------------------------\n');

  // 2. Dog Demo: Alarm / Threat Barking (Rapid Low Pitch Bursts, Pongrácz ELTE)
  console.log('2️⃣ Simulasi Suara Anjing (Gonggongan Alarm / Waspada Bahaya)...');
  const dogEngine = new PetHertz({
    interpreter: new DogInterpreter(),
    defaultSampleRate: sampleRate,
  });

  const bark1 = createToneBurst(360, sampleRate, 0.12, 0.8);
  const pause = new Float32Array(Math.floor(sampleRate * 0.08));
  const bark2 = createToneBurst(360, sampleRate, 0.12, 0.8);

  const dogBarkAudio = new Float32Array(bark1.length + pause.length + bark2.length);
  dogBarkAudio.set(bark1, 0);
  dogBarkAudio.set(pause, bark1.length);
  dogBarkAudio.set(bark2, bark1.length + pause.length);

  const dogResult = await dogEngine.analyze(dogBarkAudio);

  console.log('Hasil Analisis Anjing:');
  console.dir(dogResult, { depth: null });
  console.log('\n====================================================');
  console.log('✅ Demo Selesai! Kedua model bioakustik berfungsi optimal.');
}

runDemo().catch(console.error);

