/**
 * 32_ProductController.gs
 * Handles API endpoints for Products with RBAC enforcement.
 */

/**
 * Retrieves list of all products.
 * Enforces RBAC permission: resource 'products', action 'read'.
 *
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with list of products or error message.
 */
function productsList(sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'products', 'read');
    const data = ProductService.findAll();
    return Response.success(data, "Products retrieved successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Retrieves a single product by ID.
 * Enforces RBAC permission: resource 'products', action 'read'.
 *
 * @param {string} id - Unique identifier of the product.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with product object or error message.
 */
function productsGet(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'products', 'read');
    const data = ProductService.findById(id);
    return Response.success(data, "Product retrieved successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Creates a new product.
 * Enforces RBAC permission: resource 'products', action 'create'.
 *
 * @param {Object} data - Product data payload.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with created product record or error message.
 */
function productsCreate(data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'products', 'create');
    const result = ProductService.create(data);
    return Response.success(result, "Product created successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Updates an existing product by ID.
 * Enforces RBAC permission: resource 'products', action 'edit'.
 *
 * @param {string} id - Unique identifier of the product.
 * @param {Object} data - Fields to update.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with updated product record or error message.
 */
function productsUpdate(id, data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'products', 'edit');
    const result = ProductService.update(id, data);
    return Response.success(result, "Product updated successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Deletes a product by ID.
 * Enforces RBAC permission: resource 'products', action 'delete'.
 *
 * @param {string} id - Unique identifier of the product.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response confirming deletion or error message.
 */
function productsDelete(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'products', 'delete');
    ProductService.delete(id);
    return Response.success(null, "Product deleted successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}
