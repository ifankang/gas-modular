/**
 * 52_RoleController.gs
 * Handles API endpoints for Roles & Permissions with RBAC enforcement.
 */

/**
 * Retrieves list of all roles.
 * Enforces RBAC permission: resource 'roles', action 'read'.
 *
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with list of roles or error message.
 */
function rolesList(sessionToken) {
  try {
    try {
      RBAC.authorize(sessionToken, 'roles', 'read');
    } catch (authErr) {
      // Allow if the user has access to read, create, or edit users
      const session = RBAC.getUserSession(sessionToken);
      const perms = RBAC.getEffectivePermissions(session);
      const userPerms = perms.users || [];
      const hasUserAccess = perms['*'] || userPerms.includes('*') || userPerms.includes('read') || userPerms.includes('create') || userPerms.includes('edit');
      if (!hasUserAccess) {
        throw authErr;
      }
    }
    const data = RoleService.findAll();
    return Response.success(data, "Roles retrieved successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Retrieves a single role by ID.
 * Enforces RBAC permission: resource 'roles', action 'read'.
 *
 * @param {string} id - Role identifier.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with role object or error message.
 */
function rolesGet(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'roles', 'read');
    const data = RoleService.findById(id);
    return Response.success(data, "Role retrieved successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Creates a new role.
 * Enforces RBAC permission: resource 'roles', action 'create'.
 *
 * @param {Object} data - Role data payload.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with created role record or error message.
 */
function rolesCreate(data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'roles', 'create');
    const result = RoleService.create(data);
    return Response.success(result, "Role created successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Updates an existing role by ID.
 * Enforces RBAC permission: resource 'roles', action 'edit'.
 *
 * @param {string} id - Role identifier.
 * @param {Object} data - Fields to update.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response with updated role record or error message.
 */
function rolesUpdate(id, data, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'roles', 'edit');
    const result = RoleService.update(id, data);
    return Response.success(result, "Role updated successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Deletes a role by ID.
 * Enforces RBAC permission: resource 'roles', action 'delete'.
 *
 * @param {string} id - Role identifier.
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response confirming deletion or error message.
 */
function rolesDelete(id, sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'roles', 'delete');
    RoleService.delete(id);
    return Response.success(null, "Role deleted successfully");
  } catch (error) {
    return Response.error(error.message);
  }
}

/**
 * Seeds or re-initializes the Roles sheet in the spreadsheet.
 * Enforces RBAC permission: resource 'roles', action 'create'.
 *
 * @param {string} sessionToken - Active user session token.
 * @returns {Object} Standard response confirming seeding.
 */
function rolesSeed(sessionToken) {
  try {
    RBAC.authorize(sessionToken, 'roles', 'create');
    const result = seedDatabase();
    return Response.success(result, "Tabel Roles dan database berhasil diinisialisasi");
  } catch (error) {
    return Response.error(error.message);
  }
}
