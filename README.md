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
- Sanitasi data ketat: field `password` otomatis dihapus sebelum data dikirimkan ke lapisan frontend (*zero password leakage*).

### 3. 🛡️ Role-Based Access Control (RBAC) Granular
- Pembatasan akses pengguna berdasarkan **Domain/Tab** (`users`, `products`, `orders`) dan **Aksi CRUD** (`read`, `create`, `edit`, `delete`).
- **End-to-End Security:** Otorisasi diverifikasi ganda di sisi backend oleh `05_RBAC.gs` dan di sisi client (`Auth.can(resource, action)`).
- **Predefined Roles & Custom Override:**
  - **Admin:** Akses penuh tanpa batas.
  - **Manager:** Full CRUD produk/order, read-only pada user.
  - **Staff:** Read, create, edit produk/order (dilarang delete, tab user tersembunyi).
  - **Viewer:** Read-only produk/order (dilarang create/edit/delete, tab user tersembunyi).
  - **Custom:** Override JSON hak akses per pengguna secara fleksibel.
- **UI Adaptif:** Navigasi tab terlarang otomatis disembunyikan dari sidebar desktop dan bottom bar mobile, tombol tambah/FAB dan aksi tabel menyesuaikan izin secara dinamis.


### 3. 📱 Thoughtful Mobile-First Responsive UI/UX
Didesain khusus untuk operasional cepat di lapangan menggunakan smartphone maupun di kantor menggunakan desktop:
- **Dual Navigation:** Desktop menggunakan sidebar samping yang dapat di-collapse, smartphone menggunakan *Bottom Navigation Bar* yang mudah dijangkau jempol.
- **Adaptive Modal / Bottom-Sheet:** Formulir muncul sebagai modal dialog terpusat di desktop, dan otomatis berubah menjadi *slide-up bottom-sheet* ergonomis di mobile.
- **Dual-Mode Table/Card View:** Tampilan data otomatis beradaptasi menjadi tabel spreadsheet di layar desktop dan menjadi kartu (*card view*) yang bersih di layar ponsel.
- **Mobile Floating Action Button (FAB):** Tombol aksi melayang di sudut kanan bawah layar mobile untuk menambah data seketika tanpa harus scroll ke atas.
- **Fast-Input Ergonomics:** Auto-focus pada field input pertama saat formulir dibuka, keyboard virtual adaptif (`inputmode="numeric"`, `email`), ukuran tombol sentuh nyaman ($\ge 44\text{px}$), dan font anti-zoom otomatis di browser iOS/Safari.

### 4. 📐 Schema sebagai Single Source of Truth
Cukup definisikan struktur data Anda sekali dalam satu objek `Schema`. Schema tersebut otomatis mengontrol:
- **Tampilan Tabel & Card:** Kolom yang ditampilkan, badge warna status, kolom yang dapat dicari (*searchable*), dan diurutkan (*sortable*).
- **Formulir Dinamis:** Tipe input (text, number, email, select, textarea), validasi required, dan opsi dropdown.
- **Backend Database:** Mapping baris spreadsheet, prefix ID otomatis, dan timestamps.

### 5. 🔁 Generic Reusable CRUD (High Leverage)
Anda tidak perlu lagi menulis fungsi `findAll`, `findById`, `create`, `update`, dan `delete` yang sama berulang kali untuk setiap entitas (`Users`, `Products`, `Orders`, dll.). Semua entitas memanfaatkan satu generic **Repository** dan **Database Engine**.

### 6. 🛡️ Resilient Header Mapping (Bebas Hardcode Index)
Modul database tidak pernah mengasumsikan koordinat kolom tetap seperti `row[0]`, `row[1]`. Pembacaan dan penulisan baris dilakukan secara dinamis berdasarkan nama *Header* Spreadsheet. Jika suatu saat urutan kolom di Spreadsheet diubah oleh admin, aplikasi **tidak akan rusak**.

### 7. 🔒 Concurrency Protection Terpusat
Menggunakan `LockService` terpusat pada operasi penulisan, pembaruan, dan pembuatan ID unik otomatis (`USR-000001`, `PRD-000001`). Mencegah terjadinya *race condition* dan duplikasi ID saat banyak pengguna menyimpan data bersamaan.

### 8. 🚀 Modern Promise-Based API Adapter
Bebas dari sintaks *callback hell* `google.script.run.withSuccessHandler()`. Frontend menggunakan adapter modern berbasis Promise:
```javascript
// Bersih, ringkas, dan modern
const users = await API.users.list();
await API.users.create(newUserData);
```

