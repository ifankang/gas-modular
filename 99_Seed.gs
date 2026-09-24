/**
 * 99_Seed.gs
 * Utility script to initialize sheets, headers, sample data, and migrate password column.
 * Can be executed directly from Google Apps Script Editor or called via URL ?action=seed.
 */

function seedDatabase() {
  const ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
  const now = new Date().toISOString();
  const defaultAdminHash = Utils.hashPassword('admin2026123');

  // 1. Setup / Migrate Users Sheet
  let userSheet = ss.getSheetByName('Users');
  if (!userSheet) {
    userSheet = ss.insertSheet('Users');
  }
  
  const userHeaders = ['id', 'name', 'email', 'password', 'role', 'permissions', 'status', 'created_at', 'updated_at'];

  if (userSheet.getLastRow() === 0) {
    // Brand new sheet
    userSheet.appendRow(userHeaders);
    
    // Sample users with encrypted passwords
    const sampleUsers = [
      ['USR-000001', 'Super Admin', 'admin@databridge.com', defaultAdminHash, 'admin', '', 'active', now, now],
      ['USR-000002', 'Manager Operational', 'manager@example.com', Utils.hashPassword('manager123'), 'manager', '', 'active', now, now],
      ['USR-000003', 'Staff Gudang', 'staff@example.com', Utils.hashPassword('staff123'), 'staff', '', 'active', now, now],
      ['USR-000004', 'Viewer Monitoring', 'viewer@example.com', Utils.hashPassword('viewer123'), 'viewer', '', 'active', now, now]
    ];
    
    sampleUsers.forEach(row => userSheet.appendRow(row));
  } else {
    // Existing sheet: Check if 'password', 'role', 'permissions' columns exist, if not add them
    let lastCol = userSheet.getLastColumn();
    let currentHeaders = userSheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // 1. Check & migrate 'password'
    let passwordColIdx = currentHeaders.indexOf('password');
    if (passwordColIdx === -1) {
      userSheet.getRange(1, lastCol + 1).setValue('password');
      lastCol++;
      currentHeaders.push('password');

      const lastRow = userSheet.getLastRow();
      if (lastRow > 1) {
        for (let r = 2; r <= lastRow; r++) {
          userSheet.getRange(r, lastCol).setValue(defaultAdminHash);
        }
      }
    }

    // 2. Check & migrate 'role'
    let roleColIdx = currentHeaders.indexOf('role');
    if (roleColIdx === -1) {
      userSheet.getRange(1, lastCol + 1).setValue('role');
      lastCol++;
      currentHeaders.push('role');

      const lastRow = userSheet.getLastRow();
      if (lastRow > 1) {
        const emailColIdx = currentHeaders.indexOf('email');
        for (let r = 2; r <= lastRow; r++) {
          const rowEmail = emailColIdx !== -1 ? String(userSheet.getRange(r, emailColIdx + 1).getValue()).toLowerCase() : '';
          const defaultRole = (rowEmail === 'admin@databridge.com') ? 'admin' : 'staff';
          userSheet.getRange(r, lastCol).setValue(defaultRole);
        }
      }
    }

    // 3. Check & migrate 'permissions'
    let permColIdx = currentHeaders.indexOf('permissions');
    if (permColIdx === -1) {
      userSheet.getRange(1, lastCol + 1).setValue('permissions');
      lastCol++;
      currentHeaders.push('permissions');

      const lastRow = userSheet.getLastRow();
      if (lastRow > 1) {
        for (let r = 2; r <= lastRow; r++) {
          userSheet.getRange(r, lastCol).setValue('');
        }
      }
    }

    // Clear cache to refresh headers
    Database.clearCache('Users');

    // Seed or update sample accounts
    const sampleAccounts = [
      { id: 'USR-000001', name: 'Super Admin', email: 'admin@databridge.com', password: defaultAdminHash, role: 'admin', permissions: '', status: 'active' },
      { id: 'USR-000002', name: 'Manager Operational', email: 'manager@example.com', password: Utils.hashPassword('manager123'), role: 'manager', permissions: '', status: 'active' },
      { id: 'USR-000003', name: 'Staff Gudang', email: 'staff@example.com', password: Utils.hashPassword('staff123'), role: 'staff', permissions: '', status: 'active' },
      { id: 'USR-000004', name: 'Viewer Monitoring', email: 'viewer@example.com', password: Utils.hashPassword('viewer123'), role: 'viewer', permissions: '', status: 'active' }
    ];

    const users = Database.findAll('Users');
    sampleAccounts.forEach(acc => {
      const existing = users.find(u => (u.email || '').toLowerCase() === acc.email.toLowerCase());
      if (!existing) {
        Database.create('Users', {
          ...acc,
          created_at: now,
          updated_at: now
        });
      } else {
        Database.update('Users', 'email', existing.email, {
          password: acc.password,
          role: acc.role,
          status: acc.status
        });
      }
    });
  }

  // 2. Setup Products Sheet
  let productSheet = ss.getSheetByName('Products');
  if (!productSheet) {
    productSheet = ss.insertSheet('Products');
  }

  if (productSheet.getLastRow() === 0) {
    const productHeaders = ['id', 'name', 'price', 'stock', 'created_at', 'updated_at'];
    productSheet.appendRow(productHeaders);

    const sampleProducts = [
      ['PRD-000001', 'Laptop Pro 14"', 15000000, 10, now, now],
      ['PRD-000002', 'Wireless Mouse', 250000, 50, now, now],
      ['PRD-000003', 'Mechanical Keyboard', 850000, 25, now, now]
    ];

    sampleProducts.forEach(row => productSheet.appendRow(row));
  }

  // 3. Setup / Migrate Roles Sheet
  let roleSheet = ss.getSheetByName('Roles');
  if (!roleSheet) {
    roleSheet = ss.insertSheet('Roles');
  }

  const roleHeaders = ['role', 'name', 'users', 'products', 'orders', 'description', 'created_at', 'updated_at'];

  const sampleRoles = [
    {
      role: 'admin',
      name: 'Administrator',
      users: 'read,create,edit,delete',
      products: 'read,create,edit,delete',
      orders: 'read,create,edit,delete',
      description: 'Akses penuh seluruh sistem'
    },
    {
      role: 'manager',
      name: 'Manager Operasional',
      users: 'read',
      products: 'read,create,edit,delete',
      orders: 'read,create,edit,delete',
      description: 'Kelola katalog produk & pesanan, lihat pengguna'
    },
    {
      role: 'staff',
      name: 'Staff Lapangan',
      users: 'none',
      products: 'read,create,edit',
      orders: 'read,create,edit',
      description: 'Input data produk & pesanan'
    },
    {
      role: 'viewer',
      name: 'Viewer Monitoring',
      users: 'none',
      products: 'read',
      orders: 'none',
      description: 'Hanya melihat katalog produk'
    }
  ];

  if (roleSheet.getLastRow() === 0) {
    roleSheet.appendRow(roleHeaders);
    sampleRoles.forEach(r => {
      roleSheet.appendRow([r.role, r.name, r.users, r.products, r.orders, r.description, now, now]);
    });
  } else {
    // Existing sheet: ensure headers and seed initial roles if missing
    Database.clearCache('Roles');
    const existingRoles = Database.findAll('Roles');
    sampleRoles.forEach(r => {
      const existing = existingRoles.find(item => String(item.role).toLowerCase() === r.role.toLowerCase());
      if (!existing) {
        Database.create('Roles', {
          ...r,
          created_at: now,
          updated_at: now
        });
      }
    });
  }

  // 4. Seed Categories Sheet
  seedCategories(ss, now);

  // 5. Migrate Products Sheet (add new columns if missing)
  migrateProductsSheet(ss);

  // 6. Seed Warehouses & Stocks
  seedWarehousesAndStocks(ss, now);

  // 7. Seed Transfers & Mutations (plus SPG sample user)
  seedTransfersAndMutations(ss, now);

  // 8. Seed Orders & OrderItems (PO & SO sample transactions)
  seedOrders(ss, now);

  Logger.log('Database seeded and verified successfully.');
  return {
    success: true,
    message: 'Sheet "Users", "Products", "Roles", "Categories", "Warehouses", "Stocks", "StockTransfers", "TransferItems", "StockMutations", "Orders", dan "OrderItems" berhasil diverifikasi dan disiapkan!'
  };
}




