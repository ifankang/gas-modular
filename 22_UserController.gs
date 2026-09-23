/**
 * 22_UserController.gs
 * Handles API endpoints for Users with RBAC enforcement.
 */

/**
 * Retrieves list of all users.
 * Enforces RBAC permission: resource 'users', action 'read'.
 *
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with list of users or error message.
 */
function usersList(sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'users', 'read');
    const data = UserService.findAll();
    return Response.success(data, "Users retrieved successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Retrieves a single user by ID.
 * Enforces RBAC permission: resource 'users', action 'read'.
 *
 * @param {string} id - Unique identifier of the user.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with user object or error message.
 */
function usersGet(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'users', 'read');
    const data = UserService.findById(id);
    return Response.success(data, "User retrieved successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Creates a new user.
 * Enforces RBAC permission: resource 'users', action 'create'.
 *
 * @param {Object} data - User data payload.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with created user record or error message.
 */
function usersCreate(data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'users', 'create');
    const result = UserService.create(data);
    return Response.success(result, "User created successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Updates an existing user by ID.
 * Enforces RBAC permission: resource 'users', action 'edit'.
 *
 * @param {string} id - Unique identifier of the user.
 * @param {Object} data - Fields to update.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with updated user record or error message.
 */
function usersUpdate(id, data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'users', 'edit');
    const result = UserService.update(id, data);
    return Response.success(result, "User updated successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Deletes a user by ID.
 * Enforces RBAC permission: resource 'users', action 'delete'.
 *
 * @param {string} id - Unique identifier of the user.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response confirming deletion or error message.
 */
function usersDelete(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'users', 'delete');
    UserService.delete(id);
    return Response.success(null, "User deleted successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}