### 9. 🤖 AI Coding Agent Optimized
Dilengkapi dengan file panduan ketat [AGENTS.md](AGENTS.md) dan [.cursorrules](.cursorrules). AI Assistant (seperti Gemini, Claude, Antigravity, Cursor) dapat menavigasi kode, menambah modul baru, dan melakukan maintenance tanpa merusak arsitektur framework.

### 10. 🪶 Zero Heavy Build Dependencies
Tanpa React, Vue, NPM build tools, Webpack, atau TypeScript compilation. Menggunakan **HTML5, Tailwind CSS via CDN, dan Vanilla JavaScript modern (ES6+)**. Cepat dimuat, ringan, dan langsung berjalan natively di infrastruktur Google Apps Script.

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
Google Spreadsheet (Tab Users, Products, dll)
```

```text
Frontend Layer:
Main.html (Shell, Desktop Sidebar & Mobile Bottom Navigation)
    │
    ├── Page_Login.html (Authentication Screen)
    │
    ├── Page Tabs (Tab_Dashboard, Tab_Users, Tab_Products)
    │       │
    │       ├── Generic Table (Dual-Mode: Table Desktop & Card View Mobile)
    │       ├── Generic Form (Adaptive Modal & Mobile Bottom-Sheet)
    │       └── Mobile FAB (Floating Action Button) & Search Filter
    │
    └── API Adapter (Promise wrapper untuk google.script.run)
```

---

## 📁 Struktur File Proyek

```text
├── PRD.md                       # Dokumen spesifikasi kebutuhan arsitektur
├── AGENTS.md                    # Panduan & aturan baku untuk AI Coding Agent
├── .cursorrules                 # Instruksi otomatis untuk AI IDE (Cursor/Antigravity)
├── appsscript.json              # Manifest GAS (Web App & V8 Runtime)
│
├── 00_Config.gs                 # Konfigurasi global, Spreadsheet ID, Cache & Auth
├── 01_App.gs                    # Entry point doGet(e) & template include() helper
├── 01_Schema.gs                 # Definisi Schema Backend (UserSchema, ProductSchema)
├── 02_Response.gs               # Standardisasi payload respon (success, data, errors)
├── 03_Utils.gs                  # Utility helpers (generateId, timestamps, hashPassword)
├── 04_Auth.gs                   # Backend Authentication service (Login, Verify, Session)
├── 05_RBAC.gs                   # RBAC Engine (Authorization, Role Matrix, Session Guard)
├── 10_Database.gs               # Spreadsheet Engine, Header Mapping, Lock & Cache RAM
├── 11_Repository.gs             # Generic CRUD repository
├── 12_Validator.gs              # Centralized server-side validation
│
├── 20_UserRepository.gs         # User Data Access
├── 21_UserService.gs            # User Business Workflow (Auto-hash password)
├── 22_UserController.gs         # User Server Endpoints
│
├── 30_ProductRepository.gs      # Product Data Access
├── 31_ProductService.gs         # Product Business Workflow
├── 32_ProductController.gs      # Product Server Endpoints
├── 99_Seed.gs                   # Seeder otomatis untuk inisialisasi sheet & data awal
│
├── Main.html                    # Kerangka utama aplikasi (Responsive App Shell)
├── Styles.html                  # Styling global, Responsive Media Queries & Tailwind
├── Scripts.html                 # Routing tab & inisialisasi aplikasi
├── API.html                     # Frontend Promise Adapter
├── Page_Login.html              # Antarmuka Halaman Login responsif
├── 01_Schema_Frontend.html      # Schema Frontend (Single Source of Truth)
│
├── Component_Table.html         # Komponen Tabel generik (Desktop Table + Mobile Cards)
├── Component_Form.html          # Komponen Form generik (Fast-Input UX)
├── Component_Modal.html         # Komponen Modal (Desktop Dialog + Mobile Bottom-Sheet)
├── Component_Pagination.html    # Komponen Pagination dinamis
├── Component_Toast.html         # Komponen Notifikasi Toast interaktif
├── Component_Loading.html       # Komponen Spinner loading
├── Component_PageHeader.html    # Komponen Header halaman
│
├── Tab_Dashboard.html           # Halaman Dashboard
├── Tab_Users.html               # Halaman Manajemen Users (dengan Mobile FAB)
└── Tab_Products.html            # Halaman Manajemen Products (dengan Mobile FAB)
```

---

## 🚀 Panduan Memulai Cepat

### 1. Prasyarat
- [Node.js](https://nodejs.org/) terinstal di komputer Anda.
- Google Apps Script CLI (`@google/clasp`) terinstal global:
  ```bash
  npm install -g @google/clasp
  ```
- Akun Google dengan **Google Apps Script API** aktif di [script.google.com/home/usersettings](https://script.google.com/home/usersettings).

### 2. Login & Hubungkan Proyek
```bash
# 1. Login ke akun Google Anda
clasp login

