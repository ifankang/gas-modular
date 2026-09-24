/**
 * 77_InventoryService.gs
 * Core Atomic Engine untuk seluruh Mutasi Stok & Siklus Pindah Gudang (Stock Transfers).
 * 
 * Prinsip Utama:
 * 1. Setiap mutasi fisik dilindungi oleh LockService.getScriptLock() dengan timeout 30 detik
 *    untuk menjamin tidak ada race condition saat dua proses memotong stok bersamaan.
 * 2. Menggunakan mekanisme 2-Langkah untuk Pindah Gudang:
 *    - Langkah 1 (Approve Kirim by Admin): Stok fisik dipotong dari Gudang Asal, status -> 'approved_shipped'.
 *    - Langkah 2 (Terima Barang by SPG): Stok fisik ditambah ke Gudang Tujuan, status -> 'received'.
 * 3. Setiap perubahan kuantitas fisik WAJIB mencatat histori ke sheet StockMutations.
 * 4. Otomatis membersihkan cache RAM di Database untuk menjaga integritas data tanpa stale cache.
 */

const InventoryService = {
  /**
   * Mengambil saldo stok fisik suatu produk di gudang tertentu.
   * @param {string} warehouseId
   * @param {string} productId
   * @returns {number}
   */
  getBalance: function(warehouseId, productId) {
    return StockService.getBalance(warehouseId, productId);
  },

  /**
   * Mencatat mutasi fisik umum (IN, OUT, ADJUSTMENT).
   * Atomik dengan LockService.
   *
   * @param {Object} params { type, reference_type, reference_id, warehouse_id, product_id, quantity, notes, user }
   * @returns {Object} Hasil mutasi & saldo akhir
   */
  recordMutation: function(params) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const type = params.type; // 'IN', 'OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT'
      const warehouseId = params.warehouse_id;
      const productId = params.product_id;
      const qty = Number(params.quantity);
      const user = params.user || {};

      if (!warehouseId || !productId) {
        throw new Error('Gudang dan produk wajib ditentukan untuk mutasi stok.');
      }
      if (isNaN(qty) || qty <= 0) {
        throw new Error('Jumlah mutasi harus lebih besar dari 0.');
      }

      const currentBalance = StockService.getBalance(warehouseId, productId);
      let newBalance = currentBalance;

      if (type === 'IN' || type === 'TRANSFER_IN') {
        newBalance = currentBalance + qty;
      } else if (type === 'OUT' || type === 'TRANSFER_OUT') {
        if (currentBalance < qty) {
          throw new Error(`Stok tidak mencukupi di gudang ${warehouseId}. Saldo saat ini: ${currentBalance}, diminta: ${qty}.`);
        }
        newBalance = currentBalance - qty;
      } else if (type === 'ADJUSTMENT') {
        newBalance = qty; // Untuk adjustment langsung set ke nilai target
      }

      // Update Saldo Fisik di sheet Stocks
      StockService.setBalance(warehouseId, productId, newBalance);

      // Catat ke Sheet StockMutations
      const now = new Date().toISOString();
      const mutationRecord = Repository.create(StockMutationSchema, {
        date: params.date || now.split('T')[0],
        type: type,
        reference_type: params.reference_type || 'MANUAL',
        reference_id: params.reference_id || '-',
        warehouse_id: warehouseId,
        product_id: productId,
        quantity: qty,
        notes: params.notes || '',
        created_by: user.name || user.email || 'System'
      });

      return {
        mutation: mutationRecord,
        previous_balance: currentBalance,
        new_balance: newBalance
      };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Membuat dokumen transfer stok (Draft).
   * Belum memotong stok fisik.
   *
   * @param {Object} transferData { transfer_no, date, source_warehouse_id, destination_warehouse_id, notes }
   * @param {Array} items [{ product_id, quantity }]
   * @param {Object} user
   * @returns {Object} Dokumen transfer lengkap dengan items
   */
  createTransferDraft: function(transferData, items, user) {
    if (!transferData.source_warehouse_id || !transferData.destination_warehouse_id) {
      throw new Error('Gudang asal dan gudang tujuan wajib dipilih.');
    }
    if (transferData.source_warehouse_id === transferData.destination_warehouse_id) {
      throw new Error('Gudang asal dan gudang tujuan tidak boleh sama.');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Daftar barang transfer tidak boleh kosong.');
    }

    const now = new Date().toISOString();
    const payload = {
      transfer_no: transferData.transfer_no || ('TRF-' + Date.now()),
      date: transferData.date || now.split('T')[0],
      source_warehouse_id: transferData.source_warehouse_id,
      destination_warehouse_id: transferData.destination_warehouse_id,
      status: 'draft',
      notes: transferData.notes || '',
      approved_by: '',
      approved_at: '',
      received_by: '',
      received_at: ''
    };

    const transfer = Repository.create(StockTransferSchema, payload);

    // Simpan item-item transfer
    const savedItems = items.map(item => {
      const q = Number(item.quantity);
      if (isNaN(q) || q <= 0) {
        throw new Error('Jumlah barang pada transfer harus berupa angka positif.');
      }
      return Repository.create(TransferItemSchema, {
        transfer_id: transfer.id,
        product_id: item.product_id,
        quantity: q
      });
    });

    return {
      transfer: transfer,
      items: savedItems
    };
  },

  /**
   * Langkah 1: Approve Kirim by Admin / Manager.
   * - Memvalidasi ketersediaan stok fisik di Gudang Asal.
   * - MEMOTONG stok fisik seketika dari Gudang Asal.
   * - Mencatat mutasi TRANSFER_OUT.
   * - Mengubah status transfer menjadi 'approved_shipped' (in-transit).
   *
   * @param {string} transferId
   * @param {Object} user
   * @returns {Object}
   */
  approveTransferSend: function(transferId, user) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const transfer = Repository.findById(StockTransferSchema, transferId);
      if (!transfer) {
        throw new Error(`Dokumen transfer ${transferId} tidak ditemukan.`);
      }
      if (transfer.status !== 'draft') {
        throw new Error(`Dokumen transfer tidak dapat disetujui kirim karena berstatus "${transfer.status}". Hanya status "draft" yang dapat dikirim.`);
      }

      // Ambil items transfer
      const allItems = Repository.findAll(TransferItemSchema);
      const items = allItems.filter(it => String(it.transfer_id) === String(transferId));
      if (items.length === 0) {
        throw new Error('Tidak ada barang di dalam dokumen transfer ini.');
      }

      // 1. Validasi saldo fisik seluruh item di gudang asal
      items.forEach(it => {
        const bal = StockService.getBalance(transfer.source_warehouse_id, it.product_id);
        const reqQty = Number(it.quantity) || 0;
        if (bal < reqQty) {
          throw new Error(`Stok produk ${it.product_id} tidak mencukupi di gudang asal. Saldo: ${bal}, Dibutuhkan: ${reqQty}.`);
        }
      });

      // 2. Potong stok di Gudang Asal & Catat Mutasi TRANSFER_OUT
      const now = new Date().toISOString();
      items.forEach(it => {
        const reqQty = Number(it.quantity) || 0;
        const bal = StockService.getBalance(transfer.source_warehouse_id, it.product_id);
        const newBal = bal - reqQty;

        StockService.setBalance(transfer.source_warehouse_id, it.product_id, newBal);

        Repository.create(StockMutationSchema, {
          date: now.split('T')[0],
          type: 'TRANSFER_OUT',
          reference_type: 'TRANSFER',
          reference_id: transfer.transfer_no || transfer.id,
          warehouse_id: transfer.source_warehouse_id,
          product_id: it.product_id,
          quantity: reqQty,
          notes: `Pindah ke gudang ${transfer.destination_warehouse_id} (Kirim by ${user.name || user.email})`,
          created_by: user.name || user.email || 'Admin'
        });
      });

      // 3. Update status transfer -> approved_shipped
      const updatedTransfer = Repository.update(StockTransferSchema, transferId, {
        status: 'approved_shipped',
        approved_by: user.name || user.email || 'Admin',
        approved_at: now
      });

      return updatedTransfer;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Langkah 2: Terima Barang by SPG / Staff Toko di Gudang Tujuan.
   * - MENAMBAH stok fisik ke Gudang Tujuan.
   * - Mencatat mutasi TRANSFER_IN.
   * - Mengubah status transfer menjadi 'received' (completed).
   *
   * @param {string} transferId
   * @param {Object} user
   * @returns {Object}
   */
  receiveTransfer: function(transferId, user) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const transfer = Repository.findById(StockTransferSchema, transferId);
      if (!transfer) {
        throw new Error(`Dokumen transfer ${transferId} tidak ditemukan.`);
      }
      if (transfer.status !== 'approved_shipped') {
        throw new Error(`Dokumen transfer tidak dapat diterima karena berstatus "${transfer.status}". Barang harus berstatus "approved_shipped" terlebih dahulu.`);
      }

      // Ambil items transfer
      const allItems = Repository.findAll(TransferItemSchema);
      const items = allItems.filter(it => String(it.transfer_id) === String(transferId));
      if (items.length === 0) {
        throw new Error('Tidak ada barang di dalam dokumen transfer ini.');
      }

      // 1. Tambah stok di Gudang Tujuan & Catat Mutasi TRANSFER_IN
      const now = new Date().toISOString();
      items.forEach(it => {
        const reqQty = Number(it.quantity) || 0;
        const bal = StockService.getBalance(transfer.destination_warehouse_id, it.product_id);
        const newBal = bal + reqQty;

        StockService.setBalance(transfer.destination_warehouse_id, it.product_id, newBal);

        Repository.create(StockMutationSchema, {
          date: now.split('T')[0],
          type: 'TRANSFER_IN',
          reference_type: 'TRANSFER',
          reference_id: transfer.transfer_no || transfer.id,
          warehouse_id: transfer.destination_warehouse_id,
          product_id: it.product_id,
          quantity: reqQty,
          notes: `Diterima dari gudang ${transfer.source_warehouse_id} (Diterima oleh ${user.name || user.email})`,
          created_by: user.name || user.email || 'SPG'
        });
      });

      // 2. Update status transfer -> received
      const updatedTransfer = Repository.update(StockTransferSchema, transferId, {
        status: 'received',
        received_by: user.name || user.email || 'SPG',
        received_at: now
      });

      return updatedTransfer;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Mengambil riwayat mutasi dengan opsi filter.
   * @param {Object} filter { warehouse_id, product_id, type }
   * @returns {Array}
   */
  getMutations: function(filter) {
    let mutations = Repository.findAll(StockMutationSchema);
    if (!filter) return mutations;

    if (filter.warehouse_id) {
      mutations = mutations.filter(m => String(m.warehouse_id) === String(filter.warehouse_id));
    }
    if (filter.product_id) {
      mutations = mutations.filter(m => String(m.product_id) === String(filter.product_id));
    }
    if (filter.type) {
      mutations = mutations.filter(m => String(m.type) === String(filter.type));
    }

    return mutations.reverse(); // Terbaru di atas
  }
};
