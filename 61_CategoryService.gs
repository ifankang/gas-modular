/**
 * 61_CategoryService.gs
 * Business logic layer untuk entitas Categories.
 * Menerapkan validasi bisnis: field wajib, format kode, dan keunikan kode.
 */
const CategoryService = {
  /**
   * Mengembalikan semua kategori.
   * @returns {Array} Daftar semua kategori.
   */
  findAll: function() {
    return CategoryRepository.findAll();
  },

  /**
   * Mengembalikan satu kategori berdasarkan ID.
   * @param {string} id - ID kategori.
   * @returns {Object} Data kategori.
   * @throws {Error} Jika kategori tidak ditemukan.
   */
  findById: function(id) {
    const category = CategoryRepository.findById(id);
    if (!category) {
      throw new Error('Kategori dengan ID "' + id + '" tidak ditemukan.');
    }
    return category;
  },

  /**
   * Membuat kategori baru dengan validasi bisnis.
   * - Field `code` dan `name` wajib diisi.
   * - Kode diubah ke UPPERCASE dan di-trim.
   * - Kode harus unik di antara semua kategori yang ada.
   *
   * @param {Object} data - Data kategori yang akan dibuat.
   * @returns {Object} Kategori yang berhasil dibuat.
   * @throws {Error} Jika validasi gagal.
   */
  create: function(data) {
    // Validasi field wajib
    if (!data.code || String(data.code).trim() === '') {
      throw new Error('Kode kategori wajib diisi.');
    }
    if (!data.name || String(data.name).trim() === '') {
      throw new Error('Nama kategori wajib diisi.');
    }

    // Normalisasi kode: UPPERCASE dan strip whitespace
    data.code = String(data.code).trim().toUpperCase();

    // Validasi keunikan kode
    var existing = CategoryRepository.findAll();
    var duplicate = existing.find(function(cat) {
      return cat.code && String(cat.code).trim().toUpperCase() === data.code;
    });
    if (duplicate) {
      throw new Error('Kode kategori "' + data.code + '" sudah digunakan. Gunakan kode yang berbeda.');
    }

    return CategoryRepository.create(data);
  },

  /**
   * Memperbarui data kategori berdasarkan ID.
   * Jika kode diubah, validasi bahwa kode baru tidak konflik dengan kategori lain.
   *
   * @param {string} id - ID kategori yang akan diperbarui.
   * @param {Object} data - Field yang akan diperbarui.
   * @returns {Object} Data kategori setelah diperbarui.
   * @throws {Error} Jika kategori tidak ditemukan atau validasi gagal.
   */
  update: function(id, data) {
    // Pastikan kategori ada
    this.findById(id);

    // Jika kode diubah, normalisasi dan validasi keunikan
    if (data.code !== undefined) {
      if (String(data.code).trim() === '') {
        throw new Error('Kode kategori tidak boleh kosong.');
      }
      data.code = String(data.code).trim().toUpperCase();

      var existing = CategoryRepository.findAll();
      var conflict = existing.find(function(cat) {
        return cat.code &&
               String(cat.code).trim().toUpperCase() === data.code &&
               cat.id !== id;
      });
      if (conflict) {
        throw new Error('Kode kategori "' + data.code + '" sudah digunakan oleh kategori lain.');
      }
    }

    return CategoryRepository.update(id, data);
  },

  /**
   * Menghapus kategori berdasarkan ID.
   * @param {string} id - ID kategori yang akan dihapus.
   * @returns {*} Hasil operasi hapus dari repository.
   * @throws {Error} Jika kategori tidak ditemukan.
   */
  delete: function(id) {
    // Pastikan kategori ada sebelum dihapus
    this.findById(id);
    return CategoryRepository.delete(id);
  }
};
