/**
 * 70_WarehouseRepository.gs
 * Generic CRUD repository untuk entitas Warehouses.
 * Mendelegasikan seluruh operasi ke 11_Repository.gs dengan WarehouseSchema.
 */
const WarehouseRepository = {
  findAll: function() { return Repository.findAll(WarehouseSchema); },
  findById: function(id) { return Repository.findById(WarehouseSchema, id); },
  create: function(data) { return Repository.create(WarehouseSchema, data); },
  update: function(id, data) { return Repository.update(WarehouseSchema, id, data); },
  delete: function(id) { return Repository.delete(WarehouseSchema, id); }
};
