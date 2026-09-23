# 📋 MASTER PLAN & TECHNICAL ROADMAP
## Supply Chain, Multi-Gudang, Mutasi Stok, Order (PO & SO), dan Sistem Laporan

Dokumen ini adalah **Master Blueprint & Technical Debt Tracker** untuk pengembangan ekosistem rantai pasok (Supply Chain & Inventory Lite) pada **GAS Modular CRUD Framework**. Dokumen ini dirancang untuk menjadi acuan teknis jangka panjang, panduan implementasi bertahap, serta pencatatan potensi utang teknis (*technical debt*) dan mitigasinya.

---

## 🏛️ 1. Prinsip Arsitektur & Kepatuhan Konvensi

Berdasarkan dokumen `AGENTS.md`, seluruh modul baru **WAJIB** tunduk pada aturan berikut:

1. **Schema sebagai Single Source of Truth:**
   - Semua metadata kolom, tipe data, validasi, pencarian, dan tampilan formulir didefinisikan secara deklaratif di `01_Schema.gs` (backend) dan `01_Schema_Frontend.html` (frontend).
2. **Deep Modules & Generic Leverage:**
   - Gunakan `10_Database.gs` dan `11_Repository.gs` untuk operasi CRUD umum.
   - Modul service spesifik hanya dibuat untuk logika bisnis kompleks (misal: kalkulasi stok atomik, perubahan status pesanan, dan agregasi data laporan).
3. **Zero Spreadsheet Coordinates Leakage:**
   - Dilarang keras mereferensikan koordinat sel (`A1`, `row[0]`, `row[1]`). Seluruh pertukaran data berbasis Object JavaScript dengan dynamic Header Mapping.
4. **Automated RAM Caching & Konsistensi Transaksi:**
   - Semua mutasi database wajib melewati `10_Database.gs` agar `CacheService` otomatis di-invalidate.
   - Operasi yang mengubah kuantitas stok atau status transaksi wajib diproteksi menggunakan `LockService.getScriptLock()` untuk mencegah *race conditions*.
5. **Runtime-Native GAS (No Heavy Build):**
   - Vanilla JS (ES6+) dan Tailwind CSS (CDN). Tanpa React/Vue, bundler, atau dependensi Node.js di sisi client.

---

## 🗄️ 2. Spesifikasi Entitas & Desain Skema Database (Sheets)

### 2.1. Entitas: Kategori Produk (`Categories`)
- **Sheet Name:** `Categories`
- **ID Prefix:** `CAT` (Contoh: `CAT-000001`)
- **Struktur Kolom:**
  | Kolom | Tipe | Keterangan | Validasi / Aturan |
  | :--- | :--- | :--- | :--- |
  | `id` | string | ID Unik Kategori | Primary Key, Auto-generated |
  | `code` | string | Kode Singkat Kategori | Unik, misal: `ELK`, `FNB`, `ATK` |
  | `name` | string | Nama Kategori | Wajib diisi, Searchable |
  | `description` | string | Deskripsi / Catatan | Opsional |
  | `created_at` | string | Timestamp ISO Pembuatan | Otomatis |
  | `updated_at` | string | Timestamp ISO Pembaruan | Otomatis |

### 2.2. Entitas: Pembaruan Produk (`Products`)
- **Sheet Name:** `Products`
- **ID Prefix:** `PRD` (Contoh: `PRD-000001`)
- **Kolom Baru & Penyesuaian:**
  - Tambah kolom `category_id` (Relasi ke `Categories.id`).
  - Tambah kolom `unit` (Satuan barang: `pcs`, `box`, `kg`, dll).
  - Tambah kolom `cost_price` (Harga modal / HPP beli).
  - Tambah kolom `min_stock` (Ambang batas minimum peringatan stok menipis).
  - Kolom `stock` akan mencerminkan total agregat saldo dari seluruh gudang.

