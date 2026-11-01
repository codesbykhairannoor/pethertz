# VERDICT AWAL: Klaim 100% ESC-50 Itu Bukan Prestasi. Itu Pengakuan Overfitting.

Dengar baik-baik. Di bioakustik dan audio ML, klaim **100% rejection di ESC-50** bukan bendera kemenangan. Itu *red flag* ilmiah.

ESC-50 itu cuma 2.000 klip bersih, 5 detik, curated, direkam dalam kondisi relatif terkontrol (Piczak, 2015). State-of-the-art model raksasa seperti BEATs, AST, PANNs CNN14 yang dilatih di AudioSet 2 juta klip saja tidak berani klaim 100%. Lalu kalian, dengan heuristik TypeScript tulisan tangan, tanpa neural network, mengklaim 100%?

Artinya cuma satu dari tiga: 1) threshold kalian di-*tune* langsung di test set (data leakage), 2) kalian cuma tes subset yang gampang, atau 3) definisi "menolak" kalian adalah membuang hampir semua hal termasuk hewan asli — yang terbukti dari 19/50 false negative kalian sendiri.

Sistem kalian bukan *gatekeeper*. Ini *guillotine* dengan sensor rusak.

---

### 1. LPC + Levinson-Durbin + $L = c / (2 \cdot \Delta F)$: Resep Bencana di Smartphone

Ini bagian paling halu dari arsitektur kalian. Kalian mengambil formula buku teks untuk tabung uniform ideal, lalu menerapkannya secara membabi-buta ke kucing yang mengeong di dapur berkeramik, direkam HP Android murah dari jarak 3 meter. Mari kita bedah.

#### a) Formula Kalian Salah Konteks Sejak Lahir

Formula $F_n = (2n-1)c / 4L$ dan turunannya $\Delta F = c / 2L$ berasal dari model **tabung uniform tertutup di glottis, terbuka di bibir, untuk vokal netral manusia seperti schwa [ə]** (Fant, 1960; Titze, 1994).

Asumsinya: penampang saluran vokal konstan, tidak ada rongga hidung, tidak ada perubahan bentuk lidah/rahang, tidak ada *source-filter interaction*.

Saluran vokal kucing saat mengeong? Rahang membuka-menutup, lidah bergerak membentuk diftong mirip [iau] (Schötz, 2015; Nicastro & Owren, 2003), rongga mulut berubah total dalam 300 ms. Itu bukan tabung uniform. Itu organ dinamis non-linier.

Fitch (1997) dan Fitch & Reby (2001) menggunakan *formant dispersion* untuk allometry **secara statistik lintas banyak individu dan banyak vokalisasi rata-rata**, bukan untuk vonis satu utterance tunggal: "VTL 14.6 cm = manusia, buang!" Menggunakan regresi populasi sebagai *hard classifier* per-klip adalah penyalahgunaan literatur tingkat fatal.

Dan sensitivitas error-nya brutal: $L = c/(2\Delta F) \implies dL/L = -d\Delta F/\Delta F$. Salah ukur $\Delta F$ sebesar 20% saja, VTL kalian meleset 20%. Salah deteksi satu formant? Selesai.

Contoh: Formant asli F1=1000, F2=2500, F3=4000. $\Delta F$ rata-rata = 1500, $L = 11.6$ cm. LPC melewatkan F1 (sangat umum, lihat di bawah), kalian hitung $\Delta F = 4000-2500 = 1500$... masih selamat. Tapi jika LPC menyisipkan satu pole palsu di 1750, $\Delta F$ jadi ~750, $L$ jadi 23.3 cm. Seekor kucing 4 kg baru saja kalian vonis sebagai bapak-bapak dewasa. Sebaliknya, manusia yang LPC-nya kehilangan F2 akan punya $\Delta F$ raksasa dan divonis kucing. Satu pole palsu = vonis spesies berbalik. Ini bukan sistem klasifikasi, ini judi pole.

#### b) F0 Tinggi Membunuh LPC Secara Matematis — Bukan Opini

Ini hukum fisika sinyal yang tidak bisa kalian nego dengan threshold.

