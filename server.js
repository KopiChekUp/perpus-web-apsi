require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.json()); 
app.use(express.static('public'));
const port = process.env.PORT || 4000;

// Kunci Kulkas (Database)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: true },
    port: process.env.DB_PORT
});
console.log("Cek Alamat Gudang:", process.env.DB_HOST);

db.connect((err) => {
    if (err) console.error('Gagal nyambung Database:', err);
    else console.log('Backend sudah tersambung dengan Database!');
});

// ==========================================
// INI JALUR PELAYAN (API) BUAT LOGIN ADMIN
// ==========================================
app.post('/api/login-admin', (req, res) => {
    const usernameYangDiketik = req.body.username;
    const passwordYangDiketik = req.body.password;

    const mantraCekAdmin = "SELECT * FROM Admin WHERE nama_admin = ? AND password_admin = ?";
    
    db.query(mantraCekAdmin, [usernameYangDiketik, passwordYangDiketik], (err, hasil) => {
        if (err) {
            res.status(500).json({ sukses: false, pesan: "Database error" });
        } else {
            if (hasil.length > 0) {
                res.json({ sukses: true, pesan: "Berhasil masuk!" });
            } else {
                res.json({ sukses: false, pesan: "Username atau Password salah." });
            }
        }
    });
});
// ==========================================
// FUNGSI LOG AKTIFITAS 
// ==========================================
function catatLog(idAdmin, aksiTindakan, detailKeterangan) {
    const mantraLog = "INSERT INTO Log_Aktifitas (id_admin, aksi, keterangan_detail) VALUES (?, ?, ?)";
    
    db.query(mantraLog, [idAdmin, aksiTindakan, detailKeterangan], (err) => {
        if (err) console.error("Gagal catat log aktifitas:", err);
        else console.log(` Admin ID ${idAdmin} -> ${aksiTindakan} : ${detailKeterangan}`); 
    });
}

// ==========================================
// API UNTUK TAMPILKAN lOG AKTIFITAS
// ==========================================
app.get('/api/log', (req, res) => {
    const mantraAmbilLog = "SELECT * FROM Log_Aktifitas ORDER BY tanggal_waktu_aktifitas DESC";
    
    db.query(mantraAmbilLog, (err, hasil) => {
        if (err) {
            console.error("Gagal ambil log:", err);
            res.status(500).json({ sukses: false, pesan: "Gagal buka log aktifitas" });
        } else {
            res.json({ sukses: true, data: hasil });
        }
    });
});

// ==========================================
// INI JALUR PELAYAN (API) BUAT NGAMBIL BUKU
// ==========================================
app.get('/api/buku', (req, res) => {
    const mantraAmbilBuku = `
        SELECT buku.*, kategori.nama_kategori 
        FROM buku 
        JOIN kategori ON buku.id_kategori = kategori.id_kategori
    `;
    
    db.query(mantraAmbilBuku, (err, hasil) => {
        if (err) {
            console.error("Gagal ambil data buku:", err);
            res.status(500).json({ sukses: false, pesan: "Error saat mengambil data buku" });
        } else {
            res.json({ sukses: true, data: hasil });
        }
    });
});