/**
 * seedCategories()
 * Inisialisasi sheet Categories dengan header dan 3 baris data sampel.
 * Mengikuti pola seedRoles(): buat sheet jika belum ada, tulis header & data jika kosong,
 * upsert via Database jika sudah ada isi.
 */
function seedCategories(ss, now) {
  if (!ss) ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
  if (!now) now = new Date().toISOString();

  let catSheet = ss.getSheetByName('Categories');
  if (!catSheet) {
    catSheet = ss.insertSheet('Categories');
  }

  const catHeaders = ['id', 'code', 'name', 'description', 'created_at', 'updated_at'];

  const sampleCategories = [
    ['CAT-000001', 'ELK', 'Elektronik', 'Peralatan elektronik, gadget, dan aksesori digital', now, now],
    ['CAT-000002', 'FNB', 'Food & Beverage', 'Produk makanan dan minuman kemasan', now, now],
    ['CAT-000003', 'ATK', 'Alat Tulis Kantor', 'Perlengkapan kantor dan operasional harian', now, now]
  ];

  if (catSheet.getLastRow() === 0) {
    // Brand new / completely empty sheet
    catSheet.appendRow(catHeaders);
    sampleCategories.forEach(function(row) { catSheet.appendRow(row); });
  } else {
    // Existing sheet: ensure each sample category is present (upsert by id)
    Database.clearCache('Categories');
    const existingCats = Database.findAll('Categories');
    sampleCategories.forEach(function(row) {
      const existing = existingCats.find(function(c) { return String(c.id) === String(row[0]); });
      if (!existing) {
        Database.create('Categories', {
          id:          row[0],
          code:        row[1],
          name:        row[2],
          description: row[3],
          created_at:  now,
          updated_at:  now
        });
      }
    });
  }

  Logger.log('Categories sheet seeded/verified.');
}

