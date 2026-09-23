/**
 * 62_CategoryController.gs
 * Global controller functions untuk entitas Categories.
 * Dapat dipanggil via google.script.run dari client.
 * Setiap fungsi menerapkan RBAC authorization dan dibungkus try-catch.
 */

/**
 * Mengambil daftar semua kategori.
 * Memerlukan izin RBAC: resource 'categories', action 'read'.
 *
 * @param {string} sessionToken - Token sesi pengguna aktif.
 * @returns {Object} Response standar berisi daftar kategori atau pesan error.
 */
function categoriesList(sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'categories', 'read');
    var data = CategoryService.findAll();
    return Response.success(data, 'Categories retrieved successfully');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengambil satu kategori berdasarkan ID.
 * Memerlukan izin RBAC: resource 'categories', action 'read'.
 *
 * @param {string} id - ID unik kategori.
 * @param {string} sessionToken - Token sesi pengguna aktif.
 * @returns {Object} Response standar berisi data kategori atau pesan error.
 */
function categoriesGet(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'categories', 'read');
    var data = CategoryService.findById(id);
    return Response.success(data, 'Category retrieved successfully');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Membuat kategori baru.
 * Memerlukan izin RBAC: resource 'categories', action 'create'.
 *
 * @param {Object} data - Payload data kategori yang akan dibuat.
 * @param {string} sessionToken - Token sesi pengguna aktif.
 * @returns {Object} Response standar berisi data kategori yang dibuat atau pesan error.
 */
function categoriesCreate(data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'categories', 'create');
    var result = CategoryService.create(data);
    return Response.success(result, 'Category created successfully');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Memperbarui kategori yang ada berdasarkan ID.
 * Memerlukan izin RBAC: resource 'categories', action 'edit'.
 *
 * @param {string} id - ID unik kategori yang akan diperbarui.
 * @param {Object} data - Field yang akan diperbarui.
 * @param {string} sessionToken - Token sesi pengguna aktif.
 * @returns {Object} Response standar berisi data kategori yang diperbarui atau pesan error.
 */
function categoriesUpdate(id, data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'categories', 'edit');
    var result = CategoryService.update(id, data);
    return Response.success(result, 'Category updated successfully');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Menghapus kategori berdasarkan ID.
 * Memerlukan izin RBAC: resource 'categories', action 'delete'.
 *
 * @param {string} id - ID unik kategori yang akan dihapus.
 * @param {string} sessionToken - Token sesi pengguna aktif.
 * @returns {Object} Response standar mengkonfirmasi penghapusan atau pesan error.
 */
function categoriesDelete(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'categories', 'delete');
    CategoryService.delete(id);
    return Response.success(null, 'Category deleted successfully');
  } catch (error) {
    return Response.error(error.message);
  }
}
