/**
 * 51_RoleService.gs
 * Business logic and data operations for Roles & Permissions entity.
 */

const RoleService = {
  findAll: function() {
    return Repository.findAll(RoleSchema);
  },
  findById: function(id) {
    const role = Repository.findById(RoleSchema, id);
    if (!role) throw new Error("Peran tidak ditemukan");
    return role;
  },
  create: function(data) {
    if (!data.role || !data.name) throw new Error("ID Peran dan Nama Peran wajib diisi");
    data.role = data.role.trim().toLowerCase();
    const existing = Repository.findById(RoleSchema, data.role);
    if (existing) throw new Error(`ID Peran '${data.role}' sudah ada`);
    return Repository.create(RoleSchema, data);
  },
  update: function(id, data) {
    const existing = Repository.findById(RoleSchema, id);
    if (!existing) throw new Error("Peran tidak ditemukan");
    return Repository.update(RoleSchema, id, data);
  },
  delete: function(id) {
    if (id === 'admin') throw new Error("Peran 'admin' adalah peran sistem utama dan tidak boleh dihapus");
    const existing = Repository.findById(RoleSchema, id);
    if (!existing) throw new Error("Peran tidak ditemukan");
    return Repository.delete(RoleSchema, id);
  }
};
