/**
 * 80_OrderRepository.gs
 * Repository untuk entitas Orders (PO / SO) dan OrderItems.
 */
const OrderRepository = {
  findAll: function() {
    return Repository.findAll(OrderSchema);
  },

  findById: function(id) {
    return Repository.findById(OrderSchema, id);
  },

  create: function(data) {
    return Repository.create(OrderSchema, data);
  },

  update: function(id, data) {
    return Repository.update(OrderSchema, id, data);
  },

  delete: function(id) {
    return Repository.delete(OrderSchema, id);
  },

  // Operasi item order
  getItems: function(orderId) {
    const all = Repository.findAll(OrderItemSchema);
    return all.filter(it => String(it.order_id) === String(orderId));
  },

  addItem: function(itemData) {
    return Repository.create(OrderItemSchema, itemData);
  }
};
