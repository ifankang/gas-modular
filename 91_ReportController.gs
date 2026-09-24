/**
 * 91_ReportController.gs
 * Controller Endpoints untuk Sistem Laporan Bisnis Komprehensif.
 * Dilindungi oleh otorisasi RBAC (role: 'reports', action: 'read').
 */

/**
 * Endpoint laporan kartu stok (stock card ledger).
 * @param {Object} params { from_date, to_date, warehouse_id, product_id }
 * @param {string} sessionToken
 * @returns {Object} Response JSON
 */
function reportsStockCard(params, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'reports', 'read');
    const result = ReportService.getStockCardReport(params);
    return Response.success(result, 'Laporan kartu stok berhasil dimuat.');
  } catch (err) {
    return Response.error(err.message);
  }
}

/**
 * Endpoint laporan valuasi aset inventaris.
 * @param {Object} params { warehouse_id, category_id }
 * @param {string} sessionToken
 * @returns {Object} Response JSON
 */
function reportsStockValuation(params, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'reports', 'read');
    const result = ReportService.getStockValuationReport(params);
    return Response.success(result, 'Laporan valuasi aset berhasil dimuat.');
  } catch (err) {
    return Response.error(err.message);
  }
}

/**
 * Endpoint laporan pembelian (Purchase Orders).
 * @param {Object} params { from_date, to_date, status, warehouse_id, supplier }
 * @param {string} sessionToken
 * @returns {Object} Response JSON
 */
function reportsPurchases(params, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'reports', 'read');
    const result = ReportService.getPurchaseReport(params);
    return Response.success(result, 'Laporan pembelian berhasil dimuat.');
  } catch (err) {
    return Response.error(err.message);
  }
}

/**
 * Endpoint laporan penjualan (Sales Orders).
 * @param {Object} params { from_date, to_date, status, warehouse_id, customer }
 * @param {string} sessionToken
 * @returns {Object} Response JSON
 */
function reportsSales(params, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'reports', 'read');
    const result = ReportService.getSalesReport(params);
    return Response.success(result, 'Laporan penjualan berhasil dimuat.');
  } catch (err) {
    return Response.error(err.message);
  }
}

/**
 * Endpoint laporan transfer antar-gudang (Stock Transfers).
 * @param {Object} params { from_date, to_date, status, source_warehouse_id, destination_warehouse_id }
 * @param {string} sessionToken
 * @returns {Object} Response JSON
 */
function reportsTransfers(params, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'reports', 'read');
    const result = ReportService.getTransferReport(params);
    return Response.success(result, 'Laporan pindah gudang berhasil dimuat.');
  } catch (err) {
    return Response.error(err.message);
  }
}

/**
 * Endpoint ringkasan eksekutif (Dashboard KPI).
 * @param {string} sessionToken
 * @returns {Object} Response JSON
 */
function reportsSummary(sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'reports', 'read');
    const result = ReportService.getExecutiveSummary();
    return Response.success(result, 'Ringkasan eksekutif berhasil dimuat.');
  } catch (err) {
    return Response.error(err.message);
  }
}
