# AI AGENT GUIDELINES & EXPANSION RULES

Dokumen ini adalah panduan wajib (**System Prompt / Project Instructions**) yang **HARUS DIBACA DAN DIPATUHI** oleh setiap AI Coding Agent sebelum melakukan modifikasi, perbaikan bug, atau penambahan fitur/entitas baru (expansion) pada proyek ini.

---

## 🏛️ 1. Prinsip Utama Arsitektur (Core Architectural Laws)

1. **Prinsip Deep Modules:**
   - Modul harus memiliki antarmuka (interface) yang sederhana, namun menyembunyikan kompleksitas internal yang nyata.
   - Jangan membuat banyak modul dangkal (*shallow modules*) yang hanya memindahkan kode dari satu tempat ke tempat lain tanpa menyederhanakan interface.

2. **Schema adalah Single Source of Truth:**
   - Segala metadata entitas (kolom tabel, pencarian, pengurutan, input formulir, tipe data, validasi, dan ID prefix) **WAJIB** berasal dari `Schema`.
   - Dilarang membuat konfigurasi tabel atau formulir *hardcoded* di dalam file UI jika properti tersebut sudah atau bisa didefinisikan di dalam `Schema`.

3. **Generic Over Duplication (High Leverage):**
   - Dilarang membuat fungsi CRUD baru jika sudah disediakan oleh `11_Repository.gs` dan `10_Database.gs`.
   - Modul spesifik per entitas (seperti `OrderRepository`) hanya dibuat jika terdapat perilaku/query khusus yang benar-benar tidak bisa ditangani oleh `Repository` generic.

4. **Zero Spreadsheet Coordinates Leakage:**
   - Modul di luar `10_Database.gs` **TIDAK BOLEH** mengetahui detail cell spreadsheet (`row[0]`, `row[1]`, range coordinates).
   - Seluruh data dibaca dan ditulis dalam bentuk **Object JavaScript** menggunakan dynamic Header Mapping.

5. **No Direct `google.script.run` di Komponen:**
   - Komponen UI atau file Tab dilarang memanggil `google.script.run` secara langsung.
   - Semua pemanggilan backend **WAJIB** melalui adapter `API.html` yang mengembalikan Promise.

6. **Zero Heavy Build Dependencies:**
   - Framework ini didesain *runtime-native* untuk Google Apps Script.
   - **JANGAN** memperkenalkan npm bundler, Webpack, Babel, Vite, React, Vue, TypeScript build step, atau dependency Node.js untuk runtime client/server. Gunakan Vanilla JS (ES6+) dan Tailwind CDN.

7. **Automated RAM Caching & Auto-Invalidation:**
   - Framework menerapkan caching transparan via `CacheService` di dalam `10_Database.gs` untuk menghemat kuota Google Apps Script dan memangkas latency (dari ~1500ms menjadi ~5ms).
   - Semua operasi mutasi (`create`, `update`, `delete`) **WAJIB** melalui `10_Database.gs` agar cache sheet otomatis di-invalidate (*zero stale data*).
   - Dilarang mem-bypass modul Database (misal memanggil `SpreadsheetApp` langsung) karena akan merusak konsistensi cache.

---

## 📋 2. Aturan Penamaan File (Naming Convention)

Google Apps Script tidak memiliki folder fisik. Hirarki arsitektur dijaga ketat melalui prefix nama file:

| Prefix / Pattern | Layer / Tanggung Jawab | Contoh File |
| :--- | :--- | :--- |
| `00_*.gs` | Konfigurasi Global | `00_Config.gs` |
| `01_*.gs` | App Shell & Schema Backend | `01_App.gs`, `01_Schema.gs` |
| `02_*.gs` | Standard Response Format | `02_Response.gs` |
| `03_*.gs` | Shared Utils & Helpers | `03_Utils.gs` |
| `10_*.gs` - `19_*.gs` | Core Generic Engines | `10_Database.gs`, `11_Repository.gs`, `12_Validator.gs` |
| `20_*.gs` - `29_*.gs` | Modul Entitas 1 (Users) | `20_UserRepository.gs`, `21_UserService.gs`, `22_UserController.gs` |
| `30_*.gs` - `39_*.gs` | Modul Entitas 2 (Products) | `30_ProductRepository.gs`, `31_ProductService.gs`, `32_ProductController.gs` |
| `40_*.gs` - `49_*.gs` | Modul Entitas 3 (Orders/Next) | `40_OrderRepository.gs`, `41_OrderService.gs`, `42_OrderController.gs` |
| `90_*.gs` - `99_*.gs` | Maintenance & Seeders | `99_Seed.gs` |
| `Component_*.html` | Generic Reusable UI Components | `Component_Table.html`, `Component_Form.html` |
| `Tab_*.html` | Business Page Content | `Tab_Users.html`, `Tab_Products.html` |