LPC mengestimasi *spectral envelope* dari harmonik-harmonik sumber suara. Jika F0 kucing = 900 Hz, harmoniknya hanya ada di 900, 1800, 2700, 3600 Hz... Envelope forman di antara harmonik itu **tidak teramati**. Tidak ada informasi. LPC akan mengunci pole ke puncak harmonik terdekat, bukan ke resonansi saluran vokal sebenarnya.

Aturan praktisnya: untuk mengestimasi F1 dengan andal, butuh F0 jauh di bawah F1. Kalian mengklaim F1 kucing selalu >950 Hz sambil mendeteksi F0 sampai 3500 Hz. Pada F0 1200 Hz, harmonik pertama *sudah di atas* F1 yang kalian cari. Kalian sedang mengukur sesuatu yang secara informasi-teoretis tidak ada di sinyal. Hasilnya: "formant" kalian adalah artefak harmonik, $\Delta F \approx F0$ itu sendiri, dan VTL kalian sebenarnya cuma fungsi terbalik dari pitch. Sirkular dan sampah.

Ini masalah klasik yang sudah diketahui 40 tahun di analisis suara anak dan perempuan bersuara tinggi. Kalian mengabaikannya total.

#### c) Levinson-Durbin di Sinyal Smartphone Nyata

Levinson-Durbin metode autokorelasi itu rapuh:

1.  **Asumsi stasioneritas dilanggar.** LPC butuh frame ~25 ms yang stasioner. Meong adalah *frequency glide* non-stasioner. Formant bergerak ratusan Hz per frame.
2.  **Noise putih merusak segalanya.** Noise menambah delta di $r(0)$ autokorelasi, meratakan spektrum, mendorong pole ke dalam unit circle, melebarkan bandwidth. Pole asli terbuang oleh filter bandwidth kalian, pole noise lolos. Di SNR rendah — kondisi normal HP di ruang TV menyala — LPC kalian mengukur spektrum kipas angin, bukan kucing.
3.  **Model all-pole tidak bisa memodelkan zero.** Suara nasal, hiss, bark, dan fricative punya *spectral zero* (anti-resonansi). LPC ordo 12-16 akan membuang pole berharga untuk meniru zero tersebut, menghasilkan formant hantu.
4.  **Ordo 12-16 di Fs berapa?** Kalian tidak menyebut downsampling. Aturan praktis: ordo LPC $\approx F_s/1000 + 2$ sampai $4$. Di 48 kHz, ordo 14 berarti pole tersebar sampai 24 kHz; hanya segelintir di rentang vokal, resolusi forman menyedihkan. Jika kalian downsample ke 16 kHz tanpa anti-aliasing yang benar, masalah lain lagi. Dua-duanya buruk.
5.  **Rantai DSP smartphone menghancurkan sinyal sebelum sampai ke kalian.** MEMS mic dengan respons tidak flat dan roll-off di bawah 100 Hz, high-pass filter voice processing di 80-120 Hz, AGC yang memompa gain, noise suppression Android/iOS yang menganggap meong sebagai noise dan menghasilkan *musical noise*, codec AAC/Opus, gema ruangan berkeramik yang mengoles (smearing) formant. LPC kalian menerima sinyal yang sudah diperkosa tiga lapis DSP lain. Lalu kalian percaya akar polinomialnya sampai 0.1 cm? Naif.

#### d) Bonus Kebohongan: YIN di 20 Hz

Buffer 2048 sampel di 44.1 kHz = 46 ms. Periode 20 Hz = 50 ms = 2205 sampel. YIN butuh *minimal* satu periode penuh plus window integrasi; untuk estimasi andal butuh ~2 periode. Buffer 4096 pun cuma memberi window efektif $4096 - 2205 = 1891$ sampel. Klaim deteksi purr 20 Hz dengan buffer ini secara matematis tidak masuk akal.