/**
 * migrateProductsSheet()
 * Tambahkan kolom baru (category_id, code, unit, cost_price) ke sheet Products
 * jika kolom tersebut belum ada. Data baris yang sudah ada tidak diubah.
 */
function migrateProductsSheet(ss) {
  if (!ss) ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);

  const productSheet = ss.getSheetByName('Products');
  if (!productSheet || productSheet.getLastRow() === 0) {
    // Sheet belum ada atau kosong — tidak ada yang perlu di-migrate
    return;
  }

  const newColumns = ['category_id', 'code', 'unit', 'cost_price'];
  const lastCol = productSheet.getLastColumn();
  const currentHeaders = productSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  let colIndex = lastCol; // 1-based, will be incremented per new column added
  newColumns.forEach(function(col) {
    if (currentHeaders.indexOf(col) === -1) {
      colIndex++;
      productSheet.getRange(1, colIndex).setValue(col);
      currentHeaders.push(col); // keep local array in sync
    }
  });

  if (colIndex > lastCol) {
    // Kolom baru ditambahkan — invalidate cache agar header mapping ter-refresh
    Database.clearCache('Products');
    Logger.log('Products sheet migrated: added columns ' + newColumns.filter(function(c) { return currentHeaders.slice(0, lastCol).indexOf(c) === -1; }).join(', '));
  } else {
    Logger.log('Products sheet migration: no new columns needed.');
  }
}

/**
 * seedWarehousesAndStocks()
 * Inisialisasi sheet Warehouses dan sheet Stocks.
 * Menyiapkan data gudang utama (GDG-JKT) dan toko cabang (TKO-MALL)
 * serta menginisialisasi alokasi saldo stok fisik per gudang.
 */
