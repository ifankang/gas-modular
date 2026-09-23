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
