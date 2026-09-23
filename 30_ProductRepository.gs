/**
 * 30_ProductRepository.gs
 * Uses generic Repository and ProductSchema.
 */
const ProductRepository = {
  findAll: function() {
    return Repository.findAll(ProductSchema);
  },

  findById: function(id) {
    return Repository.findById(ProductSchema, id);
  },

  create: function(data) {
    return Repository.create(ProductSchema, data);
  },

  update: function(id, data) {
    return Repository.update(ProductSchema, id, data);
  },

  delete: function(id) {
    return Repository.delete(ProductSchema, id);
  }
};
