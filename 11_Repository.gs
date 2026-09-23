/**
 * 11_Repository.gs
 * Generic Repository for CRUD operations.
 */
const Repository = {
  findAll: function(schema) {
    return Database.findAll(schema.sheet);
  },

  findById: function(schema, id) {
    return Database.findById(schema.sheet, schema.idField || 'id', id);
  },

  create: function(schema, data) {
    const now = new Date().toISOString();
    data.created_at = now;
    data.updated_at = now;
    
    const idField = schema.idField || 'id';
    if (!data[idField] && schema.idPrefix) {
       const existing = Database.findAll(schema.sheet);
       let seq = 1;
       if (existing.length > 0) {
         // Find max sequence number from existing IDs
         const maxSeq = existing.reduce((max, row) => {
           const idStr = row[idField] || '';
           const parts = idStr.split('-');
           if (parts.length === 2) {
             const num = parseInt(parts[1], 10);
             if (!isNaN(num) && num > max) return num;
           }
           return max;
         }, 0);
         seq = maxSeq + 1;
       }
       data[idField] = Utils.generateId(schema.idPrefix, seq); 
    }
    
    return Database.create(schema.sheet, data);
  },

  update: function(schema, id, data) {
    const now = new Date().toISOString();
    data.updated_at = now;
    // Do not overwrite created_at
    
    const idField = schema.idField || 'id';
    return Database.update(schema.sheet, idField, id, data);
  },

  delete: function(schema, id) {
    const idField = schema.idField || 'id';
    return Database.delete(schema.sheet, idField, id);
  }
};
