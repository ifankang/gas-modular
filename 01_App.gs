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
