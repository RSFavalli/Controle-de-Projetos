/**
 * trator-export.js
 * ------------------------------------------------------------------
 * Exportar PDF e Compartilhar em HTML do Dashboard Trator Autônomo.
 * Mesmo padrão dos outros painéis (modal com período e seções; PDF pela
 * impressão do navegador, sempre em modo claro; HTML = arquivo único e
 * autocontido), com a escolha do idioma do relatório: Português (Brasil) ou
 * English. Em inglês, títulos, legendas, achados, datas e números seguem o
 * idioma, os nomes de causas e implementos vêm do "nome em inglês" cadastrado,
 * as descrições dos técnicos ficam como digitadas (com leitura de apoio) e um
 * glossário explica os termos técnicos sem correspondente em inglês.
 *
 * Uso (feito por trator.js):
 *   TratorExport.init({ getContexto, toast })   // getContexto() => { base, listas, filtros, abaAtiva, dados }
 *   TratorExport.abrir('pdf' | 'html')
 * ------------------------------------------------------------------
 */
const TratorExport = (() => {
  const C = window.TratorCalc;
  const I = window.TratorI18n;
  const D = window.TratorDash;

  let ctx = null;
  let modal = null;

  /* ------------------------------ textos do relatório ------------------------------ */

  const SECOES = [
    { k: 'resumo', pt: 'Resumo', en: 'Summary' },
    { k: 'tempo', pt: 'Tempo monitorado', en: 'Monitored time' },
    { k: 'status', pt: 'Status do trator', en: 'Tractor status' },
    { k: 'ofensores', pt: 'Ofensores', en: 'Offenders' },
    { k: 'tendencia', pt: 'Tendência', en: 'Trend' },
    { k: 'hora', pt: 'Hora do dia', en: 'Hour of day' },
    { k: 'implementos', pt: 'Implementos', en: 'Implements' },
    { k: 'registros', pt: 'Registros', en: 'Records' },
  ];

  const TXT = {
    pt: {
      titulo: 'Trator Autônomo — Relatório de operação',
      empresa: 'Agricef, Experimentação Agrícola · Gestão de Pessoas',
      gerado: 'Relatório gerado em {0} às {1}',
      filtros: 'Filtros do relatório',
      usinas: 'Usinas', periodo: 'Período', implemento: 'Implemento', trator: 'Trator', causa: 'Causa padrão', resp: 'Responsável', revisao: 'Revisão',
      todas: 'Todas', todos: 'Todos', tudo: 'Todo o período', ate: 'até', desde: 'desde', a: 'a',
      rev: { todos: 'Todos os eventos', classificados: 'Só classificados', 'a-classificar': 'Só a classificar' },
      leitura: 'Como ler este relatório',
      leituraItens: [
        '<strong>Tempo monitorado</strong> é a soma das horas de todos os eventos registrados pelos técnicos. <strong>Parada</strong> é todo evento que não é operação autônoma.',
        'Cada parada pertence a um grupo conforme a causa padrão: <strong>Cliente</strong> (lado da usina), <strong>ASI/Agricef</strong> (kit de autonomia e equipe de suporte) ou <strong>Não gerenciável</strong> (chuva, refeições, folgas). “A classificar” ainda não tem causa: conta nas horas, mas fica fora dos gráficos de ofensores e dos % por responsável.',
        '<strong>Disponibilidade</strong> = (168 h − horas “Não disponível”) ÷ 168 h por usina e semana; a média considera só as semanas com eventos.',
        'Na <strong>tendência</strong>, só entram semanas com 5 h ou mais monitoradas; os limites de controle são a média ± 2,66 × amplitude móvel média (mínimo 0%, máximo 100%).',
        'Os textos entre aspas são as descrições escritas pelos técnicos, exatamente como digitadas.',
      ],
      rodape: 'Agricef — Gestão de Pessoas · Equipe Trator Autônomo',
      vazio: 'Nenhum evento no filtro escolhido: nada para exportar.',
    },
    en: {
      titulo: 'Autonomous Tractor — Operations Report',
      empresa: 'Agricef, Agricultural Experimentation · People Management',
      gerado: 'Report generated on {0} at {1}',
      filtros: 'Report filters',
      usinas: 'Mills', periodo: 'Period', implemento: 'Implement', trator: 'Tractor', causa: 'Standard cause', resp: 'Responsible party', revisao: 'Review',
      todas: 'All', todos: 'All', tudo: 'Entire period', ate: 'until', desde: 'since', a: 'to',
      rev: { todos: 'All events', classificados: 'Classified only', 'a-classificar': 'Pending classification only' },
      leitura: 'How to read this report',
      leituraItens: [
        '<strong>Monitored time</strong> is the sum of the hours of all events logged by the field technicians. A <strong>stop</strong> is any event that is not autonomous operation.',
        'Each stop belongs to a group according to its standard cause: <strong>Client (mill)</strong> (mill side), <strong>ASI/Agricef</strong> (the autonomy kit and its support team) or <strong>Uncontrollable</strong> (rain, meals, days off). “Pending classification” has no cause yet: it counts in the hours but stays out of the offender charts and of the % by responsible party.',
        '<strong>Availability</strong> = (168 h − “Unavailable” hours) ÷ 168 h per mill and week; the average only counts weeks with events.',
        'In the <strong>trend</strong> charts only weeks with 5 h or more of monitored time are included; control limits are the mean ± 2.66 × the average moving range (minimum 0%, maximum 100%).',
        'Text between quotation marks is what the technicians wrote, exactly as typed (in Portuguese); an English reading aid is added next to it when available.',
      ],
      glossario: 'Glossary: Portuguese terms used in this report',
      glossarioCab: ['Term (Portuguese)', 'Used here as', 'Meaning'],
      rodape: 'Agricef — People Management · Autonomous Tractor team',
      vazio: 'No events for the chosen filter: nothing to export.',
    },
  };

  /* ------------------------------ utilidades ------------------------------ */

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s, ...a) => String(s).replace(/\{(\d+)\}/g, (m, i) => a[Number(i)]);
  const nomeDe = (lista, id) => { const x = (lista || []).find((i) => i.id === id); return x ? x.nome : id || '—'; };

  function toast(msg, tipo) { if (ctx && ctx.toast) ctx.toast(msg, tipo); }

  // Lê o CSS já aplicado na página (funciona também com o dashboard aberto como arquivo local).
  function cssDaPagina() {
    const partes = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      try { Array.from(sheet.cssRules || []).forEach((r) => partes.push(r.cssText)); } catch (e) { /* folha de outra origem: ignora */ }
    });
    return partes.join('\n');
  }

  function imagemParaDataUrl(img) {
    try {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) return img.src;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      return cv.toDataURL('image/png');
    } catch (e) { return img.src; }
  }

  function logosDoCabecalho() {
    const imgs = Array.from(document.querySelectorAll('.admin-header img'));
    return imgs.map((img) => `<img src="${imagemParaDataUrl(img)}" alt="${esc(img.alt || '')}" class="${esc(img.className)}" />`).join('');
  }

  /* ------------------------------ filtros do relatório ------------------------------ */

  function resumoDosFiltros(f, listas, T) {
    const todasUs = listas.usinas.length;
    const us = f.usinas.size >= todasUs ? T.todas : listas.usinas.filter((u) => f.usinas.has(u.id)).map((u) => u.nome).join(', ');
    const per = f.de || f.ate
      ? (f.de && f.ate ? `${I.data(f.de)} ${T.a} ${I.data(f.ate)}` : f.de ? `${T.desde} ${I.data(f.de)}` : `${T.ate} ${I.data(f.ate)}`)
      : T.tudo;
    const imp = f.implemento ? I.nomeCadastro((listas.implementos || []).find((i) => i.id === f.implemento)) : T.todos;
    const trat = f.trator ? `${nomeDe(listas.usinas, (listas.tratores.find((t) => t.id === f.trator) || {}).usina_id)} · ${nomeDe(listas.tratores, f.trator)}` : T.todos;
    const cau = f.causa ? I.nomeCadastro((listas.causas || []).find((c) => c.id === f.causa)) : T.todas;
    const resp = f.responsaveis.size >= 3 ? T.todos : Array.from(f.responsaveis).map((r) => I.grupo(r)).join(', ');
    return [[T.usinas, us], [T.periodo, per], [T.implemento, imp], [T.trator, trat], [T.causa, cau], [T.resp, resp], [T.revisao, T.rev[f.revisao] || T.rev.todos]];
  }

  /* ------------------------------ montagem do relatório ------------------------------ */

  /**
   * Gera o HTML do relatório (cabeçalho, seções e notas) no idioma pedido.
   * `opcoes` = { idioma, secoes: [chaves], filtros (cópia com overrides), maxRegistros }.
   * Devolve { html, vazio } — `html` é só o corpo (sem <html>).
   */
  function montarCorpo(opcoes) {
    const { base, listas } = ctx.getContexto();
    const idioma = opcoes.idioma === 'en' ? 'en' : 'pt';
    const T = TXT[idioma];
    const f = opcoes.filtros;
    I.setLang(idioma);
    try {
      const res = C.resumo(base, D.paraCalc(f, listas));
      if (!res.nEventos) return { html: '', vazio: true };
      const estado = { res, listas, filtros: f, ui: {}, base, estatico: true, maxRegistros: opcoes.maxRegistros || 100 };
      const agora = new Date();
      const loc = I.LOCALE[idioma];
      const quando = fmt(T.gerado, agora.toLocaleDateString(loc, { day: '2-digit', month: idioma === 'en' ? 'short' : '2-digit', year: 'numeric' }), agora.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }));
      const filtros = resumoDosFiltros(f, listas, T);
      const nomeSecao = (k) => (SECOES.find((s) => s.k === k) || {})[idioma];
      const secoes = opcoes.secoes.map((k, i) => `<section class="tr-doc__sec" data-secao="${k}"><h2>${i + 1}. ${esc(nomeSecao(k))}</h2>${D.secao(k, estado)}</section>`).join('\n');

      let glos = '';
      if (idioma === 'en') {
        const textos = [].concat(
          listas.usinas.map((u) => u.nome), res.pareto.map((c) => c.nome),
          Object.keys(res.porImpl).map((id) => nomeDe(listas.implementos, id)),
          opcoes.secoes.indexOf('registros') !== -1 || opcoes.secoes.indexOf('ofensores') !== -1 ? res.eventos.map((e) => e.descricao || '') : []
        );
        const itens = I.glossarioDoRelatorio(textos);
        glos = `<section class="tr-doc__sec tr-doc__glos"><h2>${esc(T.glossario)}</h2>
          <div class="table-wrapper"><table class="data-table"><thead><tr>${T.glossarioCab.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
          ${itens.map((g) => `<tr><td><strong>${esc(g.pt)}</strong></td><td>${esc(g.en)}</td><td>${esc(g.def)}</td></tr>`).join('')}</tbody></table></div></section>`;
      }

      const html = `<header class="tr-doc__cab">
          <div class="tr-doc__logos">${logosDoCabecalho()}</div>
          <div class="tr-doc__tit"><p class="tr-doc__empresa">${esc(T.empresa)}</p><h1>${esc(T.titulo)}</h1><p class="tr-doc__meta">${esc(quando)}</p></div>
        </header>
        <section class="tr-doc__filtros"><h2>${esc(T.filtros)}</h2><dl>${filtros.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
        ${secoes}
        <section class="tr-doc__sec tr-doc__leitura"><h2>${esc(T.leitura)}</h2><ul>${T.leituraItens.map((x) => `<li>${x}</li>`).join('')}</ul></section>
        ${glos}
        <footer class="tr-doc__rodape">${esc(T.rodape)} · ${esc(quando)}</footer>`;
      return { html, vazio: false };
    } finally {
      I.setLang('pt');
    }
  }

  const CSS_DOC = `
    body { margin: 0; padding: 0; background: #fff; }
    .tr-doc-pagina { max-width: 980px; margin: 0 auto; padding: 24px 20px 48px; }
  `;

  function documentoHtml(corpo, idioma) {
    const T = TXT[idioma];
    return `<!DOCTYPE html>
<html lang="${idioma === 'en' ? 'en' : 'pt-BR'}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(T.titulo)}</title>
<style>
${cssDaPagina()}
${CSS_DOC}
</style>
</head>
<body>
<div class="tr-doc tr-doc-pagina">
${corpo}
</div>
</body>
</html>`;
  }

  function baixar(html, idioma) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trator-autonomo-${idioma === 'en' ? 'report-en' : 'relatorio-pt'}-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function imprimir(corpo, idioma) {
    const old = document.getElementById('trExportPrint');
    if (old) old.remove();
    const div = document.createElement('div');
    div.id = 'trExportPrint';
    div.className = 'tr-doc tr-doc--print';
    div.setAttribute('lang', idioma === 'en' ? 'en' : 'pt-BR');
    div.innerHTML = corpo;
    document.body.appendChild(div);
    document.body.classList.add('tr-printing');
    const antes = document.title;
    document.title = TXT[idioma].titulo;
    const restaurar = () => {
      document.body.classList.remove('tr-printing');
      document.title = antes;
      div.remove();
      window.removeEventListener('afterprint', restaurar);
    };
    window.addEventListener('afterprint', restaurar);
    window.print();
  }

  /* ------------------------------ modal ------------------------------ */

  function garantirModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'trExportModal';
    modal.className = 'modal-overlay hidden no-print';
    modal.innerHTML = `
      <div class="modal-card tr-exp" role="dialog" aria-modal="true" aria-labelledby="trExpTitulo">
        <h3 id="trExpTitulo">Exportar relatório</h3>
        <p class="muted">Escolha o formato, o idioma, o período e o que entra no relatório.</p>
        <fieldset class="tr-exp__grupo"><legend>Formato</legend>
          <label><input type="radio" name="trExpFormato" value="pdf" /> PDF (impressão do navegador)</label>
          <label><input type="radio" name="trExpFormato" value="html" /> HTML compartilhável (arquivo único)</label>
        </fieldset>
        <fieldset class="tr-exp__grupo"><legend>Idioma do relatório</legend>
          <label><input type="radio" name="trExpIdioma" value="pt" checked /> Português (Brasil)</label>
          <label><input type="radio" name="trExpIdioma" value="en" /> English</label>
          <p class="muted tr-exp__ajuda" id="trExpAjudaIdioma"></p>
        </fieldset>
        <fieldset class="tr-exp__grupo"><legend>Período</legend>
          <div class="tr-exp__linha"><input type="date" id="trExpDe" aria-label="De" /> <span>a</span> <input type="date" id="trExpAte" aria-label="Até" />
            <button type="button" class="link-button" id="trExpTodoPeriodo">Todo o período</button></div>
        </fieldset>
        <fieldset class="tr-exp__grupo"><legend>Usinas</legend><div id="trExpUsinas" class="tr-exp__lista"></div></fieldset>
        <fieldset class="tr-exp__grupo"><legend>O que entra no relatório</legend><div id="trExpSecoes" class="tr-exp__lista"></div>
          <p class="muted tr-exp__ajuda">Registros lista os 100 eventos mais recentes, com a descrição escrita pelo técnico.</p></fieldset>
        <p class="muted tr-exp__ajuda" id="trExpOutros"></p>
        <p class="tr-exp__erro hidden" id="trExpErro" role="alert"></p>
        <div class="modal-actions">
          <button type="button" class="btn btn--ghost btn--small" id="trExpCancelar">Cancelar</button>
          <button type="button" class="btn btn--start btn--small" id="trExpGerar">Gerar relatório</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });
    modal.querySelector('#trExpCancelar').addEventListener('click', fechar);
    modal.querySelector('#trExpGerar').addEventListener('click', gerar);
    modal.querySelector('#trExpTodoPeriodo').addEventListener('click', () => { modal.querySelector('#trExpDe').value = ''; modal.querySelector('#trExpAte').value = ''; });
    modal.querySelectorAll('input[name="trExpIdioma"]').forEach((r) => r.addEventListener('change', atualizarAjudaIdioma));
    modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
    return modal;
  }

  function atualizarAjudaIdioma() {
    const en = modal.querySelector('input[name="trExpIdioma"]:checked').value === 'en';
    modal.querySelector('#trExpAjudaIdioma').textContent = en
      ? 'Títulos, legendas, achados, datas e números em inglês. Causas e implementos usam o nome em inglês de Listas; as descrições dos técnicos ficam como digitadas, com uma leitura de apoio em inglês, e um glossário explica os termos técnicos.'
      : 'Tudo em português, com datas e números no formato brasileiro.';
  }

  function abrir(formato) {
    if (!ctx) return;
    const { listas, filtros, abaAtiva } = ctx.getContexto();
    const m = garantirModal();
    m.querySelectorAll('input[name="trExpFormato"]').forEach((r) => { r.checked = r.value === (formato === 'html' ? 'html' : 'pdf'); });
    m.querySelector('#trExpDe').value = filtros.de || '';
    m.querySelector('#trExpAte').value = filtros.ate || '';
    m.querySelector('#trExpUsinas').innerHTML = listas.usinas.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((u) => `<label><input type="checkbox" value="${esc(u.id)}"${filtros.usinas.has(u.id) ? ' checked' : ''} /> ${esc(u.nome)}</label>`).join('');
    m.querySelector('#trExpSecoes').innerHTML = SECOES.map((s) =>
      `<label><input type="checkbox" value="${s.k}"${s.k !== 'registros' || abaAtiva === 'registros' ? ' checked' : ''} /> ${esc(s.pt)}</label>`).join('');
    const outros = [];
    if (filtros.implemento) outros.push(`implemento: ${nomeDe(listas.implementos, filtros.implemento)}`);
    if (filtros.trator) outros.push(`trator: ${nomeDe(listas.tratores, filtros.trator)}`);
    if (filtros.causa) outros.push(`causa: ${nomeDe(listas.causas, filtros.causa)}`);
    if (filtros.responsaveis.size < 3) outros.push(`responsável: ${Array.from(filtros.responsaveis).join(', ')}`);
    if (filtros.revisao !== 'todos') outros.push(`revisão: ${TXT.pt.rev[filtros.revisao]}`);
    m.querySelector('#trExpOutros').textContent = outros.length
      ? `Também valem os filtros da tela: ${outros.join(' · ')}. Para mudar, feche esta janela e ajuste os filtros.`
      : 'Não há outros filtros ativos na tela (implemento, trator, causa, responsável e revisão em “todos”).';
    m.querySelector('#trExpErro').classList.add('hidden');
    atualizarAjudaIdioma();
    m.classList.remove('hidden');
    const primeiro = m.querySelector('input[name="trExpFormato"]:checked');
    if (primeiro) primeiro.focus();
  }

  function fechar() { if (modal) modal.classList.add('hidden'); }

  function lerModal() {
    const v = (n) => (modal.querySelector(`input[name="${n}"]:checked`) || {}).value;
    return {
      formato: v('trExpFormato') === 'html' ? 'html' : 'pdf',
      idioma: v('trExpIdioma') === 'en' ? 'en' : 'pt',
      de: modal.querySelector('#trExpDe').value,
      ate: modal.querySelector('#trExpAte').value,
      usinas: Array.from(modal.querySelectorAll('#trExpUsinas input:checked')).map((c) => c.value),
      secoes: Array.from(modal.querySelectorAll('#trExpSecoes input:checked')).map((c) => c.value),
    };
  }

  function erro(msg) {
    const e = modal.querySelector('#trExpErro');
    e.textContent = msg;
    e.classList.remove('hidden');
  }

  function gerar() {
    const o = lerModal();
    if (!o.secoes.length) return erro('Marque ao menos uma seção para o relatório.');
    if (!o.usinas.length) return erro('Marque ao menos uma usina.');
    if (o.de && o.ate && o.de > o.ate) return erro('A data inicial é depois da data final.');
    const { filtros } = ctx.getContexto();
    const f = Object.assign({}, filtros, { usinas: new Set(o.usinas), de: o.de, ate: o.ate, responsaveis: new Set(filtros.responsaveis) });
    const { html, vazio } = montarCorpo({ idioma: o.idioma, secoes: o.secoes, filtros: f, maxRegistros: 100 });
    if (vazio) return erro(TXT.pt.vazio);
    fechar();
    if (o.formato === 'html') {
      baixar(documentoHtml(html, o.idioma), o.idioma);
      toast(o.idioma === 'en' ? 'Arquivo HTML em inglês gerado. Confira sua pasta de downloads.' : 'Arquivo HTML gerado. Confira sua pasta de downloads.', 'success');
    } else {
      imprimir(html, o.idioma);
    }
  }

  function init(contexto) { ctx = contexto; }

  return { init, abrir, montarCorpo, documentoHtml, SECOES, TXT };
})();

window.TratorExport = TratorExport;
