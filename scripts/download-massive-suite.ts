import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface EscRow {
  filename: string;
  category: string;
}

async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]!);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const targetDir = path.resolve('test-benchmarks/massive-dataset');
  await mkdir(targetDir, { recursive: true });

  console.log('📡 Mengambil metadata ESC-50 resmi...');
  const res = await fetch('https://raw.githubusercontent.com/karolpiczak/ESC-50/master/meta/esc50.csv');
  const text = await res.text();
  const lines = text.trim().split('\n');

  const rows: EscRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(',');
    rows.push({
      filename: parts[0]!,
      category: parts[3]!,
    });
  }

  // Exactly balanced suite: 50 Real Pets vs 50 Hard Negative Mirror Pairs
  const targetCategories: { [cat: string]: number } = {
    dog: 25,
    cat: 10,
    crying_baby: 5,        // Mirror pair #1: Infant cry vs meow
    siren: 5,              // Mirror pair #2: Howl vs siren
    coughing: 5,           // Mirror pair #3: Dog bark vs human cough
    sneezing: 5,           // Sneeze vs animal snort
    snoring: 5,            // Feline dead-zone 70-180 Hz
    engine: 5,             // Engine rumble vs purr
    car_horn: 5,           // Synthetic tone vs call
    clock_tick: 5,         // Ultrasonic impulse
    glass_breaking: 5,     // Treble click
    vacuum_cleaner: 5,     // Stationary appliance motor drone
  };

  const selectedFiles: { filename: string; category: string }[] = [];
  const counts: { [cat: string]: number } = {};

  for (const row of rows) {
    const quota = targetCategories[row.category];
    if (quota !== undefined) {
      const current = counts[row.category] ?? 0;
      if (current < quota) {
        selectedFiles.push(row);
        counts[row.category] = current + 1;
      }
    }
  }

  console.log(`🎯 Terpilih ${selectedFiles.length} file dari ESC-50.`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   - ${k}: ${v} file`);
  }

  // Download ESC-50 selected files in parallel pool
  let downloaded = 0;
  console.log('🚀 Memulai pengunduhan paralel (8 worker)...');

  await runPool(selectedFiles, 8, async (file) => {
    const prefix = file.category === 'dog' ? 'dog_' : file.category === 'cat' ? 'cat_' : 'noise_';
    const outName = `${prefix}${file.category}_${file.filename}`;
    const outPath = path.join(targetDir, outName);

    try {
      const url = `https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/${file.filename}`;
      const r = await fetch(url);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        await writeFile(outPath, buf);
        downloaded++;
      }
    } catch {}
  });

  console.log(`✅ Berhasil mengunduh ${downloaded} file dari ESC-50.`);

  // Add 15 Kaggle Meow dataset files to reach exactly 25 Cats
  console.log('📡 Mengunduh 15 file Kaggle Meow...');
  const kaggleCats = [
    'kaggle_cat_10_0.wav', 'kaggle_cat_10_1.wav', 'kaggle_cat_10_2.wav', 'kaggle_cat_10_3.wav',
    'kaggle_cat_11_0.wav', 'kaggle_cat_12_0.wav', 'kaggle_cat_13_0.wav', 'kaggle_cat_14_0.wav',
    'kaggle_cat_15_0.wav', 'kaggle_cat_16_0.wav', 'kaggle_cat_18_0.wav', 'kaggle_cat_19_0.wav',
    'kaggle_cat_1_0.wav',  'kaggle_cat_20_0.wav', 'kaggle_cat_21_0.wav',
  ];

  await runPool(kaggleCats, 5, async (kf) => {
    const outPath = path.join(targetDir, `cat_${kf}`);
    const url = `https://raw.githubusercontent.com/haydenroche5/meow_dataset/master/meow/${kf}`;
    try {
      const r = await fetch(url);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        await writeFile(outPath, buf);
        downloaded++;
      }
    } catch {}
  });

  console.log(`\n🎉 SELESAI! Total file di dataset massive: ${downloaded} file audio riil.`);
}

main().catch(console.error);
