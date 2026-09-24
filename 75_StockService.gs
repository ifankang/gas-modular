/**
 * 75_StockService.gs
 * Business logic layer untuk saldo stok per gudang.
 * Mengelola pembacaan saldo, penyesuaian/inisialisasi stok per lokasi,
 * dan rekalkulasi total stok produk secara otomatis.
 */
const StockService = {
  /**
   * Mengambil semua catatan saldo stok dari sheet Stocks.
   * @returns {Array} Seluruh baris stok.
   */
  findAll: function() {
    return Repository.findAll(StockSchema);
  },

  /**
   * Mengambil saldo stok spesifik berdasarkan gudang dan produk.
   * @param {string} warehouseId
   * @param {string} productId
   * @returns {Object|null} Catatan stok atau null jika belum ada.
   */
  findRecord: function(warehouseId, productId) {
    const records = this.findAll();
    return records.find(function(r) {
      return String(r.warehouse_id) === String(warehouseId) &&
             String(r.product_id) === String(productId);
    }) || null;
  },

  /**
   * Mengambil saldo kuantitas suatu produk di gudang tertentu.
   * @param {string} warehouseId
   * @param {string} productId
   * @returns {number} Jumlah stok (default 0).
   */
  getBalance: function(warehouseId, productId) {
    const record = this.findRecord(warehouseId, productId);
    return record ? Number(record.quantity) || 0 : 0;
  },

  /**
   * Mengambil rincian stok untuk satu produk di seluruh gudang.
   * Dilengkapi informasi nama gudang dan kode gudang.
   * @param {string} productId
   * @returns {Array} List stok per gudang.
   */
  getByProduct: function(productId) {
    const allStocks = this.findAll();
    const productStocks = allStocks.filter(function(s) {
      return String(s.product_id) === String(productId);
    });

    // Perkaya dengan nama gudang
    const warehouses = WarehouseRepository.findAll();
    const whMap = {};
    warehouses.forEach(function(w) {
      whMap[w.id] = w;
    });

    return productStocks.map(function(s) {
      const wh = whMap[s.warehouse_id] || {};
      return {
        id: s.id,
        warehouse_id: s.warehouse_id,
        warehouse_code: wh.code || s.warehouse_id,
        warehouse_name: wh.name || s.warehouse_id,
        product_id: s.product_id,
        quantity: Number(s.quantity) || 0,
        updated_at: s.updated_at
      };
    });
  },

  /**
   * Mengambil seluruh stok barang di satu gudang.
   * @param {string} warehouseId
   * @returns {Array} List stok produk di gudang tersebut.
   */
  getByWarehouse: function(warehouseId) {
    const allStocks = this.findAll();
    return allStocks.filter(function(s) {
      return String(s.warehouse_id) === String(warehouseId);
    });
  },

  /**
   * Menetapkan atau memperbarui saldo stok fisik secara langsung (setBalance).
   * Digunakan untuk penyesuaian stok atau inisialisasi saldo.
   *
   * @param {string} warehouseId
   * @param {string} productId
   * @param {number} newQuantity
   * @returns {Object} Data saldo stok yang diperbarui.
   */
  setBalance: function(warehouseId, productId, newQuantity) {
    const qty = Number(newQuantity);
    if (isNaN(qty) || qty < 0) {
      throw new Error('Jumlah saldo stok harus berupa angka positif atau nol.');
    }

    const existing = this.findRecord(warehouseId, productId);
    let result;
    if (existing) {
      result = Repository.update(StockSchema, existing.id, {
        quantity: qty
      });
    } else {
      result = Repository.create(StockSchema, {
        warehouse_id: warehouseId,
        product_id: productId,
        quantity: qty
      });
    }

    // Rekalkulasi konsolidasi saldo stok ke tabel Produk
    this.recalculateTotalProductStock(productId);

    return result;
  },

  /**
   * Rekalkulasi total stok produk dari seluruh gudang
   * dan memperbarui kolom `stock` pada sheet Products.
   *
   * @param {string} productId
   * @returns {number} Total saldo stok terkini.
   */
  recalculateTotalProductStock: function(productId) {
    const allStocks = this.findAll();
    const total = allStocks.reduce(function(sum, item) {
      if (String(item.product_id) === String(productId)) {
        return sum + (Number(item.quantity) || 0);
      }
      return sum;
    }, 0);

    try {
      const prd = ProductRepository.findById(productId);
      if (prd) {
        ProductRepository.update(productId, { stock: total });
      }
    } catch (e) {
      Logger.log('recalculateTotalProductStock error: ' + e.message);
    }

    return total;
  }
};
