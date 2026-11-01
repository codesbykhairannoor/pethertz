import fs from 'node:fs';

async function fetchFullAudit() {
  const env = fs.readFileSync('.env', 'utf-8');
  const key = 'LLM_2348942002539622__yTHCS0-q4ZdBIMxq1SlryiiCNY';
  const p = `Anda adalah Ahli Bioakustik & Audio DSP Senior.
Berikut adalah arsitektur sistem kami (PetHertz) yang mendeteksi suara kucing dan anjing:
- YIN pitch tracking (20-3500 Hz) dengan pembobotan energi RMS.
- Acoustic Allometry & Formant Dispersion via LPC Levinson-Durbin (mengestimasi Vocal Tract Length L = c / (2 * Delta F)).
- 13-band MFCC dan Wiener Spectral Flatness entropy.
- Gatekeeper untuk menolak klakson, suara mesin, batuk manusia, bersin, dan tangisan bayi.
- Susanne Schötz 2023 rules untuk kucing (rising/falling F0) dan Pongrácz rules untuk anjing.

Lakukan audit kritis, skeptis, dan menyeluruh:
1. Di mana saja letak cacat logika, asumsi yang terlalu kaku (brittle heuristics), atau kelemahan fatal dalam arsitektur aturan di atas?
2. Apakah formula fisika Formant Dispersion (Delta F) dan Vocal Tract Length (L = c / (2 * Delta F)) via LPC Levinson-Durbin akurat untuk kucing dan anjing, atau ada potensi jebakan/kegagalan saat diaplikasikan ke audio di dunia nyata?
3. Sebutkan minimal 5 skenario audio dunia nyata yang paling berpotensi "menipu" sistem ini:
   - Skenario yang berpotensi lolos sebagai hewan padahal bukan (False Positive).
   - Skenario suara hewan asli yang berpotensi salah ditolak sebagai noise (False Negative).
4. Bagaimana mitigasi dan rekomendasi arsitektur perbaikannya agar library ini benar-benar tangguh untuk produksi dan rilis ke publik (NPM)?

Tulis laporan lengkap, terstruktur, dan teknis!`;

  console.log('Sending query to Meta AI / Muse Wonder...');
  const res = await fetch('https://api.meta.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'muse-wonder-1.0',
      messages: [{ role: 'user', content: p }]
    })
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    fs.writeFileSync('AI_ADVERSARIAL_AUDIT_REPORT.md', content, 'utf-8');
    console.log('Saved to AI_ADVERSARIAL_AUDIT_REPORT.md (' + content.length + ' chars)');
  } else {
    console.log('No content returned, finish_reason:', data.choices?.[0]?.finish_reason);
  }
}

fetchFullAudit().catch(console.error);

