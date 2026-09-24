/**
 * 76_StockTransferRepository.gs
 * Repository untuk data Pindah Gudang (StockTransfers) dan Daftar Barang (TransferItems).
 */
const StockTransferRepository = {
  findAll: function() {
    return Repository.findAll(StockTransferSchema);
  },

  findById: function(id) {
    return Repository.findById(StockTransferSchema, id);
  },

  create: function(data) {
    return Repository.create(StockTransferSchema, data);
  },

  update: function(id, data) {
    return Repository.update(StockTransferSchema, id, data);
  },

  delete: function(id) {
    return Repository.delete(StockTransferSchema, id);
  },

  // Operasi item transfer
  getItems: function(transferId) {
    const all = Repository.findAll(TransferItemSchema);
    return all.filter(it => String(it.transfer_id) === String(transferId));
  },

  addItem: function(transferId, productId, quantity) {
    return Repository.create(TransferItemSchema, {
      transfer_id: transferId,
      product_id: productId,
      quantity: Number(quantity)
    });
  }
};
