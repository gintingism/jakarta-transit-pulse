# Jakarta Transit Pulse (AntiBablas)

Aplikasi rute multimoda Jabodetabek dan alarm GPS biar gak bablas ketiduran di kereta atau busway.

Dibangun pakai Next.js 14, TypeScript, Tailwind CSS, Leaflet, dan Web Audio API, tanpa API key berbayar.

---

## Kenapa Bikin Ini?

Masalahnya klasik buat komuter Jakarta:
1. Mau pulang kerja naik KRL, niat merem sebentar, tahu-tahu melek udah lewat tiga stasiun.
2. Google Maps seringkali kaku buat transit lokal (terutama kalau mau kombinasi KRL sama TransJakarta atau MRT).
3. Jam pulang kantor pas hujan, ojol langsung surge pricing sampai puluhan ribu, padahal halte busway atau stasiun KRL jaraknya cuma beberapa ratus meter.

Aplikasi ini dibikin buat ngasih solusi praktis: rute transit yang akurat, rincian tarif resmi, perbandingan biaya vs ojek online, dan alarm bangun tidur berbasis GPS yang bunyi otomatis sebelum stasiun tujuan.

---

## Fitur Utama

### 1. Perencana Rute 5 Moda Transit
Mendukung rute terintegrasi untuk:
* KRL Commuterline (Lin Bogor & Lin Cikarang Loop)
* TransJakarta BRT (Koridor 1 dan koridor utama)
* MRT Jakarta (Lin Bundaran HI - Lebak Bulus)
* LRT Jabodebek (Lin Cibubur & Lin Bekasi via Dukuh Atas / Halim)
* Kereta Bandara Soekarno-Hatta (Lin Basoetta)

Mendukung pencarian titik populer (mall, gedung perkantoran, tempat wisata) dengan perhitungan jalan kaki (first-mile dan last-mile) ke halte atau stasiun terdekat.

### 2. Hitungan Tarif Resmi
Semua tarif dihitung secara deterministik sesuai aturan operasional:
* KRL: Rp 3.000 untuk 25 km pertama, tambah Rp 1.000 tiap 10 km berikutnya.
* TransJakarta: Flat Rp 3.500.
* Kereta Bandara: Skema tarif resmi relasi stasiun (Rp 70.000 ke Bandara dari Manggarai/BNI City/Duri, Rp 35.000 dari Rawa Buaya/Batu Ceper, dan Rp 10.000 - Rp 35.000 antarstasiun kota).
* Rincian tarif per moda ditampilkan transparan di kartu hasil rute.

### 3. Alarm Anti-Bablas (Geo-Alarm)
* Memanfaatkan HTML5 Geolocation API untuk memantau posisi perangkat.
* Radius alarm bisa diatur fleksibel (misalnya 400 meter sebelum stasiun tujuan).
* Suara alarm disintesis langsung lewat browser menggunakan Web Audio API, jadi tidak tergantung koneksi untuk mengunduh file MP3.
* Mendukung getar (haptic feedback) pada perangkat mobile yang mendukung.
* Tersedia tombol simulasi untuk mencoba jalannya alarm tanpa harus berada langsung di atas kereta.

### 4. Sorot Segmen di Peta (Interactive Focus)
Setiap potongan rute di kartu navigasi bisa diklik. Peta akan otomatis memusatkan kamera dan memperbesar jalur yang dipilih dengan efek garis bercahaya, sementara jalur lain akan meredup.

### 5. Komparasi Biaya & Penghematan Emisi
Menghitung estimasi selisih biaya perjalanan dibanding tarif ojol motor (mengacu ke regulasi tarif batas Kepmenhub Zona II), perkiraan emisi karbon yang berhasil ditekan, serta estimasi kalori dari langkah kaki transit.

### 6. Berbagi Rute (Deep Link)
Tersedia tombol salin tautan rute. Parameter pencarian otomatis tersimpan di URL, sehingga rute yang sama bisa langsung dibuka oleh teman atau disimpan di bookmark.

---

## Arsitektur & Prinsip Kode

Project ini ditulis dengan disiplin engineering yang rapi:
* **Strict TypeScript**: Bebas dari tipe `any`. Semua objek domain, halte, rute, dan argumen fungsi memiliki tipe yang jelas.
* **Fungsi Murni (Pure Domain Engine)**: Perhitungan jarak (Haversine), pencarian jalur graf transit, dan formula tarif dipisahkan sepenuhnya di `src/lib/` tanpa ketergantungan pada React hook maupun DOM Leaflet.
* **TDD & Unit Testing**: Dilengkapi 78 unit test otomatis menggunakan Vitest untuk memastikan logika tarif dan rute selalu akurat.
* **Peta Tanpa Biaya API**: Menggunakan tile CartoDB Dark Matter dan OpenStreetMap via Leaflet, berjalan penuh tanpa perlu kartu kredit untuk billing Google Maps API.

---

## Cara Menjalankan Project

Syarat: Node.js versi 18 ke atas.

```bash
# 1. Clone repository
git clone https://github.com/gintingism/jakarta-transit-pulse.git
cd jakarta-transit-pulse

# 2. Install dependencies
npm install

# 3. Jalankan unit test
npm test

# 4. Cek validasi TypeScript
npm run type-check

# 5. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser kamu.

---

## Menjalankan Pengujian

Seluruh pengujian unit test menggunakan Vitest:

```bash
npm test
```

Semua 78 test mencakup perhitungan tarif KRL progresif, flat rate TransJakarta, matriks tarif KA Bandara, formula penghematan biaya, dan algoritma routing transit.

---

## Lisensi

Didistribusikan di bawah lisensi MIT. Silakan digunakan, dimodifikasi, atau dijadikan referensi belajar.
