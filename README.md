# GAS Modular CRUD Framework

Framework ringan, modular, cepat, dan *configuration-driven* untuk membangun aplikasi internal bisnis berbasis **Google Apps Script (GAS) Web App** dengan **Google Spreadsheet** sebagai database.

Dirancang dengan prinsip **Deep Modules**, **Locality**, **High Leverage**, dan **Mobile-First UX**, framework ini memungkinkan Anda menambah entitas bisnis baru dalam hitungan menit tanpa menduplikasi kode CRUD, menghemat kuota GAS hingga 99%, serta memberikan pengalaman pengguna yang sangat responsif baik di smartphone maupun desktop.

---

## 🌟 Kelebihan & Fitur Utama

Banyak proyek Google Apps Script tradisional berkembang menjadi tumpukan kode yang saling memanggil secara acak (*spaghetti code*), lambat karena bolak-balik membaca Spreadsheet, dan tidak nyaman dibuka di smartphone. Framework ini memecahkan masalah tersebut dengan keunggulan-keunggulan berikut:

### 1. ⚡ Automated RAM Caching & Auto-Invalidation (Hemat Quota 99%)
- Terintegrasi transparan di dalam `10_Database.gs` menggunakan `CacheService.getScriptCache()`.
- Memangkas latensi pembacaan data dari **~1500ms menjadi ~5ms** (peningkatan kecepatan hingga 300x).
- Menghemat kuota harian *Spreadsheet Read/Write* Google Apps Script hingga 99%.
- **Zero Stale Data:** Setiap operasi mutasi (`create`, `update`, `delete`) secara otomatis membersihkan (*invalidate*) cache sheet terkait secara *real-time*.

### 2. 🔐 Autentikasi Database-Backed & SHA-256 Hashing
- Dilengkapi sistem login mandiri (`04_Auth.gs` & `Page_Login.html`) yang tervalidasi langsung terhadap tabel `Users`.
- Password dienkripsi menggunakan algoritma **SHA-256** (`Utilities.computeDigest`).
- Sesi disimpan di `CacheService` (6 jam) dengan token `USR-XXXXXX_UUID`; kedaluwarsa otomatis memicu *auto-logout* di client.

### 3. 🛡️ Role-Based Access Control (RBAC Granular)
- Pembatasan akses pengguna berdasarkan **Domain/Tab** (`users`, `products`, `orders`, dst.) dan **Aksi CRUD** (`read`, `create`, `edit`, `delete`, `approve`, `receive`).
- **End-to-End Security:** Otorisasi diverifikasi ganda di sisi backend oleh `05_RBAC.gs` dan di sisi client (`Auth.can(resource, action)`).
- **Dynamic Roles:** Definisi peran dibaca dari sheet `Roles` (dapat diubah dari UI **Peran & Izin**), dengan fallback ke matriks statis `Config.ROLES` (admin, manager, staff, spg, viewer).
- **UI Adaptif:** Navigasi tab terlarang otomatis disembunyikan, tombol tambah/FAB dan aksi tabel menyesuaikan izin secara dinamis.

### 4. 📱 Thoughtful Mobile-First Responsive UI/UX
- **Dual Navigation:** Desktop menggunakan sidebar samping, smartphone menggunakan *Bottom Navigation Bar*.
- **Adaptive Modal / Bottom-Sheet:** Formulir muncul sebagai modal dialog di desktop dan *slide-up bottom-sheet* di mobile.
- **Dual-Mode Table/Card View:** Tabel di desktop, kartu bersih di ponsel.
- **Fast-Input Ergonomics:** Auto-focus ke field pertama saat form dibuka, **auto-focus ke Qty setelah barang dipilih di combobox** (cursor langsung siap ketik), dan tombol sentuh nyaman.

### 5. 📐 Schema sebagai Single Source of Truth
Cukup definisikan struktur data sekali dalam satu objek `Schema` (`01_Schema.gs` backend + `01_Schema_Frontend.html` frontend). Schema mengontrol kolom tabel, badge status, pencarian, sorting, form dinamis, prefix ID, dan mapping header spreadsheet.