Lagipula: purr bukan fonasi periodik biasa. Purr dihasilkan oleh kedutan otot laringeal 25-50 Hz pada fase inspirasi *dan* ekspirasi, dan HP kalian memotong frekuensi itu dengan high-pass filter. Dan sebutan "infrasound" untuk 20 Hz saja sudah salah kaprah — infrasound itu <20 Hz. Kalian menjual fitur yang mikrofon targetnya sendiri tidak bisa dengar.

---

### 2. BRITTLE HEURISTICS: Benteng Kartu yang Runtuh oleh Satu Segmen Audio

Seluruh "Harmonic Shield" kalian adalah tumpukan pertidaksamaan sumbu-sejajar (*axis-aligned rectangles*) dengan angka ajaib: 14.5 cm, 850 Hz, 950 Hz, 0.55, 2200 ms, 1800 ms, 2500 Hz, 0.03. Setiap angka adalah titik patah. Tidak ada probabilitas, tidak ada confidence interval, tidak ada *abstention zone*. Di dunia nyata, distribusi fitur itu tumpang tindih dan bergeser per perangkat. Berikut suara-suara yang akan menembus benteng kalian seperti kertas:

| # | Suara Penyerang | Cara Menembus Sistem Kalian |
|---|---|---|
| 1 | **Anak perempuan 6 tahun meniru "meong" / tertawa falsetto** | Ini bukan kegagalan DSP, ini kegagalan biologi kalian. VTL anak nyata memang 7-9 cm — di bawah threshold manusia 11/14.5 cm kalian. F0 falsetto 600-900 Hz lolos dari *dead-zone*. Sistem kalian secara desain tidak bisa membedakan anak manusia dari kucing, karena threshold VTL kalian cuma dikalibrasi untuk laki-laki dewasa. |
| 2 | **Derit engsel pintu / gesekan karet di lantai** | Sweep harmonik 600-1800 Hz, durasi 300-700 ms, jitter rendah karena gesekan stick-slip yang quasi-periodik. Pole-pole gesekan yang rapat menghasilkan $\Delta F$ besar → VTL terhitung kecil → "kucing". Kontur F0-nya bahkan berbentuk *arch* seperti meong. Ini false positive textbook untuk semua sistem berbasis pitch+formant. |
| 3 | **Beep microwave / chirp smoke detector baterai lemah** | Nada murni 2800-3200 Hz, 200-400 ms. F0 jauh di atas dead-zone. LPC pada nada murni hanya menemukan ≤1 pole valid → $\Delta F$ tak terdefinisi → di JavaScript/TypeScript, `NaN > 14.5` bernilai `false`. Gerbang kalian **fail-open oleh NaN**. Pitch confidence tinggi, jitter ~0. Lolos sebagai *squeak/whine* anak kucing. Periksa kode root-finder kalian — saya berani bertaruh ini sudah terjadi. |
| 4 | **Tangisan bayi yang tersegmentasi VAD** | Aturan kalian: tolak jika durasi >2200 ms DAN F0 >450 Hz. Tangis bayi terdiri dari unit tangis 800-1500 ms yang dipisah jeda napas. VAD kalian akan memotongnya menjadi segmen-segmen pendek, masing-masing di bawah 2200 ms. Setiap segmen lolos dan menjadi "kitten distress call". Aturan berbasis durasi global runtuh oleh segmentasi — kesalahan arsitektur pemula. |
| 5 | **Peluit ketel / flute recorder anak memainkan A5-C6** | F0 880-1046 Hz, vibrato teratur dengan jitter jauh di bawah 0.55, durasi per nada <2200 ms. Tidak ada formant vokal sejati, jadi LPC mengarang pole dari harmonik. Tidak memenuhi syarat klakson (F0 >300 Hz). Lolos sebagai whine bernada tinggi. |
| 6 | **Squeaky toy anjing / mainan sirine anak** | Mainan ini *dirancang evolusioner-komersial* untuk meniru jeritan mangsa: F0 1500-3000 Hz, harmonik kaya, burst pendek. Semua fitur bioakustik kalian akan berkata "hewan kecil kesakitan". DSP heuristik tidak punya konsep konteks objek. |
| 7 | **Rem sepeda berdecit / wiper kaca kering** | Squeal broadband harmonik dengan centroid yang — jika direkam dari jauh atau HP di dalam saku — turun di bawah 2500 Hz karena atenuasi udara frekuensi tinggi, sehingga lolos dari aturan klakson kalian yang mensyaratkan centroid >2500 **DAN** F0 <300 **DAN** ZCR <0.03 sekaligus. Satu syarat gagal, seluruh aturan mati. Konjungsi tiga syarat adalah undangan untuk dibypass. |

