# Pekan Olahraga PGRI Kecamatan Pesanggrahan

Frontend publik Hadang, Bola Voli, dan Senam. GitHub Pages: branch main, / (root).

Frontend berasal dari salinan lokal PGRI_PESANGGRAHAN_TUANABU_DEMO.html (29 Oktober 2026), dipisahkan menjadi index.html, app.js, styles.css, config.js, data/, dan assets/. Logo dan identitas PGRI dipertahankan.

## Koneksi langsung ke sheet asli

Pada 29 Oktober 2026 backend diperbaiki dan deployment yang sama diperbarui ke versi 4. Backend membaca langsung tab bagan, jadwal Hadang/Voli, SKOR SET VOLI, dan JADWAL SENAM pada spreadsheet TUANABU yang dapat diakses akun pemilik. Tidak menjalankan setupDatabase atau menimpa data sumber.

Endpoint publik telah diuji tanpa sesi login dan mengembalikan JSON dengan source: original_sheets, lima kategori, 50 tim dan 50 agenda. Frontend meminta data setiap 10 detik memakai fetch tanpa cookie Google, dengan batas tunggu 30 detik. Jika koneksi gagal, salinan awal di data/seed.json ditampilkan dengan penanda belum sinkron.

Panitia mengubah nama dan skor Hadang di bagan asli, poin Voli di tab SKOR SET VOLI, serta peserta/catatan Senam di JADWAL SENAM. Nilai Senam dibaca dari angka total atau label Nilai total: pada kolom L; catatan tetap disimpan. Tidak ada nilai juri yang direka.

Rumus waktu Senam di sumber mengandung #REF!. Backend menghitung ulang waktu dari B6, durasi K, dan jeda H6 serta mengembalikan peringatan; rumus spreadsheet tetap dipertahankan. Tanggal kalender masih perlu diisi panitia dan pembagian lokasi/hari perlu diperiksa.

Panel panitia tersedia di admin.html. Login dan izin menyimpan diperiksa oleh Apps Script; kredensial serta kode backend disimpan di server, tidak dimuat dalam repository publik. Token sesi hanya disimpan di memori halaman.

Admin memilih kategori dan kartu pertandingan: skor akhir Hadang, poin tiap set Voli (menang dua set), atau nilai total Senam. Perubahan pemenang menampilkan konfirmasi untuk mengosongkan hasil babak lanjutan yang pesertanya berubah. Penulisan menggunakan pemeriksaan revisi data dan kunci server agar data lama tidak menimpa perubahan baru. Ganti password tersedia di panel.

Pembaruan 2 November 2026 mempertahankan sheet dan alur bagan asli. Tidak ada inisialisasi ulang data.
