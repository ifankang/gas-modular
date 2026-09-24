/**
 * 78_StockTransferController.gs
 * Controller global untuk dokumen Pindah Gudang dan Riwayat Mutasi Stok.
 * Mendukung otorisasi berjenjang (Approve Kirim by Admin & Terima by SPG).
 */

/**
 * Mengambil daftar dokumen transfer.
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersList(sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'transfers', 'read');
    } catch (e) {
      RBAC.authorize(sessionToken, 'stocks', 'read');
    }
    const transfers = StockTransferRepository.findAll();
    return Response.success(transfers.reverse(), 'Daftar transfer berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengambil detail satu dokumen transfer beserta daftar item barangnya.
 * @param {string} id
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersGet(id, sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'transfers', 'read');
    } catch (e) {
      RBAC.authorize(sessionToken, 'stocks', 'read');
    }
    const transfer = StockTransferRepository.findById(id);
    if (!transfer) {
      throw new Error(`Dokumen transfer ${id} tidak ditemukan.`);
    }
    const items = StockTransferRepository.getItems(id);
    return Response.success({ transfer: transfer, items: items }, 'Detail transfer berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Membuat draft dokumen transfer baru.
 * @param {Object} payload { transferData, items }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersCreate(payload, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'transfers', 'create');
    if (!payload || !payload.transferData || !payload.items) {
      throw new Error('Data transfer dan daftar barang harus disertakan.');
    }
    const result = InventoryService.createTransferDraft(payload.transferData, payload.items, session);
    return Response.success(result, 'Draft transfer stok berhasil dibuat.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Langkah 1: Approve Kirim by Admin / Manager.
 * Memotong saldo fisik di gudang asal.
 * @param {string} transferId
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersApproveSend(transferId, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'transfers', 'approve');
    const result = InventoryService.approveTransferSend(transferId, session);
    return Response.success(result, 'Pengiriman barang telah disetujui. Stok di gudang asal telah dipotong (status: In-Transit).');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Langkah 2: Terima Barang by SPG / Staff Toko di Gudang Tujuan.
 * Menambah saldo fisik di gudang tujuan.
 * @param {string} transferId
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersReceive(transferId, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'transfers', 'receive');
    const result = InventoryService.receiveTransfer(transferId, session);
    return Response.success(result, 'Barang telah berhasil diterima. Saldo stok di gudang tujuan telah bertambah.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Mengambil daftar riwayat mutasi stok.
 * @param {Object} filter { warehouse_id, product_id, type }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function mutationsList(filter, sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'stocks', 'read');
    } catch (e) {
      RBAC.authorize(sessionToken, 'transfers', 'read');
    }
    const mutations = InventoryService.getMutations(filter);
    return Response.success(mutations, 'Riwayat mutasi stok berhasil diambil.');
  } catch (error) {
    return Response.error(error.message);
  }
}