### 2.3. Entitas: Gudang (`Warehouses`)
- **Sheet Name:** `Warehouses`
- **ID Prefix:** `WH` (Contoh: `WH-000001`)
- **Struktur Kolom:**
  | Kolom | Tipe | Keterangan | Validasi / Aturan |
  | :--- | :--- | :--- | :--- |
  | `id` | string | ID Unik Gudang | Primary Key, Auto-generated |
  | `code` | string | Kode Gudang | Unik, misal: `GDG-JKT`, `GDG-SBY` |
  | `name` | string | Nama Gudang | Wajib diisi |
  | `address` | string | Alamat Fisik / Lokasi | Opsional |
  | `status` | string | Status Operasional | `active` / `inactive` |
  | `created_at` | string | Timestamp ISO Pembuatan | Otomatis |
  | `updated_at` | string | Timestamp ISO Pembaruan | Otomatis |

### 2.4. Entitas: Saldo Stok per Gudang (`Stocks`)
- **Sheet Name:** `Stocks`
- **ID Prefix:** `STK` (Contoh: `STK-000001`)
- **Struktur Kolom:**
  | Kolom | Tipe | Keterangan | Validasi / Aturan |
  | :--- | :--- | :--- | :--- |
  | `id` | string | ID Unik Rekaman Saldo | Primary Key |
  | `warehouse_id` | string | Relasi ke `Warehouses.id` | Foreign Key, Wajib |
  | `product_id` | string | Relasi ke `Products.id` | Foreign Key, Wajib |
  | `quantity` | number | Jumlah Stok Fisik di Gudang ini | Bilangan riil/bulat (>= 0) |
  | `updated_at` | string | Waktu Sinkronisasi Terakhir | Otomatis |

### 2.5. Entitas: Riwayat Mutasi Stok (`StockMutations`)
- **Sheet Name:** `StockMutations`
- **ID Prefix:** `MUT` (Contoh: `MUT-000001`)
- **Prinsip:** *Immutable Ledger* (Buku besar tidak dapat diedit atau dihapus).
- **Struktur Kolom:**
  | Kolom | Tipe | Keterangan | Validasi / Aturan |
  | :--- | :--- | :--- | :--- |
  | `id` | string | ID Mutasi | Primary Key |
  | `date` | string | Tanggal & Waktu Mutasi | Timestamp ISO |
  | `type` | string | Jenis Mutasi | `IN`, `OUT`, `TRANSFER`, `ADJUSTMENT` |
  | `reference_type`| string | Sumber Transaksi | `PO`, `SO`, `OPNAME`, `MANUAL` |
  | `reference_id` | string | ID Dokumen Sumber | ID Order / Nomor Referensi |
  | `product_id` | string | ID Barang yang Berpindah | Foreign Key ke `Products` |
  | `warehouse_id` | string | Gudang Asal / Utama | Foreign Key ke `Warehouses` |
  | `target_warehouse_id` | string | Gudang Tujuan | Terisi jika `type === 'TRANSFER'` |
  | `quantity` | number | Jumlah Barang | Selalu bernilai positif |
  | `notes` | string | Alasan / Catatan Mutasi | Keterangan tambahan |
  | `created_by` | string | Aktor Pembuat Mutasi | Email pengguna dari sesi |

