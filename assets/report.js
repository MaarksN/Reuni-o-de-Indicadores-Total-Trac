(() => {
  'use strict';

  try {
  const data = window.TOTALTRAC_DATA;
  if (!data) throw new Error('window.TOTALTRAC_DATA ausente — assets/report-data.js não carregou.');
  const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  // Hífen não-quebrável (U+2011) no lugar do sinal de menos: por padrão o navegador trata "-" como
  // ponto de quebra de linha válido (UAX#14) e pode isolar "-" numa linha e "R$ 1.234,56" na
  // seguinte quando o card é estreito — mesmo texto, mesma largura, só não quebra mais ali.
  const brl = { format: (value) => brlFormatter.format(value).replace('-', '‑') };
  const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const one = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const sum = (items, field) => items.reduce((total, item) => total + Number(item[field] || 0), 0);
  const group = (items, field) => items.reduce((acc, item) => ((acc[item[field] || 'Não informado'] ||= []).push(item), acc), {});
  const pct = (value) => `${one.format(value)}%`;
  const variation = (current, previous) => previous ? ((current / previous) - 1) * 100 : null;
  const statusClass = (value, good = 80, warn = 55) => value >= good ? 'good' : value >= warn ? 'warn' : 'bad';
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const referenceMonth = data.referenceMonth;
  const months = data.summary2026.map((item) => item.month);
  const julho = data.sales[referenceMonth];
  const meta = data.metaMensal;
  const mrrNovo = sum(julho, 'mensalidade');
  const adesaoTotal = sum(julho, 'adesao');
  const attainment = mrrNovo / meta * 100;
  const gap = mrrNovo - meta;
  const ticketMensalidade = mrrNovo / julho.length;
  const rowsComAdesao = julho.filter((item) => item.adesao > 0);
  const ticketAdesao = rowsComAdesao.length ? adesaoTotal / rowsComAdesao.length : 0;
  const clientesNovos = julho.filter((item) => item.tipoVenda === 'Novo');
  const clientesExistentes = julho.filter((item) => item.tipoVenda === 'Cliente');
  const pctNovos = clientesNovos.length / julho.length * 100;
  const locacaoRows = julho.filter((item) => item.tipoContrato === 'Locação');
  const vendaRows = julho.filter((item) => item.tipoContrato === 'Venda');
  const pctLocacao = locacaoRows.length / julho.length * 100;

  const vendedorGroups = group(julho, 'vendedor');
  const produtoGroups = group(julho, 'produto');
  const clienteGroups = group(julho, 'cliente');

  const vendedorRows = Object.entries(vendedorGroups)
    .map(([name, items]) => [name, sum(items, 'mensalidade'), `${items.length} venda(s) · ${brl.format(sum(items, 'adesao'))} adesão`])
    .sort((a, b) => b[1] - a[1]);
  const top1Share = vendedorRows[0][1] / mrrNovo * 100;
  const top2Share = (vendedorRows[0][1] + vendedorRows[1][1]) / mrrNovo * 100;

  const produtoRows = Object.entries(produtoGroups)
    .map(([name, items]) => [name, sum(items, 'mensalidade'), `${items.length} unidade(s) · ${brl.format(sum(items, 'adesao'))} adesão`])
    .sort((a, b) => b[1] - a[1]);

  const juneSummary = data.summary2026.find((item) => item.month === 'Junho');
  const mrrGrowth = variation(mrrNovo, juneSummary.realizado);

  const historicalRows = data.summary2026.map((item) => [item.month, item.realizado, `${pct(item.realizado / item.meta * 100)} da meta`, item.realizado >= item.meta]);
  const cumulativeMeta = sum(data.summary2026, 'meta');
  const cumulativeRealizado = sum(data.summary2026, 'realizado');

  const adesaoByMonth = months.map((month) => [month, sum(data.sales[month], 'adesao')]);
  const cumulativeAdesao = sum(adesaoByMonth.map(([, value]) => ({ value })), 'value');
  const ticketMensalidadeByMonth = months.map((month) => {
    const rows = data.sales[month];
    const mens = sum(rows, 'mensalidade');
    return [month, rows.length ? mens / rows.length : 0];
  });
  const ticketAdesaoByMonth = months.map((month) => {
    const rows = data.sales[month].filter((item) => item.adesao > 0);
    return [month, rows.length ? sum(rows, 'adesao') / rows.length : 0];
  });

  const vendedoresConhecidos = new Set();
  months.forEach((month) => data.sales[month].forEach((item) => { if (item.vendedor !== 'Não informado') vendedoresConhecidos.add(item.vendedor); }));
  const vendedoresAtivosJulho = Object.keys(vendedorGroups).length;

  const metaNovosClientes = 40;
  const metaLocacao = 80;
  const metaTicket = 60;
  const health = {
    'Meta MRR': Math.min(100, attainment),
    'Novos Clientes': Math.min(100, pctNovos / metaNovosClientes * 100),
    'Recorrência (Locação)': Math.min(100, pctLocacao / metaLocacao * 100),
    'Ticket de Mensalidade': Math.min(100, ticketMensalidade / metaTicket * 100),
    'Equipe Ativa': Math.min(100, vendedoresAtivosJulho / vendedoresConhecidos.size * 100),
    'Qualidade de Dados': julho.filter((item) => item.vendedor !== 'Não informado' && item.tipoContrato !== 'Não informado' && item.tipoVenda !== 'Não informado').length / julho.length * 100,
  };
  const healthScore = Object.values(health).reduce((a, b) => a + b, 0) / Object.keys(health).length;

  const kpi = (label, value, detail = '', drill = '', tone = '') => {
    const tag = drill ? 'button' : 'div';
    return `<${tag} class="card kpi-card ${tone}" ${drill ? `type="button" data-drill="${esc(drill)}"` : ''}><span class="kpi-label">${esc(label)}</span><span class="kpi-value">${value}</span><span class="kpi-detail">${detail}</span></${tag}>`;
  };
  const sectionTitle = (title, note = '') => `<div class="section-title"><h2>${esc(title)}</h2><span>${esc(note)}</span></div>`;
  const bars = (rows, formatter = (value) => int.format(value)) => {
    const max = Math.max(...rows.map((row) => row[1]), 1);
    return `<div class="bar-list">${rows.map(([label, value, metaText = '', trend = null]) => {
      const arrow = trend === true ? '<span class="trend-up">▲</span> ' : trend === false ? '<span class="trend-down">▼</span> ' : '';
      return `<div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="--width:${Math.max(1, value / max * 100)}%"></div></div><div class="bar-value">${formatter(value)}${metaText ? `<br>${arrow}<span class="muted">${esc(metaText)}</span>` : ''}</div></div>`;
    }).join('')}</div>`;
  };
  const sparkline = (values, width = 88, height = 24) => {
    if (values.length < 2) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = width / (values.length - 1);
    const points = values.map((value, index) => `${(index * step).toFixed(1)},${(height - ((value - min) / range) * height).toFixed(1)}`).join(' ');
    return `<svg class="kpi-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };
  const insight = (label, title, evidence, impact, action) => `<article class="card insight"><span class="insight-label">${esc(label)}</span><strong>${esc(title)}</strong><dl><dt>Evidência</dt><dd>${evidence}</dd><dt>Impacto</dt><dd>${impact}</dd><dt>Ação</dt><dd>${action}</dd></dl></article>`;
  const source = (text) => `<p class="source-note">Fonte: ${esc(text)}</p>`;
  const page = (number, groupName, title, message, content, className = '') => `<section id="page-${String(number).padStart(2, '0')}" class="report-page ${className}" data-page="${number}" data-group="${esc(groupName)}"><div class="page-inner"><header class="page-heading"><div class="page-number">${String(number).padStart(2, '0')}</div><div><p class="eyebrow">${esc(groupName)} · ${esc(referenceMonth)} 2026</p><h1>${esc(title)}</h1><p class="executive-message">${message}</p></div></header>${content}</div></section>`;

  const logoPositivo = 'assets/img/totaltrac-logo-principal-positivo.png';
  const logoNegativo = 'assets/img/totaltrac-logo-principal-negativo-azul-escuro.png';
  const simbolo = 'assets/img/totaltrac-simbolo-positivo.png';

  const TOTAL_PAGES = 20;
  const pages = [];

  pages.push(`<section id="page-01" class="report-page cover-page active" data-page="1" data-group="Visão Geral"><div class="page-inner"><div class="cover-lockup"><img src="${logoNegativo}" alt="Total Trac" width="180" height="39"><span>Rastreamento e Telemetria Veicular</span></div><p class="eyebrow">Relatório Executivo Comercial · Atualizado em ${esc(data.generatedAt)}</p><div class="cover-h1-row"><span class="cover-h1-icon"><img src="${simbolo}" alt="" width="48" height="59"></span><h1>REUNIÃO DE INDICADORES<span>Resultados Comerciais — ${esc(referenceMonth)} de 2026</span></h1></div><p class="cover-subtitle">Da venda realizada à receita recorrente: performance por vendedor, produto, cliente e mix de negócio.</p><div class="cover-meta"><span class="cover-chip">${julho.length} vendas registradas</span><span class="cover-chip">${brl.format(mrrNovo)} de mensalidade nova</span><span class="cover-chip">${brl.format(adesaoTotal)} de adesão</span></div><a class="cover-cta" href="#page-03" data-go="3">Ver Executive Summary →</a></div></section>`);

  pages.push(page(2, 'Visão Geral', `${referenceMonth} em 60 Segundos`, `${referenceMonth} fechou em ${pct(attainment)} da meta de mensalidade nova (${brl.format(Math.abs(gap))} ${gap >= 0 ? 'acima' : 'abaixo'}), com ${brl.format(adesaoTotal)} adicionais em adesão.`, `<div class="grid grid-4">${kpi('Vendas registradas', int.format(julho.length), 'base integral do mês', 'julho', 'accent-card')}${kpi('Mensalidade nova (MRR)', brl.format(mrrNovo), `${gap >= 0 ? `<span class="trend-up">▲ ${pct(attainment)} da meta</span>` : `<span class="trend-down">▼ ${pct(attainment)} da meta</span>`}`, 'julho', gap >= 0 ? 'good-card' : 'warn-card')}${kpi('Meta mensal', brl.format(meta), 'planejamento 2026')}${kpi('Saldo da meta', brl.format(gap), gap >= 0 ? 'superávit no mês' : 'déficit no mês', 'julho', gap >= 0 ? 'good-card' : 'bad-card')}${kpi('Receita de adesão', brl.format(adesaoTotal), 'sem meta formal', 'julho')}${kpi('Ticket médio de mensalidade', brl.format(ticketMensalidade), 'por venda', 'julho')}${kpi('Clientes novos', int.format(clientesNovos.length), pct(pctNovos) + ' das vendas', 'julho-novo')}${kpi('Carteira existente', int.format(clientesExistentes.length), pct(100 - pctNovos) + ' das vendas', 'julho-existente')}</div>${sectionTitle('Mix do mês')}<div class="grid grid-2">${kpi('Locação (recorrente)', int.format(locacaoRows.length), pct(pctLocacao) + ' das vendas', 'julho-locacao', 'good-card')}${kpi('Venda', int.format(vendaRows.length), pct(100 - pctLocacao) + ' das vendas', 'julho-venda')}</div>${sectionTitle('Leitura de gestão')}<div class="grid grid-3">${insight('Atenção', 'Concentração em um vendedor', `${vendedorRows[0][0]} responde por ${pct(top1Share)} da mensalidade nova`, 'Risco de dependência de uma única carteira.', 'Redistribuir contas e apoiar os demais vendedores.')}${insight('Prioridade', 'Baixa aquisição de clientes novos', `${pct(pctNovos)} das vendas em clientes novos`, 'Crescimento do mês veio quase todo de upsell na carteira existente.', 'Definir meta explícita de novos logos por vendedor.')}${insight('Vitória', 'Modelo recorrente predominante', pct(pctLocacao) + ' das vendas em Locação', 'Receita recorrente é a base estratégica do negócio.', 'Manter a Locação como produto de entrada padrão.')}</div>${source('Docs/vendas-2026.json — aba Julho da planilha Vendas 2026.xlsx')}`));

  pages.push(page(3, 'Visão Geral', 'Executive Summary', `${referenceMonth} chegou perto da meta de mensalidade nova, sustentado por poucos vendedores e por upsell na carteira existente — não por aquisição de clientes novos.`, `<div class="grid grid-4">${insight('Resultado', pct(attainment) + ' da meta de MRR', `${brl.format(mrrNovo)} de mensalidade nova`, `${gap >= 0 ? 'Superávit' : 'Déficit'} de ${brl.format(Math.abs(gap))}.`, 'Usar julho como referência sem projetar automaticamente o mesmo mix.')}${insight('Crescimento', 'Comparação com junho', `${brl.format(juneSummary.realizado)} → ${brl.format(mrrNovo)}`, `Variação de ${pct(mrrGrowth)}.`, 'Acompanhar se a trajetória se sustenta em agosto.')}${insight('Concentração', 'Poucos vendedores movem o resultado', `Top 2 = ${pct(top2Share)} da mensalidade nova`, 'Alta dependência de poucas carteiras.', 'Plano de apoio para os vendedores com menor volume.')}${insight('Aquisição', 'Novos clientes são minoria', `${clientesNovos.length} de ${julho.length} vendas`, 'Crescimento futuro depende de diversificar a base.', 'Meta explícita de novos logos por vendedor em agosto.')}</div>${sectionTitle('Leitura executiva · Fato → impacto')}<div class="card card-pad"><ul><li><b>${pct(attainment)} da meta</b> → ${referenceMonth} fechou com ${gap >= 0 ? 'superávit' : 'déficit'} de ${brl.format(Math.abs(gap))} de mensalidade nova.</li><li><b>Top 1 vendedor = ${pct(top1Share)}</b> da mensalidade nova → concentração relevante em ${vendedorRows[0][0]}.</li><li><b>${pct(pctNovos)} de clientes novos</b> → a maior parte do volume veio da carteira existente.</li><li><b>${pct(pctLocacao)} em Locação</b> → o modelo recorrente domina o mix, como esperado para o negócio.</li><li><b>${brl.format(adesaoTotal)} em adesão</b> → receita de implantação não entra na meta de mensalidade, mas é relevante no caixa do mês.</li></ul></div>${source('reconciliação das vendas de julho contra o resumo 2026 da planilha')}`));

  const healthDetailRows = [
    ['Meta MRR', `${pct(attainment)} da meta de mensalidade nova`, 'Teto em 100% — superávit não soma pontos extras', `mín(100, ${one.format(attainment)}) = ${int.format(health['Meta MRR'])}`],
    ['Novos Clientes', `${pct(pctNovos)} das vendas em clientes novos`, `Meta de gestão: ${metaNovosClientes}% de vendas em clientes novos`, `mín(100, ${one.format(pctNovos)}/${metaNovosClientes}×100) = ${int.format(health['Novos Clientes'])}`],
    ['Recorrência (Locação)', `${pct(pctLocacao)} das vendas em Locação`, `Meta de gestão: ${metaLocacao}% em modelo recorrente`, `mín(100, ${one.format(pctLocacao)}/${metaLocacao}×100) = ${int.format(health['Recorrência (Locação)'])}`],
    ['Ticket de Mensalidade', `${brl.format(ticketMensalidade)} por venda`, `Meta de gestão: ${brl.format(metaTicket)} de ticket médio`, `mín(100, ${one.format(ticketMensalidade)}/${metaTicket}×100) = ${int.format(health['Ticket de Mensalidade'])}`],
    ['Equipe Ativa', `${vendedoresAtivosJulho} de ${vendedoresConhecidos.size} vendedores conhecidos venderam em ${referenceMonth}`, 'Meta de gestão: toda a equipe ativa no mês', `mín(100, ${vendedoresAtivosJulho}/${vendedoresConhecidos.size}×100) = ${int.format(health['Equipe Ativa'])}`],
    ['Qualidade de Dados', `${pct(health['Qualidade de Dados'])} das vendas com vendedor, tipo de contrato e tipo de venda preenchidos`, 'Sem normalização adicional — score = % direto', `${int.format(health['Qualidade de Dados'])}`],
  ];
  const healthDetailTable = `<div class="table-wrap"><table><thead><tr><th>Dimensão</th><th>Dado real de ${esc(referenceMonth)}</th><th>Meta de referência</th><th>Cálculo → score</th></tr></thead><tbody>${healthDetailRows.map(([name, real, target, calc]) => `<tr><td><b>${esc(name)}</b></td><td>${esc(real)}</td><td>${esc(target)}</td><td>${esc(calc)}</td></tr>`).join('')}</tbody></table></div>`;
  const scoreRows = Object.entries(health).map(([name, score]) => `<div class="health-row"><span>${esc(name)}</span><div class="progress"><span style="--progress:${score}%"></span></div><b>${int.format(score)}</b></div>`).join('');
  pages.push(page(4, 'Visão Geral', 'Total Trac Sales Health Score', `A saúde comercial de ${referenceMonth} fecha em ${int.format(healthScore)}/100: MRR e recorrência fortes, aquisição de clientes novos puxando a nota para baixo.`, `<div class="grid grid-2"><div class="card card-pad"><div class="score-ring" style="--score:${healthScore}"><strong>${int.format(healthScore)}<small>/100</small></strong></div><p class="muted" style="text-align:center">Média simples de 6 dimensões normalizadas</p></div><div class="card card-pad">${scoreRows}</div></div><details class="mt-16" open><summary>Como este score foi calculado? — por que Recorrência é alta e Novos Clientes é baixa</summary><div class="details-body"><p>Cada dimensão vale 0–100. A tabela abaixo mostra o dado real de ${esc(referenceMonth)}, a meta de referência usada para normalizar e a conta exata que gera o score de cada linha.</p>${healthDetailTable}<p class="mt-16">O score final (${int.format(healthScore)}) é a média simples das 6 linhas acima — não há peso maior para nenhuma dimensão.</p><p class="muted">Metas de normalização (${metaNovosClientes}% de clientes novos, ${metaLocacao}% de Locação, ${brl.format(metaTicket)} de ticket) são parâmetros transparentes de gestão, não dados observados nem benchmarks de mercado.</p></div></details>${source('fórmula documentada nesta página; base de vendas de ' + referenceMonth + '/2026')}`));

  pages.push(page(5, 'Resultado', `Meta x Realizado — ${referenceMonth}`, `A mensalidade nova ${gap >= 0 ? 'superou' : 'ficou abaixo d'}a meta em ${brl.format(Math.abs(gap))}; a adesão do mês não entra nesta conta.`, `<div class="grid grid-4">${kpi('Meta', brl.format(meta), 'planejamento 2026')}${kpi('Realizado (mensalidade nova)', brl.format(mrrNovo), 'soma de mensalidade das vendas', 'julho', gap >= 0 ? 'good-card' : 'warn-card')}${kpi('Atingimento', pct(attainment), 'teto visual em 100%', 'julho')}${kpi('Vendas no mês', int.format(julho.length), 'base oficial', 'julho')}</div>${sectionTitle('Progresso da meta')}<div class="card card-pad"><div class="progress"><span style="--progress:${attainment}%"></span></div><div class="grid grid-3 mt-16">${kpi('Meta', brl.format(meta), '100%')}${kpi('Realizado', brl.format(mrrNovo), pct(attainment))}${kpi('Saldo', brl.format(gap), gap >= 0 ? 'superávit' : 'déficit')}</div></div>${sectionTitle('Quem sustentou o resultado')}<div class="card card-pad">${bars(vendedorRows, brl.format.bind(brl))}</div>${source('Docs/vendas-2026.json — mensalidade das vendas de ' + referenceMonth)}`));

  pages.push(page(6, 'Resultado', 'Histórico 2026', `${referenceMonth} recoloca o acumulado em ${pct(cumulativeRealizado / cumulativeMeta * 100)} da meta, com trajetória volátil ao longo do primeiro semestre.`, `<div class="grid grid-4">${kpi('Meta acumulada', brl.format(cumulativeMeta), `${months[0]}–${referenceMonth.toLowerCase()}`)}${kpi('Realizado acumulado', brl.format(cumulativeRealizado), 'mensalidade nova, soma mensal')}${kpi('Atingimento acumulado', pct(cumulativeRealizado / cumulativeMeta * 100), `${months[0]}–${referenceMonth.toLowerCase()}${sparkline(data.summary2026.map((item) => item.realizado / item.meta * 100))}`)}${kpi('Gap acumulado', brl.format(cumulativeRealizado - cumulativeMeta), `${months[0]}–${referenceMonth.toLowerCase()}`)}</div>${sectionTitle('Evolução mensal')}<div class="card card-pad">${bars(historicalRows, brl.format.bind(brl))}</div><div class="card card-pad mt-16"><p><b>Como ${referenceMonth.toLowerCase()} altera a trajetória:</b> depois do piso de fevereiro e abril, ${referenceMonth.toLowerCase()} é o terceiro melhor mês do semestre, mas ainda não supera o pico de junho. A meta mensal é constante (${brl.format(meta)}); toda a variação vem do volume e do mix de vendas.</p></div>${source('aba 2026 da planilha Vendas 2026.xlsx; Março tem diferença de R$ 0,70 entre o somatório detalhado e o resumo por arredondamento da planilha')}`));

  pages.push(page(7, 'Resultado', 'Receita de Adesão (Implantação)', `A adesão somou ${brl.format(adesaoTotal)} em ${referenceMonth.toLowerCase()} — ${brl.format(ticketAdesao)} de ticket médio entre as vendas que cobraram adesão. Não há meta formal para esta receita.`, `<div class="grid grid-4">${kpi('Adesão em ' + referenceMonth, brl.format(adesaoTotal), `${rowsComAdesao.length} de ${julho.length} vendas com adesão cobrada`, 'julho')}${kpi('Ticket médio de adesão', brl.format(ticketAdesao), 'entre vendas com adesão cobrada')}${kpi('Vendas sem adesão', int.format(julho.length - rowsComAdesao.length), 'adesão zerada no fechamento', 'julho')}${kpi('Adesão acumulada 2026', brl.format(cumulativeAdesao), `${months[0]}–${referenceMonth.toLowerCase()}`)}</div>${sectionTitle('Evolução mensal da adesão')}<div class="card card-pad">${bars(adesaoByMonth, brl.format.bind(brl))}</div><div class="card card-pad mt-16"><p class="muted">A adesão não é somada à meta de mensalidade porque representa receita de implantação (não recorrente), não crescimento de MRR. Uma meta formal de adesão pode ser definida em conjunto com a gestão, caso seja útil para o acompanhamento.</p></div>${source('Docs/vendas-2026.json — campo adesao de cada venda, ' + months[0] + '–' + referenceMonth)}`));

  const vendedorCards = vendedorRows.map(([name]) => {
    const items = vendedorGroups[name];
    const novos = items.filter((item) => item.tipoVenda === 'Novo').length;
    return `<article class="card card-pad"><h3>${esc(name)}</h3><p><b>${items.length}</b> vendas · <b>${brl.format(sum(items, 'mensalidade'))}</b> mensalidade · <b>${brl.format(sum(items, 'adesao'))}</b> adesão</p><p>${novos} cliente(s) novo(s) · ${pct(novos / items.length * 100)} de aquisição</p></article>`;
  }).join('');
  pages.push(page(8, 'Vendas', 'Performance por Vendedor', `${Object.keys(vendedorGroups).length} vendedores registraram vendas em ${referenceMonth.toLowerCase()}; ${vendedoresConhecidos.size - vendedoresAtivosJulho} da equipe conhecida ficou sem vendas no mês.`, `<div class="grid grid-3">${vendedorCards}</div>${source('vendedor de cada venda em ' + referenceMonth + '/2026')}`));

  pages.push(page(9, 'Vendas', 'Ranking de Vendedores', `Os dois primeiros vendedores somam ${pct(top2Share)} da mensalidade nova; a concentração é relevante e deve ser gerida como risco de carteira, não como julgamento individual.`, `<div class="grid grid-4">${kpi('Top 1', pct(top1Share), `${vendedorRows[0][0]} · ${brl.format(vendedorRows[0][1])}`, `vendedor:${vendedorRows[0][0]}`)}${kpi('Top 2 acumulado', pct(top2Share), brl.format(vendedorRows[0][1] + vendedorRows[1][1]))}${kpi('Vendedores com mensalidade', int.format(vendedorRows.length), referenceMonth)}${kpi('Vendedores sem vendas no mês', int.format(vendedoresConhecidos.size - vendedoresAtivosJulho), 'da equipe conhecida em 2026')}</div>${sectionTitle('Ranking de mensalidade nova')}<div class="card card-pad">${bars(vendedorRows, brl.format.bind(brl))}</div>${source('vendedor de cada venda em ' + referenceMonth + '/2026')}`));

  const vendedorPrintAll = vendedorRows.map(([name]) => {
    const items = vendedorGroups[name];
    const novos = items.filter((item) => item.tipoVenda === 'Novo').length;
    return `<div class="card card-pad vendedor-print-card"><h3>${esc(name)}</h3><div class="grid grid-4">${kpi('Vendas', items.length, 'carteira do mês')}${kpi('Mensalidade', brl.format(sum(items, 'mensalidade')), 'mensalidade nova')}${kpi('Adesão', brl.format(sum(items, 'adesao')), 'receita de implantação')}${kpi('Clientes novos', novos, pct(novos / items.length * 100))}</div></div>`;
  }).join('');
  pages.push(page(10, 'Vendas', 'Vendedor Detalhe', 'Selecione um vendedor para comparar volume, mensalidade, adesão e aquisição de clientes novos sem reduzir performance a um único número.', `<div class="filters"><label>Vendedor<select id="vendedorSelect">${vendedorRows.map(([name]) => `<option>${esc(name)}</option>`).join('')}</select></label></div><div id="vendedorDynamic" aria-live="polite"></div><div class="vendedor-print-all">${vendedorPrintAll}</div>${source('carteira de vendas por vendedor em ' + referenceMonth + '/2026')}`));

  pages.push(page(11, 'Produtos', 'Mix de Produtos', `${produtoRows[0][0]} lidera a mensalidade nova do mês, com ${produtoGroups[produtoRows[0][0]].length} unidade(s) vendidas.`, `<div class="grid grid-4">${kpi('Produto líder', brl.format(produtoRows[0][1]), esc(produtoRows[0][0]), `produto:${produtoRows[0][0]}`)}${kpi('Produtos vendidos', int.format(Object.keys(produtoGroups).length), 'variações distintas no mês')}${kpi('Unidades no mês', int.format(julho.length), 'todas as vendas')}${kpi('Ticket médio por unidade', brl.format(ticketMensalidade), 'mensalidade / unidades')}</div>${sectionTitle('Mensalidade por produto')}<div class="card card-pad">${bars(produtoRows, brl.format.bind(brl))}</div>${source('campo produto de cada venda de ' + referenceMonth)}`));

  const locacaoMensalidade = sum(locacaoRows, 'mensalidade');
  const vendaMensalidade = sum(vendaRows, 'mensalidade');
  const locacaoAdesao = sum(locacaoRows, 'adesao');
  const vendaAdesao = sum(vendaRows, 'adesao');
  pages.push(page(12, 'Produtos', 'Locação × Venda', `Locação domina o volume (${pct(pctLocacao)} das vendas), mas a Venda concentra ${pct(vendaAdesao / adesaoTotal * 100)} da receita de adesão do mês por causa de um único cliente com implantação de grande porte.`, `<div class="grid grid-2">${kpi('Locação', int.format(locacaoRows.length), `${brl.format(locacaoMensalidade)} mensalidade · ${brl.format(locacaoAdesao)} adesão`, 'julho-locacao', 'good-card')}${kpi('Venda', int.format(vendaRows.length), `${brl.format(vendaMensalidade)} mensalidade · ${brl.format(vendaAdesao)} adesão`, 'julho-venda')}</div>${sectionTitle('Comparativo de mensalidade')}<div class="card card-pad">${bars([['Locação', locacaoMensalidade], ['Venda', vendaMensalidade]], brl.format.bind(brl))}</div><div class="card card-pad mt-16"><p class="muted">Contratos do tipo "Venda" nesta base também carregam mensalidade — não são necessariamente pagamento único; o campo distingue a natureza comercial do fechamento, não a existência de recorrência.</p></div>${source('campo tipoContrato de cada venda de ' + referenceMonth)}`));

  function renderSalesCards() {
    const vendedor = document.getElementById('salesVendedorFilter').value;
    const produto = document.getElementById('salesProdutoFilter').value;
    const tipo = document.getElementById('salesTipoFilter').value;
    const order = document.getElementById('salesSort').value;
    let items = julho.filter((item) => (!vendedor || item.vendedor === vendedor) && (!produto || item.produto === produto) && (!tipo || item.tipoContrato === tipo));
    items = [...items].sort((a, b) => order === 'mensalidade-asc' ? a.mensalidade - b.mensalidade : order === 'adesao-desc' ? b.adesao - a.adesao : b.mensalidade - a.mensalidade);
    const status = document.getElementById('salesResultStatus');
    const container = document.getElementById('salesCards');
    if (!items.length) {
      status.textContent = 'Nenhuma venda encontrada para os filtros selecionados.';
      container.innerHTML = '<div class="empty-state"><p>Nenhuma venda encontrada para os filtros selecionados.</p><button type="button" class="icon-button" id="resetSalesFilters">Limpar filtros</button></div>';
      document.getElementById('resetSalesFilters').addEventListener('click', () => {
        document.getElementById('salesVendedorFilter').value = '';
        document.getElementById('salesProdutoFilter').value = '';
        document.getElementById('salesTipoFilter').value = '';
        renderSalesCards();
      });
      return;
    }
    status.textContent = `${items.length} venda(s) encontrada(s).`;
    container.innerHTML = `<div class="company-grid">${items.map((item) => `<div class="company-card"><strong>${esc(item.cliente)}</strong><span>${brl.format(item.mensalidade)} mensalidade · ${brl.format(item.adesao)} adesão</span><span>${esc(item.produto)} · ${esc(item.tipoContrato)} · ${esc(item.vendedor)} · ${esc(item.tipoVenda)}</span></div>`).join('')}</div>`;
  }
  pages.push(page(13, 'Produtos', `Todas as Vendas de ${referenceMonth}`, `${julho.length} vendas individuais compõem o mês; filtre por vendedor, produto ou tipo de contrato para auditar qualquer combinação.`, `<div class="filters"><label>Vendedor<select id="salesVendedorFilter"><option value="">Todos</option>${Object.keys(vendedorGroups).sort().map((name) => `<option>${esc(name)}</option>`).join('')}</select></label><label>Produto<select id="salesProdutoFilter"><option value="">Todos</option>${Object.keys(produtoGroups).sort().map((name) => `<option>${esc(name)}</option>`).join('')}</select></label><label>Tipo de contrato<select id="salesTipoFilter"><option value="">Todos</option><option>Locação</option><option>Venda</option></select></label><label>Ordenação<select id="salesSort"><option value="mensalidade-desc">Maior mensalidade</option><option value="mensalidade-asc">Menor mensalidade</option><option value="adesao-desc">Maior adesão</option></select></label></div><p id="salesResultStatus" class="filter-status" aria-live="polite"></p><div id="salesCards"></div>${source('Docs/vendas-2026.json — todas as linhas de ' + referenceMonth)}`));

  const clienteRows = Object.entries(clienteGroups).map(([name, items]) => ({
    name, count: items.length, mensalidade: sum(items, 'mensalidade'), adesao: sum(items, 'adesao'), total: sum(items, 'mensalidade') + sum(items, 'adesao'), novo: items.some((item) => item.tipoVenda === 'Novo'),
  })).sort((a, b) => b.total - a.total);
  pages.push(page(14, 'Clientes', 'Novos Clientes × Carteira Existente', `${clientesNovos.length} vendas de ${referenceMonth.toLowerCase()} foram para clientes novos (${pct(pctNovos)}); o restante veio de upsell na carteira já ativa.`, `<div class="grid grid-4">${kpi('Clientes novos', int.format(clientesNovos.length), pct(pctNovos) + ' das vendas', 'julho-novo', 'accent-card')}${kpi('Carteira existente', int.format(clientesExistentes.length), pct(100 - pctNovos) + ' das vendas', 'julho-existente')}${kpi('Mensalidade em clientes novos', brl.format(sum(clientesNovos, 'mensalidade')), pct(sum(clientesNovos, 'mensalidade') / mrrNovo * 100) + ' da mensalidade nova', 'julho-novo')}${kpi('Mensalidade em carteira existente', brl.format(sum(clientesExistentes, 'mensalidade')), pct(sum(clientesExistentes, 'mensalidade') / mrrNovo * 100) + ' da mensalidade nova', 'julho-existente')}</div>${sectionTitle('Comparativo do mês')}<div class="card card-pad">${bars([['Clientes novos', clientesNovos.length], ['Carteira existente', clientesExistentes.length]])}</div>${sectionTitle('Clientes novos de ' + referenceMonth)}<div class="company-grid">${clienteRows.filter((row) => row.novo).map((row) => `<div class="company-card"><strong>${esc(row.name)}</strong><span>${brl.format(row.total)} total · ${row.count} venda(s)</span></div>`).join('') || '<p class="muted">Nenhum cliente novo identificado no mês.</p>'}</div>${source('campo tipoVenda de cada venda de ' + referenceMonth)}`));

  pages.push(page(15, 'Clientes', 'Maiores Clientes do Mês', `${clienteRows[0].name} lidera com ${brl.format(clienteRows[0].total)} entre mensalidade e adesão, somando ${clienteRows[0].count} venda(s) individuais.`, `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Vendas</th><th>Mensalidade</th><th>Adesão</th><th>Total</th><th>Tipo</th></tr></thead><tbody>${clienteRows.slice(0, 10).map((row) => `<tr><td>${esc(row.name)}</td><td class="numeric">${row.count}</td><td class="numeric">${brl.format(row.mensalidade)}</td><td class="numeric">${brl.format(row.adesao)}</td><td class="numeric">${brl.format(row.total)}</td><td><span class="badge ${row.novo ? 'good' : ''}">${row.novo ? 'Novo' : 'Carteira'}</span></td></tr>`).join('')}</tbody></table></div>${source('agrupamento por cliente das vendas de ' + referenceMonth)}`));

  const qualityByField = { vendedor: 0, tipoContrato: 0, tipoVenda: 0 };
  let totalRowsAllMonths = 0;
  months.forEach((month) => data.sales[month].forEach((item) => {
    totalRowsAllMonths += 1;
    if (item.vendedor === 'Não informado') qualityByField.vendedor += 1;
    if (item.tipoContrato === 'Não informado') qualityByField.tipoContrato += 1;
    if (item.tipoVenda === 'Não informado') qualityByField.tipoVenda += 1;
  }));
  pages.push(page(16, 'Clientes', 'Qualidade dos Dados', `Em ${referenceMonth.toLowerCase()}, 100% das vendas têm vendedor, tipo de contrato e tipo de venda preenchidos; olhando o ano completo (${months[0]}–${referenceMonth.toLowerCase()}), ${qualityByField.vendedor + qualityByField.tipoContrato + qualityByField.tipoVenda} campos ficaram em branco em ${totalRowsAllMonths} linhas.`, `<div class="grid grid-3">${kpi('Vendedor ausente', int.format(qualityByField.vendedor), `de ${totalRowsAllMonths} linhas · ${months[0]}–${referenceMonth.toLowerCase()}`, '', qualityByField.vendedor ? 'warn-card' : 'good-card')}${kpi('Tipo de contrato ausente', int.format(qualityByField.tipoContrato), `de ${totalRowsAllMonths} linhas`, '', qualityByField.tipoContrato ? 'warn-card' : 'good-card')}${kpi('Tipo de venda ausente', int.format(qualityByField.tipoVenda), `de ${totalRowsAllMonths} linhas`, '', qualityByField.tipoVenda ? 'warn-card' : 'good-card')}</div><div class="card card-pad mt-16"><h3>Nomenclatura de produto</h3><p>A base de ${months[0]}–${referenceMonth.toLowerCase()} tem 66 variações de nome de produto para uma linha muito menor de produtos reais (ex.: "Total Auto 4G", "TOTAL AUTO 4G COM BLOQUEIO REMOTO E BUZZER DE VELOCIDADE" e "Total Auto 4g com bloqueio" provavelmente descrevem o mesmo produto com grafias diferentes). Nenhuma consolidação foi aplicada nesta versão do relatório para não inventar uma taxonomia sem confirmação do time comercial.</p></div>${source('varredura de vendedor/tipoContrato/tipoVenda em todas as linhas de ' + months[0] + ' a ' + referenceMonth)}`));

  const receitaConsolidadaJulho = mrrNovo + adesaoTotal;
  const receitaConsolidadaJunho = juneSummary.realizado + sum(data.sales.Junho, 'adesao');
  const comparisonRows = [
    ['Mensalidade nova', brl.format(juneSummary.realizado), brl.format(mrrNovo), pct(mrrGrowth)],
    ['Adesão', brl.format(sum(data.sales.Junho, 'adesao')), brl.format(adesaoTotal), pct(variation(adesaoTotal, sum(data.sales.Junho, 'adesao')))],
    ['Receita consolidada', brl.format(receitaConsolidadaJunho), brl.format(receitaConsolidadaJulho), pct(variation(receitaConsolidadaJulho, receitaConsolidadaJunho))],
    ['Vendas no mês', String(data.sales.Junho.length), String(julho.length), `${julho.length - data.sales.Junho.length >= 0 ? '+' : ''}${julho.length - data.sales.Junho.length}`],
    ['Ticket médio de mensalidade', brl.format(juneSummary.realizado / data.sales.Junho.length), brl.format(ticketMensalidade), pct(variation(ticketMensalidade, juneSummary.realizado / data.sales.Junho.length))],
  ];
  pages.push(page(17, 'Financeiro', 'Receita Consolidada', `Somando mensalidade nova e adesão, ${referenceMonth.toLowerCase()} soma ${brl.format(receitaConsolidadaJulho)} — variação de ${pct(variation(receitaConsolidadaJulho, receitaConsolidadaJunho))} contra junho.`, `<div class="table-wrap"><table><thead><tr><th>Indicador</th><th>Junho</th><th>${esc(referenceMonth)}</th><th>Variação</th></tr></thead><tbody>${comparisonRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="grid grid-2 mt-16">${kpi('Receita consolidada', brl.format(receitaConsolidadaJulho), 'mensalidade nova + adesão', 'julho', 'accent-card')}${kpi('Mix do mês', `${pct(mrrNovo / receitaConsolidadaJulho * 100)} / ${pct(adesaoTotal / receitaConsolidadaJulho * 100)}`, 'mensalidade / adesão')}</div>${source('mensalidade e adesão de cada venda, junho e ' + referenceMonth)}`));

  pages.push(page(18, 'Financeiro', 'Ticket Médio', `O ticket médio de mensalidade fechou em ${brl.format(ticketMensalidade)} em ${referenceMonth.toLowerCase()}; o de adesão, entre as vendas que a cobraram, em ${brl.format(ticketAdesao)}.`, `<div class="grid grid-2">${kpi('Ticket médio de mensalidade', brl.format(ticketMensalidade), referenceMonth, 'julho')}${kpi('Ticket médio de adesão', brl.format(ticketAdesao), 'entre vendas com adesão cobrada', 'julho')}</div>${sectionTitle('Ticket médio de mensalidade por mês')}<div class="card card-pad">${bars(ticketMensalidadeByMonth, brl.format.bind(brl))}</div>${sectionTitle('Ticket médio de adesão por mês')}<div class="card card-pad">${bars(ticketAdesaoByMonth, brl.format.bind(brl))}</div>${source('mensalidade e adesão de cada venda, ' + months[0] + '–' + referenceMonth)}`));

  pages.push(page(19, 'Gestão', 'Insights Executivos', 'Os dados sustentam seis leituras acionáveis; nenhum card foi preenchido apenas para ocupar espaço.', `<div class="grid grid-3">${insight('Resultado', pct(attainment) + ' da meta de MRR', brl.format(mrrNovo) + ' de mensalidade nova', `${gap >= 0 ? 'Gera superávit' : 'Gera déficit'} de ${brl.format(Math.abs(gap))}.`, 'Recalibrar a meta de agosto com base na trajetória real do semestre.')}${insight('Concentração', vendedorRows[0][0] + ' domina a carteira', pct(top1Share) + ' da mensalidade nova', 'Risco relevante se a carteira desse vendedor sofrer qualquer perda.', 'Redistribuir contas e formalizar backup de carteira.')}${insight('Aquisição', 'Novos clientes ficam abaixo da meta de gestão', pct(pctNovos) + ' das vendas (meta: ' + metaNovosClientes + '%)', 'Crescimento depende quase todo de upsell.', 'Meta explícita de novos logos por vendedor em agosto.')}${insight('Modelo de negócio', 'Locação confirma a tese recorrente', pct(pctLocacao) + ' das vendas', 'Receita recorrente sustenta previsibilidade de caixa.', 'Manter Locação como produto de entrada padrão na abordagem comercial.')}${insight('Equipe', `${vendedoresConhecidos.size - vendedoresAtivosJulho} vendedor(es) sem vendas no mês`, `${vendedoresAtivosJulho} de ${vendedoresConhecidos.size} ativos`, 'Capacidade comercial ociosa.', 'Checar pipeline e agenda dos vendedores inativos no mês.')}${insight('Dados', 'Nomenclatura de produto precisa de padronização', '66 variações de nome em ' + months[0] + '–' + referenceMonth.toLowerCase(), 'Mix de produto fica difícil de consolidar com precisão.', 'Criar catálogo de produto padronizado junto ao time comercial.')}</div>${source('insights derivados diretamente dos indicadores documentados nas páginas anteriores')}`));

  const actions = [
    ['P0', 'Comercial', 'Concentração em ' + vendedorRows[0][0], 'Plano de redistribuição de carteira e backup formal', 'Gestão Comercial', '30 dias', 'Top 1 / mensalidade nova', 'Em aberto'],
    ['P0', 'Comercial', 'Baixa aquisição de clientes novos', 'Definir meta explícita de novos logos por vendedor', 'Gestão Comercial', '15 dias', '% de vendas em clientes novos', 'Em aberto'],
    ['P1', 'Equipe', `${vendedoresConhecidos.size - vendedoresAtivosJulho} vendedor(es) sem vendas no mês`, 'Checar pipeline e agenda dos vendedores inativos', 'Gestão Comercial', '7 dias', 'Vendedores ativos / total', 'Em aberto'],
    ['P1', 'Dados', 'Nomenclatura de produto inconsistente', 'Criar catálogo de produto padronizado', 'RevOps + Comercial', '30 dias', 'Nº de variações de nome', 'Em aberto'],
    ['P2', 'Financeiro', 'Adesão sem meta formal', 'Avaliar definição de meta de adesão junto à gestão', 'Financeiro + Comercial', '30 dias', 'Adesão realizada / meta', 'Em aberto'],
  ];
  pages.push(page(20, 'Gestão', 'Plano de Ação: Prioridades para Agosto', 'As prioridades convertem os gargalos comprovados em responsáveis, prazos e indicadores mensuráveis.', `<div class="table-wrap"><table><thead><tr><th>Prioridade</th><th>Área</th><th>Problema</th><th>Ação</th><th>Responsável sugerido</th><th>Prazo</th><th>KPI</th><th>Status</th></tr></thead><tbody>${actions.map((row) => `<tr>${row.map((cell, index) => `<td>${index === 0 ? `<span class="badge ${cell === 'P0' ? 'bad' : cell === 'P1' ? 'warn' : 'good'}">${cell}</span>` : esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${sectionTitle('O que queremos ver diferente em agosto?')}<div class="card card-pad mt-16"><p>Aquisição de clientes novos ≥ ${metaNovosClientes}% das vendas; toda a equipe conhecida com pelo menos uma venda no mês; catálogo de produto padronizado; meta de adesão definida junto à gestão.</p></div>${source('prioridades derivadas dos indicadores comprovados nas páginas anteriores')}`));

  const report = document.getElementById('report');
  report.innerHTML = pages.join('');
  const sections = [...document.querySelectorAll('.report-page')];
  let currentPage = 1;

  const navGroups = {
    '01 Visão Geral': [1, 2, 3, 4], '02 Resultado': [5, 6, 7], '03 Vendas': [8, 9, 10],
    '04 Produtos': [11, 12, 13], '05 Clientes': [14, 15, 16], '06 Financeiro': [17, 18], '07 Gestão': [19, 20],
  };
  const titleByPage = Object.fromEntries(sections.map((section) => [Number(section.dataset.page), section.querySelector('h1')?.textContent || 'Capa Executiva']));
  document.getElementById('reportNav').innerHTML = Object.entries(navGroups).map(([name, numbers]) => `<div class="nav-group"><button type="button">${name}</button><div class="nav-list">${numbers.map((number) => `<a href="#page-${String(number).padStart(2, '0')}" data-go="${number}">${String(number).padStart(2, '0')} · ${esc(titleByPage[number])}</a>`).join('')}</div></div>`).join('');

  function setPage(number, scroll = true) {
    currentPage = Math.max(1, Math.min(TOTAL_PAGES, Number(number)));
    sections.forEach((section) => section.classList.toggle('active', Number(section.dataset.page) === currentPage));
    document.getElementById('pageIndicator').textContent = `Página ${String(currentPage).padStart(2, '0')} de ${TOTAL_PAGES}`;
    document.querySelectorAll('[data-go]').forEach((link) => link.setAttribute('aria-current', Number(link.dataset.go) === currentPage ? 'page' : 'false'));
    if (scroll) document.getElementById(`page-${String(currentPage).padStart(2, '0')}`).scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#page-${String(currentPage).padStart(2, '0')}`);
  }
  function setMode(mode) {
    document.body.classList.toggle('mode-presentation', mode === 'presentation');
    document.body.classList.toggle('mode-report', mode === 'report');
    document.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
    if (mode === 'presentation') setPage(currentPage, false);
    localStorage.setItem('totaltrac-report-mode', mode);
  }
  document.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]'); if (go) { event.preventDefault(); setPage(go.dataset.go); document.getElementById('reportNav').classList.remove('open'); }
    const mode = event.target.closest('[data-mode]'); if (mode) setMode(mode.dataset.mode);
  });
  document.getElementById('prevButton').addEventListener('click', () => setPage(currentPage - 1));
  document.getElementById('nextButton').addEventListener('click', () => setPage(currentPage + 1));
  document.getElementById('printButton').addEventListener('click', () => window.print());
  document.getElementById('menuButton').addEventListener('click', (event) => { const nav = document.getElementById('reportNav'); nav.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', nav.classList.contains('open')); });
  document.addEventListener('keydown', (event) => {
    if (document.getElementById('drawer').getAttribute('aria-hidden') === 'false') return; // teclado pertence ao modal aberto
    if (document.body.classList.contains('mode-presentation') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { if (event.key === 'ArrowRight') setPage(currentPage + 1); if (event.key === 'ArrowLeft') setPage(currentPage - 1); }
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => { if (document.body.classList.contains('mode-report')) { const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (best) { currentPage = Number(best.target.dataset.page); document.getElementById('pageIndicator').textContent = `Página ${String(currentPage).padStart(2, '0')} de ${TOTAL_PAGES}`; } } }, { threshold: [.35, .65] });
    sections.forEach((section) => observer.observe(section));
  }

  const drawer = document.getElementById('drawer'); const drawerContent = document.getElementById('drawerContent');
  const supportsInert = 'inert' in HTMLElement.prototype;
  const inertSiblings = () => [document.querySelector('.app-header'), document.getElementById('reportNav'), document.getElementById('report'), document.querySelector('.presentation-footer')].filter(Boolean);
  // Mesma degradação do mesmo mecanismo, não um segundo sistema de modal: com `inert` nativo,
  // usa-o (bloqueia mouse/teclado/leitor de tela de uma vez). Sem `inert`, o backdrop e o
  // focus-trap já cobrem mouse e Tab; só falta o cursor virtual de leitor de tela, coberto aqui
  // com aria-hidden. O valor anterior de aria-hidden de cada elemento é lembrado (WeakMap) e
  // restaurado exatamente ao fechar — nunca fica residual, nunca sobrescreve sem restaurar.
  const prevAriaHidden = new WeakMap();
  function setBackgroundInert(on) {
    inertSiblings().forEach((el) => {
      if (supportsInert) { el.inert = on; return; }
      if (on) {
        prevAriaHidden.set(el, el.getAttribute('aria-hidden'));
        el.setAttribute('aria-hidden', 'true');
      } else {
        const prev = prevAriaHidden.get(el);
        if (prev === null || prev === undefined) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', prev);
        prevAriaHidden.delete(el);
      }
    });
  }
  let lastFocusedBeforeDrawer = null;
  function resolveDrill(spec) {
    const [type, ...rest] = spec.split(':'); const filter = rest.join(':');
    if (type === 'julho') return julho;
    if (type === 'julho-novo') return clientesNovos;
    if (type === 'julho-existente') return clientesExistentes;
    if (type === 'julho-locacao') return locacaoRows;
    if (type === 'julho-venda') return vendaRows;
    if (type === 'vendedor') return julho.filter((item) => item.vendedor === filter);
    if (type === 'produto') return julho.filter((item) => item.produto === filter);
    if (type === 'cliente') return julho.filter((item) => item.cliente === filter);
    return [];
  }
  function focusableInDrawer() {
    return [...drawer.querySelectorAll('a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
  }
  function openDrawer(spec, trigger) {
    const items = resolveDrill(spec);
    document.getElementById('drawerTitle').textContent = `Vendas de origem · ${items.length}`;
    drawerContent.innerHTML = items.length ? items.map((item) => `<div class="drawer-record"><strong>${esc(item.cliente)}</strong><span>${esc(item.produto)} · ${esc(item.tipoContrato)} · ${esc(item.vendedor)}</span><span>Mensalidade ${brl.format(item.mensalidade)} · Adesão ${brl.format(item.adesao)} · ${esc(item.tipoVenda)}</span></div>`).join('') : '<p>Nenhum registro na fonte selecionada.</p>';
    lastFocusedBeforeDrawer = trigger || document.activeElement;
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setBackgroundInert(true);
    drawer.querySelector('.drawer-close').focus();
  }
  function closeDrawer() {
    if (drawer.getAttribute('aria-hidden') === 'true') return;
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setBackgroundInert(false);
    if (lastFocusedBeforeDrawer && document.contains(lastFocusedBeforeDrawer)) lastFocusedBeforeDrawer.focus();
    lastFocusedBeforeDrawer = null;
  }
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-drill]'); if (trigger) openDrawer(trigger.dataset.drill, trigger);
    if (event.target.closest('[data-close-drawer]')) closeDrawer();
  });
  document.addEventListener('keydown', (event) => {
    if (drawer.getAttribute('aria-hidden') !== 'false') return;
    if (event.key === 'Escape') { closeDrawer(); return; }
    if (event.key === 'Tab') {
      const focusables = focusableInDrawer(); if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  ['salesVendedorFilter', 'salesProdutoFilter', 'salesTipoFilter', 'salesSort'].forEach((id) => document.getElementById(id).addEventListener('change', renderSalesCards)); renderSalesCards();

  function renderVendedor() {
    const name = document.getElementById('vendedorSelect').value;
    const items = vendedorGroups[name];
    const novos = items.filter((item) => item.tipoVenda === 'Novo').length;
    document.getElementById('vendedorDynamic').innerHTML = `<div class="grid grid-4">${kpi('Vendas', items.length, 'carteira do mês', `vendedor:${name}`)}${kpi('Mensalidade', brl.format(sum(items, 'mensalidade')), pct(sum(items, 'mensalidade') / mrrNovo * 100) + ' da mensalidade nova', `vendedor:${name}`)}${kpi('Adesão', brl.format(sum(items, 'adesao')), 'receita de implantação', `vendedor:${name}`)}${kpi('Clientes novos', novos, pct(novos / items.length * 100), `vendedor:${name}`)}</div><div class="card card-pad mt-16"><b>Benchmark do vendedor</b><p>Ticket médio de mensalidade ${brl.format(sum(items, 'mensalidade') / items.length)} vs. média da equipe ${brl.format(ticketMensalidade)}.</p></div>`;
  }
  document.getElementById('vendedorSelect').addEventListener('change', renderVendedor); renderVendedor();

  const hashPage = Number((location.hash.match(/page-(\d+)/) || [])[1]); if (hashPage) setPage(hashPage, false);
  setMode(localStorage.getItem('totaltrac-report-mode') || 'presentation');
  } catch (error) {
    // Falha crítica de renderização: registra o detalhe técnico no console para diagnóstico.
    // O bootstrap inline no HTML detecta #report vazio e mostra a mensagem ao usuário final.
    console.error('[TotalTrac] Falha ao montar o relatório:', error);
    window.__totaltracLastError = error;
  }
})();
