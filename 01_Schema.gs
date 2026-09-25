const UserSchema = {
  resource: 'users',
  sheet: 'Users',
  idField: 'id',
  idPrefix: 'USR',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'name', label: 'Nama', type: 'text', searchable: true, sortable: true },
    { key: 'email', label: 'Email', type: 'email', searchable: true },
    { key: 'role', label: 'Role / Peran', type: 'badge' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'created_at', label: 'Dibuat', type: 'date' },
    { key: 'updated_at', label: 'Diupdate', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'name', label: 'Nama', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'password', label: 'Kata Sandi', type: 'password' },
      { key: 'role', label: 'Role / Peran', type: 'select', options: [
        { value: 'admin', label: 'Admin (Full Access)' },
        { value: 'manager', label: 'Manager (CRUD Produk, Read User)' },
        { value: 'staff', label: 'Staff (Read/Create/Edit Produk)' },
        { value: 'viewer', label: 'Viewer (Read Only)' }
      ], required: true },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ], required: true }
    ]
  }
};

const ProductSchema = {
  resource: 'products',
  sheet: 'Products',
  idField: 'id',
  idPrefix: 'PRD',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'code', label: 'Kode', type: 'text', searchable: true, sortable: true },
    { key: 'name', label: 'Nama Produk', type: 'text', searchable: true, sortable: true },
    { key: 'category_id', label: 'Kategori', type: 'badge' },
    { key: 'price', label: 'Harga Jual', type: 'number', sortable: true },
    { key: 'cost_price', label: 'Harga Modal', type: 'number', sortable: true },
    { key: 'stock', label: 'Stok', type: 'number', sortable: true },
    { key: 'unit', label: 'Satuan', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'created_at', label: 'Dibuat', type: 'date' },
    { key: 'updated_at', label: 'Diupdate', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'code', label: 'Kode Produk', type: 'text', required: true },
      { key: 'name', label: 'Nama Produk', type: 'text', required: true },
      { key: 'category_id', label: 'Kategori', type: 'select', options: [], required: true },
      { key: 'unit', label: 'Satuan (pcs, box, kg, dll)', type: 'text', required: true },
      { key: 'price', label: 'Harga Jual', type: 'number', required: true },
      { key: 'cost_price', label: 'Harga Modal / Beli', type: 'number', required: true },
      { key: 'stock', label: 'Stok Awal', type: 'number', required: true },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Nonaktif' }
      ], required: true }
    ]
  }
};

const CategorySchema = {
  resource: 'categories',
  sheet: 'Categories',
  idField: 'id',
  idPrefix: 'CAT',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'code', label: 'Kode', type: 'badge', searchable: true, sortable: true },
    { key: 'name', label: 'Nama Kategori', type: 'text', searchable: true, sortable: true },
    { key: 'description', label: 'Deskripsi', type: 'text' },
    { key: 'created_at', label: 'Dibuat', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'code', label: 'Kode Kategori (e.g. ELK, FNB, ATK)', type: 'text', required: true },
      { key: 'name', label: 'Nama Kategori', type: 'text', required: true },
      { key: 'description', label: 'Deskripsi / Catatan', type: 'textarea' }
    ]
  }
};



const RoleSchema = {
  resource: 'roles',
  sheet: 'Roles',
  idField: 'role',
  idPrefix: '',
  columns: [
    { key: 'role', label: 'ID Peran', type: 'badge' },
    { key: 'name', label: 'Nama Peran', type: 'text', searchable: true, sortable: true },
    { key: 'users', label: 'Izin Users', type: 'text' },
    { key: 'products', label: 'Izin Produk', type: 'text' },
    { key: 'orders', label: 'Izin Orders', type: 'text' },
    { key: 'description', label: 'Deskripsi', type: 'text' }
  ],
  form: {
    fields: [
      { key: 'role', label: 'ID Peran (e.g. supervisor)', type: 'text', required: true },
      { key: 'name', label: 'Nama Tampilan Peran', type: 'text', required: true },
      { 
        key: 'users', 
        label: 'Hak Akses Modul Users', 
        type: 'checkbox-group', 
        options: [
          { value: 'read', label: 'Read (Lihat)' },
          { value: 'create', label: 'Create (Tambah)' },
          { value: 'edit', label: 'Edit (Ubah)' },
          { value: 'delete', label: 'Delete (Hapus)' }
        ]
      },
      { 
        key: 'products', 
        label: 'Hak Akses Modul Produk', 
        type: 'checkbox-group', 
        options: [
          { value: 'read', label: 'Read (Lihat)' },
          { value: 'create', label: 'Create (Tambah)' },
          { value: 'edit', label: 'Edit (Ubah)' },
          { value: 'delete', label: 'Delete (Hapus)' }
        ]
      },
      { 
        key: 'orders', 
        label: 'Hak Akses Modul Orders', 
        type: 'checkbox-group', 
        options: [
          { value: 'read', label: 'Read (Lihat)' },
          { value: 'create', label: 'Create (Tambah)' },
          { value: 'edit', label: 'Edit (Ubah)' },
          { value: 'delete', label: 'Delete (Hapus)' }
        ]
      },
      { key: 'description', label: 'Keterangan Peran', type: 'textarea' }
    ]
  }
};

