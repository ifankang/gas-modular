/**
 * 20_UserRepository.gs
 * Uses generic Repository and UserSchema.
 */
const UserRepository = {
  findAll: function() {
    return Repository.findAll(UserSchema);
  },

  findById: function(id) {
    return Repository.findById(UserSchema, id);
  },

  create: function(data) {
    return Repository.create(UserSchema, data);
  },

  update: function(id, data) {
    return Repository.update(UserSchema, id, data);
  },

  delete: function(id) {
    return Repository.delete(UserSchema, id);
  }
};
