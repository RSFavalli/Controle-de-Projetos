/**
 * trator.js
 * ------------------------------------------------------------------
 * Telas do Dashboard Admin da equipe "Trator Autônomo" (tipo "trator" em
 * js/teams.js). Fase 1: aba Listas — causas (com responsável), dicionário,
 * implementos, tratores, usinas, metas e técnicos, com ativar/desativar.
 *
 * É carregado junto do dashboard, mas só entra em ação quando o time ativo
 * é do tipo "trator" (app.js chama TratorAdmin.enter). As telas de Registro
 * de Tempo dos outros times não são tocadas.
 *
 * Itens nunca são apagados, só desativados: o histórico guarda o id do item
 * e precisa continuar mostrando o nome.
 * ------------------------------------------------------------------
 */

const TratorAdmin = (() => {
  let ctx = null;
  let data = null;
  let listaAtiva = 'causas';
  let busca = '';
  let edicao = null; // { lista, item|null }

  // Dashboard (Fase 4)
  let abaAtiva = 'resumo';
  let dados = null; // { turnos, eventos } crus do backend
  let base = null; // TratorCalc.preparar(dados)
  let filtros = null;
  let ui = {};
  let atualizadoEm = null;

  const ICONES = {
    resumo: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    tempo: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/>',
    status: '<path d="M4 18V9M10 18V5M16 18v-7M21 18H3" stroke-linecap="round"/>',
    ofensores: '<path d="M5 20V10M11 20V4M17 20v-6" stroke-linecap="round"/>',
    tendencia: '<path d="M3 17l5-6 4 3 8-9" stroke-linecap="round" stroke-linejoin="round"/>',
    hora: '<path d="M4 6h16M4 12h16M4 18h16M9 4v16M15 4v16" stroke-linecap="round"/>',
    implementos: '<path d="M4 7h16M4 12h10M4 17h13" stroke-linecap="round"/>',
    registros: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7" stroke-linecap="round" stroke-linejoin="round"/>',
    listas: '<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01" stroke-linecap="round" stroke-linejoin="round"/>',
    migracao: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const ABAS_NAV = [
    ['resumo', 'Resumo'], ['tempo', 'Tempo monitorado'], ['status', 'Status do trator'], ['ofensores', 'Ofensores'],
    ['tendencia', 'Tendência'], ['hora', 'Hora do dia'], ['implementos', 'Implementos'], ['registros', 'Registros'], ['migracao', 'Migração'], ['listas', 'Listas'],
  ];

  const RESP_CLASSE = {
    'ASI/Agricef': 'tr-pill--asi',
    Cliente: 'tr-pill--cli',
    'Autônomo': 'tr-pill--aut',
    'Não gerenciável': 'tr-pill--ng',
  };

  // Só estes erros derrubam a sessão; erros de validação (ex.: "Valor inválido")
  // aparecem no formulário.
  function isAuthError(err) {
    return /E-mail ou senha inválidos|não tem permissão de administrador|usuário está inativo|Muitas tentativas/i.test((err && err.message) || '');
  }

  function esc(v) {
    const d = document.createElement('div');
    d.textContent = v == null ? '' : String(v);
    return d.innerHTML;
  }

  function norm(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function fmtNum(n, casas) {
    if (n === '' || n == null || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: casas == null ? 2 : casas });
  }

  function nomeDe(lista, id) {
    const x = ((data && data[lista]) || []).find((i) => i.id === id);
    return x ? x.nome : id || '—';
  }

  function pillResp(r) {
    return `<span class="tr-pill ${RESP_CLASSE[r] || ''}">${esc(r || '—')}</span>`;
  }

  function pillStatus(ativo) {
    return ativo
      ? '<span class="status-pill status-pill--active">Ativo</span>'
      : '<span class="status-pill status-pill--inactive">Inativo</span>';
  }

  const PAPEL_TXT = { admin: 'Administrador', tecnico: 'Técnico' };

  /* ----------------------- Definição de cada lista ----------------------- */

  const usinasOpts = () => data.usinas.filter((u) => u.ativo).map((u) => ({ v: u.id, t: u.nome }));

  const DEFS = {
    causas: {
      rotulo: 'Causas',
      fem: true,
      singular: 'causa',
      desc: 'A causa define sozinha quem pode agir sobre a parada (responsável). O nome em inglês é usado nos relatórios exportados em inglês.',
      novo: '+ Nova causa',
      itens: () => data.causas.slice().sort((a, b) => (Number(a.ordem) || 999) - (Number(b.ordem) || 999) || a.nome.localeCompare(b.nome, 'pt-BR')),
      colunas: [
        { t: 'Nome', v: (x) => `<strong>${esc(x.nome)}</strong>` },
        { t: 'Nome em inglês', v: (x) => esc(x.nome_en || '—') },
        { t: 'Responsável', v: (x) => pillResp(x.responsavel) },
        { t: 'Aparece em', v: (x) => [x.uso_manual ? 'Operação manual' : '', x.uso_parada ? 'Parada' : ''].filter(Boolean).map((r) => `<span class="tr-pill tr-pill--ng">${r}</span>`).join(' ') || '—' },
        { t: 'Ordem', v: (x) => esc(x.ordem === '' ? '—' : x.ordem) },
      ],
      textoBusca: (x) => `${x.nome} ${x.nome_en} ${x.responsavel}`,
      campos: [
        { k: 'nome', label: 'Nome', tipo: 'text', req: true },
        { k: 'nome_en', label: 'Nome em inglês', tipo: 'text', ajuda: 'Se não houver o termo correto em inglês, descreva a atividade.' },
        { k: 'responsavel', label: 'Responsável', tipo: 'select', req: true, opcoes: () => data.responsaveis.map((r) => ({ v: r, t: r })) },
        { k: 'ordem', label: 'Ordem na lista', tipo: 'number', min: 0, step: 1 },
        { k: 'uso_manual', label: 'Aparece em “Operação manual”', tipo: 'checkbox', padrao: false, ajuda: 'Lista de causas do botão Operação manual no app. “Outras” sempre aparece no fim.' },
        { k: 'uso_parada', label: 'Aparece em “Parada”', tipo: 'checkbox', padrao: true, ajuda: 'Lista de causas do botão Parada no app.' },
        { k: 'ativo', label: 'Ativa', tipo: 'checkbox', padrao: true },
      ],
      padrao: () => ({ ativo: true, uso_parada: true, uso_manual: false, ordem: (data.causas.reduce((m, c) => Math.max(m, Number(c.ordem) || 0), 0) + 1) }),
    },
    dicionario: {
      rotulo: 'Dicionário',
      fem: true,
      singular: 'expressão',
      desc: 'Expressões que o sistema procura na descrição escrita pelo técnico para definir a causa. A fila “A classificar” (Fase 3) usa estas regras.',
      novo: '+ Nova expressão',
      itens: () => data.dicionario.slice().sort((a, b) => nomeDe('causas', a.causa_id).localeCompare(nomeDe('causas', b.causa_id), 'pt-BR') || a.expressao.localeCompare(b.expressao, 'pt-BR')),
      colunas: [
        { t: 'Expressão', v: (x) => `<strong>“${esc(x.expressao)}”</strong>` },
        { t: 'Causa padrão', v: (x) => esc(nomeDe('causas', x.causa_id)) },
        { t: 'Responsável', v: (x) => { const c = data.causas.find((i) => i.id === x.causa_id); return pillResp(c && c.responsavel); } },
        { t: 'Peso', v: (x) => fmtNum(x.peso) },
        { t: 'Origem', v: (x) => esc(x.origem === 'seed' ? 'Histórico' : x.origem === 'admin' ? 'Admin' : x.origem || '—') },
      ],
      textoBusca: (x) => `${x.expressao} ${nomeDe('causas', x.causa_id)}`,
      campos: [
        { k: 'expressao', label: 'Expressão (trecho do texto)', tipo: 'text', req: true, ajuda: 'Não diferencia maiúsculas nem acentos. Mínimo de 3 letras.' },
        { k: 'causa_id', label: 'Causa padrão', tipo: 'select', req: true, opcoes: () => data.causas.filter((c) => c.ativo).map((c) => ({ v: c.id, t: c.nome })) },
        { k: 'peso', label: 'Peso', tipo: 'number', min: 0.1, step: 0.1, padrao: 1, ajuda: 'Expressões mais específicas podem ter peso maior.' },
        { k: 'ativo', label: 'Ativa', tipo: 'checkbox', padrao: true },
      ],
      padrao: () => ({ ativo: true, peso: 1 }),
    },
    implementos: {
      rotulo: 'Implementos',
      fem: false,
      singular: 'implemento',
      desc: 'Implementos que o técnico escolhe ao iniciar o turno.',
      novo: '+ Novo implemento',
      itens: () => data.implementos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      colunas: [
        { t: 'Nome', v: (x) => `<strong>${esc(x.nome)}</strong>` },
        { t: 'Nome em inglês', v: (x) => esc(x.nome_en || '—') },
      ],
      textoBusca: (x) => `${x.nome} ${x.nome_en}`,
      campos: [
        { k: 'nome', label: 'Nome', tipo: 'text', req: true },
        { k: 'nome_en', label: 'Nome em inglês', tipo: 'text' },
        { k: 'ativo', label: 'Ativo', tipo: 'checkbox', padrao: true },
      ],
      padrao: () => ({ ativo: true }),
    },
    tratores: {
      rotulo: 'Tratores',
      fem: false,
      singular: 'trator',
      desc: 'Tratores de cada usina. Cada usina tem um “Trator TESTE (simulação)” criado automaticamente para treinos e simulações. O “Trator (histórico)” existe só para ancorar os dados migrados das planilhas e fica inativo.',
      novo: '+ Novo trator',
      itens: () => data.tratores.slice().sort((a, b) => nomeDe('usinas', a.usina_id).localeCompare(nomeDe('usinas', b.usina_id), 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR')),
      colunas: [
        { t: 'Usina', v: (x) => esc(nomeDe('usinas', x.usina_id)) },
        { t: 'Nome', v: (x) => `<strong>${esc(x.nome)}</strong>${x.teste ? ' <span class="tr-pill tr-pill--ng">teste</span>' : ''}` },
      ],
      textoBusca: (x) => `${nomeDe('usinas', x.usina_id)} ${x.nome}`,
      campos: [
        { k: 'usina_id', label: 'Usina', tipo: 'select', req: true, opcoes: usinasOpts },
        { k: 'nome', label: 'Nome ou identificação', tipo: 'text', req: true },
        { k: 'teste', label: 'Trator de teste', tipo: 'checkbox', padrao: false, ajuda: 'Usado em simulações: aparece no app, mas só entra no dashboard em “Trator de teste”, nunca nos dados reais.' },
        { k: 'ativo', label: 'Ativo', tipo: 'checkbox', padrao: true },
      ],
      padrao: () => ({ ativo: true, teste: false }),
    },
    usinas: {
      rotulo: 'Usinas',
      fem: true,
      singular: 'usina',
      desc: 'Usinas atendidas. O nome é mantido como está em todos os idiomas.',
      novo: '+ Nova usina',
      itens: () => data.usinas.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      colunas: [
        { t: 'Nome', v: (x) => `<strong>${esc(x.nome)}</strong>` },
        { t: 'Tratores ativos', v: (x) => String(data.tratores.filter((t) => t.usina_id === x.id && t.ativo).length) },
      ],
      textoBusca: (x) => x.nome,
      campos: [
        { k: 'nome', label: 'Nome', tipo: 'text', req: true },
        { k: 'ativo', label: 'Ativa', tipo: 'checkbox', padrao: true },
      ],
      padrao: () => ({ ativo: true }),
    },
    metas: {
      rotulo: 'Metas',
      fem: true,
      singular: 'meta',
      desc: 'Meta de hectares autônomos por turno, por usina e implemento. A referência dentro do turno é proporcional (25% da meta a cada 2 horas de um turno de 8 h).',
      novo: '+ Nova meta',
      itens: () => data.metas.slice().sort((a, b) => nomeDe('usinas', a.usina_id).localeCompare(nomeDe('usinas', b.usina_id), 'pt-BR') || nomeDe('implementos', a.implemento_id).localeCompare(nomeDe('implementos', b.implemento_id), 'pt-BR')),
      colunas: [
        { t: 'Usina', v: (x) => esc(nomeDe('usinas', x.usina_id)) },
        { t: 'Implemento', v: (x) => `<strong>${esc(nomeDe('implementos', x.implemento_id))}</strong>` },
        { t: 'Ha por turno', v: (x) => fmtNum(x.ha_turno) },
        { t: 'Horas do turno', v: (x) => fmtNum(x.horas_turno) },
        { t: 'Referência a cada 2 h', v: (x) => `${fmtNum((Number(x.ha_turno) * 2) / Number(x.horas_turno), 2)} ha` },
      ],
      textoBusca: (x) => `${nomeDe('usinas', x.usina_id)} ${nomeDe('implementos', x.implemento_id)}`,
      campos: [
        { k: 'usina_id', label: 'Usina', tipo: 'select', req: true, opcoes: usinasOpts },
        { k: 'implemento_id', label: 'Implemento', tipo: 'select', req: true, opcoes: () => data.implementos.filter((i) => i.ativo).map((i) => ({ v: i.id, t: i.nome })) },
        { k: 'ha_turno', label: 'Hectares por turno', tipo: 'number', req: true, min: 0.1, step: 0.1 },
        { k: 'horas_turno', label: 'Horas do turno', tipo: 'number', req: true, min: 1, max: 24, step: 0.5, padrao: 8 },
        { k: 'ativo', label: 'Ativa', tipo: 'checkbox', padrao: true },
      ],
      padrao: () => ({ ativo: true, horas_turno: 8 }),
    },
    tecnicos: {
      rotulo: 'Técnicos',
      fem: false,
      singular: 'usuário',
      desc: 'Quem acessa o app de campo (técnico) e este dashboard (administrador). A senha é guardada só como hash; deixe em branco ao editar para manter a atual.',
      novo: '+ Novo usuário',
      salvar: 'saveTecnico',
      itens: () => data.tecnicos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      colunas: [
        { t: 'Nome', v: (x) => `<strong>${esc(x.nome)}</strong>` },
        { t: 'E-mail', v: (x) => esc(x.email) },
        { t: 'Perfil', v: (x) => esc(PAPEL_TXT[x.papel] || x.papel) },
      ],
      textoBusca: (x) => `${x.nome} ${x.email}`,
      campos: [
        { k: 'nome', label: 'Nome', tipo: 'text', req: true },
        { k: 'email', label: 'E-mail (login)', tipo: 'email', req: true },
        { k: 'papel', label: 'Perfil', tipo: 'select', req: true, opcoes: () => [{ v: 'tecnico', t: 'Técnico (app de campo)' }, { v: 'admin', t: 'Administrador (dashboard)' }] },
        { k: 'senha', label: 'Senha', tipo: 'password', ajuda: 'Mínimo de 8 caracteres. Em branco ao editar = manter a atual.' },
        { k: 'ativo', label: 'Ativo', tipo: 'checkbox', padrao: true },
      ],
      padrao: () => ({ ativo: true, papel: 'tecnico' }),
    },
  };

  const ORDEM = ['causas', 'dicionario', 'implementos', 'tratores', 'usinas', 'metas', 'tecnicos'];

  /* ------------------------------- Entrada -------------------------------- */

  function enter(contexto) {
    ctx = contexto;
    data = null;
    dados = null;
    base = null;
    filtros = null;
    ui = {};
    edicao = null;
    busca = '';
    const root = document.getElementById('tratorRoot');
    // O overlay de carregamento do dashboard cobre o painel visível: deixa só
    // o painel da equipe visível.
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('hidden', p.id !== 'tratorRoot'));
    root.classList.remove('hidden');
    root.innerHTML = `
      <div class="panel-header tr-topo"><h2 id="trTitulo"></h2>
        <div class="tr-topo__acoes"><span class="muted" id="trAtualizado"></span>
          <span class="tr-topo__export hidden" id="trExportBtns"><button type="button" class="btn btn--ghost btn--small no-print" id="trExportPdf">Exportar PDF</button><button type="button" class="btn btn--ghost btn--small no-print" id="trExportHtml">Compartilhar em HTML</button></span>
          <button type="button" class="btn btn--ghost btn--small" id="trAtualizar">Atualizar dados</button></div></div>
      <div id="trFiltros" class="hidden"></div>
      <div id="trAnalise"></div>
      <div id="trListasWrap" class="hidden">
        <p class="muted tr-intro">Cadastros que alimentam o app de campo e o dashboard. Nada é apagado: itens que saem de uso são desativados.</p>
        <div class="tr-seg" id="trSeg" role="tablist" aria-label="Listas"></div>
        <div id="trCorpo"></div>
      </div>`;
    document.getElementById('trAtualizar').addEventListener('click', () => load());
    window.TratorExport.init({
      toast: (msg, tipo) => ctx.toast(msg, tipo),
      getContexto: () => ({ base, listas: listasDash(), filtros, abaAtiva, dados }),
    });
    document.getElementById('trExportPdf').addEventListener('click', () => window.TratorExport.abrir('pdf'));
    document.getElementById('trExportHtml').addEventListener('click', () => window.TratorExport.abrir('html'));
    desenharNav();
    load();
  }

  function desenharNav() {
    const nav = document.getElementById('tratorNav');
    nav.innerHTML = ABAS_NAV.map(([k, rot]) =>
      `<button type="button" class="trnav-button${k === abaAtiva ? ' is-active' : ''}" data-trator-tab="${k}" role="tab" aria-selected="${k === abaAtiva}">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${ICONES[k]}</svg>${esc(rot)}</button>`
    ).join('');
    nav.querySelectorAll('.trnav-button').forEach((b) => b.addEventListener('click', () => irPara(b.dataset.tratorTab)));
  }

  function irPara(aba, patchFiltros) {
    abaAtiva = aba;
    if (patchFiltros && filtros) Object.assign(filtros, patchFiltros, { atalho: filtros.atalho });
    ui.regPagina = 1;
    ui.regAberto = null;
    desenharNav();
    render();
  }

  async function load() {
    ctx.beginLoading();
    try {
      const sessao = ctx.getSession();
      const [init, dd] = await Promise.all([
        Api.call('loadTratorInit', sessao),
        // Backend ainda sem a Fase 4 (Code.gs antigo): as Listas continuam funcionando.
        Api.call('loadTratorDados', sessao).catch((e) => {
          if (/Ação desconhecida/.test(e.message)) return null;
          throw e;
        }),
      ]);
      data = init;
      dados = dd;
      base = window.TratorCalc.preparar(dados || { turnos: [], eventos: [] });
      if (!filtros) filtros = window.TratorDash.filtrosPadrao(listasDash());
      atualizadoEm = new Date();
      render();
    } catch (err) {
      if (isAuthError(err)) {
        ctx.onAuthError();
      } else {
        ctx.toast(`Erro ao carregar dados: ${err.message}`, 'error');
        document.getElementById('trFiltros').classList.add('hidden');
        document.getElementById('trListasWrap').classList.add('hidden');
        const a = document.getElementById('trAnalise');
        a.innerHTML =
          `<p class="empty-state">Não deu para carregar: ${esc(err.message)}</p>` +
          '<p><button type="button" class="btn btn--start btn--small" id="trRetry">Tentar novamente</button></p>';
        document.getElementById('trRetry').addEventListener('click', load);
      }
    } finally {
      ctx.endLoading();
    }
  }

  function listasDash() {
    return { usinas: data.usinas, tratores: data.tratores, implementos: data.implementos, causas: data.causas };
  }

  const TITULOS = {
    resumo: 'Resumo', tempo: 'Tempo monitorado', status: 'Status do trator', ofensores: 'Ofensores', tendencia: 'Tendência',
    hora: 'Hora do dia', implementos: 'Implementos', registros: 'Registros', migracao: 'Migração do histórico', listas: 'Listas',
  };

  /* ------------------------------- Renderização ------------------------------- */

  function render() {
    if (!data) return;
    document.getElementById('trTitulo').textContent = TITULOS[abaAtiva] || '';
    document.getElementById('trAtualizado').textContent = atualizadoEm
      ? `Atualizado às ${String(atualizadoEm.getHours()).padStart(2, '0')}:${String(atualizadoEm.getMinutes()).padStart(2, '0')}`
      : '';
    const ehListas = abaAtiva === 'listas';
    const ehMigracao = abaAtiva === 'migracao';
    // Exportar só nas análises, quando já há dados carregados.
    document.getElementById('trExportBtns').classList.toggle('hidden', ehListas || ehMigracao || !dados);
    document.getElementById('trListasWrap').classList.toggle('hidden', !ehListas);
    document.getElementById('trAnalise').classList.toggle('hidden', ehListas);
    document.getElementById('trFiltros').classList.toggle('hidden', ehListas || ehMigracao);
    if (ehListas) {
      renderListas();
      return;
    }
    if (ehMigracao) {
      document.getElementById('trFiltros').classList.add('hidden');
      renderMigracao();
      return;
    }
    if (!dados) {
      document.getElementById('trFiltros').classList.add('hidden');
      document.getElementById('trAnalise').innerHTML =
        '<p class="empty-state">O backend desta equipe ainda não tem a Fase 4. Cole o <code>Code.gs</code> novo no Apps Script e publique uma nova versão da implantação (veja SETUP-TRATOR.md). As Listas continuam funcionando.</p>';
      return;
    }
    renderAnalise();
  }

  function renderMigracao() {
    window.TratorMigracao.render(document.getElementById('trAnalise'), {
      api: (acao, extra) => Api.call(acao, Object.assign({}, ctx.getSession(), extra)),
      isAuthError,
      onAuthError: () => ctx.onAuthError(),
      beginLoading: () => ctx.beginLoading(),
      endLoading: () => ctx.endLoading(),
      irPara: (aba) => irPara(aba),
      onGravado: async () => {
        // recarrega listas e dados para os gráficos já usarem o histórico
        try {
          const sessao = ctx.getSession();
          const novos = await Api.call('loadTratorDados', sessao);
          dados = novos;
          base = window.TratorCalc.preparar(dados);
          atualizadoEm = new Date();
          document.getElementById('trAtualizado').textContent = 'Dados atualizados';
        } catch (err) {
          ctx.toast(`Histórico gravado, mas não deu para recarregar os gráficos: ${err.message}`, 'error');
        }
      },
    });
  }

  function renderAnalise() {
    const L = listasDash();
    const D = window.TratorDash;
    const res = window.TratorCalc.resumo(base, D.paraCalc(filtros, L));
    const estado = { res, listas: L, filtros, ui, base };
    const cb = {
      setFiltro: (patch) => { Object.assign(filtros, patch); renderAnalise(); },
      irPara,
      rerender: () => renderAnalise(),
    };
    D.barraFiltros(document.getElementById('trFiltros'), estado, cb);
    D.aba(abaAtiva, document.getElementById('trAnalise'), estado, cb);
  }

  function renderListas() {
    const seg = document.getElementById('trSeg');
    seg.innerHTML = ORDEM.map((k) =>
      `<button type="button" class="tr-seg__btn${k === listaAtiva ? ' is-active' : ''}" data-lista="${k}" role="tab">${esc(DEFS[k].rotulo)}</button>`
    ).join('');
    seg.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        listaAtiva = b.dataset.lista;
        busca = '';
        edicao = null;
        renderListas();
      })
    );
    renderLista();
  }

  function renderLista() {
    const def = DEFS[listaAtiva];
    const itens = def.itens();
    const filtro = norm(busca).trim();
    const visiveis = filtro ? itens.filter((x) => norm(def.textoBusca(x)).includes(filtro)) : itens;
    const corpo = document.getElementById('trCorpo');

    corpo.innerHTML = `
      <div class="tr-lista-topo">
        <p class="muted">${esc(def.desc)}</p>
        <div class="tr-lista-acoes">
          <input type="search" id="trBusca" placeholder="Filtrar…" aria-label="Filtrar ${esc(def.rotulo)}" value="${esc(busca)}" />
          <button type="button" class="btn btn--start btn--small" id="trNovo">${esc(def.novo)}</button>
        </div>
      </div>
      <div id="trForm"></div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>${def.colunas.map((c) => `<th>${esc(c.t)}</th>`).join('')}<th>Status</th><th></th></tr></thead>
          <tbody>
            ${visiveis.map((x) => `
              <tr class="${x.ativo ? '' : 'tr-inativo'}" data-id="${esc(x.id)}">
                ${def.colunas.map((c) => `<td>${c.v(x)}</td>`).join('')}
                <td>${pillStatus(x.ativo)}</td>
                <td><div class="row-actions">
                  <button type="button" data-acao="editar">Editar</button>
                  <button type="button" data-acao="alternar">${x.ativo ? 'Desativar' : 'Ativar'}</button>
                </div></td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${visiveis.length === 0 ? `<p class="empty-state">${filtro ? 'Nada encontrado para o filtro.' : `${def.fem ? 'Nenhuma' : 'Nenhum'} ${esc(def.singular)} cadastrad${def.fem ? 'a' : 'o'} ainda.`}</p>` : ''}
      </div>
      <p class="muted tr-contagem">${visiveis.length} de ${itens.length} ${esc(def.rotulo.toLowerCase())}</p>`;

    const campoBusca = document.getElementById('trBusca');
    campoBusca.addEventListener('input', () => {
      busca = campoBusca.value;
      const pos = campoBusca.selectionStart;
      renderLista();
      const novo = document.getElementById('trBusca');
      novo.focus();
      novo.setSelectionRange(pos, pos);
    });
    document.getElementById('trNovo').addEventListener('click', () => abrirForm(null));
    corpo.querySelectorAll('tbody tr').forEach((tr) => {
      const item = itens.find((x) => x.id === tr.dataset.id);
      tr.querySelector('[data-acao="editar"]').addEventListener('click', () => abrirForm(item));
      tr.querySelector('[data-acao="alternar"]').addEventListener('click', () => alternarAtivo(item));
    });
    if (edicao) desenharForm();
  }

  function abrirForm(item) {
    edicao = { lista: listaAtiva, item };
    desenharForm();
    const f = document.querySelector('#trForm input, #trForm select');
    if (f) f.focus();
  }

  function desenharForm() {
    const def = DEFS[edicao.lista];
    const base = edicao.item ? Object.assign({}, edicao.item) : def.padrao();
    const campos = def.campos.map((c) => {
      const id = `trf_${c.k}`;
      const valor = base[c.k] === undefined ? (c.padrao === undefined ? '' : c.padrao) : base[c.k];
      if (c.tipo === 'checkbox') {
        return `<div class="field field--checkbox"><label><input type="checkbox" id="${id}" ${valor ? 'checked' : ''} /> ${esc(c.label)}</label>${c.ajuda ? `<p class="field-hint">${esc(c.ajuda)}</p>` : ''}</div>`;
      }
      if (c.tipo === 'select') {
        const opcoes = c.opcoes();
        // Mantém a opção atual mesmo se ela estiver desativada (edição de item antigo).
        const atual = valor && !opcoes.find((o) => o.v === valor) ? [{ v: valor, t: nomeAtual(c.k, valor) }] : [];
        return `<div class="field"><label for="${id}">${esc(c.label)}</label>
          <select id="${id}" ${c.req ? 'required' : ''}>
            <option value="">Selecione…</option>
            ${atual.concat(opcoes).map((o) => `<option value="${esc(o.v)}" ${o.v === valor ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}
          </select>${c.ajuda ? `<p class="field-note">${esc(c.ajuda)}</p>` : ''}</div>`;
      }
      const attrs = [
        c.min !== undefined ? `min="${c.min}"` : '',
        c.max !== undefined ? `max="${c.max}"` : '',
        c.step !== undefined ? `step="${c.step}"` : '',
        c.req ? 'required' : '',
        c.tipo === 'password' ? 'autocomplete="new-password"' : '',
        c.tipo === 'password' && edicao.item ? 'placeholder="Deixe em branco para manter a atual"' : '',
      ].join(' ');
      const v = c.tipo === 'password' ? '' : valor;
      return `<div class="field"><label for="${id}">${esc(c.label)}</label>
        <input type="${c.tipo}" id="${id}" value="${esc(v)}" ${attrs} />${c.ajuda ? `<p class="field-note">${esc(c.ajuda)}</p>` : ''}</div>`;
    }).join('');

    document.getElementById('trForm').innerHTML = `
      <form class="inline-form" id="trFormEl" novalidate>
        <h3 class="tr-form-titulo">${edicao.item ? 'Editar' : (def.fem ? 'Nova' : 'Novo')} ${esc(def.singular)}</h3>
        ${campos}
        <p class="tr-erro hidden" id="trErro" role="alert"></p>
        <div class="inline-form__actions">
          <button type="submit" class="btn btn--start btn--small" id="trSalvar">Salvar</button>
          <button type="button" class="btn btn--ghost btn--small" id="trCancelar">Cancelar</button>
        </div>
      </form>`;
    document.getElementById('trCancelar').addEventListener('click', () => {
      edicao = null;
      document.getElementById('trForm').innerHTML = '';
    });
    document.getElementById('trFormEl').addEventListener('submit', onSalvar);
  }

  function nomeAtual(campo, valor) {
    if (campo === 'usina_id') return nomeDe('usinas', valor);
    if (campo === 'implemento_id') return nomeDe('implementos', valor);
    if (campo === 'causa_id') return nomeDe('causas', valor);
    return valor;
  }

  /* --------------------------------- Ações --------------------------------- */

  function coletar(def) {
    const v = {};
    def.campos.forEach((c) => {
      const el = document.getElementById(`trf_${c.k}`);
      v[c.k] = c.tipo === 'checkbox' ? el.checked : el.value;
    });
    return v;
  }

  function mostrarErro(msg) {
    const e = document.getElementById('trErro');
    if (!e) return;
    e.textContent = msg;
    e.classList.toggle('hidden', !msg);
  }

  async function onSalvar(ev) {
    ev.preventDefault();
    const def = DEFS[edicao.lista];
    const valores = coletar(def);
    for (const c of def.campos) {
      if (c.req && (valores[c.k] === '' || valores[c.k] == null)) {
        mostrarErro(`Preencha: ${c.label}.`);
        return;
      }
    }
    const botao = document.getElementById('trSalvar');
    botao.disabled = true;
    mostrarErro('');
    try {
      const emailAntes = edicao.item && edicao.lista === 'tecnicos' ? edicao.item.email : null;
      await gravar(edicao.lista, edicao.item ? edicao.item.id : undefined, valores);
      ctx.toast(`${cap(def.singular)} salv${def.fem ? 'a' : 'o'}.`, 'success');
      // Se o admin mudou o próprio e-mail/senha, a sessão do dashboard
      // acompanha (cada chamada reenvia e-mail e senha).
      if (emailAntes && emailAntes.toLowerCase() === String(ctx.getSession().email).toLowerCase()) {
        const mudancas = { email: valores.email.toLowerCase().trim(), nome: valores.nome.trim() };
        if (valores.senha) mudancas.senha = valores.senha;
        ctx.onSessionChange(mudancas);
      }
      edicao = null;
      await recarregar();
    } catch (err) {
      botao.disabled = false;
      if (isAuthError(err)) {
        ctx.onAuthError();
      } else {
        mostrarErro(err.message);
      }
    }
  }

  async function gravar(lista, id, valores) {
    const def = DEFS[lista];
    if (lista === 'tecnicos') {
      const t = Object.assign({}, valores);
      if (id) t.id = id;
      if (!t.senha) delete t.senha;
      return Api.call('saveTecnico', Object.assign({}, ctx.getSession(), { tecnico: t }));
    }
    const item = Object.assign({}, valores);
    if (id) item.id = id;
    ['ordem', 'peso', 'ha_turno', 'horas_turno'].forEach((k) => {
      if (k in item && item[k] !== '') item[k] = Number(String(item[k]).replace(',', '.'));
    });
    return Api.call('saveLista', Object.assign({}, ctx.getSession(), { lista, item }));
  }

  async function alternarAtivo(item) {
    const def = DEFS[listaAtiva];
    const desativando = item.ativo;
    if (desativando && !window.confirm(`Desativar ${def.singular} “${item.nome || item.expressao || ''}”? O histórico é mantido e você pode reativar depois.`)) return;
    ctx.beginLoading();
    try {
      const copia = Object.assign({}, item, { ativo: !item.ativo });
      if (listaAtiva === 'tecnicos') delete copia.senha;
      await gravar(listaAtiva, item.id, copia);
      ctx.toast(`${cap(def.singular)} ${desativando ? 'desativad' : 'ativad'}${def.fem ? 'a' : 'o'}.`, 'success');
      await recarregar(true);
    } catch (err) {
      if (isAuthError(err)) ctx.onAuthError();
      else ctx.toast(err.message, 'error');
    } finally {
      ctx.endLoading();
    }
  }

  async function recarregar(jaCarregando) {
    if (!jaCarregando) ctx.beginLoading();
    try {
      data = await Api.call('loadTratorInit', ctx.getSession());
      renderLista();
    } catch (err) {
      if (isAuthError(err)) ctx.onAuthError();
      else ctx.toast(`Erro ao atualizar a lista: ${err.message}`, 'error');
    } finally {
      if (!jaCarregando) ctx.endLoading();
    }
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  return { enter };
})();

window.TratorAdmin = TratorAdmin;