const WarehouseSchema = {
  resource: 'warehouses',
  sheet: 'Warehouses',
  idField: 'id',
  idPrefix: 'WH',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'code', label: 'Kode Gudang', type: 'badge', searchable: true, sortable: true },
    { key: 'name', label: 'Nama Gudang', type: 'text', searchable: true, sortable: true },
    { key: 'address', label: 'Alamat / Lokasi', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'created_at', label: 'Dibuat', type: 'date' },
    { key: 'updated_at', label: 'Diupdate', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'code', label: 'Kode Gudang (e.g. GDG-JKT, TKO-MALL)', type: 'text', required: true },
      { key: 'name', label: 'Nama Gudang', type: 'text', required: true },
      { key: 'address', label: 'Alamat / Lokasi Gudang', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Nonaktif' }
      ], required: true }
    ]
  }
};

const StockSchema = {
  resource: 'stocks',
  sheet: 'Stocks',
  idField: 'id',
  idPrefix: 'STK',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'warehouse_id', label: 'ID Gudang', type: 'badge', searchable: true, sortable: true },
    { key: 'product_id', label: 'ID Produk', type: 'badge', searchable: true, sortable: true },
    { key: 'quantity', label: 'Jumlah Saldo', type: 'number', sortable: true },
    { key: 'created_at', label: 'Dibuat', type: 'date' },
    { key: 'updated_at', label: 'Terakhir Update', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'warehouse_id', label: 'Gudang', type: 'select', options: [], required: true },
      { key: 'product_id', label: 'Produk', type: 'select', options: [], required: true },
      { key: 'quantity', label: 'Jumlah Saldo Stok', type: 'number', required: true }
    ]
  }
};

const StockTransferSchema = {
  resource: 'transfers',
  sheet: 'StockTransfers',
  idField: 'id',
  idPrefix: 'TRF',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'transfer_no', label: 'No. Transfer', type: 'badge', searchable: true, sortable: true },
    { key: 'date', label: 'Tanggal', type: 'date', sortable: true },
    { key: 'source_warehouse_id', label: 'Gudang Asal', type: 'badge', searchable: true },
    { key: 'destination_warehouse_id', label: 'Gudang Tujuan', type: 'badge', searchable: true },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'approved_by', label: 'Disetujui Oleh', type: 'text' },
    { key: 'approved_at', label: 'Disetujui Pada', type: 'date' },
    { key: 'received_by', label: 'Diterima Oleh', type: 'text' },
    { key: 'received_at', label: 'Diterima Pada', type: 'date' },
    { key: 'notes', label: 'Catatan', type: 'text' },
    { key: 'created_at', label: 'Dibuat', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'transfer_no', label: 'No. Referensi Transfer', type: 'text', required: true },
      { key: 'source_warehouse_id', label: 'Gudang Asal', type: 'select', options: [], required: true },
      { key: 'destination_warehouse_id', label: 'Gudang Tujuan', type: 'select', options: [], required: true },
      { key: 'notes', label: 'Catatan Pengiriman', type: 'textarea' }
    ]
  }
};

const TransferItemSchema = {
  resource: 'transfer_items',
  sheet: 'TransferItems',
  idField: 'id',
  idPrefix: 'TFI',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'transfer_id', label: 'ID Transfer', type: 'badge', searchable: true },
    { key: 'product_id', label: 'ID Produk', type: 'badge', searchable: true },
    { key: 'quantity', label: 'Jumlah Kirim', type: 'number', sortable: true },
    { key: 'created_at', label: 'Dibuat', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'transfer_id', label: 'ID Transfer', type: 'text', required: true },
      { key: 'product_id', label: 'Produk', type: 'select', options: [], required: true },
      { key: 'quantity', label: 'Jumlah Barang', type: 'number', required: true }
    ]
  }
};

