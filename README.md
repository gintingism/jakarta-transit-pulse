# 🚇 Jakarta Transit Pulse (a.k.a. *Biar Gak Bablas*)

> **"Karena transit di Manggarai udah cukup menguras mental, lu gak perlu lagi nambah beban bablas ketiduran sampe Bogor."**

Navigasi transit multimoda real-time Jabodetabek (KRL Commuterline, TransJakarta BRT, MRT, LRT Jabodebek, & Kereta Bandara Basoetta) lengkap dengan **Radar GPS Proximity Geo-Alarm** biar kuping lu ditiup alarm tepat sebelum stasiun tujuan.

Built with Next.js 14, Tailwind CSS (Dark Cyber mode), Zustand, Web Audio API procedural synthesis, and pure graph routing — **tanpa API key berbayar yang bikin dompet developer boncos**.

---

## 😫 Masalah Hidup yang Coba Diselesaikan Aplikasi Ini

1. **Sindrom Ketiduran di KRL**: Niatnya cuma merem 5 menit abis kerja rodi di Sudirman, bangun-bangun udah disambut hawa dingin Stasiun Citayam atau Cilebut. *Selamat, malam lu resmi berantakan.*
2. **Labirin Transit RPG**: Mau nyambung dari KRL Lin Cikarang ke TransJakarta Koridor 1 atau LRT Dukuh Atas tapi ngerasa kayak lagi nyari jalan keluar dungeon Elden Ring.
3. **Surge Pricing Ojol Pas Hujan**: Jam 5 sore gerimis dikit, tarif motor online langsung loncat ke Rp 75.000. Padahal kalau lu jalan kaki 200 meter ke halte busway / stasiun, modal Rp 3.500 udah nyampe rumah sambil nyelamatin emisi bumi.

---

## ⚡ Fitur-Fitur Andalan (Bukan Fitur Gimik AI Slop)

### 1. 🧭 Multi-Modal Routing Engine (Deterministic Dijkstra)
Bukan sekadar if-else anak magang. Mesin rute ini jalan di **fungsi murni (*pure functions*)** yang decoupled dari React/DOM:
- **Multi-Moda 5 Jaringan**: Integrasi penuh KRL Bogor & Cikarang Loop, TransJakarta Koridor 1 & koridor utama, MRT Jakarta, LRT Lin Cibubur/Bekasi, sampai KA Bandara SHIA.
- **Skema Tarif Resmi 100% Akurat**: Formula resmi KRL (Rp 3.000 per 25 km + Rp 1.000/10 km), TJ flat Rp 3.500, tarif Bandara Eksekutif/Premium, plus kalkulasi rincian pecahan tarif per moda.
- **Dukungan First-Mile & Last-Mile**: Lu bisa ketik gedung, mall, atau POI populer (e.g. *Grand Indonesia*, *Monas*, *Halim Whoosh*). Algoritma bakal ngitung rute jalan kaki ke halte terdekat lengkap dengan peringatan kalau jalannya kejauhan (>1.5 km disuruh nyambung ojol/mikrotrans).

### 2. 🚨 Alarm Anti-Bablas (Web Audio Synth + Geofencing)
- **HTML5 Geolocation Radar**: Melacak posisi komuter secara berkala dengan formula Haversine akurasi meter.
- **Synthesizer Prosedural (Tanpa File MP3 Eksternal)**: Suara sirene alarm dan nada stasiun disintesis langsung on-the-fly pakai osilator Web Audio API (`AudioContext`). Gak ada drama file MP3 gagal load karena sinyal ilang di gorong-gorong terowongan.
- **Haptic Vibration**: HP lu bakal getar ritmis kalau lu buka di browser HP Android/Chrome.
- **Mode Simulator**: Pengen ngetes alarm tapi lagi rebahan di kasur? Ada tombol *Simulasi Dekati Stasiun* biar lu bisa liat radarnya gerak sendiri.