// ==========================================
// INI JALUR PELAYAN (API) BUAT NAMBAH BUKU BARU
// ==========================================
app.post('/api/buku', (req, res) => {
    const bukuBaru = req.body; 

    const mantraTambah = `
        INSERT INTO buku (id_kategori, judul_buku, pengarang, penerbit, stok_buku) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(mantraTambah, [
        bukuBaru.id_kategori, 
        bukuBaru.judul_buku, 
        bukuBaru.pengarang, 
        bukuBaru.penerbit, 
        bukuBaru.stok_buku
    ], (err, hasil) => {
        if (err) {
            console.error("Gagal nambah buku:", err);
            res.status(500).json({ sukses: false, pesan: "Kulkas nolak barang baru!" });
        } else {
            catatLog(
                1, // id_admin (Anggap aja adminnya ber-ID 1)
                "TAMBAH BUKU", // aksi
                `Menambahkan buku baru dengan judul: ${bukuBaru.judul_buku} dan stok: ${bukuBaru.stok_buku}` // keterangan_detail
            );
            
            res.json({ sukses: true, pesan: "Buku berhasil ditambahkan ke Database!" });
        }
    });
}); 

// ==========================================
// INI JALUR PELAYAN (API) BUAT NGE-EDIT BUKU
// ==========================================
app.put('/api/buku/:id', (req, res) => {
    const idBuku = req.params.id; 
    const dataBaru = req.body;    

    const mantraEdit = `
        UPDATE buku 
        SET id_kategori = ?, judul_buku = ?, pengarang = ?, penerbit = ?, stok_buku = ? 
        WHERE id_buku = ?
    `;

    db.query(mantraEdit, [
        dataBaru.id_kategori, 
        dataBaru.judul_buku, 
        dataBaru.pengarang, 
        dataBaru.penerbit, 
        dataBaru.stok_buku, 
        idBuku 
    ], (err, hasil) => {
        if (err) {
            console.error("Gagal ngedit buku:", err);
            res.status(500).json({ sukses: false, pesan: "Tipexnya macet Bos!" });
        } else {
            catatLog(
                1, 
                "EDIT BUKU", 
                `Mengubah data buku ID: ${idBuku} menjadi judul: ${dataBaru.judul_buku}`
            );
            res.json({ sukses: true, pesan: "Data sukses di-update!" });
        }
    });
});
// ==========================================
// INI JALUR PELAYAN (API) BUAT NGEHAPUS BUKU
// ==========================================
app.delete('/api/buku/:id', (req, res) => {
    const idYangMauDihapus = req.params.id; 
    const mantraHapus = "DELETE FROM buku WHERE id_buku = ?";

    db.query(mantraHapus, [idYangMauDihapus], (err, hasil) => {
        if (err) {
            console.error("Gagal buang buku:", err);
            res.status(500).json({ sukses: false, pesan: "Tong sampah macet!" });
        } else {
            // 📸 JEPRET CCTV!
            catatLog(
                1, 
                "HAPUS BUKU", 
                `Menghapus buku secara permanen dengan ID: ${idYangMauDihapus}`
            );
            res.json({ sukses: true, pesan: "Buku sukses dimusnahkan dari Database!" });
        }
    });
});
// ==========================================
// INI JALUR PELAYAN (API) BUAT PENGEMBALIAN BUKU
// ==========================================
app.put('/api/transaksi/kembali/:id', (req, res) => {
    const idTransaksi = req.params.id;
    const dendaAkhir = req.body.denda; 
    const idBuku = req.body.id_buku;   

    const mantraUpdateTransaksi = `
        UPDATE transaksi 
        SET status = 1, denda = ? 
        WHERE id_transaksi = ?
    `;

    db.query(mantraUpdateTransaksi, [dendaAkhir, idTransaksi], (err, hasil) => {
        if (err) {
            console.error("Gagal update transaksi:", err);
            return res.status(500).json({ sukses: false, pesan: "Gagal memproses pengembalian!" });
        }

        const mantraTambahStok = "UPDATE buku SET stok_buku = stok_buku + 1 WHERE id_buku = ?";
        
        db.query(mantraTambahStok, [idBuku], (err2, hasil2) => {
            if (err2) {
                console.error("Gagal nambahin stok kembali:", err2);
                return res.status(500).json({ sukses: false, pesan: "Transaksi update tapi stok gagal bertambah!" });
            }

            // 📸 JEPRET CCTV!
            catatLog(
                1, 
                "KEMBALIKAN BUKU", 
                `Memproses pengembalian buku untuk Transaksi ID: ${idTransaksi} dengan denda Rp${dendaAkhir.toLocaleString('id-ID')}`
            );
            
            res.json({ sukses: true, pesan: "Buku sukses dikembalikan ke rak!" });
        });
    });
});
// ==========================================
// API BUAT PINJAM BUKU 
// ==========================================
app.post('/api/transaksi', (req, res) => {
    const idAnggota = req.body.id_anggota;
    const idBuku = req.body.id_buku;

    // 1. Kita bikin settingan Tanggal (Pinjam Hari Ini, Balik 7 Hari Lagi)
    const hariIni = new Date();
    const tenggat = new Date();
    tenggat.setDate(hariIni.getDate() + 7); // Tambah 7 hari

    // Format tanggalnya biar MySQL ngerti (YYYY-MM-DD)
    const tglPinjam = hariIni.toISOString().split('T')[0];
    const tglKembali = tenggat.toISOString().split('T')[0];

    // MANTRA 1: Nulis Struk di tabel transaksi
    const mantraTulisBon = `
        INSERT INTO transaksi (id_anggota, id_buku, tanggal_pinjam, tanggal_kembali, status, denda) 
        VALUES (?, ?, ?, ?, 0, 0)
    `;

    // Koki eksekusi Mantra 1
    db.query(mantraTulisBon, [idAnggota, idBuku, tglPinjam, tglKembali], (err, hasil) => {
        if (err) {
            console.error("Gagal nulis bon:", err);
            return res.status(500).json({ sukses: false, pesan: "Gagal nyatet bon pinjaman!" });
        }

        // MANTRA 2: Kalau bon sukses ditulis, kita kurangin stok bukunya 1
        const mantraKurangStok = "UPDATE buku SET stok_buku = stok_buku - 1 WHERE id_buku = ?";
        
        db.query(mantraKurangStok, [idBuku], (err2, hasil2) => {
            if (err2) {
                console.error("Gagal ngurangin stok:", err2);
                return res.status(500).json({ sukses: false, pesan: "Bon dicatat tapi stok gagal berkurang!" });
            }

            // Kalau DUA-DUANYA SUKSES
            res.json({ sukses: true, pesan: "Buku berhasil dipinjam! Jangan telat balikin ya." });
        });
    });
});

// ==========================================
// API BUAT SIGN UP ANGGOTA
// ==========================================

// 1. Jalur GET: Buat nampilin daftar anggota di Halaman Admin
app.get('/api/anggota', (req, res) => {
    const mantraAmbilAnggota = "SELECT * FROM Anggota";
    db.query(mantraAmbilAnggota, (err, hasil) => {
        if (err) {
            res.status(500).json({ sukses: false, pesan: "Gagal ambil data anggota" });
        } else {
            res.json({ sukses: true, data: hasil });
        }
    });
});

// 2. Jalur POST: Buat pengunjung yang lagi daftar akun baru
app.post('/api/anggota', (req, res) => {
    const anggotaBaru = req.body; 
    const mantraDaftar = `
        INSERT INTO Anggota (nama_anggota, nomor_telepon, alamat, username, password_anggota) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(mantraDaftar, [
        anggotaBaru.nama_anggota, 
        anggotaBaru.nomor_telepon, 
        anggotaBaru.alamat, 
        anggotaBaru.username, 
        anggotaBaru.password_anggota
    ], (err, hasil) => {
        if (err) {
            console.error("Gagal daftar:", err);
            res.status(500).json({ sukses: false, pesan: "Database nolak anggota baru!" });
        } else {
            res.json({ sukses: true, pesan: "Berhasil mendaftar!" });
        }
    });
});
// ==========================================
// API BUAT LOGIN ANGGOTA
// ==========================================
app.post('/api/login-anggota', (req, res) => {
    const userDiketik = req.body.username;
    const passDiketik = req.body.password;

    // Mantra nanya ke Kulkas: "Ada nggak anggota yang username & passwordnya ini?"
    const mantraCekAnggota = "SELECT * FROM Anggota WHERE username = ? AND password_anggota = ?";
    
    db.query(mantraCekAnggota, [userDiketik, passDiketik], (err, hasil) => {
        if (err) {
            res.status(500).json({ sukses: false, pesan: "Database error woi!" });
        } else {
            // Kalau ketemu (array nggak kosong)
            if (hasil.length > 0) {
                // Kita kirim balik data anggotanya (biar disimpen jadi Kartu VIP di frontend)
                res.json({ 
                    sukses: true, 
                    pesan: "Berhasil masuk!", 
                    dataAnggota: hasil[0] // Ambil data orang pertama yang cocok
                });
            } else {
                res.json({ sukses: false, pesan: "Username atau Password salah boss." });
            }
        }
    });
});
// ==========================================
// LIHAT BUKU PINJAMAN SAYA SENDIRI
// ==========================================
app.get('/api/transaksi/saya/:id', (req, res) => {
    const idAnggotaSaya = req.params.id; // Ambil ID dari URL

    // Mantra: "Ambil transaksi yang ID Anggotanya = saya, dan statusnya 0 (masih dipinjam)"
    const mantraPinjamanSaya = `
        SELECT t.*, b.judul_buku 
        FROM transaksi t
        JOIN buku b ON t.id_buku = b.id_buku
        WHERE t.id_anggota = ? AND t.status = 0
    `;

    db.query(mantraPinjamanSaya, [idAnggotaSaya], (err, hasil) => {
        if (err) {
            console.error("Gagal ambil struk pribadi:", err);
            res.status(500).json({ sukses: false, pesan: "Gagal narik data pinjaman lu." });
        } else {
            res.json({ sukses: true, data: hasil });
        }
    });
});
// ==========================================
// INI JALUR PELAYAN (API) BUAT LIHAT SEMUA TRANSAKSI (DIPAKAI ADMIN)
// ==========================================
app.get('/api/transaksi', (req, res) => {
    // Mantra JOIN: Ngegabungin data transaksi, nama anggota, dan judul buku
    const mantraAmbilTransaksi = `
        SELECT t.*, a.nama_anggota, b.judul_buku 
        FROM transaksi t
        JOIN Anggota a ON t.id_anggota = a.id_anggota
        JOIN buku b ON t.id_buku = b.id_buku
    `;

    db.query(mantraAmbilTransaksi, (err, hasil) => {
        if (err) {
            console.error("Gagal muat transaksi:", err);
            res.status(500).json({ sukses: false, pesan: "Buku catatan macet" });
        } else {
            res.json({ sukses: true, data: hasil });
        }
    });
});
app.listen(port, '0.0.0.0', () => {
    console.log("PerpusKu sudah buka untuk publik di port " + port);
});
