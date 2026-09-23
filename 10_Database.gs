/**
 * 10_Database.gs
 * Database Module (Spreadsheet operations & Automated RAM Caching)
 * Handles opening Spreadsheet, reading/writing rows, header mapping, concurrency lock,
 * and high-performance CacheService caching with automatic mutation invalidation.
 */
const Database = (function() {
  const CACHE_PREFIX = 'DB_CACHE_';

  function getCacheKey(sheetName) {
    return CACHE_PREFIX + String(sheetName).trim().toUpperCase();
  }

  function getFromCache(sheetName) {
    if (!Config.CACHE || !Config.CACHE.ENABLED) return null;
    try {
      const cache = CacheService.getScriptCache();
      const raw = cache.get(getCacheKey(sheetName));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      Logger.log("Cache get error: " + e.message);
    }
    return null;
  }

  function saveToCache(sheetName, data) {
    if (!Config.CACHE || !Config.CACHE.ENABLED) return;
    try {
      const cache = CacheService.getScriptCache();
      const str = JSON.stringify(data);
      // Google Apps Script CacheService payload limit is 100KB (100,000 bytes)
      if (str.length < 95000) {
        const ttl = Config.CACHE.TTL_SECONDS || 300;
        cache.put(getCacheKey(sheetName), str, ttl);
      }
    } catch (e) {
      Logger.log("Cache put error: " + e.message);
    }
  }

  function invalidateCache(sheetName) {
    if (!Config.CACHE || !Config.CACHE.ENABLED) return;
    try {
      const cache = CacheService.getScriptCache();
      cache.remove(getCacheKey(sheetName));
    } catch (e) {
      Logger.log("Cache invalidate error: " + e.message);
    }
  }

  function getSheet(sheetName) {
    const ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    return sheet;
  }

  function getHeaders(sheet) {
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) return [];
    return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  function mapRowToObject(row, headers) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  }

  function mapObjectToRow(obj, headers) {
    return headers.map(header => obj[header] === undefined ? "" : obj[header]);
  }

  return {
    /**
     * Retrieve all records from a sheet.
     * Uses RAM Cache when available to eliminate Spreadsheet API quotas and latency.
     */
    findAll: function(sheetName) {
      // 1. Try Cache First (Cache Hit: ~5ms)
      const cached = getFromCache(sheetName);
      if (cached !== null) {
        return cached;
      }

      // 2. Fetch from Google Spreadsheet (Cache Miss)
      const sheet = getSheet(sheetName);
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        saveToCache(sheetName, []);
        return [];
      }
      
      const headers = getHeaders(sheet);
      if (headers.length === 0) {
        saveToCache(sheetName, []);
        return [];
      }

      const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
      const values = dataRange.getValues();
      const records = values.map(row => mapRowToObject(row, headers));

      // 3. Save to RAM Cache
      saveToCache(sheetName, records);
      return records;
    },
    
    findById: function(sheetName, idField, idValue) {
      const records = this.findAll(sheetName);
      return records.find(r => r[idField] === idValue) || null;
    },

    create: function(sheetName, data) {
      const lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        const sheet = getSheet(sheetName);
        let headers = getHeaders(sheet);
        if (headers.length === 0) {
          headers = Object.keys(data);
          sheet.appendRow(headers);
        }
        const row = mapObjectToRow(data, headers);
        sheet.appendRow(row);

        // Auto-Invalidate cache on mutation
        invalidateCache(sheetName);

        return data;
      } catch (e) {
        throw new Error("Failed to create record: " + e.message);
      } finally {
        lock.releaseLock();
      }
    },

    update: function(sheetName, idField, idValue, data) {
      const lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        const sheet = getSheet(sheetName);
        const headers = getHeaders(sheet);
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) throw new Error("Record not found");
        
        const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
        const values = dataRange.getValues();
        
        const idIndex = headers.indexOf(idField);
        if (idIndex === -1) throw new Error(`ID field ${idField} not found in headers`);
        
        let rowIndex = -1;
        for (let i = 0; i < values.length; i++) {
          if (values[i][idIndex] === idValue) {
            rowIndex = i + 2; // +2 because row 1 is header and index is 0-based
            break;
          }
        }
        
        if (rowIndex === -1) throw new Error("Record not found");
        
        const existingRecord = mapRowToObject(values[rowIndex - 2], headers);
        const updatedRecord = { ...existingRecord, ...data };
        const rowData = mapObjectToRow(updatedRecord, headers);
        
        sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);

        // Auto-Invalidate cache on mutation
        invalidateCache(sheetName);

        return updatedRecord;
      } catch (e) {
        throw new Error("Failed to update record: " + e.message);
      } finally {
        lock.releaseLock();
      }
    },
    
    delete: function(sheetName, idField, idValue) {
      const lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        const sheet = getSheet(sheetName);
        const headers = getHeaders(sheet);
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return false;
        
        const idIndex = headers.indexOf(idField);
        if (idIndex === -1) throw new Error(`ID field ${idField} not found in headers`);
        const idRange = sheet.getRange(2, idIndex + 1, lastRow - 1, 1);
        const idValues = idRange.getValues();
        
        let rowIndex = -1;
        for (let i = 0; i < idValues.length; i++) {
          if (idValues[i][0] === idValue) {
            rowIndex = i + 2;
            break;
          }
        }
        
        if (rowIndex !== -1) {
          sheet.deleteRow(rowIndex);

          // Auto-Invalidate cache on mutation
          invalidateCache(sheetName);

          return true;
        }
        return false;
      } catch (e) {
        throw new Error("Failed to delete record: " + e.message);
      } finally {
        lock.releaseLock();
      }
    },

    /**
     * Helper to manually purge cache for a sheet
     */
    clearCache: function(sheetName) {
      invalidateCache(sheetName);
    }
  };
})();