Perhatikan polanya: aturan kalian semua berbentuk "tolak JIKA A DAN B DAN C". Penyerang hanya perlu menggagalkan satu huruf. Sementara suara hewan asli (bagian berikutnya) justru sering memenuhi semua syarat penolakan secara tidak sengaja. Asimetri yang mematikan.

Dan soal jitter >0.55 untuk batuk: jitter lokal ala Praat pada suara manusia patologis pun hanya ~0.01-0.05 (1-5%). Threshold 0.55 = 55% variasi periode-ke-periode. Itu bukan jitter suara, itu YIN yang sudah menyerah total dan melompat oktaf secara acak. Aturan ini antara tidak pernah aktif, atau aktif justru pada suara hewan kasar yang sah. Pilih racun kalian.

---

### 3. Mengapa 19 dari 50 Hewan Asli Mati: Karena Filter Kalian Membunuh Biologi yang Sebenarnya

38% false negative (Wilson 95% CI kira-kira 25-52% — sampel 50 itu pun memalukan kecilnya) bukan nasib buruk. Itu konsekuensi deterministik dari asumsi biologis kalian yang salah. Mari kita vonis satu per satu:

**Pembunuh #1: "Feline Biological Dead-Zone" 75-240 Hz adalah fiksi.**
Klaim "pita suara kucing 3-5 mm tidak bisa berfonasi di 75-240 Hz" mengabaikan rumus fonasi dasar: $f_0 \approx \frac{1}{2L}\sqrt{T/\mu}$. Frekuensi ditentukan oleh tegangan ($T$) dan massa ($\mu$), bukan panjang saja. Tegangan bisa bervariasi satu orde magnitudo. Kucing menggeram (*growl*), mendengkur kasar, dan melakukan *caterwauling* dengan komponen fundamental persis di rentang 75-240 Hz. Belum lagi fenomena non-linier yang terdokumentasi luas pada vokalisasi mamalia — subharmonik, biphonation, *deterministic chaos* (Wilden et al., 1998; Fitch et al., 2002) — yang menggeser F0 terukur ke setengahnya, tepat ke dalam dead-zone kalian.

Dan jika "PetHertz" mengklaim untuk hewan peliharaan umum: **anjing ada di mana?** Gonggongan anjing besar ber-F0 80-250 Hz, geraman 50-150 Hz. Dead-zone kalian adalah mesin pemusnah anjing. Kalian membangun library "pet" yang secara desain menolak mayoritas vokalisasi anjing dan semua growl kucing.

**Pembunuh #2: Gerbang VTL dan F1.**
- "F1 kucing selalu >950 Hz" — salah. Meong dengan mulut terbuka lebar pada vokal terbuka mirip [a] menurunkan F1 secara drastis; yowl dan mating call lebih rendah lagi. Schötz sendiri mendokumentasikan variasi forman meong yang besar antar konteks dan individu.
- Anjing besar yang sah punya VTL 12-18 cm (Reby & McComb, 2003 menunjukkan formant dispersion anjing berkorelasi dengan ukuran tubuh). VTL anjing besar kalian vonis "manusia". Maine Coon besar + reverberasi ruangan yang mengecilkan $\Delta F$ terukur → VTL terhitung membengkak → "manusia". Kalian menghukum hewan karena besar dan karena direkam di ruangan bergema.