# 2. Clone atau hubungkan ke script project Anda
clasp clone "<SCRIPT_ID>"
# atau buat proyek baru:
# clasp create --type webapp --title "My Modular App"

# 3. Push file lokal ke Google Apps Script
clasp push
```

### 3. Konfigurasi Spreadsheet & Pengaturan
Buka file `00_Config.gs` dan sesuaikan ID Google Spreadsheet Anda:
```javascript
const Config = {
  APP_NAME: "GAS Modular CRUD",
  SPREADSHEET_ID: "MASUKKAN_ID_SPREADSHEET_ANDA",
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10
  },
  CACHE: {
    ENABLED: true,       // Aktifkan RAM caching untuk performa tinggi
    TTL_SECONDS: 300     // Durasi cache (5 menit)
  },
  AUTH: {
    ENABLED: true,
    SESSION_KEY: 'gas_session_user'
  }
};
```

### 4. Inisialisasi Database (Seeder)
Jalankan fungsi `seedDatabase()` langsung dari Editor Google Apps Script, atau buka Web App dengan parameter `?action=seed`:
```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?action=seed
```

Seeder akan secara otomatis:
1. Membuat tab `Users` dan `Products` jika belum ada.
2. Memastikan seluruh header kolom lengkap (termasuk kolom `password`, `role`, dan `permissions`).
3. Mendaftarkan 4 akun pengguna demo dengan tingkatan hak akses RBAC berbeda:
   - **Administrator (`admin`):** `admin@databridge.com` / `admin2026123` (Full Access)
   - **Manager (`manager`):** `manager@example.com` / `manager123` (Full CRUD Produk & Orders, Read Users)
   - **Staff (`staff`):** `staff@example.com` / `staff123` (Read, Create, Edit Produk & Orders)
   - **Viewer (`viewer`):** `viewer@example.com` / `viewer123` (Read Only Produk & Orders)

### 5. Deploy Sebagai Web App
```bash
clasp deploy --description "Production Release"
```
Buka URL Web App yang dihasilkan, lalu login menggunakan kredensial administrator di atas.

---

## ➕ Protokol Menambah Entitas Baru (Misal: Orders)

Berkat arsitektur framework ini, Anda hanya perlu mengikuti 5 langkah terisolasi (sesuai panduan [AGENTS.md](AGENTS.md)):

1. **Definisikan Schema:**
   - Tambahkan `OrderSchema` di `01_Schema.gs` (backend) dan `01_Schema_Frontend.html` (frontend).
2. **Buat Service & Controller Backend:**
   - `41_OrderService.gs`: Memanggil generic `Repository.findAll(OrderSchema)`, `Repository.create(OrderSchema, data)`, dll.
   - `42_OrderController.gs`: Membuat fungsi global `ordersList()`, `ordersCreate()`, dll., dibungkus dengan `Response.success()`.
3. **Daftarkan ke API Adapter (`API.html`):**
   ```javascript
   orders: {
     list: () => API.call('ordersList'),
     create: (data) => API.call('ordersCreate', data),
     update: (id, data) => API.call('ordersUpdate', id, data),
     delete: (id) => API.call('ordersDelete', id)
   }
   ```
4. **Buat Tab Frontend (`Tab_Orders.html`):**
   - Buat file tab yang memanggil `Component_Table` dan `Component_Form` berdasarkan `OrderSchema`.
   - Pasang tombol navigasi dan container tab di `Main.html`.
5. **Tambahkan Seeder di `99_Seed.gs`:**
   - Inisialisasi sheet `Orders` lengkap dengan header kolom dan data awal.

Selesai! Entitas baru otomatis memiliki fitur CRUD lengkap, caching transparan, auto-focus form, mobile card view, pencarian live, sorting, dan pagination tanpa menulis ulang kode database.
