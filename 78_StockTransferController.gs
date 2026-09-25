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
 * Langkah 2: Review & Approve by Admin / Store Manager.
 * @param {string} transferId
 * @param {Object} payload { admin_notes, items: [{ id, approved_qty, notes }] }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersReviewApprove(transferId, payload, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'transfers', 'approve');
    const result = InventoryService.reviewApproveTransfer(transferId, payload, session);
    return Response.success(result, 'Permintaan barang telah disetujui. Menunggu penyiapan fisik oleh Picker/Gudang.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Langkah 3: Kemas & Kirim by Picker / Gudang.
 * Memotong saldo fisik di gudang asal.
 * @param {string} transferId
 * @param {Object} payload { picker_notes, items: [{ id, shipped_qty, notes }] }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersDispatchShip(transferId, payload, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'transfers', 'approve');
    const result = InventoryService.dispatchShippedTransfer(transferId, payload, session);
    return Response.success(result, 'Barang telah dikemas dan dikirim. Stok gudang asal telah dipotong (status: Shipped / In-Transit).');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Langkah 4: Cek Fisik & Konfirmasi Terima by SPG Toko.
 * Menambah saldo fisik di gudang/toko tujuan.
 * @param {string} transferId
 * @param {Object} payload { receiver_notes, attachment_url, items: [{ id, received_qty, notes }] }
 * @param {string} sessionToken
 * @returns {Object} Response standar
 */
function transfersConfirmReceive(transferId, payload, sessionToken) {
  try {
    const session = RBAC.authorize(sessionToken, 'transfers', 'receive');
    const result = InventoryService.confirmReceiveTransfer(transferId, payload, session);
    return Response.success(result, 'Barang telah diverifikasi dan diterima. Saldo stok toko telah bertambah.');
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Endpoint kompatibilitas lama
 */
function transfersApproveSend(transferId, sessionToken) {
  return transfersDispatchShip(transferId, {}, sessionToken);
}

function transfersReceive(transferId, sessionToken) {
  return transfersConfirmReceive(transferId, {}, sessionToken);
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
