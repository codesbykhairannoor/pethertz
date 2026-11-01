import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function downloadExtremeDataset() {
  const targetDir = path.resolve('test-benchmarks/extreme-dataset');
  await mkdir(targetDir, { recursive: true });

  console.log('🚀 Mengunduh dataset uji ekstrem: 70 file audio riil...');

  // 1. Cat files from haydenroche5/meow_dataset (Kaggle/YouTube)
  const catFiles = [
    'kaggle_cat_10_0.wav', 'kaggle_cat_10_1.wav', 'kaggle_cat_10_2.wav', 'kaggle_cat_10_3.wav',
    'kaggle_cat_11_0.wav', 'kaggle_cat_11_1.wav', 'kaggle_cat_11_2.wav', 'kaggle_cat_12_0.wav',
    'kaggle_cat_12_1.wav', 'kaggle_cat_13_0.wav', 'kaggle_cat_13_1.wav', 'kaggle_cat_14_0.wav',
    'kaggle_cat_15_0.wav', 'kaggle_cat_16_0.wav', 'kaggle_cat_17_0.wav', 'kaggle_cat_18_0.wav',
    'kaggle_cat_19_0.wav', 'kaggle_cat_20_0.wav', 'kaggle_cat_21_0.wav', 'kaggle_cat_22_0.wav',
    'kaggle_cat_23_0.wav', 'kaggle_cat_24_0.wav', 'kaggle_cat_25_0.wav', 'kaggle_cat_26_0.wav',
    'kaggle_cat_27_0.wav'
  ];

  // 2. Dog files from ESC-50 (Fold 1)
  const dogFiles = [
    '1-100032-A-0.wav', '1-110389-A-0.wav', '1-30226-A-0.wav', '1-30344-A-0.wav',
    '1-32318-A-0.wav', '1-59513-A-0.wav', '1-85362-A-0.wav', '1-97392-A-0.wav',
    '2-114587-A-0.wav', '2-118072-A-0.wav', '5-203128-A-0.wav'
  ];

  // 3. Negative Control / Distractor noise files from ESC-50
  const noiseFiles = [
    // Domestic sounds
    '1-19872-A-36.wav', // washing machine
    '1-32218-A-37.wav', // vacuum cleaner
    '1-21935-A-38.wav', // clock tick
    '1-26177-A-39.wav', // glass breaking
    '1-18755-A-30.wav', // door wood knock
    '1-21187-A-31.wav', // mouse click
    '1-20133-A-32.wav', // keyboard typing
    // Human non-speech
    '1-22694-A-20.wav', // crying baby
    '1-26143-A-21.wav', // sneezing
    '1-21896-A-22.wav', // clapping
    '1-1961-A-23.wav',  // breathing
    '1-19111-A-24.wav', // coughing
    '1-26143-A-25.wav', // footsteps / laugh
    '1-20545-A-28.wav', // snoring
    // Environmental & Urban
    '1-17150-A-12.wav', // crackling fire
    '1-24074-A-43.wav', // car horn
    '1-18040-A-42.wav', // siren
    '1-11687-A-47.wav', // airplane
    '1-17565-A-48.wav', // fireworks
    '1-26143-A-10.wav', // rain
    '1-15582-A-14.wav', // chirping birds
    '1-18527-A-44.wav', // engine
    '1-16568-A-45.wav', // train
    '1-20133-A-19.wav'  // thunderstorm
  ];

  let downloaded = 0;

  // Download Cats
  for (const f of catFiles) {
    const url = 'https://raw.githubusercontent.com/haydenroche5/meow_dataset/master/meow/' + f;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(path.join(targetDir, 'cat_' + f), buf);
        downloaded++;
      }
    } catch {}
  }

  // Download Dogs
  for (const f of dogFiles) {
    const url = 'https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/' + f;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(path.join(targetDir, 'dog_' + f), buf);
        downloaded++;
      }
    } catch {}
  }

  // Download Noises
  for (const f of noiseFiles) {
    const url = 'https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/' + f;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(path.join(targetDir, 'noise_' + f), buf);
        downloaded++;
      }
    } catch {}
  }

  console.log(`✅ Berhasil mengunduh ${downloaded} file audio riil ke folder test-benchmarks/extreme-dataset/`);
}

downloadExtremeDataset().catch(console.error);