### 6. 🔁 Generic Reusable CRUD (High Leverage)
Satu generic **Repository** (`11_Repository.gs`) dan **Database Engine** (`10_Database.gs`) melayani semua entitas. Modul spesifik per entitas (`OrderRepository`, dst.) hanya berisi perilaku khusus.

### 7. 📦 Modul Bisnis Siap Pakai
- **Penjualan & Pengadaan (Sales/Purchase Order):** Alur lengkap SO (potong stok otomatis + mutasi OUT) dan PO (Draft → Approved → Shipped → Received, stok masuk otomatis).
- **Permintaan Barang Antar-Gudang (Stock Transfers):** Alur 4-langkah — SPG mengajukan → Admin review qty → Picker kirim (potong stok asal) → Toko terima (tambah stok tujuan), lengkap dengan audit kuantitas per-langkah.
- **Ledger Mutasi Stok:** Semua pergerakan IN/OUT/TRANSFER/ADJUSTMENT tercatat di `StockMutations`.
- **Laporan Bisnis:** Kartu stok, valuasi stok, rekap pembelian, penjualan, dan transfer (`90_ReportService.gs`).
- **Upload Bukti Foto ke Google Drive:** Kompresi otomatis di client (`ImageCompressor`), upload base64 ke Drive terstruktur per-kategori (`06_DriveService.gs`), upload bersifat *non-fatal* — kegagalan foto tidak membatalkan transaksi.

### 8. 🔒 Concurrency Protection Terpusat
`LockService` terpusat pada operasi penulisan, pembaruan, pembuatan ID unik, dan **validasi-potong stok** (mencegah oversell saat transaksi bersamaan).

### 9. 🚀 Modern Promise-Based API Adapter dengan Normalisasi Respons
Bebas dari *callback hell*, plus tahan benci terhadap variasi format respons GAS:
```javascript
const users = await API.users.list();
await API.users.create(newUserData);
```
`API.html` secara otomatis menormalkan respons yang datang sebagai **string JSON** atau **envelope batch** (`[["op.exec",[...]]]`) sebelum diproses — sehingga data valid tidak pernah salah dikira error.

### 10. 🤖 AI Coding Agent Optimized
Dilengkapi panduan ketat [AGENTS.md](AGENTS.md) dan [.cursorrules](.cursorrules) untuk AI Assistant (Claude, Cursor, dll).

### 11. 🪶 Zero Heavy Build Dependencies
Tanpa React, Vue, NPM build tools, atau TypeScript compilation. HTML5 + Tailwind CDN + Vanilla JS (ES6+) yang berjalan native di GAS.

---

## ⚠️ KRITIS: Gotcha Environment Google Apps Script

Bagian ini adalah hasil *hard-earned debugging* — **wajib dibaca** sebelum mengedit kode frontend.

### 1. 🚫 DILARANG `//` atau `/*` raw di dalam string literal JS (file HTML client)

Lapisan transport/template GAS dapat **men-strip komentar JavaScript** dari kode yang dikirim ke browser. Akibatnya:

| Pola di source | Yang diterima browser | Gejala |
|---|---|---|
| `'https://drive.google.com'` | `'https:` (string putus) | `SyntaxError: Invalid or unexpected token`, seluruh blok `<script>` tab mati |
| `accept="image/*"` di template literal | `accept="image` lalu kode berikutnya dimakan | `Unexpected identifier`, form rusak |

**Aturan pengganti yang aman:**

```javascript
// ❌ JANGAN — raw double slash di string
if (url.startsWith('https://')) { ... }
const thumb = `https://drive.google.com/thumbnail?id=${id}`;

// ✅ GUNAKAN — regex (tidak ada // kontigu)
if (/^https?:/.test(url)) { ... }

// ✅ GUNAKAN — concat, // hanya terbentuk saat runtime
const thumb = 'https:/' + '/drive.google.com/thumbnail?id=' + id;

// ❌ JANGAN — image/* di dalam template literal HTML
<input accept="image/*" ...>

