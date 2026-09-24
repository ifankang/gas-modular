/**
 * Global Configuration for the GAS Framework
 */
const Config = {
  APP_NAME: "GAS Modular CRUD",
  SPREADSHEET_ID: "1RJwguf2Smj2R7CYPojGgvz-okTal2KbDlVKj7kjp290",
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10
  },
  AUTH: {
    DEFAULT_ADMIN: {
      email: "admin@databridge.com",
      password: "admin2026123",
      name: "Super Admin",
      role: "admin"
    }
  },
  CACHE: {
    ENABLED: true,
    TTL_SECONDS: 300 // 5 minutes cache lifetime
  },
  ROLES: {
    admin: {
      name: 'Administrator',
      permissions: {
        users: ['read', 'create', 'edit', 'delete'],
        products: ['read', 'create', 'edit', 'delete'],
        orders: ['read', 'create', 'edit', 'delete', 'approve'],
        roles: ['read', 'create', 'edit', 'delete'],
        categories: ['read', 'create', 'edit', 'delete'],
        warehouses: ['read', 'create', 'edit', 'delete'],
        stocks: ['read', 'create', 'edit', 'delete'],
        transfers: ['read', 'create', 'edit', 'delete', 'approve', 'receive'],
        reports: ['read', 'export']
      }
    },
    manager: {
      name: 'Manager',
      permissions: {
        users: ['read'],
        products: ['read', 'create', 'edit', 'delete'],
        orders: ['read', 'create', 'edit', 'delete', 'approve'],
        categories: ['read', 'create', 'edit', 'delete'],
        warehouses: ['read', 'create', 'edit'],
        stocks: ['read', 'create', 'edit'],
        transfers: ['read', 'create', 'edit', 'approve', 'receive'],
        reports: ['read', 'export']
      }
    },

    staff: {
      name: 'Staff',
      permissions: {
        products: ['read', 'create', 'edit'],
        orders: ['read', 'create', 'edit'],
        categories: ['read'],
        warehouses: ['read'],
        stocks: ['read'],
        transfers: ['read', 'create'],
        reports: ['read']
      }
    },
    spg: {
      name: 'SPG / Staff Toko',
      permissions: {
        products: ['read'],
        categories: ['read'],
        warehouses: ['read'],
        stocks: ['read'],
        transfers: ['read', 'create', 'receive'],
        orders: ['read', 'create']
      }
    },
    viewer: {
      name: 'Viewer',
      permissions: {
        products: ['read'],
        categories: ['read'],
        warehouses: ['read'],
        stocks: ['read'],
        transfers: ['read']
      }
    }
  },

  RBAC: {
    ENABLED: true
  }

};
