/**
 * 21_UserService.gs
 * Handles business logic for Users.
 * Automatically hashes passwords on create/update and sanitizes outputs.
 */
const UserService = {
  findAll: function() {
    const users = UserRepository.findAll();
    return users.map(u => {
      const copy = { ...u };
      delete copy.password;
      return copy;
    });
  },

  findById: function(id) {
    const user = UserRepository.findById(id);
    if (!user) {
      throw new Error("User not found");
    }
    const copy = { ...user };
    delete copy.password;
    return copy;
  },

  create: function(data) {
    if (!data.name || !data.email) {
      throw new Error("Nama dan email wajib diisi");
    }

    // Default role on create: data.role || 'staff'
    data.role = data.role || 'staff';

    // Preserve permissions if provided
    if (data.permissions && typeof data.permissions === 'object') {
      data.permissions = JSON.stringify(data.permissions);
    } else if (data.permissions === undefined) {
      data.permissions = '';
    }

    // Encrypt password or provide default
    const plainPassword = (data.password && data.password.trim() !== '') 
      ? data.password.trim() 
      : 'admin2026123';
    data.password = Utils.hashPassword(plainPassword);

    const result = UserRepository.create(data);
    const copy = { ...result };
    delete copy.password;
    return copy;
  },

  update: function(id, data) {
    const existingUser = UserRepository.findById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Preserve role and permissions if provided
    if (data.role === undefined && existingUser.role) {
      data.role = existingUser.role;
    }

    if (data.permissions !== undefined && typeof data.permissions === 'object' && data.permissions !== null) {
      data.permissions = JSON.stringify(data.permissions);
    } else if (data.permissions === undefined && existingUser.permissions) {
      data.permissions = existingUser.permissions;
    }

    if (data.password && data.password.trim() !== '') {
      data.password = Utils.hashPassword(data.password.trim());
    } else {
      // Do not overwrite existing password if left empty
      delete data.password;
    }

    const result = UserRepository.update(id, data);
    const copy = { ...result };
    delete copy.password;
    return copy;
  },

  delete: function(id) {
    const existingUser = UserRepository.findById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    return UserRepository.delete(id);
  }
};
