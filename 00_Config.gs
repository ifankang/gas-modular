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
        orders: ['read', 'create', 'edit', 'delete'],
        roles: ['read', 'create', 'edit', 'delete']
      }
    },
    manager: {
      name: 'Manager',
      permissions: {
        users: ['read'],
        products: ['read', 'create', 'edit', 'delete'],
        orders: ['read', 'create', 'edit', 'delete']
      }
    },
    staff: {
      name: 'Staff',
      permissions: {
        products: ['read', 'create', 'edit'],
        orders: ['read', 'create', 'edit']
      }
    },
    viewer: {
      name: 'Viewer',
      permissions: {
        products: ['read']
      }
    }
  },
  RBAC: {
    ENABLED: true
  }
};