### 3. 🎯 Interactive Segment Focus
Klik salah satu potongan perjalanan di kartu rute (*misal: segmen jalan kaki kaki lima atau lintasan MRT*), kamera peta bakal otomatis terbang (*flyTo*) dan nge-zoom ke lintasan tersebut dengan **efek neon bercahaya (glowing polyline overlay)**. Segmen lain otomatis meredup.

### 4. 💸 Kalkulator Penghematan Biaya & Karbon (Eco-Impact)
- Dihitung deterministik berdasarkan **Kepmenhub KM 322/2022 (Zona II Jabodetabek)**.
- Langsung ngasih tau lu: *"Hemat Rp 42.000 dibanding ojol motor, pangkas 1.8 kg CO₂, dan bakar 45 kalori jalan kaki"*. Lumayan buat hiburan komuter proletar.

### 5. 🔗 Deep-Linking (Bisa Dishare)
Mau pamer rute ke temen kantor? Klik tombol **Bagikan**, URL bakal otomatis meng-copy parameter pencarian (e.g. `?from=krl_bogor&to=ka_bandara_shia&pref=FASTEST`). Temen lu buka, langsung kebuka rute dan petanya.

---

## 🛠️ Stack & Prinsip Rekayasa (Strict Guardrails)

Project ini dibuat dengan standar ketat (baca [AGENTS.md](AGENTS.md)):
- **Zero `any` TypeScript**: Type safety 100%. Jalankan `npm run type-check` dan hasilnya bersih `0 errors`.
- **Pure Domain Engine**: Semua matematika jarak (Haversine), traversal graf transit, dan hitungan tarif ditaruh di `src/lib/` tanpa nyentuh `react` atau Leaflet DOM.
- **Test-Driven (TDD)**: 78 unit test otomatis pake Vitest (100% green).
- **Zero-Cost Cartography**: Menggunakan CartoDB Dark Matter tiles & OpenStreetMap. Gak perlu isi credit card Google Cloud Platform yang bikin was-was tagihan membengkak.

```bash
# Tech Stack Ringkas:
Framework  : Next.js 14 (App Router) + TypeScript
Styling    : Tailwind CSS + Dark Cyber Palette (Zinc/Sky/Rose)
State      : Zustand
Map        : Leaflet + React-Leaflet
Testing    : Vitest (78 unit tests)
Icons      : Lucide React
```

---

## 🚀 Cara Menjalankan di Lokal (Local Setup)

Punya Node.js minimal v18? Gas:

```bash
# 1. Clone repo ini
git clone https://github.com/USERNAME_LU/jakarta-transit-pulse.git
cd jakarta-transit-pulse

# 2. Install dependencies (cepet kok)
npm install

# 3. Jalankan automated tests (buktiin sendiri kalau gak ada logic cacat)
npm test

# 4. Type check TypeScript
npm run type-check

# 5. Nyalain server lokal
npm run dev
```

Buka browser di `http://localhost:3000`. Coba cari rute dari **Bogor** ke **Bandara Soekarno-Hatta (SHIA)**.

---

## 🧪 Pengujian Otomatis

```bash
# Menjalankan seluruh test suite Vitest
npm test

# Output yang bakal lu dapet:
# Test Files  4 passed (4)
# Tests       78 passed (78)
# Duration    ~4s (100% green)
```

---

## 🗺️ Roadmap & Ide Liar ke Depan

- [ ] Integrasi jadwal KRL realtime dari API Commuterline (kalau gak diblokir rate limit)
- [ ] Deteksi eskalator mati di Stasiun Manggarai (fitur darurat mental komuter)
- [ ] Integrasi Mikrotrans (JakLingko) rute angkot feeder
- [ ] Widget PWA offline-first service worker

---

## 📄 Lisensi

MIT License. Bebas lu fork, otak-atik, atau pake buat portfolio kerjaan lu. Kalau keterima kerja di tech company gara-gara project ini, minimal traktir kopi ya. ☕
