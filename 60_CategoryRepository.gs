/**
 * 60_CategoryRepository.gs
 * Generic CRUD repository untuk entitas Categories.
 * Mendelegasikan seluruh operasi ke 11_Repository.gs dengan CategorySchema.
 */
const CategoryRepository = {
  findAll: function() { return Repository.findAll(CategorySchema); },
  findById: function(id) { return Repository.findById(CategorySchema, id); },
  create: function(data) { return Repository.create(CategorySchema, data); },
  update: function(id, data) { return Repository.update(CategorySchema, id, data); },
  delete: function(id) { return Repository.delete(CategorySchema, id); }
};