const StockMutationSchema = {
  resource: 'mutations',
  sheet: 'StockMutations',
  idField: 'id',
  idPrefix: 'MUT',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'date', label: 'Tanggal', type: 'date', sortable: true },
    { key: 'type', label: 'Tipe Mutasi', type: 'badge', searchable: true, sortable: true },
    { key: 'reference_type', label: 'Tipe Ref', type: 'badge' },
    { key: 'reference_id', label: 'ID Dokumen', type: 'text', searchable: true },
    { key: 'warehouse_name', label: 'Gudang', type: 'text', searchable: true },
    { key: 'product_name', label: 'Produk', type: 'text', searchable: true },
    { key: 'quantity', label: 'Jumlah', type: 'number', sortable: true },
    { key: 'notes', label: 'Keterangan', type: 'text' },
    { key: 'created_by', label: 'Oleh', type: 'text' },
    { key: 'created_at', label: 'Dibuat', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'type', label: 'Tipe Mutasi', type: 'select', options: [
        { value: 'IN', label: 'Barang Masuk (IN)' },
        { value: 'OUT', label: 'Barang Keluar (OUT)' },
        { value: 'TRANSFER_OUT', label: 'Pindah Gudang Keluar (TRANSFER_OUT)' },
        { value: 'TRANSFER_IN', label: 'Pindah Gudang Masuk (TRANSFER_IN)' },
        { value: 'ADJUSTMENT', label: 'Penyesuaian Stok (ADJUSTMENT)' }
      ], required: true },
      { key: 'warehouse_id', label: 'Gudang', type: 'select', options: [], required: true },
      { key: 'product_id', label: 'Produk', type: 'select', options: [], required: true },
      { key: 'quantity', label: 'Jumlah', type: 'number', required: true },
      { key: 'notes', label: 'Keterangan', type: 'textarea' }
    ]
  }
};

const OrderSchema = {
  resource: 'orders',
  sheet: 'Orders',
  idField: 'id',
  idPrefix: 'ORD',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'order_no', label: 'No. Transaksi', type: 'badge', searchable: true, sortable: true },
    { key: 'type', label: 'Tipe', type: 'badge', searchable: true, sortable: true },
    { key: 'date', label: 'Tanggal', type: 'date', sortable: true },
    { key: 'destination_warehouse_id', label: 'Gudang Target / Pengirim', type: 'badge', searchable: true },
    { key: 'contact_name', label: 'Pemasok / Pelanggan', type: 'text', searchable: true },
    { key: 'total_amount', label: 'Total Transaksi', type: 'number', sortable: true },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'approved_by', label: 'Disetujui Oleh', type: 'text' },
    { key: 'approved_at', label: 'Disetujui Pada', type: 'date' },
    { key: 'received_by', label: 'Diterima Oleh', type: 'text' },
    { key: 'received_at', label: 'Diterima Pada', type: 'date' },
    { key: 'notes', label: 'Catatan', type: 'text' },
    { key: 'created_at', label: 'Dibuat', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'order_no', label: 'No. Order / Surat Jalan', type: 'text', required: true },
      { key: 'type', label: 'Tipe Pesanan', type: 'select', options: [
        { value: 'PURCHASE', label: 'Purchase Order (Pengadaan)' },
        { value: 'SALES', label: 'Sales Order (Penjualan)' }
      ], required: true },
      { key: 'destination_warehouse_id', label: 'Gudang', type: 'select', options: [], required: true },
      { key: 'contact_name', label: 'Pemasok / Pelanggan', type: 'text', required: true },
      { key: 'notes', label: 'Catatan Transaksi', type: 'textarea' }
    ]
  }
};

const OrderItemSchema = {
  resource: 'order_items',
  sheet: 'OrderItems',
  idField: 'id',
  idPrefix: 'ITM',
  columns: [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'order_id', label: 'ID Order', type: 'badge', searchable: true },
    { key: 'product_id', label: 'ID Produk', type: 'badge', searchable: true },
    { key: 'quantity', label: 'Jumlah', type: 'number', sortable: true },
    { key: 'price', label: 'Harga Satuan', type: 'number', sortable: true },
    { key: 'subtotal', label: 'Subtotal', type: 'number', sortable: true },
    { key: 'created_at', label: 'Dibuat', type: 'date' }
  ],
  form: {
    fields: [
      { key: 'order_id', label: 'ID Order', type: 'text', required: true },
      { key: 'product_id', label: 'Produk', type: 'select', options: [], required: true },
      { key: 'quantity', label: 'Jumlah', type: 'number', required: true },
      { key: 'price', label: 'Harga', type: 'number', required: true }
    ]
  }
};



