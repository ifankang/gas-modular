/**
 * Entry point for the Web App.
 * Renders the Main.html template.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'seed') {
    const result = seedDatabase();
    return HtmlService.createHtmlOutput(
      `<div style="font-family:sans-serif;padding:30px;text-align:center;">
        <h2 style="color:#10b981;">✅ ${result.message}</h2>
        <p>Spreadsheet ID: <code>${Config.SPREADSHEET_ID}</code></p>
        <p><a href="?" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:white;text-decoration:none;border-radius:6px;margin-top:15px;">Buka Web App</a></p>
      </div>`
    );
  }

  // ===== TEMPORARY DIAGNOSTIC ROUTES (hapus setelah masalah selesai) =====
  if (e && e.parameter && e.parameter.action === 'debug-ping') {
    const diag = [
      'ordersList=' + typeof ordersList,
      'warehousesList=' + typeof warehousesList,
      'productsList=' + typeof productsList,
      'Response=' + typeof Response,
      'RBAC=' + typeof RBAC,
      'OrderService=' + typeof OrderService,
      'Database=' + typeof Database,
      'Repository=' + typeof Repository,
      'Config=' + typeof Config
    ].join('\n');
    return HtmlService.createHtmlOutput('<pre style="font-family:monospace;padding:16px;">' + diag + '</pre>');
  }

  if (e && e.parameter && e.parameter.action === 'debug-orders') {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = [];
    try {
      const rows = Database.findAll('Orders');
      lines.push('1) Database.findAll(Orders): OK, rows=' + rows.length);
      lines.push('   sample: ' + esc(JSON.stringify(rows[0] || null).slice(0, 400)));
    } catch (err) {
      lines.push('1) Database.findAll(Orders) FAIL: ' + esc(err.message));
      lines.push('   stack: ' + esc(String(err.stack || '').slice(0, 600)));
    }
    try {
      const data = OrderService.findAll('SALES');
      lines.push('2) OrderService.findAll(SALES): OK, rows=' + data.length);
    } catch (err) {
      lines.push('2) OrderService.findAll(SALES) FAIL: ' + esc(err.message));
      lines.push('   stack: ' + esc(String(err.stack || '').slice(0, 600)));
    }
    return HtmlService.createHtmlOutput('<pre style="font-family:monospace;padding:16px;white-space:pre-wrap;">' + lines.join('\n') + '</pre>');
  }
  // ===== END TEMPORARY DIAGNOSTIC ROUTES =====

  return HtmlService
    .createTemplateFromFile('Main')
    .evaluate()
    .setTitle('GAS Modular CRUD')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper function to include HTML parts (components, CSS, JS) into Main.html
 * Used with <?!= include('Filename'); ?> syntax
 */
function include(filename) {
  return HtmlService
    .createTemplateFromFile(filename)
    .evaluate()
    .getContent();
}
