/**
 * 05_RBAC.gs
 * Role-Based Access Control (RBAC) Module for the GAS Framework.
 * Manages user sessions, permission resolution, and resource action authorization.
 */

const RBAC = {
  /**
   * Retrieves active session by token.
   * Checks CacheService first; on cache miss, falls back to Users database.
   *
   * @param {string} token
   * @returns {Object} session object
   */
  getUserSession: function(token) {
    if (!token) {
      throw new Error("Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.");
    }

    // 1. Check cache first
    try {
      const cache = CacheService.getScriptCache();
      const raw = cache.get('session_' + token);
      if (raw) {
        const session = JSON.parse(raw);
        if (session.status && String(session.status).toLowerCase() === 'inactive') {
          throw new Error("Akun Anda berstatus nonaktif.");
        }
        return session;
      }
    } catch (e) {
      if (e.message && e.message.includes("Akun Anda berstatus nonaktif")) {
        throw e;
      }
      Logger.log("Cache get session error: " + e.message);
    }

    // 2. Cache miss: Lookup user in Database.findAll('Users')
    let users = [];
    try {
      users = Database.findAll('Users');
    } catch (e) {
      Logger.log("Database findAll Users error: " + e.message);
    }

    let matchedUser = null;
    if (users && users.length > 0) {
      // Check direct token match
      matchedUser = users.find(u => u.token === token);

      // If token format is USR-xxx:uuid or USR-xxx_uuid, extract user ID
      if (!matchedUser) {
        const parts = String(token).split(/[:_]/);
        const potentialId = parts[0];
        if (potentialId && potentialId.startsWith('USR-')) {
          matchedUser = users.find(u => u.id === potentialId);
        }
      }
    }

    if (!matchedUser) {
      throw new Error("Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.");
    }

    if (matchedUser.status && String(matchedUser.status).toLowerCase() === 'inactive') {
      throw new Error("Akun Anda berstatus nonaktif.");
    }

    // Construct session from matched user
    const cleanEmail = (matchedUser.email || '').trim().toLowerCase();
    const role = matchedUser.role || (cleanEmail === 'admin@databridge.com' ? 'admin' : 'viewer');
    const userWithRole = { ...matchedUser, role: role };
    const permissions = this.getEffectivePermissions(userWithRole);
    const rolesMap = this.getRolesFromDatabase() || Config.ROLES;

    const sessionData = {
      id: matchedUser.id || 'USR-000001',
      name: matchedUser.name || matchedUser.email,
      email: matchedUser.email,
      role: role,
      status: matchedUser.status || 'active',
      permissions: permissions,
      token: token,
      rolesMap: rolesMap
    };

    // Re-cache session in CacheService (6 hours = 21600 seconds)
    try {
      CacheService.getScriptCache().put('session_' + token, JSON.stringify(sessionData), 21600);
    } catch (e) {
      Logger.log("Failed to cache session: " + e.message);
    }

    return sessionData;
  },

  /**
   * Retrieves dynamic roles definition from the Roles spreadsheet.
   * Parses action lists (users, products, orders) for each role into array form:
   * { roleKey: { name: row.name, description: row.description, permissions: { users: [...], products: [...], orders: [...] } } }
   *
   * @returns {Object|null} Roles dictionary map or null if empty/unavailable
   */
  getRolesFromDatabase: function() {
    try {
      const rows = Database.findAll('Roles');
      if (!rows || rows.length === 0) return null;

      const rolesMap = {};
      const parseActions = function(val) {
        if (!val || val === 'none') return [];
        if (Array.isArray(val)) return val;
        return String(val)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      };

      rows.forEach(row => {
        if (!row.role) return;
        const roleKey = String(row.role).trim().toLowerCase();
        const permissions = {};
        const userActions = parseActions(row.users);
        if (userActions.length > 0) permissions.users = userActions;

        const productActions = parseActions(row.products);
        if (productActions.length > 0) permissions.products = productActions;

        const orderActions = parseActions(row.orders);
        if (orderActions.length > 0) permissions.orders = orderActions;

        const categoryActions = parseActions(row.categories);
        if (categoryActions.length > 0) permissions.categories = categoryActions;

        const warehouseActions = parseActions(row.warehouses);
        if (warehouseActions.length > 0) permissions.warehouses = warehouseActions;

        const stockActions = parseActions(row.stocks);
        if (stockActions.length > 0) permissions.stocks = stockActions;


        if (row.roles !== undefined) {
          const roleActions = parseActions(row.roles);
          if (roleActions.length > 0) permissions.roles = roleActions;
        } else if (roleKey === 'admin') {
          permissions.roles = ['read', 'create', 'edit', 'delete'];
        }

        rolesMap[roleKey] = {
          name: row.name || roleKey,
          description: row.description || '',
          permissions: permissions
        };
      });

      return Object.keys(rolesMap).length > 0 ? rolesMap : null;
    } catch (e) {
      Logger.log("RBAC getRolesFromDatabase error: " + e.message);
      return null;
    }
  },

  /**
   * Resolves effective permissions for a user.
   * Wildcards are returned for admin. Custom permissions override default role matrix.
   *
   * @param {Object} user
   * @returns {Object} permissions matrix map
   */
  getEffectivePermissions: function(user) {
    if (!user) return {};

    const cleanEmail = (user.email || '').trim().toLowerCase();
    if (user.role === 'admin' || cleanEmail === 'admin@databridge.com') {
      return {
        '*': ['*'],
        users: ['*'],
        products: ['*'],
        orders: ['*'],
        roles: ['*'],
        categories: ['*'],
        warehouses: ['*'],
        stocks: ['*']
      };
    }

    // Check if user has custom permissions
    if (user.permissions) {
      if (typeof user.permissions === 'object') {
        return user.permissions;
      }
      if (typeof user.permissions === 'string' && user.permissions.trim() !== '') {
        try {
          const parsed = JSON.parse(user.permissions);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
          }
        } catch (e) {
          Logger.log("Failed to parse custom permissions JSON: " + e.message);
        }
      }
    }

    // Check dynamic roles from database
    const dbRoles = this.getRolesFromDatabase();
    if (dbRoles && user.role && dbRoles[user.role] && dbRoles[user.role].permissions) {
      return dbRoles[user.role].permissions;
    }

    // Fallback to role definition in Config.ROLES
    if (Config.ROLES && user.role && Config.ROLES[user.role] && Config.ROLES[user.role].permissions) {
      return Config.ROLES[user.role].permissions;
    }

    return {};
  },

  /**
   * Authorizes a request action on a resource given a session token.
   *
   * @param {string} token
   * @param {string} resource (e.g. 'users', 'products', 'orders')
   * @param {string} action (e.g. 'read', 'create', 'edit', 'delete')
   * @returns {Object|boolean} session object if allowed, true if RBAC disabled
   */
  authorize: function(token, resource, action) {
    if (!Config.RBAC || !Config.RBAC.ENABLED) {
      return true;
    }

    const session = this.getUserSession(token);
    const perms = this.getEffectivePermissions(session);

    const isWildcardAllowed = perms['*'] && (perms['*'].includes('*') || perms['*'].includes(action));
    const isResourceAllowed = perms[resource] && (perms[resource].includes('*') || perms[resource].includes(action));

    if (isWildcardAllowed || isResourceAllowed) {
      return session;
    }

    throw new Error(`Akses ditolak: Peran Anda (${session.role || 'user'}) tidak memiliki izin untuk ${action} pada ${resource}.`);
  }
};