// ✅ GUNAKAN — HTML entity &#47; (= / bagi browser, aman di source)
<input accept="image&#47;*" ...>
```

Cara cepat memburu pelanggaran:
```bash
grep -rn "://" Tab_*.html Component_*.html | grep -v "xmlns"
grep -rn 'image/\*' Tab_*.html Component_*.html
```

### 2. 🚫 DILARANG memanggil `SpreadsheetApp` langsung di luar `10_Database.gs`
Akan merusak sinkronisasi RAM cache → *stale data*.

### 3. 🚫 DILARANG membuat komentar HTML `<?!= include(...) ?>`
Server template GAS mengevaluasinya bahkan di dalam komentar → crash.

---

## 🚢 Workflow Deploy (clasp) — Ikuti Persis

```bash
# 1. Push KODE dengan -f (WAJIB)
clasp push -f
```

> ⚠️ **`clasp push` biasa bisa diam-diam "Skipping push."** padahal file berubah (bug timestamp/daftar file). Selalu pakai **`clasp push -f`** dan tidak percaya output "Skipping".

```bash
# 2. Redeploy deployment AKTIF tanpa mengubah URL
clasp deploy -i "AKfycb...(deployment ID yang aktif)" -d "deskripsi perubahan"
```

**Aturan penting deployment:**
- **Deployment GAS bersifat *pinned* (immutable).** Push baru TIDAK mengubah kode deployment lama. Editor Apps Script selalu menampilkan kode terbaru — itu bisa menipu; yang dijalankan browser adalah snapshot deployment dari URL yang dibuka.
- Satu project boleh punya banyak deployment dengan kode berbeda-beda. **URL lama = kode lama, selamanya.** Jangan pernah mengira "sudah push" berarti "semua URL sudah baru".
- Redeploy dengan `-i <ID>` memakai URL yang sama (aman jika manifest `appsscript.json` tidak berubah tipe). Jika manifest berubah → buat deployment baru.
- **Simpan deployment ID aktif** (yang URL-nya dibagikan ke pengguna) dan selalu redeploy ke ID itu.

**Verifikasi versi yang berjalan di browser:**
Buka Console (F12) — aplikasi mencetak penanda build:
```
App Initializing... | BUILD: 2026-09-25.4
[Table] loaded v2026-09-25.3
```
Jika marker tidak muncul → browser menjalankan versi lama (cache / URL deployment lama). Tes dengan **Incognito** + URL deployment aktif.

**Hard refresh** (Ctrl+Shift+R) selalu dilakukan setelah deploy.

---

## 🏗️ Diagram Arsitektur

```text
Backend Layer:
Controller (Entry Point google.script.run & Standardized Response)
    │
    ▼
Service (Business Logic, Hashing, & Centralized Validation)
    │
    ▼
Repository (Generic CRUD berdasarkan Schema)
    │
    ▼
Database (Spreadsheet Adapter, Header Mapping, Concurrency Lock, RAM Caching)
    │
    ├── CacheService (In-Memory RAM Cache: 5ms read latency, Auto-Invalidation)
    │
    ▼
Google Spreadsheet (Users, Products, Orders, StockTransfers, dst)

Frontend Layer:
Main.html (Shell, Desktop Sidebar & Mobile Bottom Navigation)
    │
    ├── Page_Login.html (Authentication Screen)
    │
    ├── Page Tabs (Dashboard, Users, Products, Orders, Transfers, dst)
    │       ├── Generic Table (Dual-Mode: Table Desktop & Card View Mobile)
    │       ├── Generic Form / Modal (Adaptive + Bottom-Sheet Mobile)
    │       └── Generic Combobox (Searchable dropdown untuk pilih produk)
    │
    └── API Adapter (Promise wrapper + normalisasi respons batch GAS)
