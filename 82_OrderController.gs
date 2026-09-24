/**
 * 82_OrderController.gs
 * Controller global untuk Purchase Order (PO) & Sales Order (SO).
 * Dapat dipanggil via google.script.run dan API.call adapter.
 */

/**
 * Mengambil daftar seluruh order (dapat difilter berdasarkan tipe 'PURCHASE' atau 'SALES').
 * @param {string} type
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function ordersList(type, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'orders', 'read');
    const data = OrderService.findAll(type);
    return Response.success(data, 'Daftar pesanan berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengambil detail satu order dan seluruh rincian item barangnya.
 * @param {string} id
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function ordersGet(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'orders', 'read');
    const data = OrderService.findById(id);
    return Response.success(data, 'Detail pesanan berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Membuat draft pengadaan Purchase Order (PO).
 * @param {Object} payload { orderData, items }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function ordersCreatePurchase(payload, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'orders', 'create');
    if (!payload || !payload.orderData || !payload.items) {
      throw new Error('Data PO dan daftar barang harus disertakan.');
    }
    const result = OrderService.createPurchaseDraft(payload.orderData, payload.items, session);
    return Response.success(result, 'Draft Purchase Order berhasil dibuat.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Menyetujui Purchase Order (Approve PO by Admin).
 * @param {string} id
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function ordersApprovePurchase(id, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'orders', 'approve');
    const result = OrderService.approvePurchase(id, session);
    return Response.success(result, 'Purchase Order telah disetujui (Approved).');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Menandai barang Purchase Order telah dikirim oleh pemasok (Shipped).
 * @param {string} id
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function ordersShipPurchase(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'orders', 'edit');
    const result = OrderService.shipPurchase(id);
    return Response.success(result, 'Status Purchase Order diubah menjadi Shipped (Barang Dikirim).');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengonfirmasi penerimaan barang Purchase Order di gudang tujuan (Received -> Stok Masuk).
 * @param {string} id
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function ordersReceivePurchase(id, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'orders', 'edit');
    const result = OrderService.receivePurchase(id, session);
    return Response.success(result, 'Barang PO telah diterima. Saldo stok di gudang tujuan telah bertambah.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Membuat transaksi penjualan Sales Order (SO -> Validasi & Potong Stok).
 * @param {Object} payload { orderData, items }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function ordersCreateSales(payload, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'orders', 'create');
    if (!payload || !payload.orderData || !payload.items) {
      throw new Error('Data penjualan dan daftar barang harus disertakan.');
    }
    const result = OrderService.createSalesOrder(payload.orderData, payload.items, session);
    return Response.success(result, 'Transaksi penjualan berhasil diselesaikan. Stok barang telah dipotong.');
  } catch (error) {
    return Response.error(error.message);
  }
}
