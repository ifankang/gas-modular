/**
 * 75_StockController.gs
 * Global controller functions untuk modul Saldo Stok per Lokasi.
 * Dapat dipanggil via google.script.run atau API.call adapter.
 */

/**
 * Mengambil seluruh data saldo stok.
 * Memerlukan RBAC: resource 'stocks' atau 'products', action 'read'.
 *
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function stocksList(sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'stocks', 'read');
    } catch (e) {
      RBAC.authorize(sessionToken, 'products', 'read');
    }
    const data = StockService.findAll();
    return Response.success(data, 'Daftar stok berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengambil rincian stok untuk produk spesifik di setiap gudang.
 * Memerlukan RBAC: resource 'stocks' atau 'products', action 'read'.
 *
 * @param {string} productId
 * @param {string} sessionToken
 * @returns {Object} Response standar dengan breakdown stok per gudang
 */
function stocksGetByProduct(productId, sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'stocks', 'read');
    } catch (e) {
      RBAC.authorize(sessionToken, 'products', 'read');
    }
    const data = StockService.getByProduct(productId);
    return Response.success(data, 'Rincian stok produk per gudang berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengambil rincian saldo stok untuk gudang tertentu.
 * Memerlukan RBAC: resource 'stocks' atau 'warehouses', action 'read'.
 *
 * @param {string} warehouseId
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function stocksGetByWarehouse(warehouseId, sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'stocks', 'read');
    } catch (e) {
      RBAC.authorize(sessionToken, 'warehouses', 'read');
    }
    const data = StockService.getByWarehouse(warehouseId);
    return Response.success(data, 'Stok gudang berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Menyesuaikan/mengubah saldo stok secara manual untuk produk di gudang tertentu.
 * Memerlukan RBAC: resource 'stocks', action 'edit'.
 *
 * @param {Object} payload { warehouse_id, product_id, quantity }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function stocksSetBalance(payload, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'stocks', 'edit');
    if (!payload || !payload.warehouse_id || !payload.product_id) {
      throw new Error('warehouse_id dan product_id wajib disertakan.');
    }
    const result = StockService.setBalance(payload.warehouse_id, payload.product_id, payload.quantity);
    return Response.success(result, 'Saldo stok berhasil disesuaikan.');
  } catch (error) {
    return Response.error(error.message);
  }
}
