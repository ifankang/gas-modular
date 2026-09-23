/**
 * 31_ProductService.gs
 * Handles business logic for Products.
 */
const ProductService = {
  findAll: function() {
    return ProductRepository.findAll();
  },

  findById: function(id) {
    const product = ProductRepository.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  },

  create: function(data) {
    if (!data.name || typeof data.price !== 'number' || typeof data.stock !== 'number') {
      throw new Error("Invalid product data");
    }
    return ProductRepository.create(data);
  },

  update: function(id, data) {
    const existingProduct = this.findById(id);
    if (!existingProduct) {
      throw new Error("Product not found");
    }
    return ProductRepository.update(id, data);
  },

  delete: function(id) {
    const existingProduct = this.findById(id);
    if (!existingProduct) {
      throw new Error("Product not found");
    }
    return ProductRepository.delete(id);
  }
};
