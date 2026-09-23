/**
 * Utilities for the Framework
 */
const Utils = {
  /**
   * Generates an ID based on a prefix and a number
   * e.g., generateId('USR', 1) => 'USR-000001'
   */
  generateId: function(prefix, sequenceNumber, padding = 6) {
    const numStr = sequenceNumber.toString().padStart(padding, '0');
    return `${prefix}-${numStr}`;
  },

  /**
   * Gets current timestamp in ISO format
   */
  getTimestamp: function() {
    return new Date().toISOString();
  },

  /**
   * Hashes a password string with SHA-256
   */
  hashPassword: function(password) {
    if (!password) return '';
    const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
    let hashStr = '';
    for (let i = 0; i < rawHash.length; i++) {
      let byteVal = rawHash[i];
      if (byteVal < 0) byteVal += 256;
      let byteHex = byteVal.toString(16);
      if (byteHex.length === 1) byteHex = '0' + byteHex;
      hashStr += byteHex;
    }
    return hashStr;
  }
};