**Pembunuh #3: Jitter >0.55 membunuh semua suara kasar yang sah.**
Growl, bark, hiss, dan distress call memang aperiodik dan chaotic — itu fitur biologisnya, bukan cacat. Menghitung jitter (metrik untuk vokal manusia *sustained* yang quasi-periodik) pada bark 80 ms yang transien adalah penyalahgunaan metrik. YIN akan melompat-lompat, jitter meledak >0.55, dan kalian membuang gonggongan sebagai "batuk manusia". Kalian menghukum hewan karena tidak bersuara seperti pasien klinik suara manusia.

**Pembunuh #4: Aturan durasi membunuh di dua arah.**
Kitten distress mew dan dog whine yang sah sering >2200 ms → dibuang sebagai "tangis bayi". Purr berlangsung ber menit-menit dengan komponen harmonik yang bisa dikunci YIN di 70-135 Hz → dibuang sebagai "dengkuran manusia >1800 ms". Aturan dengkuran kalian adalah pembunuh purr yang dirancang dengan presisi.

**Pembunuh #5: Burst count membunuh perilaku repetitif yang sah.**
Anjing menggonggong 7+ kali beruntun dengan pitch confidence rendah (karena bark itu noisy) → "detak jam". *Teeth chattering* kucing saat melihat burung — perilaku klasik — adalah burst repetitif aperiodik → "detak jam". Kalian mengubah etologi normal menjadi noise mekanik.

Singkatnya: setiap filter kalian dikalibrasi pada prototipe meong studio yang bersih, pendek, bernada menengah, dari kucing ukuran sedang, di ruangan sunyi. Dunia nyata menyimpang dari prototipe itu di semua sumbu sekaligus. 19/50 bukan anomali. Itu sistem yang bekerja persis seperti yang dirancang — dan desainnya salah.

---

### 4. Halusinasi Terbesar: Mengira Heuristik DSP Murni Bisa Menggantikan Neural Network di 2026

Ini delusi intinya, jadi saya katakan tanpa gula:

**Kalian membuang informasi, lalu berharap bisa mengambil keputusan yang informasinya sudah kalian buang.**

Pipeline kalian memampatkan audio kaya menjadi ~8 skalar (F0, ZCR, centroid, flatness, jitter, shimmer, VTL, burst count), lalu menggambar garis lurus di ruang 8-dimensi itu. Setiap keputusan klasifikasi modern — membedakan meong dari derit pintu dari anak tertawa — hidup di struktur temporal-spektral halus: pola onset, modulasi amplitudo, struktur subharmonik, evolusi forman per-10-ms, tekstur noise. Semua itu **hancur** saat kalian rata-ratakan menjadi skalar per-klip. Tidak ada threshold secanggih apa pun yang bisa memulihkan informasi yang sudah dibuang di hulu. Ini bukan keterbatasan implementasi. Ini batas teoretis.

Neural network audio (PANNs, AST, BEATs, dan keturunan distilasinya) menang bukan karena magis, tapi karena mereka belajar representasi dari jutaan contoh dengan invariansi terhadap mikrofon, ruangan, jarak, dan individu — invariansi yang tidak akan pernah bisa kalian tulis tangan satu threshold pada satu waktu. Setiap threshold baru yang kalian tambahkan untuk menambal satu false positive akan menciptakan dua false negative baru. Kalian sedang bermain *whack-a-mole* di ruang fitur yang distribusinya bergeser setiap kali pengguna ganti HP.

"Zero-dependency" bukan keunggulan arsitektural. Itu berarti kalian menulis ulang Levinson-Durbin, root-finder polinomial, dan YIN dengan tangan — tiga algoritma yang terkenal sarang bug numerik — tanpa test suite Praat/librosa untuk validasi. Keunggulan marketing, liabilitas teknis.

Dan soal emosi: memetakan kontur F0 *rising/falling/arch* ke Valence [-1,1] adalah antropomorfisme berbungkus sitasi. Schötz (2023) meneliti bagaimana **manusia mempersepsikan** meong dalam konteks; Pongrácz meneliti gonggongan dalam konteks situasional spesifik. Tidak satu pun memberi kalian fungsi deterministik `kontur → valence`. Whine anjing yang naik itu distress (valence negatif), bukan positif. Tanpa konteks visual/situasional dan baseline individu, angka valence kalian adalah horoskop numerik. Menjualnya sebagai "Affective Space" adalah *overclaiming* yang berbahaya jika dipakai untuk keputusan kesejahteraan hewan.

