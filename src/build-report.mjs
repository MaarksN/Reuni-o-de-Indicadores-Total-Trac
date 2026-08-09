import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'Docs');
const assets = path.join(root, 'assets');

const reportData = JSON.parse(fs.readFileSync(path.join(docs, 'vendas-2026.json'), 'utf8'));

fs.mkdirSync(assets, { recursive: true });
fs.writeFileSync(path.join(assets, 'report-data.js'), `window.TOTALTRAC_DATA = ${JSON.stringify(reportData, null, 2)};\n`, 'utf8');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Total Trac — Reunião de Indicadores: resultados comerciais de ${reportData.referenceMonth} de 2026">
  <title>Total Trac — Reunião de Indicadores · ${reportData.referenceMonth} 2026</title>
  <link rel="icon" href="assets/img/favicon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="assets/report.css">
</head>
<body>
  <a class="skip-link" href="#report">Ir para o relatório</a>
  <header class="app-header">
    <a class="brand" href="#page-01" aria-label="Total Trac — início">
      <img src="assets/img/totaltrac-logo-principal-positivo.png" alt="Total Trac" width="150" height="33">
      <span>Reunião de Indicadores</span>
    </a>
    <div class="header-actions">
      <button id="menuButton" class="icon-button" type="button" aria-expanded="false" aria-controls="reportNav">Menu</button>
      <div class="mode-switch" role="group" aria-label="Modo de visualização">
        <button type="button" data-mode="presentation" class="active">Apresentação</button>
        <button type="button" data-mode="report">Relatório completo</button>
      </div>
      <button id="printButton" class="icon-button" type="button">Imprimir / PDF</button>
    </div>
  </header>
  <nav id="reportNav" class="report-nav" aria-label="Navegação do relatório"></nav>
  <main id="report" tabindex="-1">
    <noscript>
      <div class="report-fallback">
        <div class="report-fallback-inner">
          <p class="eyebrow">Total Trac · Aviso</p>
          <h1>Não foi possível carregar o relatório</h1>
          <p>Este relatório depende de JavaScript para exibir os dados. Ative o JavaScript no navegador e recarregue a página, ou contate o responsável técnico.</p>
        </div>
      </div>
    </noscript>
  </main>
  <footer class="presentation-footer">
    <button id="prevButton" type="button">← Página anterior</button>
    <span id="pageIndicator" aria-live="polite">Página 01 de 19</span>
    <button id="nextButton" type="button">Próxima página →</button>
  </footer>
  <aside id="drawer" class="drawer" aria-hidden="true" aria-labelledby="drawerTitle">
    <div class="drawer-backdrop" data-close-drawer></div>
    <div class="drawer-panel" role="dialog" aria-modal="true">
      <button class="drawer-close" type="button" data-close-drawer aria-label="Fechar">×</button>
      <p class="eyebrow">Drill-down</p><h2 id="drawerTitle">Vendas de origem</h2><div id="drawerContent"></div>
    </div>
  </aside>
  <script src="assets/report-data.js" onerror="window.__totaltracLoadError='data'"></script>
  <script src="assets/report.js" onerror="window.__totaltracLoadError='render'"></script>
  <script>
    (function () {
      var report = document.getElementById('report');
      var ok = report && report.querySelector('.report-page');
      if (!ok) {
        if (window.console && console.error) {
          console.error('[TotalTrac] Relatório não carregou. Motivo técnico:', window.__totaltracLoadError || (window.__totaltracLastError && window.__totaltracLastError.message) || 'desconhecido');
        }
        if (report) {
          report.innerHTML = '<div class="report-fallback"><div class="report-fallback-inner">' +
            '<p class="eyebrow">Total Trac · Aviso</p>' +
            '<h1>Não foi possível carregar o relatório</h1>' +
            '<p>Recarregue a página. Se o problema continuar, contate o responsável técnico.</p>' +
            '</div></div>';
        }
      }
    })();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8');

console.log(`Relatório preparado com ${Object.values(reportData.sales).reduce((total, rows) => total + rows.length, 0)} vendas em ${Object.keys(reportData.sales).length} meses (${reportData.referenceMonth} como mês de referência).`);
