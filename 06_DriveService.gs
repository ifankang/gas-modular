/**
 * 06_DriveService.gs
 * Service untuk mengelola unggahan bukti foto ke Google Drive secara terstruktur.
 * Mengambil parent folder tempat Google Spreadsheet berada secara dinamis.
 */

const DriveService = {
  /**
   * Menemukan atau membuat sub-folder di Google Drive berdasarkan kategori transaksi.
   * Root folder attachments berada di parent folder yang sama dengan Spreadsheet utama.
   *
   * @param {string} category 'Penjualan' | 'Penerimaan_Barang' | 'Pengiriman_Barang'
   * @returns {Folder} Folder Google Drive target
   */
  getOrCreateFolder: function(category) {
    category = category || 'Umum';

    // 1. Ambil parent folder tempat Spreadsheet utama tersimpan
    let parentFolder;
    try {
      const ssFile = DriveApp.getFileById(Config.SPREADSHEET_ID);
      const parents = ssFile.getParents();
      if (parents.hasNext()) {
        parentFolder = parents.next();
      } else {
        parentFolder = DriveApp.getRootFolder();
      }
    } catch (e) {
      Logger.log("Failed to get spreadsheet parent folder: " + e.message);
      parentFolder = DriveApp.getRootFolder();
    }

    // 2. Cari atau buat folder induk 'DataBridge_Attachments'
    let rootAttachmentsFolder;
    const rootSearch = parentFolder.getFoldersByName('DataBridge_Attachments');
    if (rootSearch.hasNext()) {
      rootAttachmentsFolder = rootSearch.next();
    } else {
      rootAttachmentsFolder = parentFolder.createFolder('DataBridge_Attachments');
      try {
        rootAttachmentsFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("Folder setSharing warning: " + e.message);
      }
    }

    // 3. Cari atau buat sub-folder kategori transaksi
    let categoryFolder;
    const catSearch = rootAttachmentsFolder.getFoldersByName(category);
    if (catSearch.hasNext()) {
      categoryFolder = catSearch.next();
    } else {
      categoryFolder = rootAttachmentsFolder.createFolder(category);
      try {
        categoryFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("SubFolder setSharing warning: " + e.message);
      }
    }

    return categoryFolder;
  },

  /**
   * Menyimpan gambar dari data Base64 ke Google Drive.
   *
   * @param {string} base64Data Data URL (misal: "data:image/jpeg;base64,...") atau raw base64 string
   * @param {string} filename Nama file yang diinginkan
   * @param {string} category Kategori folder ('Penjualan', 'Penerimaan_Barang', dll)
   * @returns {Object} { id, name, url, downloadUrl }
   */
  uploadBase64Image: function(base64Data, filename, category) {
    if (!base64Data) {
      throw new Error("Data gambar tidak ditemukan.");
    }

    // Parse mime type & base64 content
    let mimeType = 'image/jpeg';
    let rawBase64 = base64Data;

    if (base64Data.indexOf(';base64,') > -1) {
      const parts = base64Data.split(';base64,');
      const prefix = parts[0];
      rawBase64 = parts[1];
      if (prefix.indexOf(':') > -1) {
        mimeType = prefix.split(':')[1];
      }
    }

    const decodedBytes = Utilities.base64Decode(rawBase64);
    const cleanFilename = (filename || ('FOTO_' + Date.now())).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFilename = cleanFilename.toLowerCase().endsWith('.jpg') || cleanFilename.toLowerCase().endsWith('.jpeg') || cleanFilename.toLowerCase().endsWith('.png') 
      ? cleanFilename 
      : cleanFilename + '.jpg';

    const blob = Utilities.newBlob(decodedBytes, mimeType, finalFilename);
    const folder = this.getOrCreateFolder(category);
    const file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log("File setSharing warning: " + e.message);
    }

    // URL Google Drive untuk preview langsung
    const fileId = file.getId();
    // Format preview Google Drive yang kompatibel dengan browser
    const viewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return {
      id: fileId,
      name: file.getName(),
      url: viewUrl,
      directUrl: file.getUrl(),
      size: file.getSize()
    };
  }
};

/**
 * Global Controller Endpoint untuk upload foto via API.html
 * @param {Object} payload { base64Data, filename, category }
 * @param {string} sessionToken
 * @returns {Object} Response JSON
 */
function driveUploadPhoto(payload, sessionToken) {
  try {
    if (!payload || !payload.base64Data) {
      throw new Error("Data foto wajib disertakan.");
    }
    const result = DriveService.uploadBase64Image(
      payload.base64Data,
      payload.filename || ('PHOTO_' + Date.now()),
      payload.category || 'Umum'
    );
    return Response.success(result, "Foto berhasil diunggah ke Google Drive.");
  } catch (err) {
    Logger.log("driveUploadPhoto error: " + err.message);
    return Response.error(err.message);
  }
}