---

### 5. Mitigasi Radikal dan Konkret — Bukan Tambal Sulam

Cukup bermimpi. Ini yang harus dilakukan:

**1. Matikan semua hard-reject. Hari ini juga.**
Ganti gerbang biner dengan skor probabilistik + zona abstain ("tidak tahu"). Sistem yang berkata "tidak yakin" jauh lebih berharga daripada sistem yang percaya diri membuang 38% hewan asli. Setiap threshold kaku di atas harus menjadi *soft feature*, bukan vonis.

**2. Akui kekalahan DSP murni dan adopsi hybrid ML ringan.**
Arsitektur yang benar di 2026 untuk client-side: log-mel spectrogram (64 bin) → model kecil terdistilasi (EfficientAT / MobileNetV3 / YAMNet-class, kuantisasi int8, 3-8 MB) via ONNX Runtime Web / WASM / WebGPU → DSP kalian turun pangkat menjadi lapisan *explainability* dan sanity check, bukan hakim. "Zero dependency" bukan alasan; model 5 MB bukan "deep learning raksasa". Berhenti bersembunyi di balik kemurnian TypeScript.

**3. Perbaiki atau pensiunkan VTL.**
Jika tetap dipakai: downsample ke 10-16 kHz, ganti Levinson-autokorelasi dengan metode Burg yang lebih stabil untuk frame pendek, lacak forman antar-frame (Kalman/Viterbi), dan **hanya** hitung VTL jika F0 <300 Hz, SNR >15 dB, dan ≥3 forman valid dengan bandwidth 50-400 Hz. Di luar kondisi itu, VTL = `null` (bukan NaN yang fail-open!) dan tidak boleh dipakai untuk vonis apa pun. Hapus dead-zone 75-240 Hz selamanya. Hapus klaim "F1 selalu >950 Hz".

**4. Bangun dataset seperti orang serius.**
Rekaman smartphone far-field dari ≥20 perangkat berbeda, ≥30 individu per spesies, berbagai ras/umur/ukuran, dengan augmentasi: room impulse response sintetis, codec AAC/Opus, AGC, mixing noise pada SNR -5 sampai +20 dB. Tanpa ini, semua angka akurasi kalian tidak ada artinya.

**5. Evaluasi adversarial yang jujur.**
*Leave-one-device-out* dan *leave-one-individual-out* cross-validation. Uji lintas korpus: ESC-50 + FSD50K + UrbanSound8K + serangan sintetis (chirp, sweep, nada murni, derit). Laporkan confusion matrix per kelas, ROC/EER, dan *ablation study* per filter — supaya kalian tahu filter mana yang membunuh 19 hewan itu, bukan menebak seperti sekarang. Tarik klaim "100%" dari semua materi publik sebelum ada yang mereproduksinya dan kalian malu sendiri.

**6. Turunkan klaim emosi ke level yang bisa dipertahankan.**
Arousal (dari intensitas, F0 mean, durasi, rate) masih bisa dipertahankan secara kasar. Valence: hapus, atau labeli eksplisit sebagai "persepsi pendengar manusia, bukan keadaan internal hewan", dan tambahkan personalisasi baseline per individu hewan (enrollment 10 sampel) karena variasi antar-individu menenggelamkan variasi antar-emosi.

---

### Kalimat Terakhir

Sistem kalian tidak gagal karena kurang threshold. Sistem kalian gagal karena fondasinya: formula tabung ideal diterapkan ke organ dinamis, metrik klinik manusia diterapkan ke gonggongan 80 ms, batas biologis karangan diterapkan ke spesies yang tidak mematuhinya, dan 8 skalar diharapkan mengalahkan representasi yang dipelajari dari jutaan audio.

19 dari 50 hewan asli yang kalian bunuh itu bukan *bug*. Itu sistem kalian yang sedang jujur tentang kualitas desainnya. Dengarkan dia.