function seedWarehousesAndStocks(ss, now) {
  if (!ss) ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
  if (!now) now = new Date().toISOString();

  // 1. Inisialisasi Sheet Warehouses
  let whSheet = ss.getSheetByName('Warehouses');
  if (!whSheet) {
    whSheet = ss.insertSheet('Warehouses');
  }

  const whHeaders = ['id', 'code', 'name', 'address', 'status', 'created_at', 'updated_at'];
  const sampleWarehouses = [
    ['WH-000001', 'GDG-JKT', 'Gudang Pusat Jakarta', 'Jl. Daan Mogot No. 10, Jakarta Barat', 'active', now, now],
    ['WH-000002', 'TKO-MALL', 'Toko Mall Kelapa Gading', 'Mall Kelapa Gading Lt. 2 No. 45, Jakarta Utara', 'active', now, now]
  ];

  if (whSheet.getLastRow() === 0) {
    whSheet.appendRow(whHeaders);
    sampleWarehouses.forEach(function(row) { whSheet.appendRow(row); });
  } else {
    Database.clearCache('Warehouses');
    const existingWh = Database.findAll('Warehouses');
    sampleWarehouses.forEach(function(row) {
      const exists = existingWh.find(function(w) { return String(w.id) === String(row[0]); });
      if (!exists) {
        Database.create('Warehouses', {
          id:         row[0],
          code:       row[1],
          name:       row[2],
          address:    row[3],
          status:     row[4],
          created_at: now,
          updated_at: now
        });
      }
    });
  }

  // 2. Inisialisasi Sheet Stocks
  let stockSheet = ss.getSheetByName('Stocks');
  if (!stockSheet) {
    stockSheet = ss.insertSheet('Stocks');
  }

  const stockHeaders = ['id', 'warehouse_id', 'product_id', 'quantity', 'created_at', 'updated_at'];
  if (stockSheet.getLastRow() === 0) {
    stockSheet.appendRow(stockHeaders);
  }

  // Inisialisasi alokasi stok untuk produk yang ada jika sheet Stocks masih kosong
  Database.clearCache('Stocks');
  const existingStocks = Database.findAll('Stocks');
  if (existingStocks.length === 0) {
    const products = Database.findAll('Products');
    let seq = 1;
    products.forEach(function(prd) {
      const totalQty = Number(prd.stock) || 0;
      // Bagi stok: 70% di Gudang Pusat, 30% di Toko Mall
      const qtyPusat = Math.floor(totalQty * 0.7);
      const qtyMall = totalQty - qtyPusat;

      const stkId1 = Utils.generateId('STK', seq++);
      Database.create('Stocks', {
        id: stkId1,
        warehouse_id: 'WH-000001',
        product_id: prd.id,
        quantity: qtyPusat,
        created_at: now,
        updated_at: now
      });

      const stkId2 = Utils.generateId('STK', seq++);
      Database.create('Stocks', {
        id: stkId2,
        warehouse_id: 'WH-000002',
        product_id: prd.id,
        quantity: qtyMall,
        created_at: now,
        updated_at: now
      });
    });
    Logger.log('Initialized initial stock balance per warehouse for ' + products.length + ' products.');
  }

  Logger.log('Warehouses and Stocks sheets seeded/verified.');
}

/**
 * seedTransfersAndMutations()
 * Inisialisasi sheet StockTransfers, TransferItems, StockMutations,
 * serta memastikan akun SPG (spg@example.com) terdaftar.
 */
function seedTransfersAndMutations(ss, now) {
  if (!ss) ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
  if (!now) now = new Date().toISOString();

  // 1. Inisialisasi Sheet StockTransfers
  let trfSheet = ss.getSheetByName('StockTransfers');
  if (!trfSheet) {
    trfSheet = ss.insertSheet('StockTransfers');
  }
  const trfHeaders = ['id', 'transfer_no', 'date', 'source_warehouse_id', 'destination_warehouse_id', 'status', 'approved_by', 'approved_at', 'received_by', 'received_at', 'notes', 'created_at', 'updated_at'];
  if (trfSheet.getLastRow() === 0) {
    trfSheet.appendRow(trfHeaders);
  }

  // 2. Inisialisasi Sheet TransferItems
  let itemSheet = ss.getSheetByName('TransferItems');
  if (!itemSheet) {
    itemSheet = ss.insertSheet('TransferItems');
  }
  const itemHeaders = ['id', 'transfer_id', 'product_id', 'quantity', 'created_at', 'updated_at'];
  if (itemSheet.getLastRow() === 0) {
    itemSheet.appendRow(itemHeaders);
  }

  // 3. Inisialisasi Sheet StockMutations
  let mutSheet = ss.getSheetByName('StockMutations');
  if (!mutSheet) {
    mutSheet = ss.insertSheet('StockMutations');
  }
  const mutHeaders = ['id', 'date', 'type', 'reference_type', 'reference_id', 'warehouse_id', 'product_id', 'quantity', 'notes', 'created_by', 'created_at', 'updated_at'];
  if (mutSheet.getLastRow() === 0) {
    mutSheet.appendRow(mutHeaders);
  }

  // 4. Pastikan Akun SPG Uji Coba Terdaftar di Users
  Database.clearCache('Users');
  const existingUsers = Database.findAll('Users');
  const spgUser = existingUsers.find(u => String(u.email).toLowerCase() === 'spg@example.com');
  if (!spgUser) {
    const defaultSpgHash = Utils.hashPassword('spg123');
    Database.create('Users', {
      id: Utils.generateId('USR', existingUsers.length + 1),
      name: 'SPG Toko Mall',
      email: 'spg@example.com',
      password: defaultSpgHash,
      role: 'spg',
      permissions: '',
      status: 'active',
      created_at: now,
      updated_at: now
    });
    Logger.log('Created sample SPG user (spg@example.com / spg123).');
  }

  Logger.log('StockTransfers, TransferItems, and StockMutations sheets verified.');
}

