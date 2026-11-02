import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface EscRow {
  filename: string;
  fold: number;
  target: number;
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
  const targetDir = path.resolve('test-benchmarks/ood-dataset');
  await mkdir(targetDir, { recursive: true });

  console.log('📡 Fetching official ESC-50 metadata...');
  const res = await fetch('https://raw.githubusercontent.com/karolpiczak/ESC-50/master/meta/esc50.csv');
  const text = await res.text();
  const lines = text.trim().split('\n');

  const rows: EscRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(',');
    rows.push({
      filename: parts[0]!,
      fold: parseInt(parts[1]!, 10),
      target: parseInt(parts[2]!, 10),
      category: parts[3]!,
    });
  }

  // Already used filenames from massive-dataset (to ensure 100% strictly unseen files)
  const existingFiles = new Set([
    '1-34094-A-5.wav', '1-34094-B-5.wav', '1-47819-A-5.wav', '1-47819-B-5.wav', '1-47819-C-5.wav',
    '1-56380-A-5.wav', '1-56380-B-5.wav', '1-79113-A-5.wav', '2-110010-A-5.wav', '2-110011-A-5.wav',
    '1-100032-A-0.wav', '1-110389-A-0.wav', '1-30226-A-0.wav', '1-30344-A-0.wav', '1-32318-A-0.wav',
    '1-59513-A-0.wav', '1-85362-A-0.wav', '1-97392-A-0.wav', '2-114280-A-0.wav', '2-114587-A-0.wav',
    '2-116400-A-0.wav', '2-117271-A-0.wav', '2-118072-A-0.wav', '2-118964-A-0.wav', '2-122104-A-0.wav',
    '2-122104-B-0.wav', '3-136288-A-0.wav', '3-144028-A-0.wav', '3-155312-A-0.wav', '3-157695-A-0.wav',
    '3-163459-A-0.wav', '3-170015-A-0.wav', '3-180256-A-0.wav', '3-180977-A-0.wav', '4-182395-A-0.wav',
  ]);

  // Brand New Categories Never Tested Before:
  // 1. Unseen Authentic Pets:
  //    - 15 Unseen Cats (ESC-50 folds 3, 4, 5)
  //    - 15 Unseen Dogs (ESC-50 folds 4, 5)
  // 2. Wild / Farm Animals (Biological Distractors):
  //    - rooster: 5
  //    - crow: 5
  //    - frog: 5
  //    - sheep: 5
  //    - cow: 5
  //    - chirping_birds: 5
  // 3. Human Non-Speech Vocalizations:
  //    - laughing: 5 (rhythmic bursts like barks)
  //    - breathing: 5 (canine panting mirror)
  // 4. Acoustic Environment & Transients:
  //    - door_wood_knock: 5 (impulsive knocks)
  //    - thunderstorm: 5 (low rumble mirror to purr)
  //    - chainsaw: 5 (high buzzing motor)
  //    - church_bells: 5 (resonant acoustic tones)

  const newTargetCategories: { [cat: string]: number } = {
    cat: 15,
    dog: 15,
    rooster: 5,
    crow: 5,
    frog: 5,
    sheep: 5,
    cow: 5,
    chirping_birds: 5,
    laughing: 5,
    breathing: 5,
    door_wood_knock: 5,
    thunderstorm: 5,
    chainsaw: 5,
    church_bells: 5,
  };

  const selectedFiles: { filename: string; category: string }[] = [];
  const counts: { [cat: string]: number } = {};

  for (const row of rows) {
    if (existingFiles.has(row.filename)) continue; // strictly skip previously tested files

    const quota = newTargetCategories[row.category];
    if (quota !== undefined) {
      const current = counts[row.category] ?? 0;
      if (current < quota) {
        selectedFiles.push({ filename: row.filename, category: row.category });
        counts[row.category] = current + 1;
      }
    }
  }

  console.log(`🎯 Selected ${selectedFiles.length} brand new, completely unseen audio files:`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   - ${k.padEnd(20)}: ${v} files`);
  }

  let downloaded = 0;
  console.log('🚀 Downloading OOD audio files (8 concurrent workers)...');

  await runPool(selectedFiles, 8, async (file) => {
    const isPet = file.category === 'cat' || file.category === 'dog';
    const prefix = isPet ? `${file.category}_` : 'noise_';
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
    } catch (e: any) {
      console.error(`Failed to download ${file.filename}: ${e.message}`);
    }
  });

  console.log(`✅ Successfully downloaded ${downloaded} brand new OOD audio files to ${targetDir}!`);
}

main().catch(console.error);

