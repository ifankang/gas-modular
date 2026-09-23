/**
 * 04_Auth.gs
 * Handles authentication business logic and server endpoints.
 * Validates credentials directly against the Users table with SHA-256 hashed passwords.
 */

const AuthService = {
  login: function(email, password) {
    if (!email || !password) {
      throw new Error("Email dan kata sandi wajib diisi");
    }

    const cleanEmail = email.trim().toLowerCase();
    const inputHash = Utils.hashPassword(password);

    // 1. Validate directly against the Users database
    let users = [];
    try {
      users = Database.findAll('Users');
    } catch (e) {
      Logger.log("Error reading Users database: " + e.message);
    }

    // Check if Roles sheet exists and has data
    let roles = [];
    try {
      roles = Database.findAll('Roles');
    } catch (e) {
      Logger.log("Error reading Roles database: " + e.message);
    }
    const hasRolesSheet = roles && roles.length > 0;

    // Auto-seed if Users sheet is empty, or demo role accounts are missing, or Roles sheet is missing
    const hasRoleAccounts = users.some(u => (u.email || '').toLowerCase() === 'viewer@example.com');
    if (!users || users.length === 0 || !hasRoleAccounts || !hasRolesSheet) {
      seedDatabase();
      users = Database.findAll('Users');
    }

    const user = users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error("Email tidak terdaftar dalam sistem");
    }

    if (user.status && user.status.toLowerCase() === 'inactive') {
      throw new Error("Akun Anda berstatus nonaktif, silakan hubungi administrator");
    }

    // Check password: match against stored SHA-256 hash (or plain text match if not yet hashed)
    const storedPassword = String(user.password || '');
    const isPasswordValid = (storedPassword === inputHash) || (storedPassword === password);

    if (!isPasswordValid) {
      throw new Error("Kata sandi yang Anda masukkan salah");
    }

    const role = user.role || (cleanEmail === 'admin@databridge.com' ? 'admin' : 'viewer');
    const userWithRole = { ...user, role: role };
    const permissions = RBAC.getEffectivePermissions(userWithRole);
    const rolesMap = RBAC.getRolesFromDatabase() || Config.ROLES;
    const token = `${user.id || 'USR-000001'}_${Utilities.getUuid()}`;

    const sessionData = {
      id: user.id || 'USR-000001',
      name: user.name || user.email,
      email: user.email,
      role: role,
      status: user.status || 'active',
      permissions: permissions,
      token: token,
      rolesMap: rolesMap
    };

    CacheService.getScriptCache().put('session_' + token, JSON.stringify(sessionData), 21600);

    return {
      id: sessionData.id,
      name: sessionData.name,
      email: sessionData.email,
      role: sessionData.role,
      permissions: sessionData.permissions,
      token: sessionData.token,
      rolesMap: sessionData.rolesMap
    };
  }
};

/**
 * Controller endpoint for frontend login call
 */
function authLogin(email, password) {
  try {
    const session = AuthService.login(email, password);
    return Response.success(session, "Login berhasil");
  } catch (error) {
    return Response.error(error.message);
  }
}
