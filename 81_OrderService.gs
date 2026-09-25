/**
 * 81_OrderService.gs
 * Business logic layer untuk Purchase Order (PO) dan Sales Order (SO).
 * 
 * Aturan Siklus Transaksi:
 * 1. Purchase Order (PO):
 *    - Hanya butuh gudang tujuan (destination_warehouse_id).
 *    - Draft -> Approved (oleh Admin) -> Shipped (dikirim supplier) -> Received (diterima gudang target).
 *    - Saat status 'received', otomatis menambah saldo fisik di destination_warehouse_id
 *      dan mencatat mutasi 'IN' di StockMutations via InventoryService.
 * 2. Sales Order (SO):
 *    - Gudang sumber pengiriman barang (destination_warehouse_id sebagai warehouse asal).
 *    - Validasi stok fisik secara atomik menggunakan LockService.
 *    - Jika stok cukup: potong stok fisik, catat mutasi 'OUT' di StockMutations,
 *      dan simpan order dengan status 'completed'.
 */

const OrderService = {
  /**
   * Mengambil semua order, opsional difilter berdasarkan tipe ('PURCHASE' / 'SALES').
   * @param {string} type
   * @returns {Array}
   */
  findAll: function(type) {
    let orders = OrderRepository.findAll();
    if (type) {
      orders = orders.filter(o => String(o.type).toUpperCase() === String(type).toUpperCase());
    }
    return orders.reverse(); // Terbaru di atas
  },

  /**
   * Mengambil satu order dan rincian item barangnya.
   * @param {string} id
   * @returns {Object}
   */
  findById: function(id) {
    const order = OrderRepository.findById(id);
    if (!order) {
      throw new Error(`Order dengan ID "${id}" tidak ditemukan.`);
    }
    const items = OrderRepository.getItems(id);
    return { order: order, items: items };
  },

  /**
   * ==========================================
   * ALUR PURCHASE ORDER (PO)
   * ==========================================
   */

  /**
   * Membuat draft pengadaan Purchase Order.
   * Hanya membutuhkan destination_warehouse_id (gudang tujuan).
   *
   * @param {Object} orderData { order_no, date, destination_warehouse_id, contact_name, notes }
   * @param {Array} items [{ product_id, quantity, price }]
   * @param {Object} user
   * @returns {Object}
   */
  createPurchaseDraft: function(orderData, items, user) {
    if (!orderData.destination_warehouse_id) {
      throw new Error('Gudang tujuan pengadaan wajib dipilih.');
    }
    if (!orderData.contact_name) {
      throw new Error('Nama pemasok (supplier) wajib diisi.');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Daftar barang pada Purchase Order tidak boleh kosong.');
    }

    const now = new Date().toISOString();
    let totalAmount = 0;

    items.forEach(it => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.price) || 0;
      totalAmount += (q * p);
    });

    const orderPayload = {
      order_no: orderData.order_no || ('PO-' + Date.now()),
      type: 'PURCHASE',
      date: orderData.date || now.split('T')[0],
      destination_warehouse_id: orderData.destination_warehouse_id,
      contact_name: orderData.contact_name,
      total_amount: totalAmount,
      status: 'draft',
      approved_by: '',
      approved_at: '',
      received_by: '',
      received_at: '',
      notes: orderData.notes || '',
      attachment_url: orderData.attachment_url || '',
      created_by: user.name || user.email || 'Admin'
    };

    const order = OrderRepository.create(orderPayload);

    // Simpan item-item PO
    const savedItems = items.map(it => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.price) || 0;
      return OrderRepository.addItem({
        order_id: order.id,
        product_id: it.product_id,
        quantity: q,
        price: p,
        subtotal: q * p
      });
    });

    return { order: order, items: savedItems };
  },

  /**
   * Persetujuan Purchase Order oleh Admin.
   * @param {string} orderId
   * @param {Object} user
   * @returns {Object}
   */
  approvePurchase: function(orderId, user) {
    const order = OrderRepository.findById(orderId);
    if (!order) throw new Error(`PO ${orderId} tidak ditemukan.`);
    if (order.status !== 'draft') {
      throw new Error(`PO tidak dapat disetujui karena berstatus "${order.status}".`);
    }

    const now = new Date().toISOString();
    return OrderRepository.update(orderId, {
      status: 'approved',
      approved_by: user.name || user.email || 'Admin',
      approved_at: now
    });
  },

  /**
   * Menandai barang PO telah dikirim oleh pemasok.
   * @param {string} orderId
   * @returns {Object}
   */
  shipPurchase: function(orderId) {
    const order = OrderRepository.findById(orderId);
    if (!order) throw new Error(`PO ${orderId} tidak ditemukan.`);
    if (order.status !== 'approved') {
      throw new Error(`PO harus berstatus "approved" sebelum dapat ditandai dikirim.`);
    }

    return OrderRepository.update(orderId, {
      status: 'shipped'
    });
  },

  /**
   * Konfirmasi penerimaan barang PO di gudang tujuan.
   * - Menambah kuantitas fisik di gudang tujuan untuk seluruh item barang.
   * - Mencatat mutasi IN di sheet StockMutations.
   * - Memperbarui status PO -> 'received'.
   *
   * @param {string} orderId
   * @param {Object} user
   * @returns {Object}
   */
  receivePurchase: function(orderId, user) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const order = OrderRepository.findById(orderId);
      if (!order) throw new Error(`PO ${orderId} tidak ditemukan.`);
      if (order.status !== 'shipped' && order.status !== 'approved') {
        throw new Error(`PO tidak dapat diterima karena berstatus "${order.status}". Status harus "approved" atau "shipped".`);
      }

      const items = OrderRepository.getItems(orderId);
      if (items.length === 0) throw new Error('Tidak ada barang pada PO ini.');

      const now = new Date().toISOString();
      const targetWarehouse = order.destination_warehouse_id;

      // Tambahkan saldo fisik & catat mutasi IN
      items.forEach(it => {
        const qty = Number(it.quantity) || 0;
        const currentBal = StockService.getBalance(targetWarehouse, it.product_id);
        const newBal = currentBal + qty;

        StockService.setBalance(targetWarehouse, it.product_id, newBal);

        Repository.create(StockMutationSchema, {
          date: now.split('T')[0],
          type: 'IN',
          reference_type: 'PO',
          reference_id: order.order_no || order.id,
          warehouse_id: targetWarehouse,
          product_id: it.product_id,
          quantity: qty,
          notes: `Penerimaan PO dari ${order.contact_name} (Diterima oleh ${user.name || user.email})`,
          created_by: user.name || user.email || 'Staff'
        });
      });

      const updatedOrder = OrderRepository.update(orderId, {
        status: 'received',
        received_by: user.name || user.email || 'Staff',
        received_at: now
      });

      return updatedOrder;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * ==========================================
   * ALUR SALES ORDER (SO)
   * ==========================================
   */

  /**
   * Membuat transaksi penjualan (Sales Order).
   * - Memvalidasi saldo fisik di gudang pengirim secara atomik.
   * - Mengurangi kuantitas fisik di gudang pengirim.
   * - Mencatat mutasi OUT di sheet StockMutations.
   * - Menyimpan order dengan status 'completed'.
   *
   * @param {Object} orderData { order_no, date, destination_warehouse_id (gudang pengirim), contact_name (customer), notes }
   * @param {Array} items [{ product_id, quantity, price }]
   * @param {Object} user
   * @returns {Object}
   */
  createSalesOrder: function(orderData, items, user) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);

      const sourceWarehouse = orderData.destination_warehouse_id;
      if (!sourceWarehouse) {
        throw new Error('Gudang sumber pengiriman barang penjualan wajib dipilih.');
      }
      if (!orderData.contact_name) {
        throw new Error('Nama pelanggan (customer) wajib diisi.');
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Daftar barang penjualan tidak boleh kosong.');
      }

      // 1. Validasi saldo fisik seluruh item di gudang sumber
      items.forEach(it => {
        const reqQty = Number(it.quantity) || 0;
        if (reqQty <= 0) throw new Error('Jumlah barang penjualan harus berupa angka positif.');

        const bal = StockService.getBalance(sourceWarehouse, it.product_id);
        if (bal < reqQty) {
          throw new Error(`Stok produk ${it.product_id} tidak mencukupi di gudang ${sourceWarehouse}. Saldo fisik: ${bal}, diminta: ${reqQty}.`);
        }
      });

      // 2. Hitung total nilai transaksi penjualan
      let totalAmount = 0;
      items.forEach(it => {
        const q = Number(it.quantity) || 0;
        const p = Number(it.price) || 0;
        totalAmount += (q * p);
      });

      const now = new Date().toISOString();
      const orderPayload = {
        order_no: orderData.order_no || ('SO-' + Date.now()),
        type: 'SALES',
        date: orderData.date || now.split('T')[0],
        destination_warehouse_id: sourceWarehouse,
        contact_name: orderData.contact_name,
        total_amount: totalAmount,
        status: 'completed',
        approved_by: user.name || user.email || 'System',
        approved_at: now,
        received_by: '',
        received_at: '',
        attachment_url: orderData.attachment_url || '',
        notes: orderData.notes || '',
        created_by: user.name || user.email || 'Staff'
      };

      const order = OrderRepository.create(orderPayload);

      // 3. Simpan item order, potong stok fisik, dan catat mutasi OUT
      const savedItems = items.map(it => {
        const q = Number(it.quantity) || 0;
        const p = Number(it.price) || 0;

        const currentBal = StockService.getBalance(sourceWarehouse, it.product_id);
        const newBal = currentBal - q;
        StockService.setBalance(sourceWarehouse, it.product_id, newBal);

        Repository.create(StockMutationSchema, {
          date: now.split('T')[0],
          type: 'OUT',
          reference_type: 'SO',
          reference_id: order.order_no || order.id,
          warehouse_id: sourceWarehouse,
          product_id: it.product_id,
          quantity: q,
          notes: `Penjualan ke ${order.contact_name} (Oleh ${user.name || user.email})`,
          created_by: user.name || user.email || 'Staff'
        });

        return OrderRepository.addItem({
          order_id: order.id,
          product_id: it.product_id,
          quantity: q,
          price: p,
          subtotal: q * p
        });
      });

      return { order: order, items: savedItems };
    } finally {
      lock.releaseLock();
    }
  }
};
