# Jakarta Transit Pulse (AntiBablas)

Solusi buat lu yang sering niat merem lima menit di KRL Sudirman, tapi melek-melek udah disambut hawa sejuk Stasiun Citayam.

Web app rute multimoda (KRL, TransJakarta, MRT, LRT Jabodebek, KA Bandara) plus alarm GPS yang bakal bangunin lu sebelum stasiun tujuan kelewat.

🌐 **Live Demo (Langsung buka di browser HP/Laptop):**  
👉 **[https://jakarta-transit-pulse.vercel.app](https://jakarta-transit-pulse.vercel.app)**

---

### Kenapa app ini ada?

Kalo lu tinggal di Jabodetabek, lu pasti pernah ngalamin minimal salah satu dari ini:
1. **Bablas ketiduran**: Badan capek abis lembur, niat turun Tebet malah kebablasan sampe Depok. Mau puter balik udah gak ada kereta.
2. **Labirin transit**: Nyambung antar moda di Jakarta tuh kadang kayak main game RPG tanpa mini-map. Mau pindah dari KRL Cikarang ke busway Harmoni aja bingung harus turun di mana.
3. **Surge pricing ojol**: Jam 5 sore pas gerimis setetes, tarif ojol yang biasanya 18 ribu tiba-tiba melonjak jadi 72 ribu. Padahal stasiun KRL deket, tapi males mikir rutenya.

Makanya project ini dibikin: biar ada navigator transit yang beneran ngerti kondisi lapangan Jakarta dan punya alarm anti-bablas yang gak manja.

---

### Apa aja yang bisa dilakuin?

- **Peta & Rute 5 Moda Sekaligus**
  Bisa nyambungin rute KRL (Lin Bogor & Cikarang), MRT Jakarta, LRT Jabodebek, Kereta Bandara Basoetta, dan TransJakarta.  
  *(Catatan jujur: Buat TransJakarta saat ini jalurnya masih terbatas di Koridor 1 Blok M - Kota sebagai tulang punggung utama. Koridor-koridor lainnya bakal diupdate dan ditambah bertahap seiring waktu).* Kalo titik awal atau tujuan lu mall atau gedung perkantoran (misal: Grand Indonesia atau Blok M Plaza), app ini bakal ngitungin jarak jalan kakinya juga ke halte atau stasiun terdekat.

- **Mode Navigasi Real-Time (Live Follow & Speedometer)**
  Kamera peta bisa otomatis ngikutin posisi lu secara halus pas kereta atau bus lagi jalan mirip Google Maps. Lengkap sama indikator arah hadap (heading beam), lingkaran akurasi satelit, dan speedometer live di bilah atas biar lu tau kereta lagi lari berapa km/jam. Udah dipasang Screen Wake Lock dan watchdog recovery juga biar GPS HP lu gak mendadak tidur pas lewat jembatan atau terowongan.

- **Hitungan Tarif Riil (Gak Asal Nembak)**
  - KRL: Rp 3.000 buat 25 km pertama, nambah Rp 1.000 tiap kelipatan 10 km.
  - TransJakarta: Flat Rp 3.500.
  - Kereta Bandara: Sesuai tarif relasi resmi (Rp 70.000 buat rute dari Manggarai/BNI City/Duri ke Bandara Soetta, Rp 35.000 dari Rawa Buaya/Batu Ceper, dan Rp 10.000 - Rp 35.000 buat rute antarstasiun dalam kota).
  - Rincian pecahan ongkosnya dibongkar transparan di kartu rute.

- **Alarm Turun (Geo-Alarm)**
  Nyalain GPS, set stasiun tujuan, dan tentuin radius alarmnya (misal 400 meter sebelum stasiun). Pas lu masuk radius itu, alarm bakal bunyi kenceng dan HP bakal getar. Audionya dibikin langsung lewat Web Audio API browser (procedural synth), jadi gak pake download file MP3 eksternal yang rawan macet pas sinyal ilang di gorong-gorong terowongan.
  *(Ada tombol simulasi juga buat yang mau nyoba alarmnya sambil rebahan di kamar).*

- **Interactive Segment Focus di Peta**
  Pusing liat garis rute yang ruwet? Klik aja salah satu segmen perjalanan di kartu kiri (misal: segmen jalan kaki atau segmen MRT). Peta bakal otomatis nge-zoom ke jalur itu pake garis neon bercahaya, dan jalur yang lain bakal otomatis redup.

- **Kalkulator Hemat vs Ojol & Karbon**
  Langsung ngasih liat estimasi berapa puluh ribu uang yang berhasil lu selamatkan dibanding naik motor ojol (ngikut regulasi Kepmenhub Zona II), plus berapa kilogram emisi karbon yang gak jadi lu buang ke langit Jakarta.

- **Share Rute via URL (Deep Link)**
  Tinggal klik tombol Bagikan di kartu rute. Parameter stasiun asal dan tujuan otomatis nempel di URL, jadi temen lu tinggal buka linknya dan langsung dapet rute yang sama persis.

---

### Di Balik Layar (Engineering Stuff)

Project ini dibikin bukan cuma buat pajangan:
- **No `any` club**: TypeScript-nya strictly typed dari ujung kepala sampe ujung kaki.
- **Pure domain logic**: Algoritma graf rute, hitungan tarif, dan formula jarak (Haversine) dipisah total di folder `src/lib/`. Gak dicampur aduk sama komponen UI atau Leaflet, jadi enteng dan gampang dites.
- **114 automated unit tests**: Dites menyeluruh pake Vitest. Dari mulai skenario jarak per pecahan kilometer KRL, tarif relasi KA Bandara bolak-balik, konversi kecepatan live, estimasi cuaca stasiun (BMKG/Open-Meteo), turn-by-turn navigation logic, CARTO tile proxy security, geofencing drift, hingga rute transit multi-moda.
- **Peta gratisan rasa premium**: Gak pake Google Maps API yang rawan bikin developer kena tagihan kartu kredit mendadak. Peta jalan pake kombinasi Leaflet, CartoDB Dark Matter, dan OpenStreetMap tiles dengan custom dark styling.

---

### Cara Pasang di Laptop Sendiri

Pastikan udah install Node.js minimal v18.

```bash
# Clone repo
git clone https://github.com/gintingism/jakarta-transit-pulse.git
cd jakarta-transit-pulse

# Install dependencies
npm install

# Jalanin unit tests (buktiin sendiri kalo logikanya solid)
npm test

# Cek typecheck TypeScript
npm run type-check

# Nyalain server lokal
npm run dev
```

Tinggal buka `http://localhost:3000` di browser.

---

### Menjalankan Test Suite

```bash
npm test
```

Output bakal nunjukin 114 test ijo semua:
```
Test Files  8 passed (8)
Tests       114 passed (114)
```

---

### Author & Pengembang

Dibuat oleh **Bonifasius Toto Neguisa Ginting (@gintingism)** untuk seluruh pejuang komuter Jabodetabek:
- 💼 **LinkedIn**: [linkedin.com/in/bonifasiustotoneguisaginting](https://www.linkedin.com/in/bonifasiustotoneguisaginting/)
- 🐙 **GitHub**: [@gintingism](https://github.com/gintingism)
- 🚀 **Live App**: [jakarta-transit-pulse.vercel.app](https://jakarta-transit-pulse.vercel.app)

---

### Hak Cipta & Lisensi

> **Hak Cipta © 2026 Bonifasius Toto Neguisa Ginting. All rights reserved.**
>
> Repositori ini dipublikasikan secara publik murni sebagai etalase portofolio dan peninjauan pribadi. Kode sumber tidak dilisensikan di bawah lisensi open source. Penggunaan, penyalinan, modifikasi, pendistribusian ulang, maupun deployment ulang (*re-hosting*) tanpa izin tertulis resmi tidak diperbolehkan. Fitur dukungan/donasi bersifat sukarela sebagai apresiasi dan tidak memberikan hak cipta atau lisensi apa pun.