### 2.6. Entitas: Pesanan Transaksi (`Orders`)
- **Sheet Name:** `Orders`
- **ID Prefix:** `ORD` (atau `PO`/`SO` berbasis tipe)
- **Struktur Kolom:**
  | Kolom | Tipe | Keterangan | Validasi / Aturan |
  | :--- | :--- | :--- | :--- |
  | `id` | string | ID Dokumen | Primary Key |
  | `order_no` | string | Nomor Faktur / Invoice | Misal: `PO-2026-0001`, `SO-2026-0001` |
  | `type` | string | Jenis Transaksi | `PURCHASE` (Barang Masuk) / `SALES` (Barang Keluar) |
  | `date` | string | Tanggal Faktur | Format YYYY-MM-DD |
  | `warehouse_id` | string | Gudang Sasaran / Asal | Foreign Key ke `Warehouses` |
  | `contact_name` | string | Nama Pihak Ketiga | Supplier (PO) atau Customer (SO) |
  | `total_amount` | number | Total Nilai Tagihan | Akumulasi subtotal rincian |
  | `status` | string | Status Siklus Pesanan | `draft`, `completed`, `cancelled` |
  | `notes` | string | Keterangan / Alamat Pengiriman | Opsional |
  | `created_by` | string | Pembuat Dokumen | Email pengguna sesi |
  | `created_at` | string | Timestamp Pembuatan | Otomatis |

### 2.7. Entitas: Rincian Barang Pesanan (`OrderItems`)
- **Sheet Name:** `OrderItems`
- **ID Prefix:** `ITM` (Contoh: `ITM-000001`)
- **Struktur Kolom:**
  | Kolom | Tipe | Keterangan | Validasi / Aturan |
  | :--- | :--- | :--- | :--- |
  | `id` | string | ID Item | Primary Key |
  | `order_id` | string | Relasi ke `Orders.id` | Foreign Key |
  | `product_id` | string | Relasi ke `Products.id` | Foreign Key |
  | `quantity` | number | Jumlah Qty | > 0 |
  | `price` | number | Harga Satuan (Beli/Jual) | Nilai nominal |
  | `subtotal` | number | Nilai Total Baris | `quantity * price` |

---

## 🗺️ 3. Diagram Alur Data & Siklus Pesanan

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna / Staff
    participant UI as Browser (SPA)
    participant Ctrl as OrderController
    participant Inv as InventoryService
    participant DB as 10_Database.gs
    participant Sheet as Google Sheets

    Note over User,Sheet: 1. Alur Transaksi Purchase Order (PO)
    User->>UI: Buat PO (Supplier: PT A, Gudang: GDG-JKT, Status: Completed)
    UI->>Ctrl: ordersCreate(poData, items)
    Ctrl->>Inv: recordOrderAndMutate(order, items)
    activate Inv
    Inv->>DB: LockService.getScriptLock()
    Inv->>DB: Simpan Orders & OrderItems
    loop Setiap Item Barang
        Inv->>DB: Tambah Stok di Stocks (GDG-JKT, Product)
        Inv->>DB: Catat Rekaman di StockMutations (IN, Ref: PO)
    end
    Inv->>DB: Hitung ulang total_stock di Products
    Inv->>DB: Invalidate RAM Cache (Orders, Stocks, Mutations, Products)
    Inv->>Ctrl: Selesai (Release Lock)
    deactivate Inv
    Ctrl-->>UI: Response.success(data)
    UI-->>User: Tampilkan Toast Sukses & Perbarui Tabel
```

---

## 📊 4. Spesifikasi Modul Laporan (Reporting Engine)

Modul laporan dirancang untuk memberikan visibilitas bisnis lengkap tanpa membebani performa spreadsheet:

```mermaid
graph TD
    Reports[Dashboard Laporan / Tab_Reports]
    Reports --> R1[Laporan Kartu Stok / Mutasi]
    Reports --> R2[Laporan Valuasi Saldo Stok]
    Reports --> R3[Laporan Pembelian / PO]
    Reports --> R4[Laporan Penjualan / SO]

    R1 --> Exp[Ekspor Data: CSV / Print Preview / Tautan Sheet]
    R2 --> Exp
    R3 --> Exp
    R4 --> Exp
