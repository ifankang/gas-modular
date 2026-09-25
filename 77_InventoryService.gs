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

      // Invalidate KPI Cache Laporan jika ada modul ReportService
      try {
        if (typeof ReportService !== 'undefined' && typeof ReportService.invalidateSummaryCache === 'function') {
          ReportService.invalidateSummaryCache();
        }
      } catch (ign) {}

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
  /**
   * Langkah 1: SPG / Toko membuat Permintaan Barang (Stock Request).
   * Status awal: 'requested'. Belum ada mutasi/pemotongan stok.
   *
   * @param {Object} transferData { transfer_no, date, source_warehouse_id, destination_warehouse_id, notes }
   * @param {Array} items [{ product_id, quantity }]
   * @param {Object} user
   * @returns {Object} Dokumen transfer lengkap dengan items
   */
  createTransferDraft: function(transferData, items, user) {
    if (!transferData.source_warehouse_id || !transferData.destination_warehouse_id) {
      throw new Error('Gudang asal dan toko peminta wajib dipilih.');
    }
    if (transferData.source_warehouse_id === transferData.destination_warehouse_id) {
      throw new Error('Gudang asal dan toko peminta tidak boleh sama.');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Daftar barang permintaan tidak boleh kosong.');
    }

    const now = new Date().toISOString();
    const payload = {
      transfer_no: transferData.transfer_no || ('REQ-' + Date.now()),
      date: transferData.date || now.split('T')[0],
      source_warehouse_id: transferData.source_warehouse_id,
      destination_warehouse_id: transferData.destination_warehouse_id,
      status: 'requested', // Langkah 1: Diajukan
      notes: transferData.notes || '',
      requested_by: user ? (user.name || user.email || 'SPG') : 'SPG',
      requested_at: now,
      approved_by: '',
      approved_at: '',
      shipped_by: '',
      shipped_at: '',
      received_by: '',
      received_at: '',
      attachment_url: ''
    };

    const transfer = Repository.create(StockTransferSchema, payload);

    // Simpan item-item transfer dengan requested_qty
    const savedItems = items.map(item => {
      const q = Number(item.quantity);
      if (isNaN(q) || q <= 0) {
        throw new Error('Jumlah barang pada permintaan harus berupa angka positif.');
      }
      return Repository.create(TransferItemSchema, {
        transfer_id: transfer.id,
        product_id: item.product_id,
        requested_qty: q,
        approved_qty: q,
        shipped_qty: q,
        received_qty: q,
        quantity: q,
        item_notes: item.notes || ''
      });
    });

    return {
      transfer: transfer,
      items: savedItems
    };
  },

  /**
   * Langkah 2: Review & Approve by Admin / Store Manager.
   * Admin dapat menyetujui seluruhnya/sebagian, atau mengubah Qty per item, serta memberi catatan alasan.
   * Status: 'approved'. Belum memotong stok fisik gudang.
   *
   * @param {string} transferId
   * @param {Object} payload { admin_notes, items: [{ id, approved_qty, notes }] }
   * @param {Object} user
   * @returns {Object}
   */
  reviewApproveTransfer: function(transferId, payload, user) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const transfer = Repository.findById(StockTransferSchema, transferId);
      if (!transfer) {
        throw new Error(`Dokumen permintaan ${transferId} tidak ditemukan.`);
      }
      if (transfer.status !== 'requested') {
        throw new Error(`Dokumen tidak dapat disetujui karena berstatus "${transfer.status}". Hanya status "requested" yang dapat disetujui.`);
      }

      const now = new Date().toISOString();

      // Update kuantitas approved pada item
      if (payload && Array.isArray(payload.items)) {
        payload.items.forEach(it => {
          const itemRecord = Repository.findById(TransferItemSchema, it.id);
          if (itemRecord && String(itemRecord.transfer_id) === String(transferId)) {
            const appQty = Number(it.approved_qty) >= 0 ? Number(it.approved_qty) : (Number(itemRecord.requested_qty) || 0);
            Repository.update(TransferItemSchema, it.id, {
              approved_qty: appQty,
              shipped_qty: appQty, // Default picker target
              received_qty: appQty,
              quantity: appQty,
              item_notes: it.notes || itemRecord.item_notes || ''
            });
          }
        });
      }

      // Update status transfer -> approved
      const updatedTransfer = Repository.update(StockTransferSchema, transferId, {
        status: 'approved',
        approved_by: user.name || user.email || 'Admin',
        approved_at: now,
        notes: (transfer.notes ? transfer.notes + "\n" : "") + (payload.admin_notes ? `[Admin: ${payload.admin_notes}]` : "")
      });

      return updatedTransfer;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Langkah 3: Bagian Picker / Gudang Kemas & Kirim Barang.
   * Picker memasukkan shipped_qty sesuai barang fisik yang ada, memberi catatan packing.
   * MEMOTONG stok fisik dari Gudang Asal & Mencatat TRANSFER_OUT.
   * Status: 'shipped' (In-Transit).
   *
   * @param {string} transferId
   * @param {Object} payload { picker_notes, items: [{ id, shipped_qty, notes }] }
   * @param {Object} user
   * @returns {Object}
   */
  dispatchShippedTransfer: function(transferId, payload, user) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const transfer = Repository.findById(StockTransferSchema, transferId);
      if (!transfer) {
        throw new Error(`Dokumen transfer ${transferId} tidak ditemukan.`);
      }
      if (transfer.status !== 'approved' && transfer.status !== 'draft') {
        throw new Error(`Dokumen tidak dapat dikirim karena berstatus "${transfer.status}". Dokumen harus berstatus "approved" terlebih dahulu.`);
      }

      // Ambil items transfer
      const allItems = Repository.findAll(TransferItemSchema);
      const items = allItems.filter(it => String(it.transfer_id) === String(transferId));
      if (items.length === 0) {
        throw new Error('Tidak ada barang di dalam dokumen transfer ini.');
      }

      // Mapping inputan picker jika ada
      const inputMap = {};
      if (payload && Array.isArray(payload.items)) {
        payload.items.forEach(it => { inputMap[it.id] = it; });
      }

      // 1. Validasi saldo fisik di Gudang Asal
      items.forEach(it => {
        const inp = inputMap[it.id];
        const shipQty = inp && Number(inp.shipped_qty) >= 0 ? Number(inp.shipped_qty) : (Number(it.approved_qty) || Number(it.quantity) || 0);
        const bal = StockService.getBalance(transfer.source_warehouse_id, it.product_id);
        if (bal < shipQty) {
          throw new Error(`Stok fisik produk ${it.product_id} tidak mencukupi di gudang asal. Saldo: ${bal}, Akan Dikirim: ${shipQty}.`);
        }
      });

      // 2. Potong stok di Gudang Asal & Catat Mutasi TRANSFER_OUT
      const now = new Date().toISOString();
      items.forEach(it => {
        const inp = inputMap[it.id];
        const shipQty = inp && Number(inp.shipped_qty) >= 0 ? Number(inp.shipped_qty) : (Number(it.approved_qty) || Number(it.quantity) || 0);
        const bal = StockService.getBalance(transfer.source_warehouse_id, it.product_id);
        const newBal = bal - shipQty;

        // Potong saldo
        StockService.setBalance(transfer.source_warehouse_id, it.product_id, newBal);

        // Update item record
        Repository.update(TransferItemSchema, it.id, {
          shipped_qty: shipQty,
          received_qty: shipQty,
          quantity: shipQty,
          item_notes: (inp && inp.notes) ? inp.notes : it.item_notes
        });

        // Catat mutasi
        Repository.create(StockMutationSchema, {
          date: now.split('T')[0],
          type: 'TRANSFER_OUT',
          reference_type: 'TRANSFER',
          reference_id: transfer.transfer_no || transfer.id,
          warehouse_id: transfer.source_warehouse_id,
          product_id: it.product_id,
          quantity: shipQty,
          notes: `Kirim ke toko ${transfer.destination_warehouse_id} (Picker: ${user.name || user.email})`,
          created_by: user.name || user.email || 'Picker'
        });
      });

      // 3. Update status transfer -> shipped (In-Transit)
      const updatedTransfer = Repository.update(StockTransferSchema, transferId, {
        status: 'shipped',
        shipped_by: user.name || user.email || 'Picker',
        shipped_at: now,
        notes: (transfer.notes ? transfer.notes + "\n" : "") + (payload.picker_notes ? `[Picker: ${payload.picker_notes}]` : "")
      });

      return updatedTransfer;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Langkah 4: SPG / Toko Penerima Cek Fisik & Konfirmasi Terima.
   * SPG mengisi received_qty riil, receiver_notes (jika ada selisih/rusak), dan attachment_url (foto bukti opsional).
   * MENAMBAH stok fisik ke Gudang/Toko Tujuan sebesar received_qty & Mencatat TRANSFER_IN.
   * Status: 'received'.
   *
   * @param {string} transferId
   * @param {Object} payload { receiver_notes, attachment_url, items: [{ id, received_qty, notes }] }
   * @param {Object} user
   * @returns {Object}
   */
  confirmReceiveTransfer: function(transferId, payload, user) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const transfer = Repository.findById(StockTransferSchema, transferId);
      if (!transfer) {
        throw new Error(`Dokumen transfer ${transferId} tidak ditemukan.`);
      }
      if (transfer.status !== 'shipped' && transfer.status !== 'approved_shipped') {
        throw new Error(`Dokumen transfer tidak dapat diterima karena berstatus "${transfer.status}". Barang harus berstatus "shipped" terlebih dahulu.`);
      }

      // Ambil items transfer
      const allItems = Repository.findAll(TransferItemSchema);
      const items = allItems.filter(it => String(it.transfer_id) === String(transferId));
      if (items.length === 0) {
        throw new Error('Tidak ada barang di dalam dokumen transfer ini.');
      }

      // Mapping inputan penerima
      const inputMap = {};
      if (payload && Array.isArray(payload.items)) {
        payload.items.forEach(it => { inputMap[it.id] = it; });
      }

      // 1. Tambah stok di Toko Tujuan & Catat Mutasi TRANSFER_IN
      const now = new Date().toISOString();
      items.forEach(it => {
        const inp = inputMap[it.id];
        const recvQty = inp && Number(inp.received_qty) >= 0 ? Number(inp.received_qty) : (Number(it.shipped_qty) || Number(it.quantity) || 0);
        const bal = StockService.getBalance(transfer.destination_warehouse_id, it.product_id);
        const newBal = bal + recvQty;

        // Tambah saldo toko tujuan
        StockService.setBalance(transfer.destination_warehouse_id, it.product_id, newBal);

        // Update item record dengan received_qty aktual
        Repository.update(TransferItemSchema, it.id, {
          received_qty: recvQty,
          item_notes: (inp && inp.notes) ? inp.notes : it.item_notes
        });

        // Catat mutasi masuk
        Repository.create(StockMutationSchema, {
          date: now.split('T')[0],
          type: 'TRANSFER_IN',
          reference_type: 'TRANSFER',
          reference_id: transfer.transfer_no || transfer.id,
          warehouse_id: transfer.destination_warehouse_id,
          product_id: it.product_id,
          quantity: recvQty,
          notes: `Diterima dari ${transfer.source_warehouse_id} (Diterima oleh ${user.name || user.email})`,
          created_by: user.name || user.email || 'SPG'
        });
      });

      // 2. Update status transfer -> received
      const updatedTransfer = Repository.update(StockTransferSchema, transferId, {
        status: 'received',
        received_by: user.name || user.email || 'SPG',
        received_at: now,
        attachment_url: payload.attachment_url || transfer.attachment_url || '',
        notes: (transfer.notes ? transfer.notes + "\n" : "") + (payload.receiver_notes ? `[Toko: ${payload.receiver_notes}]` : "")
      });

      return updatedTransfer;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Helper alias lama untuk backwards compatibility
   */
  approveTransferSend: function(transferId, user) {
    return this.dispatchShippedTransfer(transferId, {}, user);
  },

  receiveTransfer: function(transferId, user) {
    return this.confirmReceiveTransfer(transferId, {}, user);
  },

  /**
   * Mengambil riwayat mutasi dengan opsi filter.
   * @param {Object} filter { warehouse_id, product_id, type }
   * @returns {Array}
   */
  getMutations: function(filter) {
    let mutations = Repository.findAll(StockMutationSchema);
    if (filter) {
      if (filter.warehouse_id) {
        mutations = mutations.filter(m => String(m.warehouse_id) === String(filter.warehouse_id));
      }
      if (filter.product_id) {
        mutations = mutations.filter(m => String(m.product_id) === String(filter.product_id));
      }
      if (filter.type) {
        mutations = mutations.filter(m => String(m.type) === String(filter.type));
      }
    }

    // Perkaya data dengan nama produk dan nama gudang
    const allProducts = Database.findAll('Products');
    const allWarehouses = Database.findAll('Warehouses');
    const pMap = {};
    const wMap = {};
    allProducts.forEach(p => { pMap[p.id] = p.name ? `${p.name} (${p.code || p.id})` : p.id; });
    allWarehouses.forEach(w => { wMap[w.id] = w.name ? `${w.name} (${w.code || w.id})` : w.id; });

    mutations = mutations.map(m => ({
      ...m,
      warehouse_name: wMap[m.warehouse_id] || m.warehouse_id,
      product_name: pMap[m.product_id] || m.product_id
    }));

    return mutations.reverse(); // Terbaru di atas
  }
};
