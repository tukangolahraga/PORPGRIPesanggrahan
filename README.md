# Pekan Olahraga PGRI Kecamatan Pesanggrahan

Frontend publik Hadang, Bola Voli, dan Senam. GitHub Pages: branch main, / (root).

Sumber frontend: salinan lokal PGRI_PESANGGRAHAN_TUANABU_DEMO.html (29 Oktober 2026), dipisah menjadi index.html, app.js, styles.css, config.js, data/, dan assets/. ZIP PGRI_WEBSITE_EXEC_TERBARU.zip tidak tersedia dalam lampiran chat yang diteruskan. URL Apps Script terbaru sudah dikonfigurasi; pembaruan setiap 60 detik.

## Status backend saat pemasangan
Uji publik mode=data pada 29 Oktober 2026 mengembalikan: Exception: You do not have permission to access the requested document. (line 17, file "Code"). Data live dan sinkronisasi ke sheet asli belum berhasil diverifikasi. Situs menandai data cadangan dari TUANABU.xlsx secara jelas.

Pemilik Google perlu memastikan akun pelaksana deployment memiliki akses ke spreadsheet yang benar, menyetujui otorisasi Spreadsheet, dan menerbitkan versi Apps Script yang benar dengan Execute as: Me dan akses publik untuk pembacaan. Jangan membagikan spreadsheet atau panel admin ke publik. Pisahkan deployment admin yang memerlukan akun panitia. Jangan menjalankan setupDatabase() ulang tanpa pencadangan dan pemeriksaan karena dapat menimpa data.

Backend lokal yang diperiksa membaca tab CATEGORIES, TEAMS, MATCHES, dan PERFORMANCES; ini belum membuktikan bahwa perubahan pada bagan asli otomatis disalin ke tab tersebut. Setelah akses diperbaiki, bandingkan satu hasil pertandingan yang memang sudah diubah panitia di sheet asli dengan respons publik dan situs sesudah penyegaran.

Tidak ada backend Apps Script, kode admin, kredensial, atau kata sandi yang disertakan. config.js hanya memuat endpoint publik, adminUrl kosong, dan interval pembaruan. Data jadwal masih berupa salinan awal; tanggal kalender belum diatur dan jam Senam berasal dari perhitungan ulang akibat #REF! pada sumber.