```

### 4.1. Laporan Mutasi & Kartu Stok (Stock Card Report)
- **Tujuan:** Mengetahui riwayat arus masuk dan keluar barang tertentu di gudang tertentu.
- **Filter:** Rentang tanggal (`from_date` s.d. `to_date`), Pilihan Gudang, Pilihan Produk.
- **Kolom Tampilan:**
  `Tanggal | No Referensi | Tipe (IN/OUT/TRANSFER/ADJUSTMENT) | Qty Masuk | Qty Keluar | Saldo Akhir | Catatan`

### 4.2. Laporan Valuasi Saldo Stok (Stock Valuation Report)
- **Tujuan:** Menghitung nilai aset inventaris perusahaan secara riil.
- **Filter:** Pilihan Gudang (atau Seluruh Gudang), Kategori Produk.
- **Kalkulasi:** `Nilai Aset = Quantity x Cost Price (Harga Modal)`.
- **Kolom Tampilan:**
  `Kode Produk | Nama Produk | Kategori | Gudang | Saldo Qty | Harga Pokok | Total Nilai Aset`

### 4.3. Laporan Pembelian (Purchase Order Report)
- **Tujuan:** Rekapitulasi pengadaan barang dan pengeluaran operasional inventaris.
- **Filter:** Rentang tanggal, Supplier, Status (Completed/Draft), Gudang Penerima.
- **Kolom Tampilan:**
  `Tanggal | No PO | Supplier | Gudang | Status | Total Pembelian (Rp)`

### 4.4. Laporan Penjualan (Sales Order Report)
- **Tujuan:** Menganalisis omzet penjualan, volume barang keluar, dan pelanggan aktif.
- **Filter:** Rentang tanggal, Pelanggan, Status, Gudang Pengirim.
- **Kolom Tampilan:**
  `Tanggal | No SO | Customer | Gudang | Total Penjualan (Rp) | Estimasi Margin Kotor`

### 4.5. Fitur Ekspor Data
- **Ekspor CSV Native Client-Side:** Mengubah tabel laporan menjadi file `.csv` langsung di browser menggunakan Blob JavaScript (tanpa kuota server).
- **Print Friendly View:** Tombol cetak yang mengaktifkan media query `@media print` dengan header rapi untuk laporan fisik / simpan PDF.

---

## 📅 5. Rencana Tahapan Kerja (Action Roadmap)

| Fase | Fokus Modul | Komponen Backend | Komponen Frontend | Estimasi Output |
| :---: | :--- | :--- | :--- | :--- |
| **Fase 1** | **Kategori Produk & Integrasi Form** | `60_CategoryRepository.gs`<br>`61_CategoryService.gs`<br>`62_CategoryController.gs`<br>`01_Schema.gs` update | `01_Schema_Frontend.html`<br>`Tab_Categories.html`<br>`Tab_Products.html` dynamic select<br>`API.html` registration | CRUD Kategori selesai & Form Produk terhubung dropdown dinamis |
| **Fase 2** | **Multi-Gudang & Saldo Stok** | `70_WarehouseRepository.gs`<br>`71_WarehouseService.gs`<br>`72_WarehouseController.gs`<br>`75_StockService.gs` | `Tab_Warehouses.html`<br>Monitoring Saldo Stok per Gudang di modal/tabel produk | CRUD Gudang selesai & Tabel alokasi stok per gudang aktif |
| **Fase 3** | **Engine Mutasi Stok & Stock Opname** | `76_StockMutationRepository.gs`<br>`77_InventoryService.gs` (LockService atomic mutation) | `Tab_StockMutations.html`<br>Modal Transfer Antar Gudang<br>Modal Stock Opname / Penyesuaian | Buku besar mutasi stok berfungsi penuh dan terlindungi dari race condition |
| **Fase 4** | **Purchase Order (PO) & Sales Order (SO)** | `80_OrderRepository.gs`<br>`81_OrderService.gs`<br>`82_OrderController.gs`<br>Integrasi otomatis ke InventoryService | `Tab_Orders.html`<br>Form Order Dinamis (Multi-item row, auto sum)<br>Aksi Complete yang memicu mutasi stok | Alur belanja & penjualan terhubung otomatis ke stok |
| **Fase 5** | **Sistem Laporan & Ekspor** | `90_ReportService.gs`<br>`91_ReportController.gs` | `Tab_Reports.html`<br>Filter dinamis<br>Export CSV client-side<br>Tampilan Cetak / PDF | 4 Jenis Laporan analitik bisnis siap pakai |

---

## ⚠️ 6. Pelacakan Utang Teknis & Mitigasi Risiko (Technical Debt Tracker)

Bagian ini mendokumentasikan batas teknis arsitektur Google Apps Script dan strategi pencegahan mitigasi:

### TD-01: Batas Kuota Eksekusi 6 Menit & Payload Spreadsheet
- **Deskripsi Masalah:** Jika baris pada `StockMutations` atau `OrderItems` mencapai puluhan ribu baris, pemanggilan `SpreadsheetApp.getDataRange()` berulang kali dapat memperlambat respon hingga timeout.
- **Rencana Mitigasi:**
  1. `10_Database.gs` telah dilengkapi RAM Caching transparan (`CacheService`), memangkas latency dari ~1500ms menjadi ~5ms untuk query berulang.
  2. Untuk laporan periode panjang, filter dilakukan secara server-side pada dataset yang ter-cache, bukan memanggil API Google Sheets berkali-kali.
  3. Pemisahan sheet arsip tahunan jika transaksi melampaui 50.000 baris per tahun.

### TD-02: Race Condition pada Pembaruan Stok Bersamaan
- **Deskripsi Masalah:** Dua staff melakukan transaksi penjualan barang yang sama pada detik yang sama di gudang yang sama.
- **Rencana Mitigasi:**
  1. Penggunaan `LockService.getScriptLock()` wajib diterapkan pada setiap method mutasi stok di `77_InventoryService.gs` dengan timeout 15-30 detik.
  2. Validasi stok sebelum pengurangan: Jika saldo fisik tidak mencukupi, sistem langsung melempar Exception yang ramah pengguna (*"Stok tidak mencukupi di gudang ini"*).

### TD-03: Ketergantungan Dropdown Dinamis Berantai (Cascading Dropdowns)
- **Deskripsi Masalah:** Form penjualan membutuhkan pemilihan Gudang $\rightarrow$ kemudian memfilter Produk yang hanya memiliki stok di gudang tersebut.
- **Rencana Mitigasi:**
  Komponen `Component_Form.html` dipertahankan tetap generik. Logika dependensi antar dropdown ditangani pada level handler tab halaman (`Tab_Orders.html`) melalui *event listener* `change` pada elemen select.

### TD-04: RBAC Granular pada Modul Baru
- **Deskripsi Masalah:** Menambahkan 5 modul baru (`categories`, `warehouses`, `stocks`, `orders`, `reports`) harus selaras dengan hak akses pengguna yang sudah ada di database.
- **Rencana Mitigasi:**
  1. Administrator otomatis mendapatkan wildcard `*` untuk seluruh modul baru.
  2. Inisialisasi otomatis: Skrip migrasi di `05_RBAC.gs` dan `99_Seed.gs` memberikan izin default yang aman bagi role `manager`, `staff`, dan `viewer`.

---

## 🔐 7. Matriks Hak Akses (RBAC) Baru yang Direncanakan

| Modul / Resource | Admin | Manager | Staff | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| `categories` | CRUD | CRUD | Read | Read |
| `warehouses` | CRUD | Read | Read | Read |
| `stocks` | CRUD + Adjust | Read + Adjust | Read | Read |
| `mutations` | Create + Read | Create + Read | Create (In/Out) | Read |
| `orders` | CRUD + Complete | CRUD + Complete | Create + Read | Read |
| `reports` | Read + Export | Read + Export | Read (Stok) | - |

---

*Dokumen ini diperbarui secara berkala seiring berjalannya implementasi fase.*
