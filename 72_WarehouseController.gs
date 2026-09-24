/**
 * 72_WarehouseController.gs
 * Global controller functions untuk entitas Warehouses.
 * Dapat dipanggil via google.script.run atau API.call adapter.
 * Seluruh endpoint dilindungi RBAC dan dibungkus try-catch.
 */

/**
 * Mengambil daftar seluruh gudang.
 * Memerlukan RBAC: resource 'warehouses', action 'read'
 * (atau fallback ke 'products:read' untuk keperluan dropdown formulir).
 *
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function warehousesList(sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'warehouses', 'read');
    } catch (e) {
      // Fallback: Izinkan user yang memiliki izin baca produk/orders untuk melihat daftar gudang
      RBAC.authorize(sessionToken, 'products', 'read');
    }
    const data = WarehouseService.findAll();
    return Response.success(data, 'Daftar gudang berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengambil data satu gudang berdasarkan ID.
 * Memerlukan RBAC: resource 'warehouses', action 'read'.
 *
 * @param {string} id
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function warehousesGet(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'warehouses', 'read');
    const data = WarehouseService.findById(id);
    return Response.success(data, 'Detail gudang berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Membuat data gudang baru.
 * Memerlukan RBAC: resource 'warehouses', action 'create'.
 *
 * @param {Object} data
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function warehousesCreate(data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'warehouses', 'create');
    const result = WarehouseService.create(data);
    return Response.success(result, 'Gudang baru berhasil ditambahkan.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Memperbarui data gudang berdasarkan ID.
 * Memerlukan RBAC: resource 'warehouses', action 'edit'.
 *
 * @param {string} id
 * @param {Object} data
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function warehousesUpdate(id, data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'warehouses', 'edit');
    const result = WarehouseService.update(id, data);
    return Response.success(result, 'Data gudang berhasil diperbarui.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Menghapus gudang berdasarkan ID.
 * Memerlukan RBAC: resource 'warehouses', action 'delete'.
 *
 * @param {string} id
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function warehousesDelete(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'warehouses', 'delete');
    WarehouseService.delete(id);
    return Response.success(null, 'Gudang berhasil dihapus.');
  } catch (error) {
    return Response.error(error.message);
  }
}