/**
 * seedOrders()
 * Inisialisasi sheet Orders dan OrderItems dengan header kolom,
 * serta menyiapkan data sampel 1 Purchase Order (PO) dan 1 Sales Order (SO).
 */
function seedOrders(ss, now) {
  if (!ss) ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
  if (!now) now = new Date().toISOString();

  // 1. Inisialisasi Sheet Orders
  let orderSheet = ss.getSheetByName('Orders');
  if (!orderSheet) {
    orderSheet = ss.insertSheet('Orders');
  }
  const orderHeaders = [
    'id', 'order_no', 'type', 'date', 'destination_warehouse_id',
    'contact_name', 'total_amount', 'status', 'approved_by',
    'approved_at', 'received_by', 'received_at', 'notes', 'created_at', 'updated_at'
  ];
  if (orderSheet.getLastRow() === 0) {
    orderSheet.appendRow(orderHeaders);
  }

  // 2. Inisialisasi Sheet OrderItems
  let itemSheet = ss.getSheetByName('OrderItems');
  if (!itemSheet) {
    itemSheet = ss.insertSheet('OrderItems');
  }
  const itemHeaders = ['id', 'order_id', 'product_id', 'quantity', 'price', 'subtotal', 'created_at', 'updated_at'];
  if (itemSheet.getLastRow() === 0) {
    itemSheet.appendRow(itemHeaders);
  }

  // 3. Tambahkan sampel transaksi jika Orders masih kosong
  Database.clearCache('Orders');
  const existingOrders = Database.findAll('Orders');
  if (existingOrders.length === 0) {
    const products = Database.findAll('Products');
    const firstPrd = products[0] || { id: 'PRD-000001', price: 150000 };

    // Sampel PO (Pengadaan ke Gudang Pusat)
    const samplePoId = 'ORD-000001';
    Database.create('Orders', {
      id: samplePoId,
      order_no: 'PO-2026-001',
      type: 'PURCHASE',
      date: now.split('T')[0],
      destination_warehouse_id: 'WH-000001',
      contact_name: 'PT Mitra Pemasok Mandiri',
      total_amount: Number(firstPrd.price || 150000) * 50,
      status: 'received',
      approved_by: 'Super Admin',
      approved_at: now,
      received_by: 'Staff Gudang',
      received_at: now,
      notes: 'Pengadaan stok batch perdana',
      created_at: now,
      updated_at: now
    });

    Database.create('OrderItems', {
      id: 'ITM-000001',
      order_id: samplePoId,
      product_id: firstPrd.id,
      quantity: 50,
      price: Number(firstPrd.price || 150000),
      subtotal: Number(firstPrd.price || 150000) * 50,
      created_at: now,
      updated_at: now
    });

    // Sampel SO (Penjualan dari Toko Mall)
    const sampleSoId = 'ORD-000002';
    Database.create('Orders', {
      id: sampleSoId,
      order_no: 'SO-2026-001',
      type: 'SALES',
      date: now.split('T')[0],
      destination_warehouse_id: 'WH-000002',
      contact_name: 'Bpk. Hendra Kurniawan',
      total_amount: Number(firstPrd.price || 150000) * 2,
      status: 'completed',
      approved_by: 'SPG Toko Mall',
      approved_at: now,
      received_by: '',
      received_at: '',
      notes: 'Penjualan retail langsung',
      created_at: now,
      updated_at: now
    });

    Database.create('OrderItems', {
      id: 'ITM-000002',
      order_id: sampleSoId,
      product_id: firstPrd.id,
      quantity: 2,
      price: Number(firstPrd.price || 150000),
      subtotal: Number(firstPrd.price || 150000) * 2,
      created_at: now,
      updated_at: now
    });

    Logger.log('Seeded initial sample PO and SO transactions.');
  }

  Logger.log('Orders and OrderItems sheets verified.');
}