```

---

## 📁 Struktur File Proyek

```text
├── PRD.md                       # Dokumen spesifikasi kebutuhan arsitektur
├── AGENTS.md                    # Panduan & aturan baku untuk AI Coding Agent
├── .cursorrules                 # Instruksi otomatis untuk AI IDE
├── appsscript.json              # Manifest GAS (Web App & V8 Runtime)
│
├── 00_Config.gs                 # Konfigurasi global, Spreadsheet ID, Cache, Roles matriks, RBAC
├── 01_App.gs                    # Entry point doGet(e) + include() helper
├── 01_Schema.gs                 # Definisi Schema Backend (semua entitas)
├── 02_Response.gs               # Standardisasi payload respon (success, data, message)
├── 03_Utils.gs                  # Utility helpers (generateId, timestamps, hashPassword)
├── 04_Auth.gs                   # Authentication service (login, SHA-256, session token)
├── 05_RBAC.gs                   # RBAC Engine (sesi, izin dinamis dari sheet Roles)
├── 06_DriveService.gs           # Upload bukti foto base64 ke Google Drive per-kategori
│
├── 10_Database.gs               # Spreadsheet Engine, Header Mapping, Lock & RAM Cache
├── 11_Repository.gs             # Generic CRUD repository (ID auto, timestamps)
├── 12_Validator.gs              # Centralized server-side validation
│
├── 20_UserRepository.gs         # User Data Access
├── 21_UserService.gs            # User Business Workflow (auto-hash password)
├── 22_UserController.gs         # User Server Endpoints
│
├── 30_ProductRepository.gs      # Product Data Access
├── 31_ProductService.gs         # Product Business Workflow
├── 32_ProductController.gs      # Product Server Endpoints
│
├── 51_RoleService.gs            # Role & Permission Workflow
├── 52_RoleController.gs         # Role Server Endpoints
│
├── 60_CategoryRepository.gs     # Category Data Access
├── 61_CategoryService.gs        # Category Business Workflow
├── 62_CategoryController.gs     # Category Server Endpoints
│
├── 70_WarehouseRepository.gs    # Warehouse Data Access
├── 71_WarehouseService.gs       # Warehouse Business Workflow
├── 72_WarehouseController.gs    # Warehouse Server Endpoints
│
├── 75_StockService.gs           # Saldo stok per gudang/produk (getBalance, setBalance)
├── 75_StockController.gs        # Stock Server Endpoints
├── 76_StockTransferRepository.gs# StockTransfers + TransferItems Data Access
├── 77_InventoryService.gs       # Alur 4-langkah permintaan barang & mutasi stok atomik
├── 78_StockTransferController.gs# Transfer Server Endpoints
│
├── 80_OrderRepository.gs        # Orders + OrderItems Data Access
├── 81_OrderService.gs           # Alur Sales Order & Purchase Order (stok atomik + Lock)
├── 82_OrderController.gs        # Order Server Endpoints
│
├── 90_ReportService.gs          # Laporan: kartu stok, valuasi, pembelian, penjualan, transfer
├── 91_ReportController.gs       # Report Server Endpoints
│
├── 99_Seed.gs                   # Seeder otomatis (semua sheet + data demo + akun)
│
├── Main.html                    # Kerangka utama (Responsive App Shell)
├── Styles.html                  # Styling global, responsive utilities & Tailwind
├── Scripts.html                 # App object: routing tab, RBAC UI, ImageCompressor
├── API.html                     # Promise Adapter + normalisasi respons batch GAS
├── Page_Login.html              # Halaman Login responsif
├── 01_Schema_Frontend.html      # Schema Frontend (Single Source of Truth UI)
│
├── Component_Table.html         # Tabel generik (desktop table + mobile cards, search, sort)
├── Component_Form.html          # Form generik (fast-input UX)
├── Component_Modal.html         # Modal (desktop dialog + mobile bottom-sheet)
├── Component_Combobox.html      # Searchable dropdown dengan navigasi keyboard
├── Component_Pagination.html    # Pagination dinamis
├── Component_Toast.html         # Notifikasi Toast
├── Component_Loading.html       # Spinner loading
├── Component_PageHeader.html    # Header halaman
│
├── Tab_Dashboard.html           # Dashboard ringkasan bisnis
├── Tab_Users.html               # Manajemen Users
├── Tab_Products.html            # Manajemen Products
├── Tab_Categories.html          # Manajemen Kategori
├── Tab_Warehouses.html          # Manajemen Gudang/Toko
├── Tab_Orders.html              # Penjualan (SO) & Pengadaan (PO) + upload struk
├── Tab_StockTransfers.html      # Permintaan barang 4-langkah + upload foto bukti
├── Tab_StockMutations.html      # Ledger mutasi stok
├── Tab_Reports.html             # Laporan bisnis
├── Tab_Roles.html               # Peran & Izin (RBAC editor)
│
├── bundled_test.html            # Bundle dev lokal (generated; JANGAN edit manual)
└── architecture.html            # Dokumentasi arsitektur visual (bukan bagian app)
```

---

## 🚀 Panduan Memulai Cepat

### 1. Prasyarat
- [Node.js](https://nodejs.org/) terinstal.
- Google Apps Script CLI:
  ```bash
  npm install -g @google/clasp
  ```
- Akun Google dengan **Google Apps Script API** aktif di [script.google.com/home/usersettings](https://script.google.com/home/usersettings).

### 2. Login & Hubungkan Proyek
```bash
clasp login
clasp clone "<SCRIPT_ID>"     # atau clasp create --type webapp
```

### 3. Konfigurasi (`00_Config.gs`)
```javascript
const Config = {
  APP_NAME: "GAS Modular CRUD",
  SPREADSHEET_ID: "MASUKKAN_ID_SPREADSHEET_ANDA",
  PAGINATION: { DEFAULT_PAGE_SIZE: 10 },
  CACHE: {
    ENABLED: true,
    TTL_SECONDS: 300
  },
  AUTH: {
    DEFAULT_ADMIN: {
      email: "admin@databridge.com",
      password: "admin2026123",
      name: "Super Admin",
      role: "admin"
    }
  },
  ROLES: { /* matriks fallback: admin, manager, staff, spg, viewer */ },
  RBAC: { ENABLED: true }
};
```

### 4. Inisialisasi Database (Seeder)
Jalankan `seedDatabase()` dari Editor GAS, atau buka:
```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?action=seed
```
Seeder membuat & memverifikasi semua sheet (`Users`, `Products`, `Roles`, `Categories`, `Warehouses`, `Stocks`, `StockTransfers`, `TransferItems`, `StockMutations`, `Orders`, `OrderItems`) lengkap dengan header dan data demo. Akun administrator: `admin@databridge.com` / `admin2026123`.

### 5. Deploy Sebagai Web App
```bash
clasp push -f
clasp deploy -d "Production Release"
```
> Simpan deployment ID yang dihasilkan — itu ID yang akan selalu Anda redeploy dengan `-i` agar URL tetap sama. Lihat bagian [Workflow Deploy](#-workflow-deploy-clasp--ikuti-persis).

---

## ➕ Protokol Menambah Entitas Baru

Contoh aktual dari repo ini (entitas Orders memakai blok 80-an):

1. **Definisikan Schema** di `01_Schema.gs` (backend) dan `01_Schema_Frontend.html` (frontend) — identik keduanya.
2. **Buat lapisan backend:**
   - `80_OrderRepository.gs` — hanya jika ada perilaku khusus di luar generic Repository.
   - `81_OrderService.gs` — business logic; panggil `Repository.findAll(OrderSchema)`, dst.
   - `82_OrderController.gs` — endpoint global `ordersList()`, dst., dibungkus `try-catch` + `Response.success()/error()`.
3. **Daftarkan ke `API.html`:**
   ```javascript
   orders: {
     list: (type) => API.call('ordersList', type),
     get: (id) => API.call('ordersGet', id),
     create: (payload) => API.call('ordersCreateSales', payload)
   }
   ```
4. **Buat `Tab_Orders.html`** — pakai `Table.render()` berbasis `OrderSchema.columns`, ekspos `window.initOrdersTab`, lalu pasang nav + container di `Main.html`.
5. **Tambahkan seeder** di `99_Seed.gs` (header sheet + data sampel).

**Checklist sebelum selesai** (wajib):
- [ ] Syntax check semua blok `<script>` (lihat perintah di bawah) dan `node --check` untuk `.gs`.
- [ ] Tidak ada `//` atau `/*` raw di string literal JS file client.
- [ ] `clasp push -f` (bukan push biasa) → **verifikasi via `clasp pull`** bahwa isi server = lokal.
- [ ] Redeploy ke deployment ID aktif, hard refresh, cek marker BUILD di console.
- [ ] Cache ter-invalidate otomatis, timestamps terisi, ID ber-prefix benar.

**Syntax check cepat semua blok script HTML:**
```bash
node -e "
const fs=require('fs');
for(const f of fs.readdirSync('.').filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(f,'utf8');
  const re=/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m,i=0;
  while((m=re.exec(html))){i++;
    try{ new Function(m[1]); }
    catch(e){ console.log('FAIL',f,'#'+i,e.message); }
  }
}"
```