---

## 🛠️ 3. Protokol Penambahan Entitas Baru (Expansion Protocol)

Ketika Anda (AI Agent) diminta menambahkan entitas baru (contoh: **Orders**), ikuti langkah-langkah terisolasi berikut secara berurutan:

### Langkah 1: Definisikan Schema
Tambahkan `OrderSchema` pada:
1. `01_Schema.gs` (untuk backend: `resource`, `sheet`, `idField`, `idPrefix`, `columns`, `form`).
2. `01_Schema_Frontend.html` (untuk frontend: definisi yang identik).

### Langkah 2: Buat Lapisan Backend
1. **Service (`41_OrderService.gs`):**
   - Tangani validasi bisnis khusus jika ada.
   - Panggil generic `Repository.findAll(OrderSchema)`, `Repository.create(OrderSchema, data)`, dst.
2. **Controller (`42_OrderController.gs`):**
   - Buat fungsi global: `ordersList()`, `ordersGet(id)`, `ordersCreate(data)`, `ordersUpdate(id, data)`, `ordersDelete(id)`.
   - Bungkus seluruh kembalian dengan `Response.success(result)` atau `Response.error(err.message)`.

### Langkah 3: Daftarkan ke API Adapter (`API.html`)
Tambahkan resource baru di objek `API`:
```javascript
orders: {
  list: () => API.call('ordersList'),
  get: (id) => API.call('ordersGet', id),
  create: (data) => API.call('ordersCreate', data),
  update: (id, data) => API.call('ordersUpdate', id, data),
  delete: (id) => API.call('ordersDelete', id)
}
```

### Langkah 4: Buat Halaman Tab Frontend (`Tab_Orders.html`)
- Gunakan `PageHeader.render('Orders', ...)`
- Pasang tombol `+ Add Order` yang memanggil `Modal.create()` dan `Form.render()` berbasis `OrderSchema`.
- Pasang container tabel yang merender `Table.render()` berbasis `OrderSchema.columns`.
- Ekspos lifecycle hook `window.initOrdersTab = function() { OrdersTab.init(); };`.

### Langkah 5: Pasang ke Shell (`Main.html`)
1. Tambahkan link navigasi di `<nav>`: `<a href="#" data-nav="orders">Orders</a>`.
2. Tambahkan tab container:
   ```html
   <div id="tab-orders" class="tab-content hidden">
     <?!= include('Tab_Orders'); ?>
   </div>
   ```

### Langkah 6: Tambahkan Seeder di `99_Seed.gs`
Pastikan seeder menginisialisasi sheet `Orders` lengkap dengan header kolom dan minimal 2 baris data sampel.

---

## 🚫 4. Hal yang DILARANG KERAS (Strict Don'ts)

1. ❌ **JANGAN** menulis sintaks `<?!= include('File_Yang_Belum_Ada'); ?>` di dalam file HTML (bahkan di dalam tag komentar `<!-- -->`), karena server template GAS akan mengevaluasinya dan menyebabkan *crash*.
2. ❌ **JANGAN** membuat fungsi controller tanpa `try-catch` dan `Response.error()`. Server tidak boleh mengirim raw unhandled exception ke client.
3. ❌ **JANGAN** menghapus proteksi `LockService` pada operasi database yang mengubah data atau membuat ID.
4. ❌ **JANGAN** menaruh logika spesifik bisnis di dalam `Component_Table.html`, `Component_Form.html`, atau `Component_Modal.html`. Komponen harus tetap 100% *entity-agnostic*.
5. ❌ **JANGAN** memanggil `clasp deploy -i <ID_LAMA>` jika manifest `appsscript.json` berubah tipe; buat deployment baru atau pastikan ID deployment memang bertipe Web App.
6. ❌ **JANGAN** mengakses atau menulis langsung ke `SpreadsheetApp` di luar `10_Database.gs` karena akan merusak sinkronisasi Cache RAM dan menyebabkan data basi (*stale cache*).

---

## ✅ 5. Verifikasi Checklist Sebelum Selesai

Setiap kali menyelesaikan penambahan fitur atau entitas baru:
- [ ] Apakah `clasp push` berhasil tanpa ada file tertinggal?
- [ ] Apakah fungsi backend bebas dari syntax error (`node -c` check)?
- [ ] Apakah ID digenerate otomatis dengan prefix yang benar?
- [ ] Apakah timestamps `created_at` dan `updated_at` terisi otomatis?
- [ ] Apakah operasi tambah/edit/hapus otomatis membersihkan cache spreadsheet terkait (*zero stale data*)?
- [ ] Apakah tabel mendukung pencarian dan sorting sesuai schema?
- [ ] Apakah modal Add/Edit tertutup dan tabel me-refresh data setelah submit?
