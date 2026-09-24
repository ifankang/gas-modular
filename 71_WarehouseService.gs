/**
 * 71_WarehouseService.gs
 * Business logic layer untuk entitas Warehouses.
 * Menerapkan validasi: field wajib, normalisasi kode unik, dan proteksi hapus jika masih ada stok.
 */
const WarehouseService = {
  /**
   * Mengambil seluruh data gudang.
   * @returns {Array} Daftar gudang.
   */
  findAll: function() {
    return WarehouseRepository.findAll();
  },

  /**
   * Mengambil data gudang berdasarkan ID.
   * @param {string} id - ID Gudang (misal 'WH-000001').
   * @returns {Object} Data gudang.
   * @throws {Error} Jika gudang tidak ditemukan.
   */
  findById: function(id) {
    const wh = WarehouseRepository.findById(id);
    if (!wh) {
      throw new Error('Gudang dengan ID "' + id + '" tidak ditemukan.');
    }
    return wh;
  },

  /**
   * Menambahkan gudang baru.
   * - Field `code` dan `name` wajib diisi.
   * - Kode dinormalisasi ke UPPERCASE dan dipangkas spasi.
   * - Kode harus unik di antara semua gudang.
   * - Default status adalah 'active' jika tidak dispesifikasikan.
   *
   * @param {Object} data - Payload data gudang.
   * @returns {Object} Gudang yang berhasil dibuat.
   */
  create: function(data) {
    if (!data.code || String(data.code).trim() === '') {
      throw new Error('Kode gudang wajib diisi.');
    }
    if (!data.name || String(data.name).trim() === '') {
      throw new Error('Nama gudang wajib diisi.');
    }

    data.code = String(data.code).trim().toUpperCase();
    data.status = data.status || 'active';

    const existing = WarehouseRepository.findAll();
    const duplicate = existing.find(function(w) {
      return w.code && String(w.code).trim().toUpperCase() === data.code;
    });

    if (duplicate) {
      throw new Error('Kode gudang "' + data.code + '" sudah digunakan. Gunakan kode yang unik.');
    }

    return WarehouseRepository.create(data);
  },

  /**
   * Memperbarui informasi gudang.
   * - Jika kode diubah, periksa keunikan terhadap gudang lain.
   *
   * @param {string} id - ID Gudang.
   * @param {Object} data - Data pembaruan.
   * @returns {Object} Data gudang setelah pembaruan.
   */
  update: function(id, data) {
    this.findById(id);

    if (data.code !== undefined) {
      if (String(data.code).trim() === '') {
        throw new Error('Kode gudang tidak boleh kosong.');
      }
      data.code = String(data.code).trim().toUpperCase();

      const existing = WarehouseRepository.findAll();
      const conflict = existing.find(function(w) {
        return w.code &&
               String(w.code).trim().toUpperCase() === data.code &&
               w.id !== id;
      });

      if (conflict) {
        throw new Error('Kode gudang "' + data.code + '" sudah digunakan oleh gudang lain.');
      }
    }

    return WarehouseRepository.update(id, data);
  },

  /**
   * Menghapus gudang.
   * - Proteksi integritas: dilarang menghapus gudang jika masih ada saldo stok > 0.
   *
   * @param {string} id - ID Gudang.
   * @returns {*} Hasil penghapusan.
   */
  delete: function(id) {
    this.findById(id);

    // Cek apakah ada saldo stok di gudang ini
    try {
      const stocks = StockService.getByWarehouse(id);
      const hasPositiveStock = stocks.some(function(s) {
        return Number(s.quantity) > 0;
      });

      if (hasPositiveStock) {
        throw new Error('Gudang tidak dapat dihapus karena masih memiliki barang/stok aktif (> 0). Pindahkan atau kosongkan stok terlebih dahulu.');
      }
    } catch (e) {
      // Jika error adalah pesan proteksi stok di atas, teruskan
      if (e.message && e.message.indexOf('Gudang tidak dapat dihapus') !== -1) {
        throw e;
      }
    }

    return WarehouseRepository.delete(id);
  }
};
