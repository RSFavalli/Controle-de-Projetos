/**
 * trator-dash.js
 * ------------------------------------------------------------------
 * Telas de análise do Dashboard da equipe Trator Autônomo (Fase 4).
 * Só desenha: os números vêm de TratorCalc (trator-calc.js). Gráficos em SVG
 * e HTML puro, sem bibliotecas, nas cores dos grupos (variáveis --tr-* em
 * css/trator.css, com versão para o tema escuro).
 *
 * Uso (feito por trator.js):
 *   TratorDash.barraFiltros(el, estado, cb)
 *   TratorDash.aba(nome, el, estado, cb)
 *   TratorDash.secao(nome, estado)   // HTML estático (relatório exportado), no idioma ativo de TratorI18n
 *   estado = { res, listas, filtros, ui, base, avisoVazio }
 *   cb     = { setFiltro(patch), irPara(aba, patchFiltros), rerender() }
 * ------------------------------------------------------------------
 */
const TratorDash = (() => {

  const C = window.TratorCalc;
  const I = window.TratorI18n;
  const t = I.t;
  const GRUPOS = ['Autônomo', 'Cliente', 'ASI/Agricef', 'Não gerenciável'];
  const TODOS = GRUPOS.concat(['A classificar']);
  const COR = {
    'Autônomo': 'var(--tr-aut)',
    Cliente: 'var(--tr-cli)',
    'ASI/Agricef': 'var(--tr-asi)',
    'Não gerenciável': 'var(--tr-ng)',
    'A classificar': 'var(--tr-ac)',
  };
  const COR_STATUS = { 'Autônomo': 'var(--tr-aut)', Manual: 'var(--tr-st-man)', 'Não disponível': 'var(--tr-st-nd)' };
  const SERIES = ['var(--activity-1)', 'var(--activity-3)', 'var(--activity-2)', 'var(--activity-7)', 'var(--activity-5)'];

  /* ------------------------------ utilidades ------------------------------ */
  // Tudo que aparece na tela passa por `t()` (idioma ativo; português por padrão).
  // O idioma só muda durante a geração do relatório exportado (trator-export.js).

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const nf = (n, d) => I.nf(n, d);
  const fmtH = (n) => `${nf(n || 0, 1)} h`;
  const fmtPct = (x, d) => (x == null || isNaN(x) ? '—' : `${nf(100 * x, d == null ? 1 : d)}%`);
  const fmtPct100 = (v, d) => (v == null || isNaN(v) ? '—' : `${nf(v, d == null ? 1 : d)}%`);
  const fmtData = (s) => I.data(s);
  const fmtSemana = (s) => I.semanaCurta(s);
  const fmtHora = (ms) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  // Nome em português (usado nos filtros).
  const nomeDe = (lista, id) => {
    const x = (lista || []).find((i) => i.id === id);
    return x ? x.nome : id || '—';
  };
  // Nome no idioma ativo: usinas ficam como estão; implementos e causas usam o "nome em inglês".
  const nomeI = (lista, id) => {
    const x = (lista || []).find((i) => i.id === id);
    return x ? I.nomeCadastro(x) : id || '—';
  };
  const causaI = (estado, id, nomePt) => I.nomeCadastro((estado.listas.causas || []).find((c) => c.id === id), nomePt);
  const plural = (n, um, varios) => I.pl(n, um, varios);
  const gr = (g) => I.grupo(g);

  /** Descrição escrita pelo técnico: sempre como digitada; em inglês ganha uma leitura de apoio. */
  function descHtml(texto) {
    let h = `“${esc(texto)}”`;
    if (I.getLang() === 'en') {
      const l = I.leituraEmIngles(texto);
      if (l.texto) h += ` <span class="trd-leitura">${l.tipo === 'frase' ? '(EN: ' : '(key terms: '}${esc(l.texto)})</span>`;
    }
    return h;
  }

  function usinasDe(estado) {
    return estado.listas.usinas.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function legenda(itens) {
    return `<div class="trd-legenda">${itens.map((i) => `<span><i style="background:${i.cor}"></i>${esc(i.t)}</span>`).join('')}</div>`;
  }

  function barraEmpilhada(segmentos, total, rotuloTotal) {
    const tt = total || 1;
    return `<div class="trd-barra" role="img">${segmentos.filter((s) => s.v > 0).map((s) => {
      const p = s.v / tt;
      return `<span class="trd-barra__seg" style="width:${(100 * p).toFixed(3)}%;background:${s.cor}" title="${esc(s.t)}: ${fmtH(s.v)} (${fmtPct(p, 0)})">${p >= 0.07 ? fmtPct(p, 0) : ''}</span>`;
    }).join('')}</div><span class="trd-barra__total">${rotuloTotal}</span>`;
  }

  function vazio(msg) {
    return `<p class="empty-state">${esc(t(msg))}</p>`;
  }

  /* ------------------------------ filtros ------------------------------ */

  function atalhoParaPeriodo(a) {
    const hoje = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ate = iso(hoje);
    const menos = (n) => { const d = new Date(hoje); d.setDate(d.getDate() - n); return iso(d); };
    if (a === '7') return { de: menos(6), ate };
    if (a === '30') return { de: menos(29), ate };
    if (a === '90') return { de: menos(89), ate };
    if (a === 'mes') return { de: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), ate };
    if (a === 'mes-ant') {
      return { de: iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), ate: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)) };
    }
    return { de: '', ate: '' };
  }

  function paraCalc(f, listas) {
    const todasUs = listas.usinas.length;
    return {
      usinas: f.usinas.size >= todasUs ? [] : Array.from(f.usinas),
      de: f.de, ate: f.ate, implemento: f.implemento, trator: f.trator, causa: f.causa,
      responsaveis: f.responsaveis.size >= 3 ? [] : Array.from(f.responsaveis),
      revisao: f.revisao,
      modo: f.modo === 'teste' ? 'teste' : 'reais',
      testeIds: (listas.tratores || []).filter((t) => t.teste).map((t) => t.id),
    };
  }

  function filtrosPadrao(listas) {
    return {
      usinas: new Set(listas.usinas.map((u) => u.id)),
      de: '', ate: '', atalho: '', implemento: '', trator: '', causa: '',
      responsaveis: new Set(['Cliente', 'ASI/Agricef', 'Não gerenciável']),
      revisao: 'todos', modo: 'reais',
    };
  }

  function barraFiltros(el, estado, cb) {
    const f = estado.filtros;
    const L = estado.listas;
    const chip = (grupo, id, rotulo, on) =>
      `<button type="button" class="trd-chip${on ? ' is-on' : ''}" data-chip="${grupo}" data-id="${esc(id)}" aria-pressed="${on}">${esc(rotulo)}</button>`;
    const opcoes = (lista, atual, todos) =>
      `<option value="">${todos}</option>` + lista.map((x) => `<option value="${esc(x.id)}"${x.id === atual ? ' selected' : ''}>${esc(x.nome)}</option>`).join('');
    const tratoresVis = L.tratores.filter((t) => f.usinas.has(t.usina_id) && !!t.teste === (f.modo === 'teste'));
    el.innerHTML = `
      <div class="trd-modo${f.modo === 'teste' ? ' trd-modo--teste' : ''}" role="group" aria-label="Origem dos dados">
        <span class="trd-filtro__rot">Dados</span>
        <button type="button" class="trd-chip${f.modo === 'teste' ? '' : ' is-on'}" data-modo="reais" aria-pressed="${f.modo !== 'teste'}">Dados reais</button>
        <button type="button" class="trd-chip${f.modo === 'teste' ? ' is-on' : ''}" data-modo="teste" aria-pressed="${f.modo === 'teste'}">Trator de teste</button>
        ${f.modo === 'teste' ? '<span class="trd-modo__aviso" role="status"><strong>Modo simulação.</strong> Só aparecem os tratores de teste; nada disto entra nos dados reais.</span>' : ''}
      </div>
      <div class="trd-filtros">
        <div class="trd-filtro"><span class="trd-filtro__rot">Usina</span>${usinasDe(estado).map((u) => chip('usina', u.id, u.nome, f.usinas.has(u.id))).join('')}</div>
        <div class="trd-filtro"><span class="trd-filtro__rot">Período</span>
          <input type="date" id="trfDe" value="${esc(f.de)}" aria-label="De" /> <span>a</span>
          <input type="date" id="trfAte" value="${esc(f.ate)}" aria-label="Até" />
          <select id="trfAtalho" aria-label="Atalho de período">
            <option value="">Atalho</option>
            <option value="7"${f.atalho === '7' ? ' selected' : ''}>Últimos 7 dias</option>
            <option value="30"${f.atalho === '30' ? ' selected' : ''}>Últimos 30 dias</option>
            <option value="90"${f.atalho === '90' ? ' selected' : ''}>Últimos 90 dias</option>
            <option value="mes"${f.atalho === 'mes' ? ' selected' : ''}>Este mês</option>
            <option value="mes-ant"${f.atalho === 'mes-ant' ? ' selected' : ''}>Mês passado</option>
            <option value="tudo">Todo o período</option>
          </select></div>
        <div class="trd-filtro"><span class="trd-filtro__rot">Implemento</span><select id="trfImpl">${opcoes(L.implementos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), f.implemento, 'Todos')}</select></div>
        <div class="trd-filtro"><span class="trd-filtro__rot">Trator</span><select id="trfTrator">${opcoes(tratoresVis.map((t) => ({ id: t.id, nome: `${nomeDe(L.usinas, t.usina_id)} · ${t.nome}` })), f.trator, 'Todos')}</select></div>
        <div class="trd-filtro"><span class="trd-filtro__rot">Causa padrão</span><select id="trfCausa">${opcoes(L.causas.filter((c) => c.responsavel !== 'Autônomo').slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), f.causa, 'Todas')}</select></div>
        <div class="trd-filtro"><span class="trd-filtro__rot">Responsável</span>${['Cliente', 'ASI/Agricef', 'Não gerenciável'].map((r) => chip('resp', r, r, f.responsaveis.has(r))).join('')}</div>
        <div class="trd-filtro"><span class="trd-filtro__rot">Revisão</span>
          <select id="trfRevisao"><option value="todos"${f.revisao === 'todos' ? ' selected' : ''}>Todos os eventos</option><option value="classificados"${f.revisao === 'classificados' ? ' selected' : ''}>Só classificados</option><option value="a-classificar"${f.revisao === 'a-classificar' ? ' selected' : ''}>Só a classificar</option></select></div>
        <button type="button" class="btn btn--ghost btn--small" id="trfLimpar">Limpar filtros</button>
      </div>
      <p class="trd-filtros__nota muted">Usina, período, implemento e trator valem para tudo. Causa e responsável filtram só as paradas; a operação autônoma continua como referência.</p>`;

    el.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => {
      const conj = b.dataset.chip === 'usina' ? new Set(f.usinas) : new Set(f.responsaveis);
      if (conj.has(b.dataset.id)) conj.delete(b.dataset.id); else conj.add(b.dataset.id);
      if (conj.size === 0) { // nada marcado = tudo
        (b.dataset.chip === 'usina' ? L.usinas.map((u) => u.id) : ['Cliente', 'ASI/Agricef', 'Não gerenciável']).forEach((x) => conj.add(x));
      }
      cb.setFiltro(b.dataset.chip === 'usina' ? { usinas: conj, trator: '' } : { responsaveis: conj });
    }));
    const on = (id, ev, fn) => { const x = el.querySelector(id); if (x) x.addEventListener(ev, fn); };
    on('#trfDe', 'change', (e) => cb.setFiltro({ de: e.target.value, atalho: '' }));
    on('#trfAte', 'change', (e) => cb.setFiltro({ ate: e.target.value, atalho: '' }));
    on('#trfAtalho', 'change', (e) => {
      const v = e.target.value;
      if (!v) return;
      cb.setFiltro(Object.assign(atalhoParaPeriodo(v === 'tudo' ? '' : v), { atalho: v === 'tudo' ? '' : v }));
    });
    on('#trfImpl', 'change', (e) => cb.setFiltro({ implemento: e.target.value }));
    on('#trfTrator', 'change', (e) => cb.setFiltro({ trator: e.target.value }));
    on('#trfCausa', 'change', (e) => cb.setFiltro({ causa: e.target.value }));
    on('#trfRevisao', 'change', (e) => cb.setFiltro({ revisao: e.target.value }));
    on('#trfLimpar', 'click', () => cb.setFiltro(Object.assign(filtrosPadrao(L), { modo: f.modo })));
    el.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.modo !== (f.modo || 'reais')) cb.setFiltro({ modo: b.dataset.modo, trator: '' });
    }));
  }

  /* --------------------------- aviso "A classificar" --------------------------- */

  function aviso(estado) {
    const a = estado.res.aClassificar;
    if (!a.n) return '';
    const botao = estado.estatico ? '' : `\n      <button type="button" class="btn btn--start btn--small" data-acao="revisar">Revisar agora</button>`;
    return `<div class="trd-aviso" role="status"><span>${t('<strong>{0} {1} ({2})</strong> ainda sem causa definida: contam nas horas, mas ficam fora dos gráficos de ofensores e dos % por responsável.', a.n, plural(a.n, 'evento', 'eventos'), fmtH(a.h))}</span>${botao}</div>`;
  }

  /* ------------------------------- KPIs ------------------------------- */

  function kpis(estado) {
    const r = estado.res;
    const top = r.topOfensor;
    const kpi = (rot, val, sub, extra) => `<div class="kpi${extra || ''}"><span class="kpi__label">${esc(t(rot))}</span><span class="kpi__value">${val}</span><span class="kpi__sub">${sub}</span></div>`;
    const turnosHa = (estado.base.turnos || []).filter((x) => x.ha_autonomo !== '' && x.ha_autonomo != null && Number(x.ha_autonomo) > 0).length;
    return `<div class="trd-kpis">
      ${kpi('Tempo monitorado', fmtH(r.total), t('{0} eventos · {1} {2} de campo', nf(r.nEventos, 0), nf(r.diasCampo, 0), plural(r.diasCampo, 'dia', 'dias')))}
      ${kpi('Operação autônoma', fmtPct(r.pctAut), t('{0} do tempo monitorado', fmtH(r.aut)), ' kpi--aut')}
      ${kpi('Horas paradas', fmtH(r.horasParadas), t('{0} paradas · {1} do tempo', nf(r.nParadas, 0), fmtPct(r.pctParadas, 0)))}
      ${kpi('Disponibilidade', fmtPct(r.disp.media), r.disp.semanas ? t('média de {0} {1} por usina (regra 168 h)', r.disp.semanas, plural(r.disp.semanas, 'semana', 'semanas')) : t('sem semanas no filtro'))}
      ${kpi('Maior ofensor', top ? esc(causaI(estado, top.id, top.nome)) : '—', top ? t('{0} · {1} das paradas', fmtH(top.h), fmtPct(r.horasClassificadas ? top.h / r.horasClassificadas : 0, 0)) : t('sem paradas no filtro'), ' kpi--texto')}
      ${estado.estatico ? '' : `<div class="kpi kpi--novo"><span class="kpi__label">Meta × realizado</span><span class="kpi__value">—</span><span class="kpi__sub">começa com os hectares lançados no app${estado.base.turnos.length ? ` (hoje ${nf(turnosHa, 0)} ${plural(turnosHa, 'turno com ha', 'turnos com ha')})` : ''}</span></div>`}
    </div>`;
  }

  /* ------------------------------- achados ------------------------------- */

  function maiorCausaDoGrupo(pareto, grupo) {
    return pareto.filter((c) => c.grupo === grupo);
  }

  function achados(estado) {
    const r = estado.res;
    const itens = [];
    const horasP = r.horasParadas;
    const nomeC = (c) => `<strong>${esc(causaI(estado, c.id, c.nome))}</strong>`;
    if (r.pareto.length) {
      const t3 = r.pareto.slice(0, 3);
      const s = t3.reduce((a, c) => a + c.h, 0);
      const lista = I.juntar(t3.map(nomeC));
      itens.push([t('Pareto'), t3.length > 1
        ? t('Os {0} maiores ofensores, {1}, somam {2} do tempo parado ({3}).', t3.length, lista, fmtPct(horasP ? s / horasP : 0, 0), fmtH(s))
        : t('O maior ofensor, {0}, soma {1} do tempo parado ({2}).', lista, fmtPct(horasP ? s / horasP : 0, 0), fmtH(s))]);
    }
    ['ASI/Agricef', 'Cliente', 'Não gerenciável'].forEach((g) => {
      const h = r.porGrupo[g];
      if (!h) return;
      const cs = maiorCausaDoGrupo(r.pareto, g);
      const chave = g === 'Não gerenciável' ? '<strong>{0}</strong> ({1}) das paradas não são gerenciáveis.'
        : g === 'Cliente' ? '<strong>{0}</strong> ({1}) das paradas são do lado do cliente.' : '<strong>{0}</strong> ({1}) das paradas são da ASI/Agricef.';
      const base = t(chave, fmtH(h), fmtPct(horasP ? h / horasP : 0, 0));
      const maior = cs[0] && cs.length > 0 && g !== 'Não gerenciável'
        ? t(' Maior: <strong>{0}</strong> com {1} em {2} {3}{4}.', esc(causaI(estado, cs[0].id, cs[0].nome)), fmtH(cs[0].h), nf(cs[0].n, 0), plural(cs[0].n, 'parada', 'paradas'),
          cs[1] ? t(', depois {0} ({1})', esc(causaI(estado, cs[1].id, cs[1].nome)), fmtH(cs[1].h)) : '')
        : '';
      itens.push([gr(g).toUpperCase(), base + maior + (g === 'Cliente' ? t(' Vale conversar com a usina.') : '')]);
    });
    if (r.aClassificar.n) itens.push([t('Classificação'), t('<strong>{0} {1}</strong> ({2}) {3} causa.', r.aClassificar.n, plural(r.aClassificar.n, 'evento', 'eventos'), fmtH(r.aClassificar.h), plural(r.aClassificar.n, 'aguarda', 'aguardam'))]);
    if (r.tendencia.pontos.length > 1) {
      const tt = r.tendencia;
      const ult = tt.pontos[tt.pontos.length - 1];
      itens.push([t('Tendência'), tt.foraDosLimites
        ? t('<strong>{0} {1}</strong> dos limites de controle; a última semana teve {2} de operação autônoma.', tt.foraDosLimites, plural(tt.foraDosLimites, 'semana saiu', 'semanas saíram'), fmtPct100(ult.v))
        : t('Variação normal do processo: nenhuma das {0} semanas saiu dos limites. Média de {1} de operação autônoma.', tt.pontos.length, fmtPct100(tt.media))]);
    }
    if (!itens.length) return vazio('Sem dados no filtro atual.');
    return `<ul class="trd-achados">${itens.map(([k, h]) => `<li><span class="trd-tag">${esc(k)}</span><span>${h}</span></li>`).join('')}</ul>`;
  }

  /* ------------------------------ por usina ------------------------------ */

  function blocoUsinas(estado) {
    const r = estado.res;
    const us = usinasDe(estado).filter((u) => r.porUsina[u.id]);
    if (!us.length) return vazio('Sem dados no filtro atual.');
    return `<div class="trd-linhas">${us.map((u) => {
      const x = r.porUsina[u.id];
      return `<div class="trd-linha"><span class="trd-linha__nome">${esc(u.nome)}</span>${barraEmpilhada(TODOS.map((g) => ({ t: gr(g), v: x.grupos[g] || 0, cor: COR[g] })), x.total, fmtH(x.total))}</div>`;
    }).join('')}</div>${legenda(TODOS.filter((g) => r.porGrupo[g] > 0).map((g) => ({ t: gr(g), cor: COR[g] })))}`;
  }

  /* -------------------------- gráfico semanal empilhado -------------------------- */

  function semanasEmpilhadas(estado) {
    const ev = estado.res.eventos;
    const sem = {};
    ev.forEach((e) => {
      const s = C.inicioSemana(e.data);
      const c = (sem[s] = sem[s] || {});
      c[e.grupo] = (c[e.grupo] || 0) + e.h;
    });
    const ks = Object.keys(sem).sort();
    if (!ks.length) return vazio('Sem dados no filtro atual.');
    const W = 860, H = 280, mL = 44, mR = 10, mT = 10, mB = 30;
    const max = Math.max.apply(null, ks.map((k) => TODOS.reduce((a, g) => a + (sem[k][g] || 0), 0)));
    const topo = Math.max(10, Math.ceil(max / 10) * 10);
    const bw = (W - mL - mR) / ks.length;
    const y = (v) => mT + (H - mT - mB) * (1 - v / topo);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = (topo * i) / 4;
      g += `<line class="trd-grade" x1="${mL}" x2="${W - mR}" y1="${y(v)}" y2="${y(v)}"/><text class="trd-eixo" x="${mL - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v, 0)}</text>`;
    }
    const passo = Math.ceil(ks.length / 10);
    ks.forEach((k, i) => {
      let acc = 0;
      TODOS.forEach((grp) => {
        const v = sem[k][grp] || 0;
        if (!v) return;
        g += `<rect x="${(mL + i * bw + bw * 0.15).toFixed(1)}" y="${y(acc + v).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${(y(acc) - y(acc + v)).toFixed(1)}" fill="${COR[grp]}"><title>${t('Semana de {0} · {1}: {2}', fmtData(k), gr(grp), fmtH(v))}</title></rect>`;
        acc += v;
      });
      if (i % passo === 0) g += `<text class="trd-eixo" x="${(mL + i * bw + bw / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle">${fmtSemana(k)}</text>`;
    });
    return `<svg class="trd-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('Horas monitoradas por semana'))}">${g}</svg>${legenda(TODOS.filter((x) => estado.res.porGrupo[x] > 0).map((x) => ({ t: gr(x), cor: COR[x] })))}`;
  }

  /* ------------------------------ status do trator ------------------------------ */

  function statusPorUsina(estado) {
    const r = estado.res;
    const us = usinasDe(estado).filter((u) => r.statusUsina[u.id]);
    if (!us.length) return vazio('Sem dados no filtro atual.');
    const chaves = ['Autônomo', 'Manual', 'Não disponível'];
    return `<div class="trd-linhas">${us.map((u) => {
      const x = r.statusUsina[u.id];
      return `<div class="trd-linha"><span class="trd-linha__nome">${esc(u.nome)}</span>${barraEmpilhada(chaves.map((k) => ({ t: gr(k), v: x[k], cor: COR_STATUS[k] })), x.total, fmtH(x.total))}</div>`;
    }).join('')}</div>${legenda(chaves.map((k) => ({ t: gr(k), cor: COR_STATUS[k] })))}`;
  }

  function dispSemanal(estado) {
    const serie = estado.res.disp.serie;
    const us = usinasDe(estado).filter((u) => serie[u.id] && serie[u.id].length);
    if (!us.length) return vazio('Sem dados no filtro atual.');
    const semanas = Array.from(new Set([].concat.apply([], us.map((u) => serie[u.id].map((p) => p.semana))))).sort();
    const W = 860, H = 260, mL = 44, mR = 14, mT = 12, mB = 30;
    const x = (i) => mL + ((W - mL - mR) * (semanas.length === 1 ? 0.5 : i / (semanas.length - 1)));
    const minV = Math.min(0.5, Math.min.apply(null, us.map((u) => Math.min.apply(null, serie[u.id].map((p) => p.v)))));
    const piso = Math.floor(minV * 10) / 10;
    const y = (v) => mT + (H - mT - mB) * (1 - (v - piso) / (1 - piso));
    let g = '';
    for (let v = piso; v <= 1.0001; v += 0.1) g += `<line class="trd-grade" x1="${mL}" x2="${W - mR}" y1="${y(v)}" y2="${y(v)}"/><text class="trd-eixo" x="${mL - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v * 100)}%</text>`;
    const passo = Math.ceil(semanas.length / 10);
    semanas.forEach((s, i) => { if (i % passo === 0) g += `<text class="trd-eixo" x="${x(i)}" y="${H - 10}" text-anchor="middle">${fmtSemana(s)}</text>`; });
    us.forEach((u, k) => {
      const cor = SERIES[k % SERIES.length];
      const pts = serie[u.id].map((p) => [x(semanas.indexOf(p.semana)), y(p.v), p]);
      g += `<polyline class="trd-linha-graf" stroke="${cor}" points="${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}"/>`;
      pts.forEach((p) => { g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="${cor}"><title>${t('{0} · semana de {1}: {2}', esc(u.nome), fmtData(p[2].semana), fmtPct(p[2].v))}</title></circle>`; });
    });
    return `<svg class="trd-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('Disponibilidade semanal por usina'))}">${g}</svg>${legenda(us.map((u, k) => ({ t: u.nome, cor: SERIES[k % SERIES.length] })))}
      <p class="muted trd-nota">${esc(t('Disponibilidade da semana = (168 h − horas “Não disponível”) ÷ 168 h, por usina. A média considera só as semanas com eventos.'))}</p>`;
  }

  /* ------------------------------ ofensores ------------------------------ */

  const PARETO_DETALHES_ESTATICO = 8;

  function pareto(estado) {
    const r = estado.res;
    if (!r.pareto.length && !r.aClassificar.n) return vazio('Nenhuma parada no filtro atual.');
    const max = r.pareto.length ? r.pareto[0].h : 1;
    const aberta = estado.ui.causaAberta;
    const linhas = r.pareto.map((c, idx) => {
      const abre = estado.estatico ? idx < PARETO_DETALHES_ESTATICO : aberta === (c.id || c.nome);
      let det = '';
      if (abre) {
        const desc = C.descricoesFrequentes(r.eventos, c.id, estado.estatico ? 3 : 4);
        const lista = desc.length ? desc.map((d) => `${descHtml(d.texto)}${d.n > 1 ? ` <span class="muted">×${d.n}</span>` : ''}`).join(estado.estatico ? '<br>' : ' · ') : `<span class="muted">${esc(t('sem descrição escrita nestes eventos.'))}</span>`;
        const acoes = estado.estatico ? '' : `
          <span class="trd-detalhe__acoes"><button type="button" class="btn btn--ghost btn--small" data-acao="ver-registros" data-causa="${esc(c.id)}">${esc(t('Ver todas as {0}', nf(c.n, 0)))}</button>
          <button type="button" class="btn btn--ghost btn--small" data-acao="filtrar-causa" data-causa="${esc(c.id)}">Filtrar o dashboard por esta causa</button></span>`;
        if (!estado.estatico || desc.length) {
          det = `<div class="trd-detalhe"><strong>${esc(t('O que os técnicos escreveram (mais frequentes):'))}</strong>
          ${lista}${acoes}</div>`;
        }
      }
      const nomeC = causaI(estado, c.id, c.nome);
      const corpo = `<span class="trd-p__nome"><i style="background:${COR[c.grupo]}"></i>${esc(nomeC)}</span>
        <span class="trd-p__barra"><span style="width:${(100 * c.h / max).toFixed(2)}%;background:${COR[c.grupo]}"></span></span>
        <span class="trd-p__h">${fmtH(c.h)}</span><span class="trd-p__acum">${fmtPct(c.acum, 0)}</span>`;
      const cab = estado.estatico
        ? `<div class="trd-p__linha">${corpo}</div>`
        : `<button type="button" class="trd-p__linha" data-acao="abrir-causa" data-causa="${esc(c.id || c.nome)}" aria-expanded="${abre}">${corpo}</button>`;
      return `<div class="trd-p${abre ? ' is-aberta' : ''}">${cab}${det}</div>`;
    }).join('');
    const ac = r.aClassificar.n
      ? `<div class="trd-p"><div class="trd-p__linha trd-p__linha--ac"><span class="trd-p__nome"><i class="trd-pontilhado"></i>${esc(t('A classificar'))}</span><span class="trd-p__barra"><span style="width:${Math.max(1, 100 * r.aClassificar.h / max).toFixed(2)}%;background:var(--tr-ac)"></span></span><span class="trd-p__h">${fmtH(r.aClassificar.h)}</span><span class="trd-p__acum">—</span></div></div>`
      : '';
    const nota = estado.estatico
      ? 'Para as maiores causas, abaixo de cada barra aparece o que os técnicos escreveram. “A classificar” fica fora do Pareto e dos % por responsável até ser revisado.'
      : 'Clique numa causa para ver o que os técnicos escreveram. “A classificar” fica fora do Pareto e dos % por responsável até ser revisado.';
    return `<div class="trd-pareto">${linhas}${ac}</div>
      <p class="muted trd-nota">${esc(t(nota))}</p>`;
  }

  function porResponsavel(estado) {
    const r = estado.res;
    const g3 = ['Cliente', 'ASI/Agricef', 'Não gerenciável'];
    const tot = g3.reduce((a, g) => a + r.porGrupo[g], 0);
    if (!tot) return vazio('Nenhuma parada classificada no filtro atual.');
    return `<div class="trd-resp">${g3.map((g) => `<div class="trd-resp__item" style="border-top-color:${COR[g]}"><span class="trd-resp__rot">${esc(gr(g))}</span><strong>${fmtH(r.porGrupo[g])}</strong><span class="muted">${t('{0} das paradas classificadas', fmtPct(r.porGrupo[g] / tot, 0))}</span></div>`).join('')}</div>`;
  }

  function matrizCausaUsina(estado) {
    const r = estado.res;
    const us = usinasDe(estado).filter((u) => r.porUsina[u.id]);
    const causas = r.pareto.slice(0, 10);
    if (!causas.length || !us.length) return vazio('Sem dados no filtro atual.');
    let max = 0;
    causas.forEach((c) => us.forEach((u) => { max = Math.max(max, (r.causaUsina[c.id || c.nome] || {})[u.id] || 0); }));
    return `<div class="table-wrapper"><table class="data-table trd-matriz"><thead><tr><th>${esc(t('Causa'))}</th>${us.map((u) => `<th class="num">${esc(u.nome)}</th>`).join('')}<th class="num">${esc(t('Total'))}</th></tr></thead><tbody>
      ${causas.map((c) => `<tr><td><i class="trd-quad" style="background:${COR[c.grupo]}"></i>${esc(causaI(estado, c.id, c.nome))}</td>${us.map((u) => {
        const v = (r.causaUsina[c.id || c.nome] || {})[u.id] || 0;
        return `<td class="num"${v ? ` style="background:${calor(v / max, 0.55)}"` : ''}>${v ? fmtH(v) : '—'}</td>`;
      }).join('')}<td class="num"><strong>${fmtH(c.h)}</strong></td></tr>`).join('')}</tbody></table></div>
      <p class="muted trd-nota">${esc(t('Mostra as 10 maiores causas. Quanto mais escuro, mais horas naquela usina.'))}</p>`;
  }

  function bolhas(estado) {
    const fd = C.frequenciaDuracao(estado.res.pareto);
    const P = fd.pontos.map((p) => Object.assign({}, p, { nomeI: causaI(estado, p.id, p.nome) }));
    if (P.length < 2) return vazio('Poucas causas no filtro para comparar frequência e duração.');
    const W = 860, H = 340, mL = 54, mR = 20, mT = 16, mB = 44;
    const maxN = Math.max.apply(null, P.map((p) => p.n)) * 1.12;
    const maxD = Math.max.apply(null, P.map((p) => p.media)) * 1.2;
    const maxH = Math.max.apply(null, P.map((p) => p.h));
    const x = (v) => mL + (W - mL - mR) * (v / maxN);
    const y = (v) => mT + (H - mT - mB) * (1 - v / maxD);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const vy = (maxD * i) / 4, vx = (maxN * i) / 4;
      g += `<line class="trd-grade" x1="${mL}" x2="${W - mR}" y1="${y(vy)}" y2="${y(vy)}"/><text class="trd-eixo" x="${mL - 6}" y="${y(vy) + 4}" text-anchor="end">${nf(vy, 1)}</text>`;
      g += `<text class="trd-eixo" x="${x(vx)}" y="${H - 24}" text-anchor="middle">${nf(vx, 0)}</text>`;
    }
    g += `<line class="trd-mediana" x1="${x(fd.medN)}" x2="${x(fd.medN)}" y1="${mT}" y2="${H - mB}"/><line class="trd-mediana" x1="${mL}" x2="${W - mR}" y1="${y(fd.medH)}" y2="${y(fd.medH)}"/>`;
    g += `<text class="trd-eixo trd-eixo--tit" x="${(mL + W - mR) / 2}" y="${H - 4}" text-anchor="middle">${esc(t('Frequência (nº de paradas)'))}</text>`;
    g += `<text class="trd-eixo trd-eixo--tit" transform="translate(12 ${(mT + H - mB) / 2}) rotate(-90)" text-anchor="middle">${esc(t('Duração média (h)'))}</text>`;
    g += `<text class="trd-quadrante" x="${W - mR - 4}" y="${mT + 12}" text-anchor="end">${esc(t('frequente e longo = prioridade'))}</text>`;
    P.slice().sort((a, b) => b.h - a.h).forEach((p, i) => {
      const rad = 6 + 20 * Math.sqrt(p.h / maxH);
      g += `<circle class="trd-bolha" cx="${x(p.n).toFixed(1)}" cy="${y(p.media).toFixed(1)}" r="${rad.toFixed(1)}" fill="${COR[p.grupo]}"><title>${t('{0}: {1} paradas, média {2} h, total {3}', esc(p.nomeI), nf(p.n, 0), nf(p.media, 2), fmtH(p.h))}</title></circle>`;
      if (i < 6) {
        const noFim = x(p.n) + rad + 8 + p.nomeI.length * 6.2 > W - 4; // sem espaço à direita: rótulo à esquerda
        g += `<text class="trd-rotulo-bolha" x="${(noFim ? x(p.n) - rad - 3 : x(p.n) + rad + 3).toFixed(1)}" y="${(y(p.media) + 4).toFixed(1)}" text-anchor="${noFim ? 'end' : 'start'}">${esc(p.nomeI)}</text>`;
      }
    });
    return `<svg class="trd-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('Frequência por duração das paradas'))}">${g}</svg>
      ${legenda(GRUPOS.slice(1).map((x2) => ({ t: gr(x2), cor: COR[x2] })))}
      <p class="muted trd-nota">${esc(t('Tamanho da bolha = horas totais. Linhas tracejadas = medianas entre as causas exibidas.'))}</p>`;
  }

  /* ------------------------------ tendência (I-MR) ------------------------------ */

  function tendencia(estado) {
    const tr = estado.res.tendencia;
    if (tr.pontos.length < 3) return vazio('Precisa de pelo menos 3 semanas com 5 h ou mais monitoradas para a carta de controle.');
    const W = 860, mL = 46, mR = 92;
    const x = (i) => mL + ((W - mL - mR) * i) / (tr.pontos.length - 1);
    // carta de indivíduos
    const H1 = 300, mT = 14, mB = 30;
    const topo = Math.max(20, Math.ceil(Math.max(tr.lsc, Math.max.apply(null, tr.pontos.map((p) => p.v))) / 20) * 20);
    const y = (v) => mT + (H1 - mT - mB) * (1 - v / topo);
    let g = '';
    for (let v = 0; v <= topo + 0.001; v += topo / 4) g += `<line class="trd-grade" x1="${mL}" x2="${W - mR}" y1="${y(v)}" y2="${y(v)}"/><text class="trd-eixo" x="${mL - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v, 0)}%</text>`;
    g += `<line class="trd-lsc" x1="${mL}" x2="${W - mR}" y1="${y(tr.lsc)}" y2="${y(tr.lsc)}"/><text class="trd-rot-lsc" x="${W - mR + 4}" y="${y(tr.lsc) + 4}">${t('LSC {0}%', nf(tr.lsc, 1))}</text>`;
    if (tr.lic > 0.5) g += `<line class="trd-lsc" x1="${mL}" x2="${W - mR}" y1="${y(tr.lic)}" y2="${y(tr.lic)}"/><text class="trd-rot-lsc" x="${W - mR + 4}" y="${y(tr.lic) + 4}">${t('LIC {0}%', nf(tr.lic, 1))}</text>`;
    g += `<line class="trd-media" x1="${mL}" x2="${W - mR}" y1="${y(tr.media)}" y2="${y(tr.media)}"/><text class="trd-rot-media" x="${W - mR + 4}" y="${y(tr.media) + 4}">${t('Média {0}%', nf(tr.media, 1))}</text>`;
    const passo = Math.ceil(tr.pontos.length / 9);
    tr.pontos.forEach((p, i) => { if (i % passo === 0 || i === tr.pontos.length - 1) g += `<text class="trd-eixo" x="${x(i)}" y="${H1 - 10}" text-anchor="middle">${fmtSemana(p.semana)}</text>`; });
    g += `<polyline class="trd-linha-graf" stroke="var(--tr-serie)" points="${tr.pontos.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>`;
    tr.pontos.forEach((p, i) => {
      const fora = p.v > tr.lsc || p.v < tr.lic;
      g += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${fora ? 5 : 3.2}" fill="${fora ? 'var(--color-danger)' : 'var(--tr-serie)'}"><title>${t('Semana de {0}: {1} autônomo em {2}', fmtData(p.semana), fmtPct100(p.v), fmtH(p.horas))}</title></circle>`;
    });
    // amplitude móvel
    const H2 = 170, mT2 = 12, mB2 = 26;
    const topo2 = Math.max(10, Math.ceil(Math.max(tr.lscMr, Math.max.apply(null, tr.mr.map((m) => m.v))) / 10) * 10);
    const y2 = (v) => mT2 + (H2 - mT2 - mB2) * (1 - v / topo2);
    let g2 = '';
    for (let v = 0; v <= topo2 + 0.001; v += topo2 / 2) g2 += `<line class="trd-grade" x1="${mL}" x2="${W - mR}" y1="${y2(v)}" y2="${y2(v)}"/><text class="trd-eixo" x="${mL - 6}" y="${y2(v) + 4}" text-anchor="end">${nf(v, 0)}</text>`;
    g2 += `<line class="trd-lsc" x1="${mL}" x2="${W - mR}" y1="${y2(tr.lscMr)}" y2="${y2(tr.lscMr)}"/><text class="trd-rot-lsc" x="${W - mR + 4}" y="${y2(tr.lscMr) + 4}">${t('LSC {0}', nf(tr.lscMr, 1))}</text>`;
    g2 += `<line class="trd-media" x1="${mL}" x2="${W - mR}" y1="${y2(tr.mrMedia)}" y2="${y2(tr.mrMedia)}"/><text class="trd-rot-media" x="${W - mR + 4}" y="${y2(tr.mrMedia) + 4}">${t('Média {0}', nf(tr.mrMedia, 1))}</text>`;
    g2 += `<polyline class="trd-linha-graf" stroke="var(--tr-serie)" points="${tr.mr.map((m, i) => `${x(i + 1).toFixed(1)},${y2(m.v).toFixed(1)}`).join(' ')}"/>`;
    tr.mr.forEach((m, i) => { const fora = m.v > tr.lscMr; g2 += `<circle cx="${x(i + 1).toFixed(1)}" cy="${y2(m.v).toFixed(1)}" r="${fora ? 5 : 3}" fill="${fora ? 'var(--color-danger)' : 'var(--tr-serie)'}"><title>${t('Variação para a semana de {0}: {1} p.p.', fmtData(m.semana), nf(m.v, 1))}</title></circle>`; });
    const msg = tr.foraDosLimites
      ? t('{0} {1} dos limites de controle (pontos em vermelho): vale investigar o que mudou nelas.', tr.foraDosLimites, plural(tr.foraDosLimites, 'semana fora', 'semanas fora'))
      : t('Variação normal do processo: nenhuma das {0} semanas saiu dos limites. Para melhorar de forma duradoura é preciso mudar o processo (as causas dos ofensores), não reagir a uma semana ruim.', tr.pontos.length);
    return `<h4 class="trd-sub">${esc(t('Parcela autônoma por semana (%)'))}</h4><svg class="trd-svg" viewBox="0 0 ${W} ${H1}" role="img" aria-label="${esc(t('Carta de indivíduos'))}">${g}</svg>
      <h4 class="trd-sub">${esc(t('Variação entre semanas (amplitude móvel, pontos percentuais)'))}</h4><svg class="trd-svg" viewBox="0 0 ${W} ${H2}" role="img" aria-label="${esc(t('Carta de amplitude móvel'))}">${g2}</svg>
      <p class="muted trd-nota">${esc(msg + t(' Só entram semanas com 5 h ou mais monitoradas. Limites = média ± 2,66 × amplitude móvel média (mínimo 0%, máximo 100%).'))}</p>`;
  }

  /* ------------------------------ hora do dia ------------------------------ */

  function calor(frac, minimo) {
    const p = Math.round(100 * Math.max(0, Math.min(1, frac)) * (1 - (minimo || 0)) + 100 * (minimo || 0));
    return `color-mix(in srgb, var(--heat-max) ${p}%, var(--heat-min))`;
  }

  function horaDoDia(estado) {
    const m = estado.res.hora;
    let max = 0;
    m.forEach((l) => l.forEach((v) => { max = Math.max(max, v); }));
    if (!max) return vazio('Nenhuma operação autônoma no filtro atual.');
    const porHora = new Array(24).fill(0);
    m.forEach((l) => l.forEach((v, h) => { porHora[h] += v; }));
    let pico = 0;
    porHora.forEach((v, h) => { if (v > porHora[pico]) pico = h; });
    const hh = (h) => `${String(h).padStart(2, '0')}h`;
    const DIAS = I.dias();
    let cab = '<span></span>';
    for (let h = 0; h < 24; h++) cab += `<span class="trd-hm__h">${h % 3 === 0 ? h : ''}</span>`;
    const corpo = m.map((l, d) => `<span class="trd-hm__d">${DIAS[d]}</span>${l.map((v, h) => `<span class="trd-hm__c" style="${v > 0.005 ? `background:${calor(v / max, 0.12)}` : ''}" title="${t('{0} {1}–{2}: {3} autônomas', DIAS[d], hh(h), hh((h + 1) % 24), fmtH(v))}"></span>`).join('')}`).join('');
    return `<div class="trd-hm">${cab}${corpo}</div>
      <p class="muted trd-nota">${esc(t('Mais escuro = mais horas. Hora de pico: {0} às {1} ({2}). Cada evento é dividido pelas horas de relógio que cobre.', hh(pico), hh((pico + 1) % 24), fmtH(porHora[pico])))}</p>`;
  }

  /* ------------------------------ implementos ------------------------------ */

  function implementos(estado) {
    const r = estado.res;
    const linhas = Object.keys(r.porImpl).map((id) => Object.assign({ nome: nomeI(estado.listas.implementos, id) }, r.porImpl[id])).sort((a, b) => b.total - a.total);
    if (!linhas.length) return vazio('Sem dados no filtro atual.');
    const maxP = Math.max.apply(null, linhas.map((l) => (l.total ? l.aut / l.total : 0))) || 1;
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>${esc(t('Implemento'))}</th><th class="num">${esc(t('Monit. (h)'))}</th><th class="num">${esc(t('Autônomo (h)'))}</th><th>${esc(t('Parcela autônoma'))}</th><th class="num">%</th></tr></thead><tbody>
      ${linhas.map((l) => { const p = l.total ? l.aut / l.total : 0; return `<tr><td><strong>${esc(l.nome)}</strong></td><td class="num">${nf(l.total, 1)}</td><td class="num">${nf(l.aut, 1)}</td><td><span class="trd-mini"><span style="width:${(100 * p / maxP).toFixed(1)}%"></span></span></td><td class="num">${fmtPct(p)}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }

  /* ------------------------------ registros ------------------------------ */

  const POR_PAGINA = 50;
  const MAX_REGISTROS_ESTATICO = 100;
  const PILL = { 'ASI/Agricef': 'tr-pill--asi', Cliente: 'tr-pill--cli', 'Autônomo': 'tr-pill--aut', 'Não gerenciável': 'tr-pill--ng' };

  function registrosEstatico(estado) {
    const L = estado.listas;
    const lista = estado.res.eventos.slice().sort((a, b) => b.t0 - a.t0);
    const max = estado.maxRegistros || MAX_REGISTROS_ESTATICO;
    const fatia = lista.slice(0, max);
    const em = I.getLang() === 'en';
    const linhas = fatia.map((e) => {
      const ehAut = e.grupo === 'Autônomo';
      const leitura = em && e.descricao ? I.leituraEmIngles(e.descricao).texto : '';
      return `<tr><td>${fmtData(e.data)}</td><td>${esc(nomeI(L.usinas, e.usina_id))}</td><td>${esc(nomeI(L.implementos, e.implemento_id))}</td>
        <td>${fmtHora(e.t0)}–${fmtHora(e.t1)}</td><td class="num">${nf(e.h, 2)}</td>
        <td>${esc(t(ehAut ? 'Autônomo' : (e.disponibilidade || '—')))}</td>
        <td>${e.causa_nome ? esc(causaI(estado, e.causa_id, e.causa_nome)) : `<em class="muted">${esc(t('A classificar'))}</em>`}</td>
        <td><span class="tr-pill ${PILL[e.grupo] || ''}">${esc(e.grupo === 'A classificar' ? '—' : gr(e.grupo))}</span></td>
        <td class="trd-desc">${e.descricao ? esc(e.descricao) : '—'}</td>${em ? `<td class="trd-desc trd-leitura">${esc(leitura)}</td>` : ''}</tr>`;
    }).join('');
    return `<p class="muted">${esc(t('{0} {1} no filtro', nf(lista.length, 0), plural(lista.length, 'evento', 'eventos')))}${lista.length > max ? ` · ${esc(t('Mostrando os {0} eventos mais recentes de {1} no filtro.', nf(max, 0), nf(lista.length, 0)))}` : ''}</p>
      <div class="table-wrapper"><table class="data-table trd-tab-reg"><thead><tr><th>${esc(t('Data'))}</th><th>${esc(t('Usina'))}</th><th>${esc(t('Implemento'))}</th><th>${esc(t('Horário'))}</th><th class="num">${esc(t('Horas'))}</th><th>${esc(t('Status'))}</th><th>${esc(t('Causa padrão'))}</th><th>${esc(t('Responsável'))}</th><th>${esc(t('Descrição escrita pelo técnico'))}</th>${em ? `<th>${esc(t('Leitura em inglês'))}</th>` : ''}</tr></thead><tbody>${linhas}</tbody></table>
      ${lista.length ? '' : vazio('Nenhum evento no filtro atual.')}</div>`;
  }

  function registros(estado) {
    if (estado.estatico) return registrosEstatico(estado);
    const ui = estado.ui;
    const L = estado.listas;
    const termo = C.norm(ui.regBusca || '');
    let lista = estado.res.eventos.slice().sort((a, b) => b.t0 - a.t0);
    if (termo) {
      lista = lista.filter((e) => C.norm([e.descricao, e.causa_nome, e.grupo, nomeDe(L.usinas, e.usina_id), nomeDe(L.implementos, e.implemento_id), e.tecnico, e.data].join(' ')).includes(termo));
    }
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    ui.regPagina = Math.min(Math.max(1, ui.regPagina || 1), paginas);
    const ini = (ui.regPagina - 1) * POR_PAGINA;
    const fatia = lista.slice(ini, ini + POR_PAGINA);
    const linhas = fatia.map((e) => {
      const aberto = ui.regAberto === e.id;
      const ehAut = e.grupo === 'Autônomo';
      return `<tr class="trd-reg${aberto ? ' is-aberta' : ''}" data-acao="abrir-reg" data-id="${esc(e.id)}" tabindex="0">
        <td>${fmtData(e.data)}</td><td>${esc(nomeDe(L.usinas, e.usina_id))}</td><td>${esc(nomeDe(L.implementos, e.implemento_id))}</td>
        <td>${fmtHora(e.t0)}–${fmtHora(e.t1)}</td><td class="num">${nf(e.h, 2)}</td>
        <td>${ehAut ? 'Autônomo' : esc(e.disponibilidade || '—')}</td>
        <td>${e.causa_nome ? esc(e.causa_nome) : '<em class="muted">A classificar</em>'}</td>
        <td><span class="tr-pill ${PILL[e.grupo] || ''}">${esc(e.grupo === 'A classificar' ? '—' : e.grupo)}</span></td></tr>
        ${aberto ? `<tr class="trd-reg-det"><td colspan="8"><strong>Descrição original:</strong> ${e.descricao ? `“${esc(e.descricao)}”` : '<span class="muted">sem descrição</span>'}
          <span class="muted"> · Técnico: ${esc(e.tecnico || '—')}${e.origem ? ` · Origem da causa: ${esc(e.origem)}` : ''}</span></td></tr>` : ''}`;
    }).join('');
    return `<div class="trd-reg-topo"><input type="search" id="trdBuscaReg" placeholder="Buscar por texto, causa, usina…" value="${esc(ui.regBusca || '')}" aria-label="Buscar registros" />
        <span class="muted">${nf(lista.length, 0)} ${plural(lista.length, 'evento', 'eventos')} no filtro</span></div>
      <div class="table-wrapper"><table class="data-table trd-tab-reg"><thead><tr><th>Data</th><th>Usina</th><th>Implemento</th><th>Horário</th><th class="num">Horas</th><th>Status</th><th>Causa padrão</th><th>Responsável</th></tr></thead><tbody>${linhas}</tbody></table>
      ${lista.length ? '' : vazio('Nenhum evento no filtro atual.')}</div>
      <div class="trd-pag"><button type="button" class="btn btn--ghost btn--small" data-acao="pag" data-d="-1"${ui.regPagina <= 1 ? ' disabled' : ''}>Anterior</button>
        <span>Página ${ui.regPagina} de ${paginas}</span><button type="button" class="btn btn--ghost btn--small" data-acao="pag" data-d="1"${ui.regPagina >= paginas ? ' disabled' : ''}>Próxima</button></div>
      <p class="muted trd-nota">A descrição escrita pelo técnico aparece ao clicar na linha.</p>`;
  }

  /* ------------------------------ montagem das abas ------------------------------ */

  const card = (titulo, sub, corpo, extra) => `<section class="trd-card${extra ? ' ' + extra : ''}"><h3>${esc(t(titulo))}</h3>${sub ? `<p class="muted trd-sub-card">${esc(t(sub))}</p>` : ''}${corpo}</section>`;

  const ABAS = {
    resumo: (s) => `${aviso(s)}${kpis(s)}<div class="trd-duas">${card('Principais achados', 'Texto gerado dos dados do filtro atual; cada etiqueta indica quem pode agir.', achados(s))}${card('Tempo monitorado por usina', 'Participação de cada grupo; passe o mouse para ver as horas.', blocoUsinas(s))}</div>`,
    tempo: (s) => `${aviso(s)}${card('Tempo monitorado por usina', 'Participação de cada grupo no tempo monitorado.', blocoUsinas(s))}${card('Horas monitoradas por semana', 'Semana de segunda a domingo, empilhada por grupo.', semanasEmpilhadas(s))}`,
    status: (s) => `${card('Status do trator por usina', 'Horas em que o trator estava autônomo, em modo manual ou não disponível.', statusPorUsina(s))}${card('Disponibilidade semanal', 'Uma linha por usina.', dispSemanal(s))}`,
    ofensores: (s) => `${aviso(s)}${card('Ofensores (Pareto)', 'Horas paradas por causa padrão e % acumulado.', pareto(s))}<div class="trd-duas">${card('Quem pode agir', 'Paradas classificadas por responsável.', porResponsavel(s))}${card('Causas por usina', 'Onde cada ofensor pesa mais.', matrizCausaUsina(s))}</div>${card('Frequência × duração', 'Causas frequentes e longas pedem ação primeiro.', bolhas(s))}`,
    tendencia: (s) => card('Tendência semanal da operação autônoma', 'Carta de controle I-MR sobre a parcela autônoma por semana.', tendencia(s)),
    hora: (s) => card('Hora do dia × dia da semana', 'Horas em operação autônoma em cada hora do dia.', horaDoDia(s)),
    implementos: (s) => card('Resultado por implemento', 'Tempo monitorado e parcela autônoma de cada implemento.', implementos(s)),
    registros: (s) => card('Registros', 'Todos os eventos do filtro atual, mais recentes primeiro.', registros(s)),
  };

  /** HTML de uma análise (sem ligar eventos), no idioma ativo. `estado.estatico` = versão para relatório. */
  function secao(nome, estado) {
    const montar = ABAS[nome];
    return montar ? montar(estado) : '';
  }

  function aba(nome, el, estado, cb) {
    const montar = ABAS[nome];
    if (!montar) { el.innerHTML = ''; return; }
    el.innerHTML = estado.res.nEventos === 0 && estado.res.turnos.length === 0 && estado.base.eventos.length === 0
      ? vazio('Ainda não há eventos registrados. Quando os técnicos lançarem turnos no app (ou o histórico for migrado), os gráficos aparecem aqui.')
      : montar(estado);
    ligar(el, estado, cb);
  }

  function ligar(el, estado, cb) {
    const ui = estado.ui;
    el.querySelectorAll('[data-acao="revisar"]').forEach((b) => b.addEventListener('click', () => cb.irPara('registros', { revisao: 'a-classificar' })));
    el.querySelectorAll('[data-acao="abrir-causa"]').forEach((b) => b.addEventListener('click', () => {
      ui.causaAberta = ui.causaAberta === b.dataset.causa ? null : b.dataset.causa;
      cb.rerender();
    }));
    el.querySelectorAll('[data-acao="filtrar-causa"]').forEach((b) => b.addEventListener('click', () => cb.setFiltro({ causa: b.dataset.causa })));
    el.querySelectorAll('[data-acao="ver-registros"]').forEach((b) => b.addEventListener('click', () => cb.irPara('registros', { causa: b.dataset.causa })));
    el.querySelectorAll('[data-acao="abrir-reg"]').forEach((tr) => {
      const abre = () => { ui.regAberto = ui.regAberto === tr.dataset.id ? null : tr.dataset.id; cb.rerender(); };
      tr.addEventListener('click', abre);
      tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abre(); } });
    });
    el.querySelectorAll('[data-acao="pag"]').forEach((b) => b.addEventListener('click', () => { ui.regPagina = (ui.regPagina || 1) + Number(b.dataset.d); ui.regAberto = null; cb.rerender(); }));
    const busca = el.querySelector('#trdBuscaReg');
    if (busca) {
      busca.addEventListener('input', () => {
        ui.regBusca = busca.value;
        ui.regPagina = 1;
        const pos = busca.selectionStart;
        cb.rerender();
        const novo = document.getElementById('trdBuscaReg');
        if (novo) { novo.focus(); novo.setSelectionRange(pos, pos); }
      });
    }
  }

  return { barraFiltros, aba, secao, paraCalc, filtrosPadrao, ABAS_LISTA: Object.keys(ABAS) };
})();

window.TratorDash = TratorDash;
