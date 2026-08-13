/**
 * app.js
 * ------------------------------------------------------------------
 * Wiring da tela do Dashboard Admin: configuração da URL da API,
 * login, navegação entre abas e CRUD de Clientes, Projetos e
 * Colaboradores.
 *
 * A sessão (e-mail + senha do admin logado) fica em sessionStorage
 * (não em localStorage) — some ao fechar a aba, para não deixar
 * credenciais guardadas indefinidamente no navegador.
 * ------------------------------------------------------------------
 */

(function () {
  const SESSION_KEY = 'admin_session';

  let state = {
    session: null, // { email, senha, nome, papel }
    clientes: [],
    projetos: [],
    colaboradores: [],
    apontamentos: [],
    cenarios: [],
  };

  const els = {
    configScreen: document.getElementById('configScreen'),
    loginScreen: document.getElementById('loginScreen'),
    dashboardScreen: document.getElementById('dashboardScreen'),
    sessionInfo: document.getElementById('sessionInfo'),
    sessionUserName: document.getElementById('sessionUserName'),
    logoutButton: document.getElementById('logoutButton'),

    configForm: document.getElementById('configForm'),
    apiUrlInput: document.getElementById('apiUrlInput'),
    configTestResult: document.getElementById('configTestResult'),

    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    changeApiUrlButton: document.getElementById('changeApiUrlButton'),

    toastArea: document.getElementById('toastArea'),

    tabButtons: document.querySelectorAll('.tab-button'),
    financeiraTabButton: document.getElementById('financeiraTabButton'),

    // Clientes
    newClienteButton: document.getElementById('newClienteButton'),
    clienteForm: document.getElementById('clienteForm'),
    clienteId: document.getElementById('clienteId'),
    clienteNome: document.getElementById('clienteNome'),
    clienteAtivo: document.getElementById('clienteAtivo'),
    cancelClienteButton: document.getElementById('cancelClienteButton'),
    clientesTableBody: document.getElementById('clientesTableBody'),
    clientesEmptyState: document.getElementById('clientesEmptyState'),

    // Projetos
    newProjetoButton: document.getElementById('newProjetoButton'),
    projetoForm: document.getElementById('projetoForm'),
    projetoId: document.getElementById('projetoId'),
    projetoCliente: document.getElementById('projetoCliente'),
    projetoNome: document.getElementById('projetoNome'),
    projetoValorOrcado: document.getElementById('projetoValorOrcado'),
    projetoInicioPrevisto: document.getElementById('projetoInicioPrevisto'),
    projetoTerminoPrevisto: document.getElementById('projetoTerminoPrevisto'),
    projetoDataConclusao: document.getElementById('projetoDataConclusao'),
    projetoAtivo: document.getElementById('projetoAtivo'),
    cancelProjetoButton: document.getElementById('cancelProjetoButton'),
    projetosTableBody: document.getElementById('projetosTableBody'),
    projetosEmptyState: document.getElementById('projetosEmptyState'),

    // Colaboradores
    newColaboradorButton: document.getElementById('newColaboradorButton'),
    colaboradorForm: document.getElementById('colaboradorForm'),
    colaboradorId: document.getElementById('colaboradorId'),
    colaboradorNome: document.getElementById('colaboradorNome'),
    colaboradorEmail: document.getElementById('colaboradorEmail'),
    colaboradorSenha: document.getElementById('colaboradorSenha'),
    colaboradorPapel: document.getElementById('colaboradorPapel'),
    colaboradorCargo: document.getElementById('colaboradorCargo'),
    colaboradorDedicacaoDiaria: document.getElementById('colaboradorDedicacaoDiaria'),
    colaboradorCustoMensal: document.getElementById('colaboradorCustoMensal'),
    colaboradorAtivo: document.getElementById('colaboradorAtivo'),
    colaboradorObrigatorioApontamento: document.getElementById('colaboradorObrigatorioApontamento'),
    colaboradorAcessoFinanceiro: document.getElementById('colaboradorAcessoFinanceiro'),
    cancelColaboradorButton: document.getElementById('cancelColaboradorButton'),
    colaboradoresTableBody: document.getElementById('colaboradoresTableBody'),
    colaboradoresEmptyState: document.getElementById('colaboradoresEmptyState'),

    // Apontamentos
    apontamentosRangeSelect: document.getElementById('apontamentosRangeSelect'),
    refreshApontamentosButton: document.getElementById('refreshApontamentosButton'),
    conformidadeTableBody: document.getElementById('conformidadeTableBody'),
    conformidadeEmptyState: document.getElementById('conformidadeEmptyState'),
    horasFiltroDe: document.getElementById('horasFiltroDe'),
    horasFiltroAte: document.getElementById('horasFiltroAte'),
    horasFiltroCliente: document.getElementById('horasFiltroCliente'),
    horasFiltroProjeto: document.getElementById('horasFiltroProjeto'),
    limparFiltroHorasButton: document.getElementById('limparFiltroHorasButton'),
    departamentoChartContainer: document.getElementById('departamentoChartContainer'),
    departamentoChartEmptyState: document.getElementById('departamentoChartEmptyState'),
    heatmapTable: document.getElementById('heatmapTable'),
    heatmapEmptyState: document.getElementById('heatmapEmptyState'),
    heatmapLegend: document.getElementById('heatmapLegend'),
    horasChartContainer: document.getElementById('horasChartContainer'),
    horasChartEmptyState: document.getElementById('horasChartEmptyState'),
    projetoChartContainer: document.getElementById('projetoChartContainer'),
    projetoChartEmptyState: document.getElementById('projetoChartEmptyState'),
    gerarResumoIAButton: document.getElementById('gerarResumoIAButton'),
    resumoIAResultado: document.getElementById('resumoIAResultado'),
    exportPdfButton: document.getElementById('exportPdfButton'),
    printReportHeaderMeta: document.getElementById('printReportHeaderMeta'),
    themeToggleButton: document.getElementById('themeToggleButton'),

    equipeAnoSelect: document.getElementById('equipeAnoSelect'),
    equipeTetoInput: document.getElementById('equipeTetoInput'),
    kpiCapacidadeBrutaValue: document.getElementById('kpiCapacidadeBrutaValue'),
    kpiCapacidadeLiquidaValue: document.getElementById('kpiCapacidadeLiquidaValue'),
    kpiTetoLabel: document.getElementById('kpiTetoLabel'),
    kpiTetoValue: document.getElementById('kpiTetoValue'),
    kpiTetoSub: document.getElementById('kpiTetoSub'),
    kpiOcupacaoLabel: document.getElementById('kpiOcupacaoLabel'),
    kpiOcupacaoValue: document.getElementById('kpiOcupacaoValue'),
    kpiColaboradoresAtivosValue: document.getElementById('kpiColaboradoresAtivosValue'),
    kpiProjetosExecutadosValue: document.getElementById('kpiProjetosExecutadosValue'),
    kpiSobrecarregadosValue: document.getElementById('kpiSobrecarregadosValue'),
    equipeSobrecarregadosDetalhe: document.getElementById('equipeSobrecarregadosDetalhe'),
    equipeChartHorasEmptyState: document.getElementById('equipeChartHorasEmptyState'),
    equipeLegendTetoGood: document.getElementById('equipeLegendTetoGood'),
    equipeLegendTetoWarn: document.getElementById('equipeLegendTetoWarn'),
    equipeLegendTetoLine: document.getElementById('equipeLegendTetoLine'),
    equipeProjectBarsEmptyState: document.getElementById('equipeProjectBarsEmptyState'),
    equipeProjectBarsContainer: document.getElementById('equipeProjectBarsContainer'),
    equipeCargoDonutEmptyState: document.getElementById('equipeCargoDonutEmptyState'),
    equipeCargoDonutContainer: document.getElementById('equipeCargoDonutContainer'),
    equipeHeatmapTable: document.getElementById('equipeHeatmapTable'),
    equipeHeatmapEmptyState: document.getElementById('equipeHeatmapEmptyState'),
    equipeHeatmapLegend: document.getElementById('equipeHeatmapLegend'),

    horasDiariasColaborador: document.getElementById('horasDiariasColaborador'),
    horasDiariasMes: document.getElementById('horasDiariasMes'),
    horasDiariasEmptyState: document.getElementById('horasDiariasEmptyState'),
    horasDiariasZoomOut: document.getElementById('horasDiariasZoomOut'),
    horasDiariasZoomIn: document.getElementById('horasDiariasZoomIn'),
    horasDiariasZoomLevel: document.getElementById('horasDiariasZoomLevel'),
    rankingMesSelect: document.getElementById('rankingMesSelect'),
    rankingComparativoSelect: document.getElementById('rankingComparativoSelect'),

    excluirPeriodoDe: document.getElementById('excluirPeriodoDe'),
    excluirPeriodoAte: document.getElementById('excluirPeriodoAte'),
    excluirPeriodoButton: document.getElementById('excluirPeriodoButton'),

    financeiraAnoSelect: document.getElementById('financeiraAnoSelect'),
    kpiCustoAnoValue: document.getElementById('kpiCustoAnoValue'),
    kpiOrcadoAnoValue: document.getElementById('kpiOrcadoAnoValue'),
    kpiMargemAnoValue: document.getElementById('kpiMargemAnoValue'),
    kpiMargemAnoSub: document.getElementById('kpiMargemAnoSub'),
    kpiProjetosPrejuizoValue: document.getElementById('kpiProjetosPrejuizoValue'),
    financeiraCustoMensalEmptyState: document.getElementById('financeiraCustoMensalEmptyState'),
    financeiraMargemEmptyState: document.getElementById('financeiraMargemEmptyState'),
    financeiraMargemRows: document.getElementById('financeiraMargemRows'),
    financeiraOrcamentoEmptyState: document.getElementById('financeiraOrcamentoEmptyState'),
    financeiraOrcamentoRows: document.getElementById('financeiraOrcamentoRows'),
    financeiraProjecaoLegend: document.getElementById('financeiraProjecaoLegend'),
    financeiraProjecaoZoomOut: document.getElementById('financeiraProjecaoZoomOut'),
    financeiraProjecaoZoomIn: document.getElementById('financeiraProjecaoZoomIn'),
    financeiraProjecaoZoomLevel: document.getElementById('financeiraProjecaoZoomLevel'),
    financeiraProjecaoEmptyState: document.getElementById('financeiraProjecaoEmptyState'),
    financeiraBolhasEmptyState: document.getElementById('financeiraBolhasEmptyState'),
    financeiraCustoCargoEmptyState: document.getElementById('financeiraCustoCargoEmptyState'),
    financeiraCustoCargoContainer: document.getElementById('financeiraCustoCargoContainer'),
    financeiraCustoProjetoEmptyState: document.getElementById('financeiraCustoProjetoEmptyState'),
    financeiraCustoProjetoContainer: document.getElementById('financeiraCustoProjetoContainer'),

    estrategiaTabButton: document.getElementById('estrategiaTabButton'),
    estrategiaCenarioSelect: document.getElementById('estrategiaCenarioSelect'),
    novoCenarioButton: document.getElementById('novoCenarioButton'),
    salvarCenarioButton: document.getElementById('salvarCenarioButton'),
    excluirCenarioButton: document.getElementById('excluirCenarioButton'),
    estrategiaEmptyState: document.getElementById('estrategiaEmptyState'),
    estrategiaConteudo: document.getElementById('estrategiaConteudo'),
    estrategiaCenarioNome: document.getElementById('estrategiaCenarioNome'),
    estrategiaKpiColaboradoresValue: document.getElementById('estrategiaKpiColaboradoresValue'),
    estrategiaKpiColaboradoresSub: document.getElementById('estrategiaKpiColaboradoresSub'),
    estrategiaKpiCustoValue: document.getElementById('estrategiaKpiCustoValue'),
    estrategiaKpiCustoSub: document.getElementById('estrategiaKpiCustoSub'),
    estrategiaKpiCapacidadeValue: document.getElementById('estrategiaKpiCapacidadeValue'),
    estrategiaKpiCapacidadeSub: document.getElementById('estrategiaKpiCapacidadeSub'),
    estrategiaKpiCustoHoraValue: document.getElementById('estrategiaKpiCustoHoraValue'),
    estrategiaKpiCustoHoraSub: document.getElementById('estrategiaKpiCustoHoraSub'),
    estrategiaHorasCargoEmptyState: document.getElementById('estrategiaHorasCargoEmptyState'),
    estrategiaCustoCargoEmptyState: document.getElementById('estrategiaCustoCargoEmptyState'),
    elencoItemForm: document.getElementById('elencoItemForm'),
    elencoItemChave: document.getElementById('elencoItemChave'),
    elencoItemNome: document.getElementById('elencoItemNome'),
    elencoItemCargo: document.getElementById('elencoItemCargo'),
    elencoItemDedicacao: document.getElementById('elencoItemDedicacao'),
    elencoItemCusto: document.getElementById('elencoItemCusto'),
    cancelElencoItemButton: document.getElementById('cancelElencoItemButton'),
    addElencoItemButton: document.getElementById('addElencoItemButton'),
    estrategiaElencoBody: document.getElementById('estrategiaElencoBody'),

    rankingEquipeEmptyState: document.getElementById('rankingEquipeEmptyState'),
    rankingEquipeGrid: document.getElementById('rankingEquipeGrid'),
    rankMaisHorasList: document.getElementById('rankMaisHorasList'),
    rankPorAtividadeList: document.getElementById('rankPorAtividadeList'),
    rankPresencaTotalContainer: document.getElementById('rankPresencaTotalContainer'),
    rankPresencaTotalDesc: document.getElementById('rankPresencaTotalDesc'),
    rankForaHorarioList: document.getElementById('rankForaHorarioList'),

    relatorioSubtitle: document.getElementById('relatorioSubtitle'),
    relatorioColaboradorSelect: document.getElementById('relatorioColaboradorSelect'),
    relatorioMesSelect: document.getElementById('relatorioMesSelect'),
    relatorioVoltarButton: document.getElementById('relatorioVoltarButton'),
    relatorioExportPdfButton: document.getElementById('relatorioExportPdfButton'),
    relatorioEmptyState: document.getElementById('relatorioEmptyState'),
    relatorioConteudo: document.getElementById('relatorioConteudo'),
    relatorioResumoBox: document.getElementById('relatorioResumoBox'),
    relatorioKpiCargaValue: document.getElementById('relatorioKpiCargaValue'),
    relatorioKpiCargaSub: document.getElementById('relatorioKpiCargaSub'),
    relatorioKpiHorasValue: document.getElementById('relatorioKpiHorasValue'),
    relatorioKpiHorasSub: document.getElementById('relatorioKpiHorasSub'),
    relatorioKpiFaltasValue: document.getElementById('relatorioKpiFaltasValue'),
    relatorioKpiFaltasSub: document.getElementById('relatorioKpiFaltasSub'),
    relatorioKpiMediaValue: document.getElementById('relatorioKpiMediaValue'),
    relatorioKpiMediaSub: document.getElementById('relatorioKpiMediaSub'),
    legendRelatorioAtividade: document.getElementById('legendRelatorioAtividade'),
    relatorioAtividadeTableBody: document.getElementById('relatorioAtividadeTableBody'),
    relatorioHeatmapEmptyState: document.getElementById('relatorioHeatmapEmptyState'),
    relatorioHeatmapTable: document.getElementById('relatorioHeatmapTable'),
    relatorioHeatmapLegend: document.getElementById('relatorioHeatmapLegend'),
    relatorioComportamentoEmptyState: document.getElementById('relatorioComportamentoEmptyState'),
    relatorioComportamentoConteudo: document.getElementById('relatorioComportamentoConteudo'),
    relatorioKpiAtrasoValue: document.getElementById('relatorioKpiAtrasoValue'),
    relatorioKpiAtrasoSub: document.getElementById('relatorioKpiAtrasoSub'),
    relatorioComportamentoResumo: document.getElementById('relatorioComportamentoResumo'),
  };

  const THEME_STORAGE_KEY = 'timesheet_admin_theme';
  let equipeTetoPercent = 90;
  let horasDiariasZoom = 1;
  const HORAS_DIARIAS_BASE_WIDTH = 820;
  const HORAS_DIARIAS_ZOOM_MIN = 1;
  const HORAS_DIARIAS_ZOOM_MAX = 3;
  const HORAS_DIARIAS_ZOOM_STEP = 0.5;

  let financeiraProjecaoZoom = 1;
  const financeiraProjecaoOcultos = new Set();
  const FINANCEIRA_PROJECAO_BASE_WIDTH = 780;

  // Cópia de trabalho do cenário sendo editado na aba Estratégia — null
  // enquanto nenhum cenário foi criado/selecionado ainda.
  let cenarioAtual = null;

  // Colaborador pendente de abertura no Relatório individual (setado pelo
  // botão "Relatório" da aba Colaboradores, consumido assim que a aba troca).
  let relatorioColaboradorPendente = null;

  /* --------------------------------- Init --------------------------------- */

  function initTheme() {
    els.themeToggleButton.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
    });
  }

  function init() {
    initTheme();
    wireStaticHandlers();

    const savedUrl = Api.getBaseUrl();
    if (!savedUrl) {
      showScreen('config');
      return;
    }

    const savedSession = readSession();
    if (savedSession) {
      state.session = savedSession;
      enterDashboard();
    } else {
      showScreen('login');
    }
  }

  function wireStaticHandlers() {
    els.configForm.addEventListener('submit', onConfigSubmit);
    els.loginForm.addEventListener('submit', onLoginSubmit);
    els.changeApiUrlButton.addEventListener('click', () => {
      showScreen('config');
      els.apiUrlInput.value = Api.getBaseUrl();
    });
    els.logoutButton.addEventListener('click', onLogout);

    els.tabButtons.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    els.exportPdfButton.addEventListener('click', exportReportPdf);

    els.equipeTetoInput.addEventListener('input', (e) => {
      const v = Number(e.target.value);
      if (!v || v < 50 || v > 100) return;
      equipeTetoPercent = v;
      renderEquipe();
    });
    els.equipeAnoSelect.addEventListener('change', renderEquipe);

    els.horasDiariasColaborador.addEventListener('change', renderHorasDiarias);
    els.horasDiariasMes.addEventListener('change', renderHorasDiarias);
    els.rankingMesSelect.addEventListener('change', renderRankingEquipe);
    els.rankingComparativoSelect.addEventListener('change', renderRankingEquipe);
    els.horasDiariasZoomIn.addEventListener('click', () => {
      horasDiariasZoom = Math.min(HORAS_DIARIAS_ZOOM_MAX, horasDiariasZoom + HORAS_DIARIAS_ZOOM_STEP);
      applyHorasDiariasZoom();
    });
    els.horasDiariasZoomOut.addEventListener('click', () => {
      horasDiariasZoom = Math.max(HORAS_DIARIAS_ZOOM_MIN, horasDiariasZoom - HORAS_DIARIAS_ZOOM_STEP);
      applyHorasDiariasZoom();
    });
    els.excluirPeriodoButton.addEventListener('click', onExcluirPeriodo);

    els.financeiraAnoSelect.addEventListener('change', renderFinanceira);
    els.financeiraProjecaoZoomIn.addEventListener('click', () => {
      financeiraProjecaoZoom = Math.min(3, financeiraProjecaoZoom + 0.5);
      applyFinanceiraProjecaoZoom();
    });
    els.financeiraProjecaoZoomOut.addEventListener('click', () => {
      financeiraProjecaoZoom = Math.max(1, financeiraProjecaoZoom - 0.5);
      applyFinanceiraProjecaoZoom();
    });

    els.estrategiaCenarioSelect.addEventListener('change', onEstrategiaCenarioSelectChange);
    els.novoCenarioButton.addEventListener('click', onNovoCenario);
    els.salvarCenarioButton.addEventListener('click', onSalvarCenario);
    els.excluirCenarioButton.addEventListener('click', onExcluirCenario);
    els.addElencoItemButton.addEventListener('click', () => openElencoItemForm());
    els.cancelElencoItemButton.addEventListener('click', () => closeForm(els.elencoItemForm));
    els.elencoItemForm.addEventListener('submit', onElencoItemSubmit);
    els.estrategiaElencoBody.addEventListener('click', onElencoBodyClick);

    els.relatorioColaboradorSelect.addEventListener('change', renderRelatorio);
    els.relatorioMesSelect.addEventListener('change', renderRelatorio);
    els.relatorioVoltarButton.addEventListener('click', () => switchTab('colaboradores'));
    els.relatorioExportPdfButton.addEventListener('click', exportRelatorioColaboradorPdf);

    // Clientes
    els.newClienteButton.addEventListener('click', () => openClienteForm());
    els.cancelClienteButton.addEventListener('click', () => closeForm(els.clienteForm));
    els.clienteForm.addEventListener('submit', onClienteSubmit);

    // Projetos
    els.newProjetoButton.addEventListener('click', () => openProjetoForm());
    els.cancelProjetoButton.addEventListener('click', () => closeForm(els.projetoForm));
    els.projetoForm.addEventListener('submit', onProjetoSubmit);

    // Colaboradores
    els.newColaboradorButton.addEventListener('click', () => openColaboradorForm());
    els.cancelColaboradorButton.addEventListener('click', () => closeForm(els.colaboradorForm));
    els.colaboradorForm.addEventListener('submit', onColaboradorSubmit);

    // Apontamentos
    els.refreshApontamentosButton.addEventListener('click', () => loadApontamentos());
    els.apontamentosRangeSelect.addEventListener('change', () => renderConformidade());
    els.horasFiltroDe.addEventListener('change', () => renderCharts());
    els.horasFiltroAte.addEventListener('change', () => renderCharts());
    els.horasFiltroCliente.addEventListener('change', () => {
      populateHorasFiltroProjetoSelect();
      renderCharts();
    });
    els.horasFiltroProjeto.addEventListener('change', () => renderCharts());
    els.limparFiltroHorasButton.addEventListener('click', () => {
      els.horasFiltroDe.value = '';
      els.horasFiltroAte.value = '';
      els.horasFiltroCliente.value = '';
      populateHorasFiltroProjetoSelect();
      renderCharts();
    });
    els.gerarResumoIAButton.addEventListener('click', onGerarResumoIA);
  }

  function showScreen(name) {
    els.configScreen.classList.toggle('hidden', name !== 'config');
    els.loginScreen.classList.toggle('hidden', name !== 'login');
    els.dashboardScreen.classList.toggle('hidden', name !== 'dashboard');
    els.sessionInfo.classList.toggle('hidden', name !== 'dashboard');
  }

  /* ------------------------------ Configuração ----------------------------- */

  async function onConfigSubmit(e) {
    e.preventDefault();
    const url = els.apiUrlInput.value.trim();
    els.configTestResult.textContent = 'Testando conexão...';
    els.configTestResult.className = 'config-test-result';
    try {
      await Api.ping(url);
      Api.setBaseUrl(url);
      els.configTestResult.textContent = 'Conectado com sucesso!';
      els.configTestResult.classList.add('ok');
      setTimeout(() => {
        showScreen('login');
      }, 500);
    } catch (err) {
      els.configTestResult.textContent = `Não foi possível conectar: ${err.message}`;
      els.configTestResult.classList.add('error');
    }
  }

  /* --------------------------------- Login --------------------------------- */

  async function onLoginSubmit(e) {
    e.preventDefault();
    const email = els.loginEmail.value.trim();
    const senha = els.loginPassword.value;
    try {
      const result = await Api.login(email, senha);
      if (result.papel !== 'admin') {
        toast('Este usuário não tem permissão de administrador.', 'error');
        return;
      }
      state.session = { email, senha, nome: result.nome, papel: result.papel, acessoFinanceiro: result.acessoFinanceiro === true };
      saveSession(state.session);
      els.loginPassword.value = '';
      enterDashboard();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function onLogout() {
    state.session = null;
    clearSession();
    els.loginEmail.value = '';
    els.loginPassword.value = '';
    showScreen('login');
  }

  function saveSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /* ------------------------------- Dashboard -------------------------------- */

  async function enterDashboard() {
    showScreen('dashboard');
    els.sessionUserName.textContent = `${state.session.nome} (admin)`;
    els.financeiraTabButton.classList.toggle('hidden', !state.session.acessoFinanceiro);
    els.estrategiaTabButton.classList.toggle('hidden', !state.session.acessoFinanceiro);
    switchTab('clientes');
    await loadAll();
  }

  async function loadAll() {
    try {
      const [clientes, projetos, colaboradores] = await Promise.all([
        Api.listClientes(state.session),
        Api.listProjetos(state.session),
        Api.listColaboradores(state.session),
      ]);
      state.clientes = clientes;
      state.projetos = projetos;
      state.colaboradores = colaboradores;
      renderClientes();
      renderProjetos();
      renderColaboradores();
      populateProjetoClienteSelect();
      populateHorasFiltroClienteSelect();
      populateHorasFiltroProjetoSelect();
    } catch (err) {
      if (isAuthError(err)) {
        toast('Sessão expirada ou inválida. Faça login novamente.', 'error');
        onLogout();
      } else {
        toast(`Erro ao carregar dados: ${err.message}`, 'error');
      }
    }
  }

  function isAuthError(err) {
    return /senha|permissão|inválid/i.test(err.message || '');
  }

  function switchTab(tabName) {
    if ((tabName === 'financeira' || tabName === 'estrategia') && !state.session.acessoFinanceiro) return;
    els.tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== `tab-${tabName}`);
    });
    if (tabName === 'apontamentos') {
      loadApontamentos();
    } else if (tabName === 'equipe') {
      loadApontamentos().then(() => {
        populateEquipeAnoSelect();
        renderEquipe();
      });
    } else if (tabName === 'financeira') {
      loadApontamentos().then(() => {
        populateFinanceiraAnoSelect();
        renderFinanceira();
      });
    } else if (tabName === 'estrategia') {
      loadEstrategiaCenarios();
    } else if (tabName === 'relatorio') {
      loadApontamentos().then(() => {
        populateRelatorioSelects();
        renderRelatorio();
      });
    }
  }

  /**
   * Exporta um relatório em PDF (via impressão do navegador, sempre em modo
   * claro — ver regras @media print em css/styles.css) reunindo as análises
   * das abas de gestão de equipe, independente de qual aba está ativa no
   * momento.
   */
  async function exportReportPdf() {
    const REPORT_PANEL_IDS = ['tab-apontamentos', 'tab-equipe'];
    if (state.session.acessoFinanceiro) REPORT_PANEL_IDS.push('tab-financeira', 'tab-estrategia');

    await loadApontamentos();
    populateEquipeAnoSelect();
    renderEquipe();
    if (state.session.acessoFinanceiro) {
      populateFinanceiraAnoSelect();
      renderFinanceira();
      await loadEstrategiaCenarios();
    }

    const panels = Array.from(document.querySelectorAll('.tab-panel'));
    const previouslyHidden = panels.map((panel) => panel.classList.contains('hidden'));
    panels.forEach((panel) => {
      panel.classList.toggle('hidden', !REPORT_PANEL_IDS.includes(panel.id));
    });

    const agora = new Date();
    els.printReportHeaderMeta.textContent =
      `Relatório gerado em ${agora.toLocaleDateString('pt-BR')} às ` +
      `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const restore = () => {
      panels.forEach((panel, i) => panel.classList.toggle('hidden', previouslyHidden[i]));
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    window.print();
  }

  /* -------------------------------- Clientes -------------------------------- */

  function openClienteForm(cliente) {
    els.clienteForm.classList.remove('hidden');
    if (cliente) {
      els.clienteId.value = cliente.id;
      els.clienteNome.value = cliente.nome;
      els.clienteAtivo.checked = cliente.ativo;
    } else {
      els.clienteId.value = '';
      els.clienteNome.value = '';
      els.clienteAtivo.checked = true;
    }
    els.clienteNome.focus();
  }

  async function onClienteSubmit(e) {
    e.preventDefault();
    const payload = {
      id: els.clienteId.value || undefined,
      nome: els.clienteNome.value.trim(),
      ativo: els.clienteAtivo.checked,
    };
    try {
      await Api.saveCliente(state.session, payload);
      toast('Cliente salvo com sucesso.', 'success');
      closeForm(els.clienteForm);
      await loadAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function renderClientes() {
    els.clientesTableBody.innerHTML = '';
    els.clientesEmptyState.classList.toggle('hidden', state.clientes.length > 0);

    state.clientes
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((cliente) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(cliente.nome)}</td>
          <td>${statusPill(cliente.ativo)}</td>
          <td></td>
        `;
        const actionsTd = tr.querySelector('td:last-child');
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => openClienteForm(cliente));
        const rowActions = document.createElement('div');
        rowActions.className = 'row-actions';
        rowActions.appendChild(editBtn);
        actionsTd.appendChild(rowActions);
        els.clientesTableBody.appendChild(tr);
      });
  }

  /* -------------------------------- Projetos -------------------------------- */

  function populateProjetoClienteSelect() {
    const current = els.projetoCliente.value;
    els.projetoCliente.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.textContent = 'Selecione o cliente';
    els.projetoCliente.appendChild(placeholder);

    state.clientes
      .filter((c) => c.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((cliente) => {
        const opt = document.createElement('option');
        opt.value = cliente.id;
        opt.textContent = cliente.nome;
        els.projetoCliente.appendChild(opt);
      });

    if (current) els.projetoCliente.value = current;
  }

  function openProjetoForm(projeto) {
    if (state.clientes.length === 0) {
      toast('Cadastre ao menos um cliente antes de criar um projeto.', 'error');
      return;
    }
    els.projetoForm.classList.remove('hidden');
    if (projeto) {
      els.projetoId.value = projeto.id;
      els.projetoCliente.value = projeto.clienteId;
      els.projetoNome.value = projeto.nome;
      els.projetoValorOrcado.value = projeto.valorOrcado || '';
      els.projetoInicioPrevisto.value = projeto.dataInicioPrevista || '';
      els.projetoTerminoPrevisto.value = projeto.dataTerminoPrevista || '';
      els.projetoDataConclusao.value = projeto.dataConclusao || '';
      els.projetoAtivo.checked = projeto.ativo;
    } else {
      els.projetoId.value = '';
      els.projetoCliente.value = '';
      els.projetoNome.value = '';
      els.projetoValorOrcado.value = '';
      els.projetoInicioPrevisto.value = '';
      els.projetoTerminoPrevisto.value = '';
      els.projetoDataConclusao.value = '';
      els.projetoAtivo.checked = true;
    }
    els.projetoNome.focus();
  }

  async function onProjetoSubmit(e) {
    e.preventDefault();
    const payload = {
      id: els.projetoId.value || undefined,
      clienteId: els.projetoCliente.value,
      nome: els.projetoNome.value.trim(),
      valorOrcado: Number(els.projetoValorOrcado.value) || 0,
      dataInicioPrevista: els.projetoInicioPrevisto.value,
      dataTerminoPrevista: els.projetoTerminoPrevisto.value,
      dataConclusao: els.projetoDataConclusao.value,
      ativo: els.projetoAtivo.checked,
    };
    if (!payload.clienteId) {
      toast('Selecione um cliente.', 'error');
      return;
    }
    try {
      await Api.saveProjeto(state.session, payload);
      toast('Projeto salvo com sucesso.', 'success');
      closeForm(els.projetoForm);
      await loadAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function renderProjetos() {
    els.projetosTableBody.innerHTML = '';
    els.projetosEmptyState.classList.toggle('hidden', state.projetos.length > 0);

    const clienteById = Object.fromEntries(state.clientes.map((c) => [c.id, c]));
    const clienteNomeDe = (projeto) => (clienteById[projeto.clienteId] ? clienteById[projeto.clienteId].nome : '(cliente removido)');

    state.projetos
      .slice()
      .sort((a, b) => clienteNomeDe(a).localeCompare(clienteNomeDe(b)) || a.nome.localeCompare(b.nome))
      .forEach((projeto) => {
        const clienteNome = clienteNomeDe(projeto);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(clienteNome)}</td>
          <td>${escapeHtml(projeto.nome)}</td>
          <td>${statusPill(projeto.ativo)}</td>
          <td></td>
        `;
        const actionsTd = tr.querySelector('td:last-child');
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => openProjetoForm(projeto));
        const rowActions = document.createElement('div');
        rowActions.className = 'row-actions';
        rowActions.appendChild(editBtn);
        actionsTd.appendChild(rowActions);
        els.projetosTableBody.appendChild(tr);
      });
  }

  /* ------------------------------ Colaboradores ------------------------------ */

  function openColaboradorForm(colaborador) {
    els.colaboradorForm.classList.remove('hidden');
    els.colaboradorSenha.value = '';
    if (colaborador) {
      els.colaboradorId.value = colaborador.id;
      els.colaboradorNome.value = colaborador.nome;
      els.colaboradorEmail.value = colaborador.email;
      els.colaboradorPapel.value = colaborador.papel;
      els.colaboradorCargo.value = colaborador.cargo || '';
      els.colaboradorDedicacaoDiaria.value = colaborador.dedicacaoDiaria || 8;
      els.colaboradorCustoMensal.value = colaborador.custoMensal || '';
      els.colaboradorAtivo.checked = colaborador.ativo;
      els.colaboradorObrigatorioApontamento.checked = colaborador.obrigatorioApontamento !== false;
      els.colaboradorAcessoFinanceiro.checked = colaborador.acessoFinanceiro === true;
      els.colaboradorSenha.placeholder = 'Deixe em branco para manter a atual';
    } else {
      els.colaboradorId.value = '';
      els.colaboradorNome.value = '';
      els.colaboradorEmail.value = '';
      els.colaboradorPapel.value = 'colaborador';
      els.colaboradorCargo.value = '';
      els.colaboradorDedicacaoDiaria.value = 8;
      els.colaboradorCustoMensal.value = '';
      els.colaboradorAtivo.checked = true;
      els.colaboradorObrigatorioApontamento.checked = true;
      els.colaboradorAcessoFinanceiro.checked = false;
      els.colaboradorSenha.placeholder = 'Senha inicial';
    }
    // Só quem já tem acesso financeiro pode conceder esse acesso ou ver/
    // alterar o custo mensal de alguém — o backend também recusa a
    // gravação, isso aqui só evita mostrar um campo que vai dar erro.
    const podeEditarFinanceiro = state.session.acessoFinanceiro === true;
    els.colaboradorCustoMensal.disabled = !podeEditarFinanceiro;
    els.colaboradorAcessoFinanceiro.disabled = !podeEditarFinanceiro;
    els.colaboradorCustoMensal.title = podeEditarFinanceiro ? '' : 'Apenas administradores com acesso financeiro podem ver ou alterar este campo.';
    els.colaboradorAcessoFinanceiro.title = podeEditarFinanceiro ? '' : 'Apenas administradores com acesso financeiro podem conceder esse acesso.';
    els.colaboradorNome.focus();
  }

  async function onColaboradorSubmit(e) {
    e.preventDefault();
    const isNew = !els.colaboradorId.value;
    const payload = {
      id: els.colaboradorId.value || undefined,
      nome: els.colaboradorNome.value.trim(),
      email: els.colaboradorEmail.value.trim(),
      papel: els.colaboradorPapel.value,
      cargo: els.colaboradorCargo.value.trim(),
      dedicacaoDiaria: Number(els.colaboradorDedicacaoDiaria.value) || 8,
      ativo: els.colaboradorAtivo.checked,
      obrigatorioApontamento: els.colaboradorObrigatorioApontamento.checked,
      acessoFinanceiro: els.colaboradorAcessoFinanceiro.checked,
    };
    // Quem não tem acesso financeiro nunca recebe o custo mensal do backend
    // (fica em branco no campo) — nesse caso, omite do payload em vez de
    // mandar 0, senão salvar qualquer outro campo apagaria o custo real.
    if (els.colaboradorCustoMensal.value !== '') {
      payload.custoMensal = Number(els.colaboradorCustoMensal.value) || 0;
    }
    if (els.colaboradorSenha.value) {
      payload.senha = els.colaboradorSenha.value;
    } else if (isNew) {
      toast('Defina uma senha inicial para o novo colaborador.', 'error');
      return;
    }

    try {
      await Api.saveColaborador(state.session, payload);
      toast('Colaborador salvo com sucesso.', 'success');
      closeForm(els.colaboradorForm);
      await loadAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function renderColaboradores() {
    els.colaboradoresTableBody.innerHTML = '';
    els.colaboradoresEmptyState.classList.toggle('hidden', state.colaboradores.length > 0);

    state.colaboradores
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((colaborador) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(colaborador.nome)}</td>
          <td>${escapeHtml(colaborador.email)}</td>
          <td>${escapeHtml(colaborador.cargo || '—')}</td>
          <td>${colaborador.papel === 'admin' ? '<span class="role-pill">Admin</span>' : 'Colaborador'}</td>
          <td>${colaborador.obrigatorioApontamento !== false ? 'Obrigatório' : 'Isento'}</td>
          <td>${statusPill(colaborador.ativo)}</td>
          <td></td>
        `;
        const actionsTd = tr.querySelector('td:last-child');
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => openColaboradorForm(colaborador));
        const relatorioBtn = document.createElement('button');
        relatorioBtn.textContent = 'Relatório';
        relatorioBtn.addEventListener('click', () => abrirRelatorioColaborador(colaborador.id));
        const rowActions = document.createElement('div');
        rowActions.className = 'row-actions';
        rowActions.appendChild(editBtn);
        rowActions.appendChild(relatorioBtn);
        actionsTd.appendChild(rowActions);
        els.colaboradoresTableBody.appendChild(tr);
      });
  }

  /* ------------------------------- Apontamentos ------------------------------- */

  const MES_NOMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  function formatMesAno(mesStr) {
    const [y, m] = mesStr.split('-').map(Number);
    return `${MES_NOMES[m - 1]} de ${y}`;
  }

  function populateHorasDiariasColaboradorSelect() {
    const current = els.horasDiariasColaborador.value;
    els.horasDiariasColaborador.innerHTML = state.colaboradores
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}${c.ativo ? '' : ' (inativo)'}</option>`)
      .join('');
    if (current && state.colaboradores.some((c) => c.id === current)) {
      els.horasDiariasColaborador.value = current;
    }
  }

  /** Popula um <select> de mês com todos os meses que já têm apontamento (de
   * qualquer colaborador) + o mês corrente do calendário, e seleciona por
   * padrão o mês mais recente que já tem apontamento — não o mês corrente,
   * pra não abrir sempre num mês vazio quando o time ainda não apontou nada
   * nele. Reaproveitado pelo filtro de "Horas apontadas por dia" e pelo do
   * "Ranking da equipe" (ambos olham o time inteiro, não um colaborador só). */
  function populateMesSelectGenerico(selectEl) {
    const hoje = new Date();
    const atual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const mesesComDados = new Set();
    state.apontamentos.forEach((a) => {
      if (a.data) mesesComDados.add(a.data.slice(0, 7));
    });
    const ordenados = Array.from(new Set([atual, ...mesesComDados])).sort().reverse();
    const maisRecenteComDados = Array.from(mesesComDados).sort().reverse()[0];
    const padrao = maisRecenteComDados || atual;
    const current = selectEl.value;
    selectEl.innerHTML = ordenados.map((m) => `<option value="${m}">${formatMesAno(m)}</option>`).join('');
    selectEl.value = ordenados.includes(current) ? current : padrao;
  }

  function populateHorasDiariasMesSelect() {
    populateMesSelectGenerico(els.horasDiariasMes);
  }

  function populateRankingMesSelect() {
    populateMesSelectGenerico(els.rankingMesSelect);
  }

  function applyHorasDiariasZoom() {
    const width = HORAS_DIARIAS_BASE_WIDTH * horasDiariasZoom;
    document.getElementById('chartHorasDiariasStatus').style.width = `${width}px`;
    document.getElementById('chartHorasDiariasAtividade').style.width = `${width}px`;
    els.horasDiariasZoomLevel.textContent = `${Math.round(horasDiariasZoom * 100)}%`;
    els.horasDiariasZoomOut.disabled = horasDiariasZoom <= HORAS_DIARIAS_ZOOM_MIN;
    els.horasDiariasZoomIn.disabled = horasDiariasZoom >= HORAS_DIARIAS_ZOOM_MAX;
  }

  function gerarDadosHorasDiarias(colaboradorId, year, month) {
    const colaborador = state.colaboradores.find((c) => c.id === colaboradorId);
    if (!colaborador) return null;
    const meta = Number(colaborador.dedicacaoDiaria) || 8;
    const obrigatorio = colaborador.obrigatorioApontamento !== false;
    const totalDias = new Date(year, month, 0).getDate();
    const mesStr = `${year}-${String(month).padStart(2, '0')}`;

    const porDia = {};
    state.apontamentos
      .filter(
        (a) =>
          a.colaboradorId === colaboradorId &&
          a.duracaoMinutos != null &&
          a.duracaoMinutos > 0 &&
          a.data &&
          a.data.slice(0, 7) === mesStr
      )
      .forEach((a) => {
        const dia = Number(a.data.slice(8, 10));
        if (!porDia[dia]) porDia[dia] = { minutos: 0, porAtividade: {} };
        porDia[dia].minutos += a.duracaoMinutos;
        porDia[dia].porAtividade[a.atividadeId] = (porDia[dia].porAtividade[a.atividadeId] || 0) + a.duracaoMinutos;
      });

    const hojeStr = Holidays.dateStr(new Date());
    const dias = [];
    for (let d = 1; d <= totalDias; d++) {
      const date = new Date(year, month - 1, d);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = !isWeekend && isHolidayLocal(date);
      const registro = porDia[d];
      const dataStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dias.push({
        dia: d,
        isNonBusiness: isWeekend || isHoliday,
        isHoliday,
        // Dia do calendário ainda não chegou — não é "esquecido", é só cedo
        // demais pra cobrar apontamento dele. Usado pra não contar contra o
        // colaborador nas análises do mês corrente ainda em andamento.
        isFuture: dataStr > hojeStr,
        // Dia já totalmente decorrido (estritamente antes de hoje) — hoje em
        // si NÃO conta como "passado" ainda, porque o dia não terminou: quem
        // ainda vai apontar à tarde/noite não deveria aparecer como "sem
        // apontamento" só porque é cedo.
        isPast: dataStr < hojeStr,
        horas: registro ? registro.minutos / 60 : 0,
        porAtividade: registro ? registro.porAtividade : {},
      });
    }

    return { colaborador, meta, obrigatorio, dias };
  }

  function horasDiariasStatusColor(horas, meta) {
    if (horas < meta * 0.7) return 'var(--status-warning)';
    return 'var(--status-good)';
  }

  /** Eixos + faixas de fim de semana/feriado, compartilhados pelas duas opções
   * de gráfico (status do dia e composição por atividade) — mesma leitura de
   * X, só muda o que cada barra representa. */
  function renderHorasDiariasEixos(dias, meta) {
    const W = HORAS_DIARIAS_BASE_WIDTH, H = 260;
    const padL = 40, padR = 12, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const n = dias.length;
    const slot = plotW / n;
    const barW = Math.max(slot * 0.55, 3);
    const maiorHoras = Math.max(0, ...dias.map((d) => d.horas));
    const maxVal = Math.max(meta * 1.5, maiorHoras * 1.15, 1);
    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const parts = [];
    dias.forEach((d, i) => {
      if (d.isNonBusiness) {
        const cls = d.isHoliday ? 'holiday-band' : 'weekend-band';
        parts.push(`<rect class="${cls}" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${plotH}" />`);
      }
    });

    const ticks = Array.from(new Set([0, Math.round(meta), Math.round(maxVal)])).sort((a, b) => a - b);
    ticks.forEach((v) => {
      const y = yFor(v);
      parts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      parts.push(`<text class="value-tick" x="${padL - 6}" y="${y + 3}" text-anchor="end">${v}h</text>`);
    });

    return { W, H, padL, padR, padT, padB, plotW, plotH, barW, yFor, xForCenter, parts };
  }

  function renderHorasDiariasRodape(ctx, dias) {
    const { W, padL, padR, padT, plotH, xForCenter, parts, yFor } = ctx;
    const yMeta = yFor(ctx.meta);
    parts.push(`<line class="meta-line" x1="${padL}" y1="${yMeta}" x2="${W - padR}" y2="${yMeta}" />`);
    dias.forEach((d, i) => {
      if (dias.length <= 20 || d.dia % 2 === 1) {
        parts.push(`<text class="day-tick" x="${xForCenter(i)}" y="${ctx.H - 10}" text-anchor="middle">${d.dia}</text>`);
      }
    });
  }

  function renderHorasDiariasStatus(dados, targetId) {
    const { dias, meta, obrigatorio } = dados;
    const ctx = renderHorasDiariasEixos(dias, meta);
    ctx.meta = meta;
    const { padT, plotH, barW, yFor, xForCenter, parts } = ctx;

    dias.forEach((d, i) => {
      const x = xForCenter(i) - barW / 2;
      if (d.horas > 0) {
        const color = d.isNonBusiness ? 'var(--status-good)' : horasDiariasStatusColor(d.horas, meta);
        const y = yFor(d.horas);
        const h = padT + plotH - y;
        parts.push(
          `<rect class="day-bar" x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${color}">` +
            `<title>Dia ${d.dia}: ${formatHm(Math.round(d.horas * 60))} apontadas</title></rect>`
        );
      } else if (!d.isNonBusiness && obrigatorio && d.isPast) {
        const yBase = yFor(0);
        parts.push(
          `<rect class="day-bar" x="${x}" y="${yBase - 6}" width="${barW}" height="6" rx="1" fill="var(--status-critical)">` +
            `<title>Dia ${d.dia}: sem apontamento</title></rect>`
        );
      }
    });

    renderHorasDiariasRodape(ctx, dias);
    document.getElementById(targetId || 'chartHorasDiariasStatus').innerHTML = ctx.parts.join('');
  }

  function renderHorasDiariasAtividade(dados, targetId, legendId) {
    const { dias, meta } = dados;
    const activities = window.APP_DATA.ACTIVITIES;
    const colorFor = (index) => `var(--activity-${index + 1})`;
    document.getElementById(legendId || 'legendHorasDiariasAtividade').innerHTML = activities
      .map((act, i) => `<span><i style="background:${colorFor(i)}"></i>${escapeHtml(act.name)}</span>`)
      .join('');

    const ctx = renderHorasDiariasEixos(dias, meta);
    ctx.meta = meta;
    const { barW, yFor, xForCenter, parts } = ctx;

    dias.forEach((d, i) => {
      if (d.horas <= 0) return;
      const x = xForCenter(i) - barW / 2;
      let acumulado = 0;
      activities.forEach((act, idx) => {
        const minutos = d.porAtividade[act.id];
        if (!minutos) return;
        const horasAtividade = minutos / 60;
        const yTop = yFor(acumulado + horasAtividade);
        const yBottom = yFor(acumulado);
        parts.push(
          `<rect class="day-bar" x="${x}" y="${yTop}" width="${barW}" height="${yBottom - yTop}" fill="${colorFor(idx)}">` +
            `<title>Dia ${d.dia} — ${escapeHtml(act.name)}: ${formatHm(minutos)}</title></rect>`
        );
        acumulado += horasAtividade;
      });
    });

    renderHorasDiariasRodape(ctx, dias);
    document.getElementById(targetId || 'chartHorasDiariasAtividade').innerHTML = ctx.parts.join('');
  }

  function renderHorasDiarias() {
    const colaboradorId = els.horasDiariasColaborador.value;
    const mesValue = els.horasDiariasMes.value;
    if (!colaboradorId || !mesValue) return;

    const [year, month] = mesValue.split('-').map(Number);
    const dados = gerarDadosHorasDiarias(colaboradorId, year, month);
    if (!dados) return;

    const temApontamento = dados.dias.some((d) => d.horas > 0);
    els.horasDiariasEmptyState.classList.toggle('hidden', temApontamento);

    renderHorasDiariasStatus(dados);
    renderHorasDiariasAtividade(dados);
    applyHorasDiariasZoom();
  }

  async function onExcluirPeriodo() {
    const desde = els.excluirPeriodoDe.value;
    const ate = els.excluirPeriodoAte.value;
    if (!desde || !ate) {
      toast('Informe a data de início e de fim do período.', 'error');
      return;
    }
    if (desde > ate) {
      toast('A data "De" não pode ser depois da data "Até".', 'error');
      return;
    }

    els.excluirPeriodoButton.disabled = true;
    try {
      const { total, colaboradores } = await Api.contarApontamentosPorPeriodo(state.session, desde, ate);
      if (total === 0) {
        toast('Nenhum apontamento encontrado nesse período.', 'success');
        return;
      }

      const resumo =
        `Isso vai excluir PERMANENTEMENTE ${total} apontamento(s) entre ${desde} e ${ate}, de: ${colaboradores.join(', ')}.\n\n` +
        'Essa ação não pode ser desfeita. Digite EXCLUIR (em maiúsculas) para confirmar:';
      const confirmacao = window.prompt(resumo, '');
      if (confirmacao !== 'EXCLUIR') {
        toast('Exclusão cancelada.', 'success');
        return;
      }

      const { excluidos } = await Api.excluirApontamentosPorPeriodo(state.session, desde, ate);
      toast(`${excluidos} apontamento(s) excluído(s).`, 'success');
      await loadApontamentos();
    } catch (err) {
      if (isAuthError(err)) {
        toast('Sessão expirada ou inválida. Faça login novamente.', 'error');
        onLogout();
      } else {
        toast(err.message, 'error');
      }
    } finally {
      els.excluirPeriodoButton.disabled = false;
    }
  }

  /* -------------------------------- Financeira -------------------------------- */

  function formatBRL(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  function monthDiffFinanceira(deStr, ateStr) {
    const [ay, am] = deStr.split('-').map(Number);
    const [by, bm] = ateStr.split('-').map(Number);
    return (by - ay) * 12 + (bm - am);
  }

  function populateFinanceiraAnoSelect() {
    const anoAtual = new Date().getFullYear();
    const anos = new Set([anoAtual]);
    state.apontamentos.forEach((a) => {
      if (a.data) anos.add(Number(a.data.slice(0, 4)));
    });
    const ordenados = Array.from(anos).sort((a, b) => b - a);
    const anterior = els.financeiraAnoSelect.value ? Number(els.financeiraAnoSelect.value) : anoAtual;
    els.financeiraAnoSelect.innerHTML = ordenados.map((a) => `<option value="${a}">${a}</option>`).join('');
    els.financeiraAnoSelect.value = ordenados.includes(anterior) ? anterior : anoAtual;
  }

  function renderFinanceira() {
    const year = Number(els.financeiraAnoSelect.value) || new Date().getFullYear();

    const colaboradorById = {};
    state.colaboradores.forEach((c) => {
      colaboradorById[c.id] = c;
    });

    const ativos = state.colaboradores.filter((c) => c.ativo);
    const custoMensalTotal = ativos.reduce((a, c) => a + (Number(c.custoMensal) || 0), 0);

    const concluidos = state.apontamentos.filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0 && a.data);

    // Custo/hora do colaborador naquele mês específico: custo mensal (fixo) ÷
    // dias úteis do mês ÷ dedicação diária — mesmo calendário da aba Equipe.
    // O custo AGREGADO do departamento (gráfico mensal) não usa essa conta —
    // é sempre a soma fixa dos salários, como confirmado.
    function custoHoraDoColaborador(colaborador, ano, mesIdx) {
      const custoMensal = Number(colaborador.custoMensal) || 0;
      const dedicacao = Number(colaborador.dedicacaoDiaria) || 8;
      const diasUteis = diasUteisNoMes(ano, mesIdx);
      return diasUteis > 0 ? custoMensal / (diasUteis * dedicacao) : 0;
    }

    function custoDoApontamento(a) {
      const colaborador = colaboradorById[a.colaboradorId];
      if (!colaborador) return 0;
      const [ano, mes] = a.data.split('-').map(Number);
      return (a.duracaoMinutos / 60) * custoHoraDoColaborador(colaborador, ano, mes - 1);
    }

    // Custo acumulado por projeto é sempre "vida inteira" do projeto (não
    // filtrado pelo ano selecionado) — como o consumo de horas por projeto
    // da aba Apontamentos, e porque margem/projeção fazem sentido olhando o
    // projeto inteiro, não um recorte de calendário.
    const custoAcumuladoPorProjeto = {};
    const custoPorProjetoPorMes = {};
    concluidos.forEach((a) => {
      const custo = custoDoApontamento(a);
      custoAcumuladoPorProjeto[a.projetoId] = (custoAcumuladoPorProjeto[a.projetoId] || 0) + custo;
      const chave = `${a.projetoId}::${a.data.slice(0, 7)}`;
      custoPorProjetoPorMes[chave] = (custoPorProjetoPorMes[chave] || 0) + custo;
    });

    const projetosOrcados = state.projetos.filter(
      (p) => Number(p.valorOrcado) > 0 && (custoAcumuladoPorProjeto[p.id] || 0) > 0
    );

    renderFinanceiraKpis(custoMensalTotal, projetosOrcados, custoAcumuladoPorProjeto);
    renderFinanceiraCustoMensal(year, custoMensalTotal);
    renderFinanceiraMargem(projetosOrcados, custoAcumuladoPorProjeto);
    renderFinanceiraOrcamento(projetosOrcados, custoAcumuladoPorProjeto);

    const projecaoDados = computeFinanceiraProjecaoList(custoAcumuladoPorProjeto, custoPorProjetoPorMes);
    renderFinanceiraProjecaoLegend(projecaoDados);
    renderFinanceiraProjecao(projecaoDados);
    applyFinanceiraProjecaoZoom();
    renderFinanceiraBolhas(projecaoDados);

    renderFinanceiraCustoCargo(ativos);
    renderFinanceiraCustoProjetoAtividade(concluidos, custoDoApontamento);
  }

  function renderFinanceiraKpis(custoMensalTotal, projetosOrcados, custoAcumuladoPorProjeto) {
    els.kpiCustoAnoValue.textContent = formatBRL(custoMensalTotal * 12);

    const orcadoTotal = projetosOrcados.reduce((a, p) => a + Number(p.valorOrcado), 0);
    els.kpiOrcadoAnoValue.textContent = formatBRL(orcadoTotal);

    const custoTotal = projetosOrcados.reduce((a, p) => a + (custoAcumuladoPorProjeto[p.id] || 0), 0);
    const margem = orcadoTotal - custoTotal;
    els.kpiMargemAnoValue.textContent = formatBRL(margem);
    els.kpiMargemAnoValue.className = 'kpi__value ' + (margem >= 0 ? 'pos' : 'neg');
    const margemPct = orcadoTotal > 0 ? (margem / orcadoTotal) * 100 : 0;
    els.kpiMargemAnoSub.textContent = `${margem >= 0 ? '+' : ''}${Math.round(margemPct * 10) / 10}% do orçado`;

    const prejuizo = projetosOrcados.filter((p) => (custoAcumuladoPorProjeto[p.id] || 0) > Number(p.valorOrcado)).length;
    els.kpiProjetosPrejuizoValue.textContent = `${prejuizo} de ${projetosOrcados.length}`;
  }

  function renderFinanceiraCustoMensal(year, custoMensalTotal) {
    const svg = document.getElementById('chartFinanceiraCustoMensal');
    els.financeiraCustoMensalEmptyState.classList.toggle('hidden', custoMensalTotal > 0);
    if (custoMensalTotal <= 0) {
      svg.innerHTML = '';
      return;
    }

    const custoMes = new Array(12).fill(custoMensalTotal);
    const receitaMes = new Array(12).fill(0);
    const projetosDoMes = Array.from({ length: 12 }, () => []);
    state.projetos.forEach((p) => {
      if (Number(p.valorOrcado) > 0 && p.dataConclusao && p.dataConclusao.slice(0, 4) === String(year)) {
        const mesIdx = Number(p.dataConclusao.slice(5, 7)) - 1;
        receitaMes[mesIdx] += Number(p.valorOrcado);
        projetosDoMes[mesIdx].push(p.nome);
      }
    });
    const mediaReceita = receitaMes.reduce((a, b) => a + b, 0) / 12;

    const W = 720, H = 260;
    const padL = 64, padR = 12, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxVal = Math.max(...custoMes, ...receitaMes, mediaReceita, 1) * 1.15;
    const n = EQUIPE_MESES.length;
    const slot = plotW / n;
    const barW = slot * 0.55;

    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const parts = [];
    [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].forEach((v) => {
      const y = yFor(v);
      parts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      parts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${formatBRL(Math.round(v / 100) * 100)}</text>`);
    });

    receitaMes.forEach((v, i) => {
      if (v <= 0) return;
      const x = xForCenter(i) - barW / 2;
      const y = yFor(v);
      const h = padT + plotH - y;
      parts.push(
        `<rect class="revenue-bar" x="${x}" y="${y}" width="${barW}" height="${h}" rx="3">` +
          `<title>${EQUIPE_MESES[i]}: ${formatBRL(v)} — ${escapeHtml(projetosDoMes[i].join(', '))}</title></rect>`
      );
    });

    const linePoints = custoMes.map((v, i) => `${xForCenter(i)},${yFor(v)}`).join(' ');
    parts.push(`<polyline class="cost-line" points="${linePoints}" />`);
    custoMes.forEach((v, i) => {
      parts.push(`<circle class="cost-dot" cx="${xForCenter(i)}" cy="${yFor(v)}" r="4"><title>${EQUIPE_MESES[i]}: custo de ${formatBRL(v)}</title></circle>`);
    });

    const yMedia = yFor(mediaReceita);
    parts.push(
      `<line class="revenue-avg-line" x1="${padL}" y1="${yMedia}" x2="${W - padR}" y2="${yMedia}">` +
        `<title>Receita média do ano: ${formatBRL(mediaReceita)}/mês</title></line>`
    );
    parts.push(`<text class="revenue-avg-label" x="${padL + 4}" y="${yMedia - 5}">Receita média: ${formatBRL(mediaReceita)}/mês</text>`);

    EQUIPE_MESES.forEach((m, i) => parts.push(`<text class="month-tick" x="${xForCenter(i)}" y="${H - 8}" text-anchor="middle">${m}</text>`));

    svg.innerHTML = parts.join('');
  }

  function renderFinanceiraMargem(projetosOrcados, custoAcumuladoPorProjeto) {
    const container = els.financeiraMargemRows;
    els.financeiraMargemEmptyState.classList.toggle('hidden', projetosOrcados.length > 0);
    container.innerHTML = '';
    if (projetosOrcados.length === 0) return;

    const comMargem = projetosOrcados
      .map((p) => ({ nome: p.nome, margem: Number(p.valorOrcado) - (custoAcumuladoPorProjeto[p.id] || 0) }))
      .sort((a, b) => a.margem - b.margem);
    const maxAbs = Math.max(...comMargem.map((p) => Math.abs(p.margem)), 1);

    container.innerHTML = comMargem
      .map((p) => {
        const fracao = p.margem / maxAbs;
        const isNeg = p.margem < 0;
        const widthPct = Math.abs(fracao) * 48;
        const left = isNeg ? 50 - widthPct : 50;
        const color = isNeg ? 'var(--status-critical)' : 'var(--status-good)';
        return `
          <div class="margem-row">
            <span class="margem-row__nome">${escapeHtml(p.nome)}</span>
            <div class="margem-row__track">
              <div class="margem-row__axis" style="left:50%"></div>
              <div class="margem-row__bar" style="left:${left}%; width:${widthPct}%; background:${color};" title="${escapeHtml(p.nome)}: ${formatBRL(p.margem)}"></div>
            </div>
            <span class="margem-row__valor ${isNeg ? 'neg' : 'pos'}">${isNeg ? '' : '+'}${formatBRL(p.margem)}</span>
          </div>`;
      })
      .join('');
  }

  function renderFinanceiraOrcamento(projetosOrcados, custoAcumuladoPorProjeto) {
    const container = els.financeiraOrcamentoRows;
    els.financeiraOrcamentoEmptyState.classList.toggle('hidden', projetosOrcados.length > 0);
    container.innerHTML = '';
    if (projetosOrcados.length === 0) return;

    const comPct = projetosOrcados
      .map((p) => {
        const custo = custoAcumuladoPorProjeto[p.id] || 0;
        const orcado = Number(p.valorOrcado);
        return { nome: p.nome, custo, orcado, pct: orcado > 0 ? custo / orcado : 0 };
      })
      .sort((a, b) => b.pct - a.pct);

    container.innerHTML = comPct
      .map((p) => {
        const pctClamped = Math.min(p.pct, 1) * 100;
        const color = p.pct > 1 ? 'var(--status-critical)' : p.pct >= 0.9 ? 'var(--status-warning)' : 'var(--status-good)';
        return `
          <div>
            <div class="orcamento-row__label">
              <span class="orcamento-row__name">${escapeHtml(p.nome)}</span>
              <span class="orcamento-row__pct" style="color:${color}">${formatPct(p.pct)}</span>
            </div>
            <div class="orcamento-row__track" title="${escapeHtml(p.nome)}: ${formatBRL(p.custo)} de ${formatBRL(p.orcado)} orçados">
              <div class="orcamento-row__fill" style="width:${pctClamped}%; background:${color};"></div>
            </div>
          </div>`;
      })
      .join('');
  }

  /** Base compartilhada pela projeção (linha) e pelas bolhas de desvio — só
   * entram projetos orçados com início e término previstos cadastrados. */
  function computeFinanceiraProjecaoList(custoAcumuladoPorProjeto, custoPorProjetoPorMes) {
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    function taxaRecente(projetoId) {
      let soma = 0;
      for (let i = 0; i < 3; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        soma += custoPorProjetoPorMes[`${projetoId}::${mesStr}`] || 0;
      }
      return soma / 3;
    }

    return state.projetos
      .filter((p) => Number(p.valorOrcado) > 0 && p.dataInicioPrevista && p.dataTerminoPrevista)
      .map((p) => {
        const orcado = Number(p.valorOrcado);
        const mesesTotais = Math.max(monthDiffFinanceira(p.dataInicioPrevista, p.dataTerminoPrevista), 1);
        const mesesDecorridos = Math.min(Math.max(monthDiffFinanceira(p.dataInicioPrevista, hojeStr), 0), mesesTotais);
        const custoAcumuladoHoje = custoAcumuladoPorProjeto[p.id] || 0;
        const taxa = taxaRecente(p.id);
        const mesesRestantes = mesesTotais - mesesDecorridos;
        const custoProjetadoFinal = custoAcumuladoHoje + taxa * mesesRestantes;
        return {
          id: p.id,
          nome: p.nome,
          orcado,
          mesesTotais,
          mesesDecorridos,
          saldoMeses: mesesRestantes,
          pctPrazoHoje: (mesesDecorridos / mesesTotais) * 100,
          pctOrcadoHoje: (custoAcumuladoHoje / orcado) * 100,
          custoProjetadoFinal,
          pctOrcadoFinal: (custoProjetadoFinal / orcado) * 100,
        };
      });
  }

  function financeiraCorDoProjeto(dados, id) {
    const i = dados.findIndex((o) => o.id === id);
    return `var(--activity-${(i % 6) + 1})`;
  }

  function renderFinanceiraProjecaoLegend(dados) {
    const legend = els.financeiraProjecaoLegend;
    legend.innerHTML = dados
      .map(
        (p) => `
      <button type="button" class="projecao-chip${financeiraProjecaoOcultos.has(p.id) ? ' is-off' : ''}" data-id="${p.id}">
        <i style="background:${financeiraCorDoProjeto(dados, p.id)}"></i>${escapeHtml(p.nome)}
      </button>`
      )
      .join('');
    legend.querySelectorAll('.projecao-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.id;
        if (financeiraProjecaoOcultos.has(id)) financeiraProjecaoOcultos.delete(id);
        else financeiraProjecaoOcultos.add(id);
        renderFinanceira();
      });
    });
  }

  function renderFinanceiraProjecao(dados) {
    const svg = document.getElementById('chartFinanceiraProjecao');
    els.financeiraProjecaoEmptyState.classList.toggle('hidden', dados.length > 0);
    if (dados.length === 0) {
      svg.innerHTML = '';
      return;
    }

    const visiveis = dados.filter((p) => !financeiraProjecaoOcultos.has(p.id));
    const W = FINANCEIRA_PROJECAO_BASE_WIDTH, H = 380;
    const padL = 50, padR = 16, padT = 32, padB = 34;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxPct = Math.max(100, ...visiveis.map((p) => Math.max(p.pctOrcadoHoje, p.pctOrcadoFinal)), 1) * 1.1;

    const xFor = (pct) => padL + (pct / 100) * plotW;
    const yFor = (pct) => padT + plotH - (pct / maxPct) * plotH;

    const parts = [];
    [0, 25, 50, 75, 100].forEach((v) => {
      const x = xFor(v);
      parts.push(`<line class="gridline" x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" />`);
      parts.push(`<text class="month-tick" x="${x}" y="${H - 14}" text-anchor="middle">${v}%</text>`);
    });
    [0, 25, 50, 75, 100].filter((v) => v <= maxPct).forEach((v) => {
      const y = yFor(v);
      parts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v}%</text>`);
    });

    parts.push(`<line class="proj-diag" x1="${xFor(0)}" y1="${yFor(0)}" x2="${xFor(100)}" y2="${yFor(Math.min(100, maxPct))}" />`);
    parts.push(`<line class="proj-limit" x1="${padL}" y1="${yFor(100)}" x2="${W - padR}" y2="${yFor(100)}" />`);
    parts.push(`<text class="axis-title" x="${padL}" y="16" text-anchor="start">Eixo Y: % do orçamento consumido</text>`);
    parts.push(`<text class="axis-title" x="${W - padR}" y="${H - padB + 32}" text-anchor="end">Eixo X: % do prazo previsto decorrido</text>`);

    visiveis.forEach((p) => {
      const cor = financeiraCorDoProjeto(dados, p.id);
      const xHoje = xFor(p.pctPrazoHoje), yHoje = yFor(p.pctOrcadoHoje);
      const xFim = xFor(100), yFim = yFor(Math.min(p.pctOrcadoFinal, maxPct));
      parts.push(`<polyline class="proj-line" points="${xFor(0)},${yFor(0)} ${xHoje},${yHoje}" stroke="${cor}" />`);
      parts.push(`<polyline class="proj-line proj-line--projetado" points="${xHoje},${yHoje} ${xFim},${yFim}" stroke="${cor}" />`);
      parts.push(
        `<circle class="proj-dot" cx="${xHoje}" cy="${yHoje}" r="5" fill="${cor}">` +
          `<title>${escapeHtml(p.nome)}: ${Math.round(p.pctPrazoHoje)}% do prazo, ${Math.round(p.pctOrcadoHoje)}% do orçado hoje — projeção final ${Math.round(p.pctOrcadoFinal)}% (${formatBRL(p.custoProjetadoFinal)} de ${formatBRL(p.orcado)})</title>` +
          `</circle>`
      );
    });

    svg.innerHTML = parts.join('');
  }

  function applyFinanceiraProjecaoZoom() {
    document.getElementById('chartFinanceiraProjecao').style.width = `${FINANCEIRA_PROJECAO_BASE_WIDTH * financeiraProjecaoZoom}px`;
    els.financeiraProjecaoZoomLevel.textContent = `${Math.round(financeiraProjecaoZoom * 100)}%`;
    els.financeiraProjecaoZoomOut.disabled = financeiraProjecaoZoom <= 1;
    els.financeiraProjecaoZoomIn.disabled = financeiraProjecaoZoom >= 3;
  }

  function renderFinanceiraBolhas(dados) {
    const svg = document.getElementById('chartFinanceiraBolhas');
    const elegiveis = dados.filter((p) => p.pctPrazoHoje >= 5).map((p) => ({ ...p, ritmoCusto: (p.pctOrcadoHoje / p.pctPrazoHoje) * 100 }));
    els.financeiraBolhasEmptyState.classList.toggle('hidden', elegiveis.length > 0);
    if (elegiveis.length === 0) {
      svg.innerHTML = '';
      return;
    }

    const W = 720, H = 420;
    const padL = 46, padR = 20, padT = 36, padB = 40;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxX = Math.max(120, ...elegiveis.map((p) => p.pctPrazoHoje)) * 1.05;
    const maxY = Math.max(120, ...elegiveis.map((p) => p.ritmoCusto)) * 1.1;
    const xFor = (v) => padL + (v / maxX) * plotW;
    const yFor = (v) => padT + plotH - (v / maxY) * plotH;
    const raioFor = (saldoMeses) => 10 + Math.min(saldoMeses, 12) * 1.8;

    const x100 = xFor(100), y100 = yFor(100);
    const parts = [];
    parts.push(`<rect class="quad-good" x="${padL}" y="${y100}" width="${x100 - padL}" height="${padT + plotH - y100}" />`);
    parts.push(`<rect class="quad-warn" x="${padL}" y="${padT}" width="${x100 - padL}" height="${y100 - padT}" />`);
    parts.push(`<rect class="quad-warn" x="${x100}" y="${y100}" width="${padL + plotW - x100}" height="${padT + plotH - y100}" />`);
    parts.push(`<rect class="quad-bad" x="${x100}" y="${padT}" width="${padL + plotW - x100}" height="${y100 - padT}" />`);

    [0, 25, 50, 75, 100, 125].filter((v) => v <= maxX).forEach((v) => {
      parts.push(`<text class="value-tick" x="${xFor(v)}" y="${H - padB + 16}" text-anchor="middle">${v}%</text>`);
    });
    [0, 25, 50, 75, 100, 125, 150].filter((v) => v <= maxY).forEach((v) => {
      parts.push(`<text class="value-tick" x="${padL - 8}" y="${yFor(v) + 3}" text-anchor="end">${v}%</text>`);
    });

    parts.push(`<line class="quad-axis" x1="${x100}" y1="${padT}" x2="${x100}" y2="${padT + plotH}" />`);
    parts.push(`<line class="quad-axis" x1="${padL}" y1="${y100}" x2="${padL + plotW}" y2="${y100}" />`);
    parts.push(`<text class="axis-title" x="${padL}" y="16" text-anchor="start">Eixo Y: ritmo de custo (100% = no ritmo do prazo)</text>`);
    parts.push(`<text class="axis-title" x="${padL + plotW}" y="${H - padB + 32}" text-anchor="end">Eixo X: % do prazo previsto decorrido</text>`);

    elegiveis.forEach((p) => {
      const cx = xFor(Math.min(p.pctPrazoHoje, maxX));
      const cy = yFor(Math.min(p.ritmoCusto, maxY));
      const r = raioFor(p.saldoMeses);
      const cor = financeiraCorDoProjeto(dados, p.id);
      parts.push(
        `<circle class="bubble" cx="${cx}" cy="${cy}" r="${r}" fill="${cor}" fill-opacity="0.75">` +
          `<title>${escapeHtml(p.nome)}: ${Math.round(p.pctPrazoHoje)}% do prazo, ritmo de custo ${Math.round(p.ritmoCusto)}% — ${Math.round(p.saldoMeses)} meses restantes</title>` +
          `</circle>`
      );
      const nomeAbrev = p.nome.length > 18 ? p.nome.slice(0, 17) + '…' : p.nome;
      parts.push(`<text class="bubble-label" x="${cx}" y="${cy - r - 6}" text-anchor="middle">${escapeHtml(nomeAbrev)}</text>`);
      parts.push(`<text class="bubble-sub" x="${cx}" y="${cy - r + 6}" text-anchor="middle">${Math.round(p.pctPrazoHoje)}%, ${Math.round(p.ritmoCusto)}%</text>`);
    });

    const mediaX = elegiveis.reduce((a, p) => a + p.pctPrazoHoje, 0) / elegiveis.length;
    const mediaY = elegiveis.reduce((a, p) => a + p.ritmoCusto, 0) / elegiveis.length;
    const mx = xFor(Math.min(mediaX, maxX)), my = yFor(Math.min(mediaY, maxY));
    parts.push(
      `<circle class="media-marker" cx="${mx}" cy="${my}" r="6"><title>Média do portfólio: ${Math.round(mediaX)}% do prazo, ritmo de custo ${Math.round(mediaY)}%</title></circle>`
    );
    parts.push(`<text class="media-label" x="${mx + 10}" y="${my - 8}">Média: ${Math.round(mediaX)}% / ${Math.round(mediaY)}%</text>`);

    svg.innerHTML = parts.join('');
  }

  function renderFinanceiraCustoCargo(ativos) {
    const container = els.financeiraCustoCargoContainer;
    const temDados = ativos.some((c) => (Number(c.custoMensal) || 0) > 0);
    els.financeiraCustoCargoEmptyState.classList.toggle('hidden', temDados);
    container.innerHTML = '';
    if (!temDados) return;

    const porCargo = {};
    ativos.forEach((c) => {
      const cargo = c.cargo || 'Sem cargo definido';
      porCargo[cargo] = (porCargo[cargo] || 0) + (Number(c.custoMensal) || 0) * 12;
    });
    const total = Object.values(porCargo).reduce((a, b) => a + b, 0);
    const fatias = Object.entries(porCargo)
      .map(([cargo, valor]) => ({ cargo, valor }))
      .sort((a, b) => b.valor - a.valor)
      .map((f, i) => ({ ...f, color: `var(--activity-${(i % 6) + 1})` }));

    const size = 200, cx = size / 2, cy = size / 2, rOuter = 90, rInner = 50;
    const svgParts = [];
    if (fatias.length === 1) {
      const f = fatias[0];
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${f.color}"><title>${escapeHtml(f.cargo)}: ${formatBRL(f.valor)} (100%)</title></circle>`);
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="var(--color-surface)"/>`);
    } else {
      let angulo = -90;
      fatias.forEach((f) => {
        const fracao = f.valor / total;
        const inicio = angulo, fim = angulo + fracao * 360;
        angulo = fim;
        const d = donutSlicePath(cx, cy, rOuter, rInner, inicio, fim);
        svgParts.push(
          `<path class="departamento-chart__slice" d="${d}" fill="${f.color}" stroke="var(--color-surface)" stroke-width="2">` +
            `<title>${escapeHtml(f.cargo)}: ${formatBRL(f.valor)} (${formatPct(fracao)})</title></path>`
        );
      });
    }

    const svgWrap = document.createElement('div');
    svgWrap.className = 'departamento-chart__svg-wrap';
    svgWrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Composição de custo por cargo">${svgParts.join('')}</svg>`;

    const legend = document.createElement('div');
    legend.className = 'departamento-chart__legend';
    fatias.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'departamento-chart__legend-row';
      row.innerHTML = `
        <i style="background:${f.color}"></i>
        <span class="departamento-chart__legend-name">${escapeHtml(f.cargo)}</span>
        <span class="departamento-chart__legend-hours">${formatBRL(f.valor)}</span>
        <span class="departamento-chart__legend-pct">${formatPct(f.valor / total)}</span>
      `;
      legend.appendChild(row);
    });

    container.appendChild(svgWrap);
    container.appendChild(legend);
  }

  function renderFinanceiraCustoProjetoAtividade(concluidos, custoDoApontamento) {
    const container = els.financeiraCustoProjetoContainer;
    container.innerHTML = '';

    const activities = window.APP_DATA.ACTIVITIES;
    const colorFor = (index) => `var(--activity-${index + 1})`;

    const porProjeto = {};
    concluidos.forEach((a) => {
      if (!porProjeto[a.projetoId]) {
        porProjeto[a.projetoId] = { nome: a.projetoNome, cliente: a.clienteNome, porAtividade: {}, total: 0 };
      }
      const bucket = porProjeto[a.projetoId];
      const custo = custoDoApontamento(a);
      bucket.porAtividade[a.atividadeId] = (bucket.porAtividade[a.atividadeId] || 0) + custo;
      bucket.total += custo;
    });

    const linhas = Object.values(porProjeto).filter((l) => l.total > 0).sort((a, b) => b.total - a.total);
    els.financeiraCustoProjetoEmptyState.classList.toggle('hidden', linhas.length > 0);
    if (linhas.length === 0) return;
    const maiorTotal = Math.max(...linhas.map((l) => l.total));

    const legend = document.createElement('div');
    legend.className = 'horas-chart__legend';
    activities.forEach((act, i) => {
      const item = document.createElement('span');
      item.className = 'horas-chart__legend-item';
      item.innerHTML = `<i style="background:${colorFor(i)}"></i>${escapeHtml(act.name)}`;
      legend.appendChild(item);
    });

    const rows = document.createElement('div');
    rows.className = 'horas-chart__rows';

    linhas.forEach((linha) => {
      const row = document.createElement('div');
      row.className = 'horas-chart__row';

      const label = document.createElement('div');
      label.className = 'horas-chart__label';
      label.innerHTML = `<span class="horas-chart__name">${escapeHtml(linha.nome)}</span><span class="horas-chart__total">${escapeHtml(linha.cliente)} · ${formatBRL(linha.total)}</span>`;

      const track = document.createElement('div');
      track.className = 'horas-chart__track';
      track.style.width = `${Math.max(6, (linha.total / maiorTotal) * 100)}%`;

      activities.forEach((act, i) => {
        const valor = linha.porAtividade[act.id];
        if (!valor) return;
        const fracao = valor / linha.total;
        const pct = formatPct(fracao);
        const segment = document.createElement('div');
        segment.className = 'horas-chart__segment';
        segment.style.background = colorFor(i);
        segment.style.flexBasis = `${fracao * 100}%`;
        segment.title = `${linha.nome} — ${act.name}: ${formatBRL(valor)} (${pct})`;
        if (fracao > 0.12) {
          const segLabel = document.createElement('span');
          segLabel.className = 'horas-chart__segment-label';
          segLabel.textContent = `${formatBRL(valor)} · ${pct}`;
          segment.appendChild(segLabel);
        }
        track.appendChild(segment);
      });

      row.appendChild(label);
      row.appendChild(track);
      rows.appendChild(row);
    });

    container.appendChild(legend);
    container.appendChild(rows);
  }

  /* -------------------------------- Estratégia ------------------------------- */

  async function loadEstrategiaCenarios() {
    try {
      const cenarios = await Api.listCenarios(state.session);
      state.cenarios = cenarios;
      populateEstrategiaCenarioSelect();
      if (!cenarioAtual) {
        if (cenarios.length > 0) {
          selecionarCenario(cenarios[0].id);
        } else {
          renderEstrategia();
        }
      } else {
        renderEstrategia();
      }
    } catch (err) {
      if (isAuthError(err)) {
        toast('Sessão expirada ou inválida. Faça login novamente.', 'error');
        onLogout();
      } else {
        toast(`Erro ao carregar cenários: ${err.message}`, 'error');
      }
    }
  }

  function populateEstrategiaCenarioSelect() {
    els.estrategiaCenarioSelect.innerHTML = state.cenarios
      .map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`)
      .join('');
    if (cenarioAtual && cenarioAtual.id) {
      els.estrategiaCenarioSelect.value = cenarioAtual.id;
    }
  }

  function selecionarCenario(id) {
    const salvo = state.cenarios.find((c) => c.id === id);
    if (!salvo) return;
    cenarioAtual = {
      id: salvo.id,
      nome: salvo.nome,
      elenco: salvo.elenco.map((p) => ({ ...p })),
    };
    els.estrategiaCenarioSelect.value = id;
    renderEstrategia();
  }

  function onEstrategiaCenarioSelectChange() {
    selecionarCenario(els.estrategiaCenarioSelect.value);
  }

  function onNovoCenario() {
    const ativos = state.colaboradores.filter((c) => c.ativo);
    cenarioAtual = {
      id: null,
      nome: '',
      elenco: ativos.map((c) => ({
        chave: c.id,
        colaboradorId: c.id,
        nome: c.nome,
        cargo: c.cargo || 'Sem cargo definido',
        dedicacaoDiaria: Number(c.dedicacaoDiaria) || 8,
        custoMensal: Number(c.custoMensal) || 0,
        situacao: 'mantido',
      })),
    };
    els.estrategiaCenarioSelect.value = '';
    renderEstrategia();
    els.estrategiaCenarioNome.focus();
  }

  async function onSalvarCenario() {
    if (!cenarioAtual) return;
    const nome = els.estrategiaCenarioNome.value.trim();
    if (!nome) {
      toast('Dê um nome ao cenário antes de salvar.', 'error');
      els.estrategiaCenarioNome.focus();
      return;
    }
    cenarioAtual.nome = nome;
    try {
      const salvo = await Api.saveCenario(state.session, {
        id: cenarioAtual.id || undefined,
        nome: cenarioAtual.nome,
        elenco: cenarioAtual.elenco,
      });
      toast('Cenário salvo com sucesso.', 'success');
      cenarioAtual.id = salvo.id;
      const cenarios = await Api.listCenarios(state.session);
      state.cenarios = cenarios;
      populateEstrategiaCenarioSelect();
      els.excluirCenarioButton.classList.remove('hidden');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function onExcluirCenario() {
    if (!cenarioAtual || !cenarioAtual.id) {
      toast('Este cenário ainda não foi salvo.', 'error');
      return;
    }
    if (!window.confirm(`Excluir o cenário "${cenarioAtual.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await Api.excluirCenario(state.session, cenarioAtual.id);
      toast('Cenário excluído.', 'success');
      cenarioAtual = null;
      const cenarios = await Api.listCenarios(state.session);
      state.cenarios = cenarios;
      populateEstrategiaCenarioSelect();
      if (cenarios.length > 0) {
        selecionarCenario(cenarios[0].id);
      } else {
        renderEstrategia();
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function openElencoItemForm(item) {
    els.elencoItemForm.classList.remove('hidden');
    if (item) {
      els.elencoItemChave.value = item.chave;
      els.elencoItemNome.value = item.nome;
      els.elencoItemCargo.value = item.cargo;
      els.elencoItemDedicacao.value = item.dedicacaoDiaria;
      els.elencoItemCusto.value = item.custoMensal || '';
    } else {
      els.elencoItemChave.value = '';
      els.elencoItemNome.value = '';
      els.elencoItemCargo.value = '';
      els.elencoItemDedicacao.value = 8;
      els.elencoItemCusto.value = '';
    }
    els.elencoItemNome.focus();
  }

  function onElencoItemSubmit(e) {
    e.preventDefault();
    if (!cenarioAtual) return;
    const chave = els.elencoItemChave.value;
    const dados = {
      nome: els.elencoItemNome.value.trim(),
      cargo: els.elencoItemCargo.value.trim() || 'Sem cargo definido',
      dedicacaoDiaria: Number(els.elencoItemDedicacao.value) || 8,
      custoMensal: Number(els.elencoItemCusto.value) || 0,
    };
    if (chave) {
      const item = cenarioAtual.elenco.find((p) => p.chave === chave);
      if (item) Object.assign(item, dados);
    } else {
      cenarioAtual.elenco.push({
        chave: `novo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        colaboradorId: null,
        situacao: 'novo',
        ...dados,
      });
    }
    closeForm(els.elencoItemForm);
    renderEstrategia();
  }

  function onElencoBodyClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn || !cenarioAtual) return;
    const chave = btn.dataset.chave;
    const item = cenarioAtual.elenco.find((p) => p.chave === chave);
    if (!item) return;

    if (btn.dataset.action === 'editar') {
      openElencoItemForm(item);
    } else if (btn.dataset.action === 'remover') {
      if (item.colaboradorId) {
        item.situacao = 'removido';
      } else {
        cenarioAtual.elenco = cenarioAtual.elenco.filter((p) => p.chave !== chave);
      }
      renderEstrategia();
    } else if (btn.dataset.action === 'restaurar') {
      item.situacao = 'mantido';
      renderEstrategia();
    }
  }

  function estrategiaPorCargo(pessoas, campo, capacidadeDiasUteis) {
    const mapa = {};
    pessoas.forEach((p) => {
      const valor = campo === 'horas' ? p.dedicacaoDiaria * capacidadeDiasUteis : p.custoMensal;
      mapa[p.cargo] = (mapa[p.cargo] || 0) + valor;
    });
    return mapa;
  }

  function renderEstrategia() {
    els.estrategiaEmptyState.classList.toggle('hidden', !!cenarioAtual);
    els.estrategiaConteudo.classList.toggle('hidden', !cenarioAtual);
    els.excluirCenarioButton.classList.toggle('hidden', !cenarioAtual || !cenarioAtual.id);
    if (!cenarioAtual) return;

    els.estrategiaCenarioNome.value = cenarioAtual.nome;

    const ativos = state.colaboradores.filter((c) => c.ativo).map((c) => ({
      cargo: c.cargo || 'Sem cargo definido',
      dedicacaoDiaria: Number(c.dedicacaoDiaria) || 8,
      custoMensal: Number(c.custoMensal) || 0,
    }));
    const elencoAtivo = cenarioAtual.elenco.filter((p) => p.situacao !== 'removido');

    const hoje = new Date();
    const diasUteisMes = diasUteisNoMes(hoje.getFullYear(), hoje.getMonth());

    renderEstrategiaKpis(ativos, elencoAtivo, diasUteisMes);

    const temColaboradores = ativos.length > 0 || elencoAtivo.length > 0;
    els.estrategiaHorasCargoEmptyState.classList.toggle('hidden', temColaboradores);
    els.estrategiaCustoCargoEmptyState.classList.toggle('hidden', temColaboradores);
    if (temColaboradores) {
      renderEstrategiaGroupedBarChart(
        'chartEstrategiaHorasCargo',
        estrategiaPorCargo(ativos, 'horas', diasUteisMes),
        estrategiaPorCargo(elencoAtivo, 'horas', diasUteisMes),
        (v) => `${Math.round(v)}h`
      );
      renderEstrategiaGroupedBarChart(
        'chartEstrategiaCustoCargo',
        estrategiaPorCargo(ativos, 'custo', diasUteisMes),
        estrategiaPorCargo(elencoAtivo, 'custo', diasUteisMes),
        (v) => formatBRL(Math.round(v))
      );
    } else {
      document.getElementById('chartEstrategiaHorasCargo').innerHTML = '';
      document.getElementById('chartEstrategiaCustoCargo').innerHTML = '';
    }

    renderEstrategiaElenco();
  }

  function renderEstrategiaKpis(ativos, elencoAtivo, diasUteisMes) {
    const custoAtual = ativos.reduce((a, p) => a + p.custoMensal, 0);
    const custoCenario = elencoAtivo.reduce((a, p) => a + p.custoMensal, 0);
    const capacidadeAtual = ativos.reduce((a, p) => a + p.dedicacaoDiaria * diasUteisMes, 0);
    const capacidadeCenario = elencoAtivo.reduce((a, p) => a + p.dedicacaoDiaria * diasUteisMes, 0);
    const custoHoraAtual = capacidadeAtual > 0 ? custoAtual / capacidadeAtual : 0;
    const custoHoraCenario = capacidadeCenario > 0 ? custoCenario / capacidadeCenario : 0;

    const diffColaboradores = elencoAtivo.length - ativos.length;
    els.estrategiaKpiColaboradoresValue.innerHTML = `${elencoAtivo.length} <span style="color:var(--color-text-muted); font-size:1rem;">(atual: ${ativos.length})</span>`;
    els.estrategiaKpiColaboradoresSub.textContent =
      diffColaboradores === 0 ? 'igual ao time atual' : `${diffColaboradores > 0 ? '+' : ''}${diffColaboradores} em relação ao time atual`;
    els.estrategiaKpiColaboradoresSub.className = 'kpi__sub ' + (diffColaboradores > 0 ? 'pos' : diffColaboradores < 0 ? 'neg' : '');

    const diffCusto = custoCenario - custoAtual;
    const diffCustoPct = custoAtual > 0 ? (diffCusto / custoAtual) * 100 : 0;
    els.estrategiaKpiCustoValue.textContent = formatBRL(custoCenario);
    els.estrategiaKpiCustoSub.textContent =
      diffCusto === 0 ? 'igual ao time atual' : `${diffCusto > 0 ? '+' : ''}${formatBRL(diffCusto)} (${diffCusto > 0 ? '+' : ''}${Math.round(diffCustoPct * 10) / 10}%) vs. atual`;
    els.estrategiaKpiCustoSub.className = 'kpi__sub ' + (diffCusto > 0 ? 'neg' : diffCusto < 0 ? 'pos' : '');

    const diffCapacidade = capacidadeCenario - capacidadeAtual;
    const diffCapacidadePct = capacidadeAtual > 0 ? (diffCapacidade / capacidadeAtual) * 100 : 0;
    els.estrategiaKpiCapacidadeValue.textContent = `${Math.round(capacidadeCenario).toLocaleString('pt-BR')}h`;
    els.estrategiaKpiCapacidadeSub.textContent =
      diffCapacidade === 0
        ? 'igual ao time atual'
        : `${diffCapacidade > 0 ? '+' : ''}${Math.round(diffCapacidade).toLocaleString('pt-BR')}h (${diffCapacidade > 0 ? '+' : ''}${Math.round(diffCapacidadePct * 10) / 10}%) vs. atual`;
    els.estrategiaKpiCapacidadeSub.className = 'kpi__sub ' + (diffCapacidade > 0 ? 'pos' : diffCapacidade < 0 ? 'neg' : '');

    const diffCustoHora = custoHoraCenario - custoHoraAtual;
    els.estrategiaKpiCustoHoraValue.textContent = `R$ ${custoHoraCenario.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`;
    els.estrategiaKpiCustoHoraSub.textContent =
      Math.abs(diffCustoHora) < 0.05
        ? 'igual ao time atual'
        : `${diffCustoHora > 0 ? '+' : ''}R$ ${diffCustoHora.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vs. atual (R$ ${custoHoraAtual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })})`;
    els.estrategiaKpiCustoHoraSub.className = 'kpi__sub ' + (diffCustoHora > 0 ? 'neg' : diffCustoHora < 0 ? 'pos' : '');
  }

  function renderEstrategiaGroupedBarChart(svgId, atualMap, cenarioMap, formatter) {
    const svg = document.getElementById(svgId);
    const cargos = Array.from(new Set([...Object.keys(atualMap), ...Object.keys(cenarioMap)])).sort();
    const W = 720, H = 240;
    const padL = 70, padR = 12, padT = 16, padB = 34;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maiorValor = Math.max(1, ...cargos.map((c) => Math.max(atualMap[c] || 0, cenarioMap[c] || 0)));
    const maxVal = maiorValor * 1.2;
    const n = cargos.length;
    const slot = plotW / Math.max(1, n);
    const barW = slot * 0.32;
    const barGap = slot * 0.04;

    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const parts = [];
    [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].forEach((v) => {
      const y = yFor(v);
      parts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      parts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${formatter(v)}</text>`);
    });

    cargos.forEach((cargo, i) => {
      const center = xForCenter(i);
      const vAtual = atualMap[cargo] || 0;
      const vCenario = cenarioMap[cargo] || 0;

      const yA = yFor(vAtual);
      parts.push(
        `<rect class="bar-atual" x="${center - barGap / 2 - barW}" y="${yA}" width="${barW}" height="${padT + plotH - yA}" rx="3">` +
          `<title>${escapeHtml(cargo)} — atual: ${formatter(vAtual)}</title></rect>`
      );

      const yC = yFor(vCenario);
      parts.push(
        `<rect class="bar-cenario" x="${center + barGap / 2}" y="${yC}" width="${barW}" height="${padT + plotH - yC}" rx="3">` +
          `<title>${escapeHtml(cargo)} — cenário: ${formatter(vCenario)}</title></rect>`
      );

      parts.push(`<text class="month-tick" x="${center}" y="${H - 12}" text-anchor="middle">${escapeHtml(cargo)}</text>`);
    });

    svg.innerHTML = parts.join('');
  }

  function renderEstrategiaElenco() {
    els.estrategiaElencoBody.innerHTML = cenarioAtual.elenco
      .map((p) => {
        const statusLabel = { mantido: 'Mantido', novo: 'Novo', removido: 'Removido' }[p.situacao];
        const statusClass = `elenco-status--${p.situacao}`;
        const acoes =
          p.situacao === 'removido'
            ? `<button type="button" class="btn btn--ghost btn--small" data-action="restaurar" data-chave="${p.chave}">Restaurar</button>`
            : `<button type="button" class="btn btn--ghost btn--small" data-action="editar" data-chave="${p.chave}">Editar</button>` +
              `<button type="button" class="btn btn--ghost btn--small" data-action="remover" data-chave="${p.chave}">Remover</button>`;
        return `
          <tr class="${p.situacao === 'removido' ? 'elenco-row--removido' : ''}">
            <td>${escapeHtml(p.nome)}</td>
            <td>${escapeHtml(p.cargo)}</td>
            <td>${p.dedicacaoDiaria}h/dia</td>
            <td>${formatBRL(p.custoMensal)}</td>
            <td class="elenco-status-cell"><span class="elenco-status ${statusClass}">${statusLabel}</span></td>
            <td class="row-actions">${acoes}</td>
          </tr>`;
      })
      .join('');
  }

  /* --------------------------- Relatório individual -------------------------- */

  function abrirRelatorioColaborador(colaboradorId) {
    relatorioColaboradorPendente = colaboradorId;
    switchTab('relatorio');
  }

  function populateRelatorioSelects() {
    const currentColaborador = els.relatorioColaboradorSelect.value;
    els.relatorioColaboradorSelect.innerHTML = state.colaboradores
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}${c.ativo ? '' : ' (inativo)'}</option>`)
      .join('');
    const alvo = relatorioColaboradorPendente || currentColaborador;
    if (alvo && state.colaboradores.some((c) => c.id === alvo)) {
      els.relatorioColaboradorSelect.value = alvo;
    }
    relatorioColaboradorPendente = null;

    const hoje = new Date();
    const atual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const colaboradorSelecionado = els.relatorioColaboradorSelect.value;
    const mesesComDados = new Set();
    state.apontamentos.forEach((a) => {
      if (a.data && a.colaboradorId === colaboradorSelecionado) mesesComDados.add(a.data.slice(0, 7));
    });
    const ordenados = Array.from(new Set([atual, ...mesesComDados])).sort().reverse();
    // Abre por padrão no mês mais recente em que esse colaborador apontou
    // algo, não no mês corrente do calendário (que costuma estar vazio).
    const maisRecenteComDados = Array.from(mesesComDados).sort().reverse()[0];
    const padrao = maisRecenteComDados || atual;
    const currentMes = els.relatorioMesSelect.value;
    els.relatorioMesSelect.innerHTML = ordenados.map((m) => `<option value="${m}">${formatMesAno(m)}</option>`).join('');
    els.relatorioMesSelect.value = ordenados.includes(currentMes) ? currentMes : padrao;
  }

  /** Soma de horas apontadas por um colaborador num mês específico, só nos
   * dias úteis (mesma regra do total do relatório) — usado pelos
   * comparativos com o mês anterior e a média do ano. */
  function totalHorasMesColaborador(colaboradorId, year, month) {
    const dados = gerarDadosHorasDiarias(colaboradorId, year, month);
    if (!dados) return null;
    return dados.dias.filter((d) => !d.isNonBusiness).reduce((acc, d) => acc + d.horas, 0);
  }

  /** Média mensal do ano até o mês decorrido (mesma regra de "meses
   * considerados" da aba Equipe: ano corrente conta só até o mês atual do
   * calendário; ano passado conta os 12 meses). */
  function mediaMensalDoAno(colaboradorId, year) {
    const anoAtualReal = new Date().getFullYear();
    const mesAtualReal = new Date().getMonth() + 1;
    const mesesConsiderados = year === anoAtualReal ? mesAtualReal : 12;
    let soma = 0;
    for (let m = 1; m <= mesesConsiderados; m++) {
      soma += totalHorasMesColaborador(colaboradorId, year, m) || 0;
    }
    return mesesConsiderados > 0 ? soma / mesesConsiderados : null;
  }

  function renderRelatorio() {
    const colaboradorId = els.relatorioColaboradorSelect.value;
    const mesValue = els.relatorioMesSelect.value;
    if (!colaboradorId || !mesValue) return;

    const [year, month] = mesValue.split('-').map(Number);
    const dados = gerarDadosHorasDiarias(colaboradorId, year, month);
    if (!dados) return;

    els.relatorioSubtitle.textContent = `${dados.colaborador.nome} · ${formatMesAno(mesValue)}`;

    // Hoje e dias futuros do mês corrente ficam fora da conta — hoje ainda
    // não terminou (quem apontar à tarde não pode aparecer como "atrasado"
    // de manhã), e dias futuros nem chegaram. Senão "carga prevista"/"dias
    // sem apontamento" cobram o mês inteiro mesmo faltando semanas pra ele
    // acabar. Os gráficos continuam mostrando o mês inteiro
    // (renderHorasDiariasStatus só marca em vermelho dias já encerrados).
    const ehMesEmAndamento = dados.dias.some((d) => !d.isPast);
    const sufixoAteHoje = ehMesEmAndamento ? ' até ontem' : '';
    const diasUteis = dados.dias.filter((d) => !d.isNonBusiness && d.isPast);
    const diasTrabalhados = diasUteis.filter((d) => d.horas > 0);
    const diasSemApontamento = diasUteis.length - diasTrabalhados.length;

    const totaisPorAtividade = {};
    let totalMinutos = 0;
    diasUteis.forEach((d) => {
      Object.entries(d.porAtividade).forEach(([id, min]) => {
        totaisPorAtividade[id] = (totaisPorAtividade[id] || 0) + min;
        totalMinutos += min;
      });
    });
    const totalHoras = totalMinutos / 60;
    const cargaPrevista = dados.meta * diasUteis.length;
    const pctCarga = cargaPrevista > 0 ? Math.round((totalHoras / cargaPrevista) * 100) : 0;
    const mediaPorDiaUtil = diasUteis.length > 0 ? totalHoras / diasUteis.length : 0;

    els.relatorioEmptyState.classList.toggle('hidden', totalMinutos > 0);

    els.relatorioKpiCargaValue.textContent = `${Math.round(cargaPrevista)}h`;
    els.relatorioKpiCargaSub.textContent = `${dados.meta}h/dia × ${diasUteis.length} dias úteis${sufixoAteHoje}`;
    els.relatorioKpiHorasValue.textContent = `${Math.round(totalHoras)}h`;
    els.relatorioKpiHorasValue.className = 'kpi__value ' + (pctCarga >= 100 ? 'pos' : 'neg');
    els.relatorioKpiHorasSub.textContent = `${pctCarga}% da carga prevista${sufixoAteHoje}`;
    els.relatorioKpiFaltasValue.textContent = String(diasSemApontamento);
    els.relatorioKpiFaltasValue.className = 'kpi__value ' + (diasSemApontamento > 0 ? 'neg' : 'pos');
    els.relatorioKpiFaltasSub.textContent = `de ${diasUteis.length} dias úteis${sufixoAteHoje}`;
    els.relatorioKpiMediaValue.textContent = `${Math.round(mediaPorDiaUtil * 10) / 10}h`;
    els.relatorioKpiMediaSub.textContent = `meta diária: ${dados.meta}h`;

    const nome = escapeHtml(dados.colaborador.nome);
    const topEntry = Object.entries(totaisPorAtividade).sort((a, b) => b[1] - a[1])[0];
    const topAct = topEntry ? window.APP_DATA.ACTIVITIES.find((a) => a.id === topEntry[0]) : null;
    const pctTop = topEntry ? Math.round((topEntry[1] / totalMinutos) * 100) : 0;
    const trechoAtividade = topAct ? ` Atividade com mais tempo dedicado: <strong>${escapeHtml(topAct.name)}</strong> (${pctTop}%).` : '';

    // Comparativo com o mês anterior e com a média mensal do ano — só entra
    // na frase quando há uma base real pra comparar (mês anterior com
    // apontamento, média do ano maior que zero).
    let mesAnteriorAno = year, mesAnteriorMes = month - 1;
    if (mesAnteriorMes < 1) { mesAnteriorMes = 12; mesAnteriorAno -= 1; }
    const horasMesAnterior = totalHorasMesColaborador(colaboradorId, mesAnteriorAno, mesAnteriorMes);
    const mediaAno = mediaMensalDoAno(colaboradorId, year);

    const partesComparativo = [];
    if (horasMesAnterior != null && horasMesAnterior > 0) {
      const nomeMesAnterior = formatMesAno(`${mesAnteriorAno}-${String(mesAnteriorMes).padStart(2, '0')}`);
      const diffPct = Math.round(((totalHoras - horasMesAnterior) / horasMesAnterior) * 100);
      partesComparativo.push(`${diffPct >= 0 ? '+' : ''}${diffPct}% em relação a ${nomeMesAnterior} (${Math.round(horasMesAnterior)}h)`);
    }
    if (mediaAno != null && mediaAno > 0) {
      const diffMediaPct = Math.round(((totalHoras - mediaAno) / mediaAno) * 100);
      partesComparativo.push(`${diffMediaPct >= 0 ? '+' : ''}${diffMediaPct}% em relação à média do ano (${Math.round(mediaAno)}h/mês)`);
    }
    const trechoComparativo = partesComparativo.length ? ` ${partesComparativo.join(', ')}.` : '';

    els.relatorioResumoBox.classList.remove('is-ok');
    if (totalMinutos === 0) {
      els.relatorioResumoBox.innerHTML = `${nome} não registrou nenhum apontamento em ${formatMesAno(mesValue)}.${trechoComparativo}`;
    } else if (diasSemApontamento === 0) {
      els.relatorioResumoBox.classList.add('is-ok');
      els.relatorioResumoBox.innerHTML =
        `${nome} apontou corretamente <strong>todos os ${diasUteis.length} dias úteis</strong> do mês${sufixoAteHoje} — parabéns pela consistência! ` +
        `Total de <strong>${Math.round(totalHoras)}h</strong> apontadas, média de <strong>${Math.round(mediaPorDiaUtil * 10) / 10}h</strong> por dia útil ` +
        `(${pctCarga}% da carga prevista${sufixoAteHoje} de ${Math.round(cargaPrevista)}h).${trechoAtividade}${trechoComparativo}`;
    } else {
      els.relatorioResumoBox.innerHTML =
        `${nome} apontou <strong>${Math.round(totalHoras)}h</strong> em <strong>${diasTrabalhados.length} dos ${diasUteis.length}</strong> dias úteis do mês${sufixoAteHoje}, ` +
        `faltando <strong>${diasSemApontamento} apontamento${diasSemApontamento > 1 ? 's' : ''}</strong>. Média de <strong>${Math.round(mediaPorDiaUtil * 10) / 10}h</strong> ` +
        `por dia útil — ${pctCarga}% da carga prevista${sufixoAteHoje} de ${Math.round(cargaPrevista)}h.${trechoAtividade}${trechoComparativo}`;
    }

    renderHorasDiariasStatus(dados, 'chartRelatorioStatus');
    renderHorasDiariasAtividade(dados, 'chartRelatorioAtividade', 'legendRelatorioAtividade');
    renderRelatorioPizza(totaisPorAtividade, totalMinutos, diasUteis.length);
    renderRelatorioHeatmap(colaboradorId, mesValue);
    renderRelatorioComportamento(colaboradorId, mesValue);
  }

  /** Mapa de calor Projeto × Atividade do colaborador no mês — mesmo padrão
   * visual do mapa de calor Colaboradores × Projetos da aba Apontamentos.
   * Projetos ordenados do que mais consumiu tempo pro que menos. */
  function renderRelatorioHeatmap(colaboradorId, mesValue) {
    const activities = window.APP_DATA.ACTIVITIES;
    const doColaborador = state.apontamentos.filter(
      (a) =>
        a.colaboradorId === colaboradorId &&
        a.duracaoMinutos != null &&
        a.duracaoMinutos > 0 &&
        a.data &&
        a.data.slice(0, 7) === mesValue
    );

    const minutosPorCelula = {};
    const totalPorProjeto = {};
    const nomePorProjeto = {};
    const clientePorProjeto = {};
    let maiorMinutos = 0;
    doColaborador.forEach((a) => {
      const chave = `${a.projetoId}::${a.atividadeId}`;
      minutosPorCelula[chave] = (minutosPorCelula[chave] || 0) + a.duracaoMinutos;
      totalPorProjeto[a.projetoId] = (totalPorProjeto[a.projetoId] || 0) + a.duracaoMinutos;
      nomePorProjeto[a.projetoId] = a.projetoNome;
      clientePorProjeto[a.projetoId] = a.clienteNome;
      if (minutosPorCelula[chave] > maiorMinutos) maiorMinutos = minutosPorCelula[chave];
    });

    const projetos = Object.keys(totalPorProjeto)
      .map((id) => ({ id, nome: nomePorProjeto[id], cliente: clientePorProjeto[id], total: totalPorProjeto[id] }))
      .sort((a, b) => b.total - a.total);

    els.relatorioHeatmapTable.innerHTML = '';
    const semDados = projetos.length === 0;
    els.relatorioHeatmapEmptyState.classList.toggle('hidden', !semDados);
    els.relatorioHeatmapLegend.classList.toggle('hidden', semDados);
    if (semDados) return;

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    activities.forEach((act) => {
      const th = document.createElement('th');
      th.textContent = act.name;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    els.relatorioHeatmapTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    projetos.forEach((projeto) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.innerHTML = `${escapeHtml(projeto.nome)}<span>${escapeHtml(projeto.cliente)}</span>`;
      tr.appendChild(th);

      activities.forEach((act) => {
        const minutos = minutosPorCelula[`${projeto.id}::${act.id}`] || 0;
        const td = document.createElement('td');
        td.className = 'cell' + (minutos === 0 ? ' empty' : '');
        if (minutos > 0) {
          const fracao = maiorMinutos > 0 ? minutos / maiorMinutos : 0;
          td.style.background = heatColor(fracao);
          td.style.color = fracao > 0.55 ? '#fff' : 'var(--color-text)';
          td.title = `${projeto.nome} — ${act.name}: ${formatHm(minutos)}`;
          td.textContent = formatHm(minutos);
        } else {
          td.textContent = '–';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    els.relatorioHeatmapTable.appendChild(tbody);
  }

  function diffDiasCorridos(dataDeStr, dataAteStr) {
    const [ay, am, ad] = dataDeStr.split('-').map(Number);
    const [by, bm, bd] = dataAteStr.split('-').map(Number);
    const de = new Date(ay, am - 1, ad);
    const ate = new Date(by, bm - 1, bd);
    return Math.round((ate - de) / 86400000);
  }

  const DIAS_SEMANA_COMPORTAMENTO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  /** Compara o dia TRABALHADO (data) com o dia em que o apontamento foi
   * REGISTRADO (criadoEm) — atraso médio + em qual dia da semana o
   * colaborador costuma registrar. Só usa apontamentos com criadoEm válido
   * (registros sincronizados antes da API expor esse campo não têm essa
   * informação e ficam de fora). */
  function renderRelatorioComportamento(colaboradorId, mesValue) {
    const doColaborador = state.apontamentos.filter(
      (a) =>
        a.colaboradorId === colaboradorId &&
        a.duracaoMinutos != null &&
        a.duracaoMinutos > 0 &&
        a.data &&
        a.data.slice(0, 7) === mesValue &&
        a.criadoEm &&
        a.criadoEm.length >= 10
    );

    const semDados = doColaborador.length === 0;
    els.relatorioComportamentoEmptyState.classList.toggle('hidden', !semDados);
    els.relatorioComportamentoConteudo.classList.toggle('hidden', semDados);
    if (semDados) return;

    let somaAtraso = 0;
    const minutosPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];
    let countFimDeMes = 0;
    doColaborador.forEach((a) => {
      const dataRegistro = a.criadoEm.slice(0, 10);
      const atraso = Math.max(0, diffDiasCorridos(a.data, dataRegistro));
      somaAtraso += atraso;

      const [ry, rm, rd] = dataRegistro.split('-').map(Number);
      const dow = new Date(ry, rm - 1, rd).getDay();
      minutosPorDiaSemana[dow] += a.duracaoMinutos;

      const [ay, am] = a.data.split('-').map(Number);
      const ultimoDiaMes = new Date(ay, am, 0).getDate();
      if (dataRegistro.slice(0, 7) === a.data.slice(0, 7) && rd >= ultimoDiaMes - 4) countFimDeMes++;
    });

    const atrasoMedio = somaAtraso / doColaborador.length;
    const totalMinutosSemana = minutosPorDiaSemana.reduce((a, b) => a + b, 0);
    const maiorIdx = minutosPorDiaSemana.indexOf(Math.max(...minutosPorDiaSemana));
    const fracaoMaiorDia = totalMinutosSemana > 0 ? minutosPorDiaSemana[maiorIdx] / totalMinutosSemana : 0;
    const concentradoNumDia = fracaoMaiorDia >= 0.45;
    const fracaoFimDeMes = countFimDeMes / doColaborador.length;

    els.relatorioKpiAtrasoValue.textContent = `${Math.round(atrasoMedio * 10) / 10} dia${atrasoMedio >= 1.5 || atrasoMedio < 0.5 ? 's' : ''}`;
    if (atrasoMedio <= 0.5) {
      els.relatorioKpiAtrasoValue.className = 'kpi__value pos';
      els.relatorioKpiAtrasoSub.textContent = 'Em dia — registra no mesmo dia em que trabalha';
    } else if (atrasoMedio <= 2) {
      els.relatorioKpiAtrasoValue.className = 'kpi__value';
      els.relatorioKpiAtrasoSub.textContent = 'Leve atraso entre trabalhar e registrar';
    } else {
      els.relatorioKpiAtrasoValue.className = 'kpi__value neg';
      els.relatorioKpiAtrasoSub.textContent = 'Atraso considerável entre trabalhar e registrar';
    }

    const nomeDiaMaior = DIAS_SEMANA_COMPORTAMENTO[maiorIdx];
    const ehFimDeSemanaDia = maiorIdx === 0 || maiorIdx === 5 || maiorIdx === 6;
    let resumo;
    if (atrasoMedio <= 0.5) {
      resumo = `Costuma registrar no mesmo dia em que trabalha — hábito consistente e em dia, sem indício de apontamento em lote.`;
    } else if (fracaoFimDeMes >= 0.4) {
      resumo = `Concentra ${Math.round(fracaoFimDeMes * 100)}% dos registros nos últimos dias do mês trabalhado — indício de apontamento em lote no fim do mês, não dia a dia.`;
    } else if (concentradoNumDia && ehFimDeSemanaDia) {
      resumo = `Concentra ${Math.round(fracaoMaiorDia * 100)}% das horas registradas às ${nomeDiaMaior}s, com atraso médio de ${Math.round(atrasoMedio * 10) / 10} dia(s) — indício de apontamento em lote no fim de semana, em vez de diário.`;
    } else if (concentradoNumDia) {
      resumo = `Concentra ${Math.round(fracaoMaiorDia * 100)}% das horas registradas às ${nomeDiaMaior}s, com atraso médio de ${Math.round(atrasoMedio * 10) / 10} dia(s).`;
    } else {
      resumo = `Atraso médio de ${Math.round(atrasoMedio * 10) / 10} dia(s) entre trabalhar e registrar, sem um dia da semana claramente concentrado.`;
    }
    els.relatorioComportamentoResumo.textContent = resumo;

    const svg = document.getElementById('chartRelatorioComportamento');
    const W = 480, H = 180;
    const padL = 40, padR = 12, padT = 12, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const n = 7;
    const slot = plotW / n;
    const barW = slot * 0.55;
    const maxVal = Math.max(1, ...minutosPorDiaSemana) * 1.15;
    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const parts = [];
    [0, maxVal / 2, maxVal].forEach((v) => {
      const y = yFor(v);
      parts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      parts.push(`<text class="value-tick" x="${padL - 6}" y="${y + 3}" text-anchor="end">${formatHm(v)}</text>`);
    });
    const SIGLAS_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    minutosPorDiaSemana.forEach((min, i) => {
      const x = xForCenter(i) - barW / 2;
      const y = yFor(min);
      const cor = i === maiorIdx && min > 0 ? 'var(--color-primary)' : 'var(--capacity-bar)';
      if (min > 0) {
        parts.push(
          `<rect class="day-bar" x="${x}" y="${y}" width="${barW}" height="${padT + plotH - y}" rx="3" fill="${cor}">` +
            `<title>${DIAS_SEMANA_COMPORTAMENTO[i]}: ${formatHm(min)} registradas</title></rect>`
        );
      }
      parts.push(`<text class="month-tick" x="${xForCenter(i)}" y="${H - 10}" text-anchor="middle">${SIGLAS_DIA[i]}</text>`);
    });
    svg.innerHTML = parts.join('');
  }

  function renderRelatorioPizza(totaisPorAtividade, totalMinutos, diasUteisCount) {
    const activities = window.APP_DATA.ACTIVITIES;
    const colorFor = (i) => `var(--activity-${i + 1})`;
    const svg = document.getElementById('chartRelatorioPizza');
    const fatias = activities
      .map((a, i) => ({ ...a, color: colorFor(i), minutos: totaisPorAtividade[a.id] || 0 }))
      .filter((f) => f.minutos > 0)
      .sort((a, b) => b.minutos - a.minutos);

    if (!fatias.length) {
      svg.innerHTML = '';
      els.relatorioAtividadeTableBody.innerHTML = '';
      return;
    }

    const cx = 100, cy = 100, rOuter = 90, rInner = 50;
    const svgParts = [];
    if (fatias.length === 1) {
      const f = fatias[0];
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${f.color}"><title>${escapeHtml(f.name)}: ${formatHm(f.minutos)} (100%)</title></circle>`);
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="var(--color-surface)"/>`);
    } else {
      let angulo = -90;
      fatias.forEach((f) => {
        const fracao = f.minutos / totalMinutos;
        const inicio = angulo, fim = angulo + fracao * 360;
        angulo = fim;
        const d = donutSlicePath(cx, cy, rOuter, rInner, inicio, fim);
        svgParts.push(
          `<path d="${d}" fill="${f.color}" stroke="var(--color-surface)" stroke-width="2">` +
            `<title>${escapeHtml(f.name)}: ${formatHm(f.minutos)} (${formatPct(fracao)})</title></path>`
        );
      });
    }
    svg.innerHTML = svgParts.join('');

    els.relatorioAtividadeTableBody.innerHTML = fatias
      .map((f) => {
        const horas = f.minutos / 60;
        const fracao = f.minutos / totalMinutos;
        const mediaDiaUtil = diasUteisCount > 0 ? f.minutos / diasUteisCount / 60 : 0;
        return `<tr>
          <td class="atividade-table__nome"><i style="background:${f.color}"></i>${escapeHtml(f.name)}</td>
          <td>${Math.round(horas * 10) / 10}h</td>
          <td>${formatPct(fracao)}</td>
          <td>${Math.round(mediaDiaUtil * 10) / 10}h</td>
        </tr>`;
      })
      .join('');
  }

  async function exportRelatorioColaboradorPdf() {
    const panels = Array.from(document.querySelectorAll('.tab-panel'));
    const previouslyHidden = panels.map((panel) => panel.classList.contains('hidden'));
    panels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== 'tab-relatorio');
    });

    const agora = new Date();
    els.printReportHeaderMeta.textContent =
      `${els.relatorioSubtitle.textContent} · gerado em ${agora.toLocaleDateString('pt-BR')} às ` +
      `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const restore = () => {
      panels.forEach((panel, i) => panel.classList.toggle('hidden', previouslyHidden[i]));
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    window.print();
  }

  /* ----------------------------- Ranking da equipe ---------------------------- */

  /** Média mensal de cada métrica do ranking, olhando os `monthsBack` meses
   * imediatamente ANTES de (year, month) — janela móvel, não bloco fixo de
   * calendário (trimestre/semestre/ano sempre contam a partir do mês
   * selecionado, não de Jan/Abr/Jul/Out). */
  function computeRankingBaseline(monthsBack, year, month) {
    const acumulado = {};
    let y = year, m = month;
    for (let i = 0; i < monthsBack; i++) {
      m -= 1;
      if (m < 1) { m = 12; y -= 1; }
      computeRankingEquipe(y, m).forEach((c) => {
        if (!acumulado[c.id]) acumulado[c.id] = { totalMinutos: 0, foraHorarioMinutos: 0, porAtividade: {} };
        acumulado[c.id].totalMinutos += c.totalMinutos;
        acumulado[c.id].foraHorarioMinutos += c.foraHorarioMinutos;
        Object.entries(c.porAtividade).forEach(([aid, min]) => {
          acumulado[c.id].porAtividade[aid] = (acumulado[c.id].porAtividade[aid] || 0) + min;
        });
      });
    }
    const medias = {};
    Object.entries(acumulado).forEach(([id, vals]) => {
      medias[id] = {
        totalMinutos: vals.totalMinutos / monthsBack,
        foraHorarioMinutos: vals.foraHorarioMinutos / monthsBack,
        porAtividade: Object.fromEntries(Object.entries(vals.porAtividade).map(([aid, min]) => [aid, min / monthsBack])),
      };
    });
    return medias;
  }

  /** { id: minutos } -> { id: posição no ranking (1 = maior valor) },
   * ignorando quem tem 0 (não dá pra falar em "posição" sem ter apontado). */
  function posicoesPorMetrica(mapaValores) {
    const posicoes = {};
    Object.entries(mapaValores)
      .filter(([, min]) => min > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([id], i) => { posicoes[id] = i + 1; });
    return posicoes;
  }

  function formatRankingDelta(deltaMinutos, deltaPos) {
    const cls = deltaMinutos > 0 ? 'ranking-row__delta--up' : deltaMinutos < 0 ? 'ranking-row__delta--down' : '';
    const horasTxt = `${deltaMinutos > 0 ? '+' : deltaMinutos < 0 ? '−' : '±'}${formatHm(Math.abs(deltaMinutos))}`;
    const posTxt = deltaPos === undefined ? '' : deltaPos > 0 ? ` · ▲${deltaPos}` : deltaPos < 0 ? ` · ▼${Math.abs(deltaPos)}` : ' · =';
    return `<span class="ranking-row__delta ${cls}">${horasTxt}${posTxt}</span>`;
  }

  const RANKING_NOVO_HTML = '<span class="ranking-row__delta ranking-row__delta--novo">novo no período</span>';

  function computeRankingEquipe(year, month) {
    const ativos = state.colaboradores.filter((c) => c.ativo);
    return ativos.map((c) => {
      const dados = gerarDadosHorasDiarias(c.id, year, month);
      // Hoje e dias futuros do mês corrente não contam contra ninguém — hoje
      // ainda não terminou, e dias futuros nem chegaram.
      const diasUteis = dados.dias.filter((d) => !d.isNonBusiness && d.isPast);
      const diasSemApontamento = diasUteis.filter((d) => d.horas === 0).length;
      let totalMinutos = 0;
      let foraHorarioMinutos = 0;
      const porAtividade = {};
      dados.dias.forEach((d) => {
        Object.entries(d.porAtividade).forEach(([id, min]) => {
          totalMinutos += min;
          porAtividade[id] = (porAtividade[id] || 0) + min;
          if (d.isNonBusiness) foraHorarioMinutos += min;
        });
      });
      return {
        id: c.id,
        nome: c.nome,
        obrigatorio: dados.obrigatorio,
        totalMinutos,
        foraHorarioMinutos,
        diasUteis: diasUteis.length,
        diasSemApontamento,
        porAtividade,
      };
    });
  }

  function renderRankingEquipe() {
    const mesValue = els.rankingMesSelect.value;
    if (!mesValue) return;
    const [year, month] = mesValue.split('-').map(Number);
    const equipe = computeRankingEquipe(year, month);

    const hoje = new Date();
    const ehMesEmAndamento = year === hoje.getFullYear() && month === hoje.getMonth() + 1;
    els.rankPresencaTotalDesc.textContent = ehMesEmAndamento
      ? '100% de presença até ontem (considera só quem é obrigado a apontar).'
      : '100% de presença no mês (considera só quem é obrigado a apontar).';

    const temDados = equipe.some((c) => c.totalMinutos > 0);
    els.rankingEquipeEmptyState.classList.toggle('hidden', temDados);
    els.rankingEquipeGrid.classList.toggle('hidden', !temDados);
    if (!temDados) return;

    const monthsBack = Number(els.rankingComparativoSelect.value) || 0;
    const baseline = monthsBack > 0 ? computeRankingBaseline(monthsBack, year, month) : null;

    function linhaRanking(pos, nome, valorTexto, deltaHtml) {
      return `<li class="ranking-row ${pos === 1 ? 'ranking-row--top1' : ''}">
        <span class="ranking-row__pos">${pos}</span>
        <span class="ranking-row__nome">${escapeHtml(nome)}</span>
        <span class="ranking-row__valor">${valorTexto}</span>
        ${deltaHtml || ''}
      </li>`;
    }

    // 1) Quem trabalhou mais
    const porHoras = equipe.filter((c) => c.totalMinutos > 0).sort((a, b) => b.totalMinutos - a.totalMinutos);
    const posicoesAnterioresHoras = baseline
      ? posicoesPorMetrica(Object.fromEntries(equipe.map((c) => [c.id, (baseline[c.id] && baseline[c.id].totalMinutos) || 0])))
      : null;
    els.rankMaisHorasList.innerHTML = porHoras.length
      ? porHoras
          .map((c, i) => {
            let deltaHtml = '';
            if (baseline) {
              const baseVal = baseline[c.id] ? baseline[c.id].totalMinutos : 0;
              deltaHtml = baseVal > 0
                ? formatRankingDelta(c.totalMinutos - baseVal, posicoesAnterioresHoras[c.id] - (i + 1))
                : RANKING_NOVO_HTML;
            }
            return linhaRanking(i + 1, c.nome, formatHm(c.totalMinutos), deltaHtml);
          })
          .join('')
      : '<li class="ranking-empty">Nenhum apontamento neste mês.</li>';

    // 2) Quem trabalhou mais, por atividade (líder + variação de horas do próprio líder)
    const activities = window.APP_DATA.ACTIVITIES;
    els.rankPorAtividadeList.innerHTML = activities
      .map((act) => {
        const comAtividade = equipe.filter((c) => (c.porAtividade[act.id] || 0) > 0);
        if (!comAtividade.length) {
          return `<li class="ranking-row"><span class="ranking-row__nome">${escapeHtml(act.name)}</span><span class="ranking-row__valor">—</span></li>`;
        }
        const lider = comAtividade.sort((a, b) => (b.porAtividade[act.id] || 0) - (a.porAtividade[act.id] || 0))[0];
        let deltaHtml = '';
        if (baseline) {
          const baseVal = (baseline[lider.id] && baseline[lider.id].porAtividade[act.id]) || 0;
          deltaHtml = baseVal > 0 ? formatRankingDelta(lider.porAtividade[act.id] - baseVal) : RANKING_NOVO_HTML;
        }
        return `<li class="ranking-row">
          <span class="ranking-row__nome">${escapeHtml(act.name)}</span>
          <span class="ranking-row__valor">${escapeHtml(lider.nome)} · ${formatHm(lider.porAtividade[act.id])}</span>
          ${deltaHtml}
        </li>`;
      })
      .join('');

    // 3) Quem apontou todos os dias úteis — "bateu 100% ou não" não tem um
    // "período anterior" comparável (não é uma métrica numérica), fica sem comparativo.
    const presencaTotal = equipe
      .filter((c) => c.obrigatorio && c.diasUteis > 0 && c.diasSemApontamento === 0)
      .sort((a, b) => b.totalMinutos - a.totalMinutos);
    els.rankPresencaTotalContainer.innerHTML = presencaTotal.length
      ? `<div style="display:flex; flex-wrap:wrap; gap:8px;">${presencaTotal.map((c) => `<span class="badge-full">✓ ${escapeHtml(c.nome)}</span>`).join('')}</div>`
      : '<p class="ranking-empty">Ninguém bateu 100% de presença este mês.</p>';

    // 4) Quem trabalhou mais fora do horário
    const foraHorario = equipe.filter((c) => c.foraHorarioMinutos > 0).sort((a, b) => b.foraHorarioMinutos - a.foraHorarioMinutos);
    const posicoesAnterioresFora = baseline
      ? posicoesPorMetrica(Object.fromEntries(equipe.map((c) => [c.id, (baseline[c.id] && baseline[c.id].foraHorarioMinutos) || 0])))
      : null;
    els.rankForaHorarioList.innerHTML = foraHorario.length
      ? foraHorario
          .map((c, i) => {
            let deltaHtml = '';
            if (baseline) {
              const baseVal = baseline[c.id] ? baseline[c.id].foraHorarioMinutos : 0;
              deltaHtml = baseVal > 0
                ? formatRankingDelta(c.foraHorarioMinutos - baseVal, posicoesAnterioresFora[c.id] - (i + 1))
                : RANKING_NOVO_HTML;
            }
            return linhaRanking(i + 1, c.nome, formatHm(c.foraHorarioMinutos), deltaHtml);
          })
          .join('')
      : '<li class="ranking-empty">Ninguém apontou fora dos dias úteis este mês.</li>';
  }

  /** Busca TODO o histórico de apontamentos, mas em pedaços de poucos meses
   * em vez de uma chamada só. Um único listApontamentos(undefined, undefined)
   * devolve a planilha inteira de uma vez — conforme os dados acumulam, essa
   * resposta cresce até o ponto em que o Apps Script passa a servi-la via um
   * redirecionamento, e o fetch() do navegador derruba o POST pra GET ao
   * seguir esse redirecionamento (perde o corpo, cai no doGet == erro "use
   * POST"). Pedaços menores ficam abaixo desse limite. Anda de trás pra
   * frente a partir de hoje e para depois de 2 blocos vazios seguidos (com um
   * teto de segurança pra nunca rodar pra sempre). */
  async function fetchTodosApontamentos(session) {
    const CHUNK_MESES = 3;
    const MAX_CHUNKS = 40; // ~10 anos em blocos de 3 meses
    // Mapa por id, não array: se algum pedaço vier com um registro repetido
    // (ex.: filtro de data se comportando de forma inesperada num caso
    // extremo), o duplicado só sobrescreve a si mesmo em vez de contar dobrado
    // nas somas de horas — mais seguro que confiar cegamente na filtragem do
    // servidor.
    const porId = new Map();
    let anoFim = new Date().getFullYear();
    let mesFim = new Date().getMonth() + 1; // 1-indexado
    let vaziosSeguidos = 0;

    for (let i = 0; i < MAX_CHUNKS && vaziosSeguidos < 2; i++) {
      let anoInicio = anoFim;
      let mesInicio = mesFim - (CHUNK_MESES - 1);
      while (mesInicio < 1) {
        mesInicio += 12;
        anoInicio -= 1;
      }
      const desde = `${anoInicio}-${String(mesInicio).padStart(2, '0')}-01`;
      const ultimoDia = new Date(anoFim, mesFim, 0).getDate();
      const ate = `${anoFim}-${String(mesFim).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

      const pedaco = await Api.listApontamentos(session, desde, ate);
      if (pedaco.length === 0) {
        vaziosSeguidos += 1;
      } else {
        vaziosSeguidos = 0;
        pedaco.forEach((a) => porId.set(a.id, a));
      }

      mesFim = mesInicio - 1;
      anoFim = anoInicio;
      if (mesFim < 1) {
        mesFim += 12;
        anoFim -= 1;
      }
    }
    return Array.from(porId.values());
  }

  async function loadApontamentos() {
    try {
      const apontamentos = await fetchTodosApontamentos(state.session);
      state.apontamentos = apontamentos;
      populateHorasDiariasColaboradorSelect();
      populateHorasDiariasMesSelect();
      populateRankingMesSelect();
      renderHorasDiarias();
      renderRankingEquipe();
      renderConformidade();
      renderCharts();
      // Consumo de horas por projeto é proposital separado dos filtros de
      // período/cliente/projeto — sempre olha o histórico completo.
      renderProjetoChart();
    } catch (err) {
      if (isAuthError(err)) {
        toast('Sessão expirada ou inválida. Faça login novamente.', 'error');
        onLogout();
      } else {
        toast(`Erro ao carregar apontamentos: ${err.message}`, 'error');
      }
    }
  }

  function populateHorasFiltroClienteSelect() {
    const current = els.horasFiltroCliente.value;
    els.horasFiltroCliente.innerHTML = '<option value="">Todos os clientes</option>';
    state.clientes
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nome;
        els.horasFiltroCliente.appendChild(opt);
      });
    els.horasFiltroCliente.value = current;
  }

  function populateHorasFiltroProjetoSelect() {
    const clienteId = els.horasFiltroCliente.value;
    const current = els.horasFiltroProjeto.value;
    els.horasFiltroProjeto.innerHTML = '<option value="">Todos os projetos</option>';
    state.projetos
      .filter((p) => !clienteId || p.clienteId === clienteId)
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        els.horasFiltroProjeto.appendChild(opt);
      });
    const stillValid = Array.from(els.horasFiltroProjeto.options).some((o) => o.value === current);
    els.horasFiltroProjeto.value = stillValid ? current : '';
  }

  function getFilteredApontamentosParaGraficos() {
    const de = els.horasFiltroDe.value;
    const ate = els.horasFiltroAte.value;
    const clienteId = els.horasFiltroCliente.value;
    const projetoId = els.horasFiltroProjeto.value;
    return state.apontamentos.filter((a) => {
      if (de && a.data < de) return false;
      if (ate && a.data > ate) return false;
      if (clienteId && a.clienteId !== clienteId) return false;
      if (projetoId && a.projetoId !== projetoId) return false;
      return true;
    });
  }

  function renderCharts() {
    const filtrados = getFilteredApontamentosParaGraficos();
    renderDepartamentoChart(filtrados);
    renderHeatmap(filtrados);
    renderHorasChart(filtrados);
  }

  function renderConformidade() {
    const dias = Number(els.apontamentosRangeSelect.value);
    const businessDays = Holidays.lastBusinessDays(dias);
    const hoje = Holidays.dateStr(new Date());
    const ativos = state.colaboradores.filter((c) => c.ativo && c.obrigatorioApontamento !== false);

    const linhas = ativos.map((colaborador) => {
      const doColaborador = state.apontamentos.filter((a) => a.colaboradorId === colaborador.id);
      const diasComApontamento = new Set(doColaborador.map((a) => a.data));
      const diasSemApontamento = businessDays.filter((d) => !diasComApontamento.has(d)).length;
      // Uma atividade em aberto de HOJE é normal (a pessoa está trabalhando
      // nela agora) — só conta como pendência se sobrou aberta de outro dia.
      const atividadesEmAberto = doColaborador.filter((a) => a.status === 'em_andamento' && a.data !== hoje).length;
      return {
        colaborador,
        diasSemApontamento,
        atividadesEmAberto,
        score: diasSemApontamento + atividadesEmAberto,
      };
    });

    linhas.sort((a, b) => b.score - a.score);

    els.conformidadeTableBody.innerHTML = '';
    els.conformidadeEmptyState.classList.toggle('hidden', linhas.length > 0);

    linhas.forEach(({ colaborador, diasSemApontamento, atividadesEmAberto, score }) => {
      const severidade = severityFor(score);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(colaborador.nome)}</td>
        <td>${diasSemApontamento} de ${businessDays.length}</td>
        <td>${atividadesEmAberto}</td>
        <td><span class="status-pill ${severidade.cls}">${severidade.icon} ${severidade.label}</span></td>
        <td></td>
      `;
      if (score > 0) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Notificar';
        btn.addEventListener('click', () => onNotificar(colaborador));
        const rowActions = document.createElement('div');
        rowActions.className = 'row-actions';
        rowActions.appendChild(btn);
        tr.querySelector('td:last-child').appendChild(rowActions);
      }
      els.conformidadeTableBody.appendChild(tr);
    });
  }

  function severityFor(score) {
    if (score === 0) return { label: 'Em dia', cls: 'status-pill--good', icon: '●' };
    if (score <= 2) return { label: 'Atenção', cls: 'status-pill--warning', icon: '▲' };
    return { label: 'Crítico', cls: 'status-pill--critical', icon: '■' };
  }

  async function onNotificar(colaborador) {
    const mensagem = window.prompt(
      `Enviar e-mail de reforço para ${colaborador.nome}.\n\nMensagem adicional (opcional — pode deixar em branco e enviar só o texto padrão):`,
      ''
    );
    if (mensagem === null) return; // cancelou o prompt
    try {
      await Api.enviarReforcoApontamento(state.session, colaborador.id, mensagem || undefined);
      toast(`E-mail de reforço enviado para ${colaborador.nome}.`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function renderHorasChart(apontamentos) {
    const concluidos = apontamentos.filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0);
    els.horasChartEmptyState.classList.toggle('hidden', concluidos.length > 0);
    els.horasChartContainer.innerHTML = '';
    if (concluidos.length === 0) return;

    const activities = window.APP_DATA.ACTIVITIES;
    const colorFor = (index) => `var(--activity-${index + 1})`;

    const porColaborador = {};
    concluidos.forEach((a) => {
      if (!porColaborador[a.colaboradorId]) {
        porColaborador[a.colaboradorId] = { nome: a.colaboradorNome, porAtividade: {}, total: 0 };
      }
      const bucket = porColaborador[a.colaboradorId];
      bucket.porAtividade[a.atividadeId] = (bucket.porAtividade[a.atividadeId] || 0) + a.duracaoMinutos;
      bucket.total += a.duracaoMinutos;
    });

    const linhas = Object.values(porColaborador).sort((a, b) => b.total - a.total);
    const maiorTotal = Math.max(...linhas.map((l) => l.total));

    const legend = document.createElement('div');
    legend.className = 'horas-chart__legend';
    activities.forEach((act, i) => {
      const item = document.createElement('span');
      item.className = 'horas-chart__legend-item';
      item.innerHTML = `<i style="background:${colorFor(i)}"></i>${escapeHtml(act.name)}`;
      legend.appendChild(item);
    });

    const rows = document.createElement('div');
    rows.className = 'horas-chart__rows';

    linhas.forEach((linha) => {
      const row = document.createElement('div');
      row.className = 'horas-chart__row';

      const label = document.createElement('div');
      label.className = 'horas-chart__label';
      label.innerHTML = `<span class="horas-chart__name">${escapeHtml(linha.nome)}</span><span class="horas-chart__total">${formatHm(linha.total)}</span>`;

      const track = document.createElement('div');
      track.className = 'horas-chart__track';
      // A largura da track (relativa ao maior total) mostra quem trabalhou
      // mais horas no período; os segmentos dentro dela mostram a composição
      // por atividade daquele colaborador.
      track.style.width = `${Math.max(6, (linha.total / maiorTotal) * 100)}%`;

      activities.forEach((act, i) => {
        const minutos = linha.porAtividade[act.id];
        if (!minutos) return;
        const fracao = minutos / linha.total;
        const pct = formatPct(fracao);
        const segment = document.createElement('div');
        segment.className = 'horas-chart__segment';
        segment.style.background = colorFor(i);
        segment.style.flexBasis = `${fracao * 100}%`;
        segment.title = `${linha.nome} — ${act.name}: ${formatHm(minutos)} (${pct})`;
        if (fracao > 0.12) {
          const segLabel = document.createElement('span');
          segLabel.className = 'horas-chart__segment-label';
          segLabel.textContent = `${formatHm(minutos)} · ${pct}`;
          segment.appendChild(segLabel);
        }
        track.appendChild(segment);
      });

      row.appendChild(label);
      row.appendChild(track);
      rows.appendChild(row);
    });

    els.horasChartContainer.appendChild(legend);
    els.horasChartContainer.appendChild(rows);
  }

  /** Consumo de horas por projeto (total + composição por atividade) — mesmo
   * padrão visual do gráfico por colaborador, mas agrupado por projeto.
   * Proposital: NÃO usa os filtros de período/cliente/projeto (filtrar um
   * gráfico organizado por projeto por "projeto" não faz sentido) — sempre
   * olha o histórico completo, ordenado do maior para o menor total. */
  function renderProjetoChart() {
    const concluidos = state.apontamentos.filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0);
    els.projetoChartEmptyState.classList.toggle('hidden', concluidos.length > 0);
    els.projetoChartContainer.innerHTML = '';
    if (concluidos.length === 0) return;

    const activities = window.APP_DATA.ACTIVITIES;
    const colorFor = (index) => `var(--activity-${index + 1})`;

    const porProjeto = {};
    concluidos.forEach((a) => {
      if (!porProjeto[a.projetoId]) {
        porProjeto[a.projetoId] = { nome: a.projetoNome, cliente: a.clienteNome, porAtividade: {}, total: 0 };
      }
      const bucket = porProjeto[a.projetoId];
      bucket.porAtividade[a.atividadeId] = (bucket.porAtividade[a.atividadeId] || 0) + a.duracaoMinutos;
      bucket.total += a.duracaoMinutos;
    });

    const linhas = Object.values(porProjeto).sort((a, b) => b.total - a.total);
    const maiorTotal = Math.max(...linhas.map((l) => l.total));

    const legend = document.createElement('div');
    legend.className = 'horas-chart__legend';
    activities.forEach((act, i) => {
      const item = document.createElement('span');
      item.className = 'horas-chart__legend-item';
      item.innerHTML = `<i style="background:${colorFor(i)}"></i>${escapeHtml(act.name)}`;
      legend.appendChild(item);
    });

    const rows = document.createElement('div');
    rows.className = 'horas-chart__rows';

    linhas.forEach((linha) => {
      const row = document.createElement('div');
      row.className = 'horas-chart__row';

      const label = document.createElement('div');
      label.className = 'horas-chart__label';
      label.innerHTML = `<span class="horas-chart__name">${escapeHtml(linha.nome)}</span><span class="horas-chart__total">${escapeHtml(linha.cliente)} · ${formatHm(linha.total)}</span>`;

      const track = document.createElement('div');
      track.className = 'horas-chart__track';
      track.style.width = `${Math.max(6, (linha.total / maiorTotal) * 100)}%`;

      activities.forEach((act, i) => {
        const minutos = linha.porAtividade[act.id];
        if (!minutos) return;
        const fracao = minutos / linha.total;
        const pct = formatPct(fracao);
        const segment = document.createElement('div');
        segment.className = 'horas-chart__segment';
        segment.style.background = colorFor(i);
        segment.style.flexBasis = `${fracao * 100}%`;
        segment.title = `${linha.nome} — ${act.name}: ${formatHm(minutos)} (${pct})`;
        if (fracao > 0.12) {
          const segLabel = document.createElement('span');
          segLabel.className = 'horas-chart__segment-label';
          segLabel.textContent = `${formatHm(minutos)} · ${pct}`;
          segment.appendChild(segLabel);
        }
        track.appendChild(segment);
      });

      row.appendChild(label);
      row.appendChild(track);
      rows.appendChild(row);
    });

    els.projetoChartContainer.appendChild(legend);
    els.projetoChartContainer.appendChild(rows);
  }

  /** Gráfico de pizza (donut) com as horas de TODOS os colaboradores somadas
   * por atividade — visão do departamento como um todo, respeitando os
   * mesmos filtros de período/cliente/projeto do gráfico por colaborador. */
  function renderDepartamentoChart(apontamentos) {
    const concluidos = apontamentos.filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0);
    els.departamentoChartEmptyState.classList.toggle('hidden', concluidos.length > 0);
    els.departamentoChartContainer.innerHTML = '';
    if (concluidos.length === 0) return;

    const activities = window.APP_DATA.ACTIVITIES;
    const colorFor = (index) => `var(--activity-${index + 1})`;

    const porAtividade = {};
    let totalGeral = 0;
    concluidos.forEach((a) => {
      porAtividade[a.atividadeId] = (porAtividade[a.atividadeId] || 0) + a.duracaoMinutos;
      totalGeral += a.duracaoMinutos;
    });

    const fatias = activities
      .map((act, i) => ({ act, color: colorFor(i), minutos: porAtividade[act.id] || 0 }))
      .filter((f) => f.minutos > 0)
      .sort((a, b) => b.minutos - a.minutos);

    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = 90;
    const rInner = 50;

    const svgParts = [];
    if (fatias.length === 1) {
      // Uma atividade só = 100% — um arco não representa um círculo cheio,
      // desenha como anel completo (dois círculos concêntricos).
      const f = fatias[0];
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${f.color}"><title>${escapeHtml(f.act.name)}: ${formatHm(f.minutos)} (100%)</title></circle>`);
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="var(--color-surface)"/>`);
    } else {
      let anguloAtual = -90; // começa no topo (12h), sentido horário
      fatias.forEach((f) => {
        const fracao = f.minutos / totalGeral;
        const anguloInicio = anguloAtual;
        const anguloFim = anguloAtual + fracao * 360;
        anguloAtual = anguloFim;
        const d = donutSlicePath(cx, cy, rOuter, rInner, anguloInicio, anguloFim);
        svgParts.push(
          `<path class="departamento-chart__slice" d="${d}" fill="${f.color}" stroke="var(--color-surface)" stroke-width="2">` +
            `<title>${escapeHtml(f.act.name)}: ${formatHm(f.minutos)} (${formatPct(fracao)})</title>` +
            `</path>`
        );
      });
    }

    const svgWrap = document.createElement('div');
    svgWrap.className = 'departamento-chart__svg-wrap';
    svgWrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Distribuição de horas do departamento por atividade">${svgParts.join('')}</svg>`;

    const legend = document.createElement('div');
    legend.className = 'departamento-chart__legend';
    fatias.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'departamento-chart__legend-row';
      row.innerHTML = `
        <i style="background:${f.color}"></i>
        <span class="departamento-chart__legend-name">${escapeHtml(f.act.name)}</span>
        <span class="departamento-chart__legend-hours">${formatHm(f.minutos)}</span>
        <span class="departamento-chart__legend-pct">${formatPct(f.minutos / totalGeral)}</span>
      `;
      legend.appendChild(row);
    });

    els.departamentoChartContainer.appendChild(svgWrap);
    els.departamentoChartContainer.appendChild(legend);
  }

  /** Caminho SVG de uma fatia de anel (donut) entre dois ângulos, em graus. */
  function donutSlicePath(cx, cy, rOuter, rInner, startAngleDeg, endAngleDeg) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;

    const x1o = cx + rOuter * Math.cos(toRad(startAngleDeg));
    const y1o = cy + rOuter * Math.sin(toRad(startAngleDeg));
    const x2o = cx + rOuter * Math.cos(toRad(endAngleDeg));
    const y2o = cy + rOuter * Math.sin(toRad(endAngleDeg));

    const x1i = cx + rInner * Math.cos(toRad(endAngleDeg));
    const y1i = cy + rInner * Math.sin(toRad(endAngleDeg));
    const x2i = cx + rInner * Math.cos(toRad(startAngleDeg));
    const y2i = cy + rInner * Math.sin(toRad(startAngleDeg));

    return [
      `M ${x1o} ${y1o}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      'Z',
    ].join(' ');
  }

  function formatPct(fracao) {
    return `${Math.round(fracao * 1000) / 10}%`;
  }

  /** Nome do cliente de um projeto, pra ordenar/rotular sem precisar buscar
   * toda vez — cliente removido não quebra, só mostra um texto de aviso. */
  function clienteNomeDoProjeto(projeto) {
    if (!projeto) return '';
    const cliente = state.clientes.find((c) => c.id === projeto.clienteId);
    return cliente ? cliente.nome : '(cliente removido)';
  }

  /** Mapa de calor: linhas são os projetos (com o cliente embaixo do nome),
   * colunas são os colaboradores — ambos sempre em ordem alfabética (projetos
   * agrupados por cliente). Mostra todo mundo ativo, mesmo sem horas no
   * período/filtro — uma linha ou coluna vazia já é informação útil (projeto
   * sem ninguém alocado, ou colaborador sem apontamento no recorte). */
  function renderHeatmap(apontamentos) {
    const projetosAtivos = state.projetos
      .filter((p) => p.ativo)
      .slice()
      .sort((a, b) => clienteNomeDoProjeto(a).localeCompare(clienteNomeDoProjeto(b)) || a.nome.localeCompare(b.nome));
    const colaboradoresAtivos = state.colaboradores
      .filter((c) => c.ativo)
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));

    els.heatmapTable.innerHTML = '';
    const semDados = projetosAtivos.length === 0 || colaboradoresAtivos.length === 0;
    els.heatmapEmptyState.classList.toggle('hidden', !semDados);
    els.heatmapLegend.classList.toggle('hidden', semDados);
    if (semDados) return;

    const minutosPorCelula = {};
    let maiorMinutos = 0;
    apontamentos
      .filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0)
      .forEach((a) => {
        const chave = `${a.projetoId}::${a.colaboradorId}`;
        minutosPorCelula[chave] = (minutosPorCelula[chave] || 0) + a.duracaoMinutos;
        if (minutosPorCelula[chave] > maiorMinutos) maiorMinutos = minutosPorCelula[chave];
      });

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    colaboradoresAtivos.forEach((colaborador) => {
      const th = document.createElement('th');
      th.textContent = colaborador.nome;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    els.heatmapTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    projetosAtivos.forEach((projeto) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.innerHTML = `${escapeHtml(projeto.nome)}<span>${escapeHtml(clienteNomeDoProjeto(projeto))}</span>`;
      tr.appendChild(th);

      colaboradoresAtivos.forEach((colaborador) => {
        const minutos = minutosPorCelula[`${projeto.id}::${colaborador.id}`] || 0;
        const td = document.createElement('td');
        td.className = 'cell' + (minutos === 0 ? ' empty' : '');
        if (minutos > 0) {
          const fracao = maiorMinutos > 0 ? minutos / maiorMinutos : 0;
          td.style.background = heatColor(fracao);
          td.style.color = fracao > 0.55 ? '#fff' : 'var(--color-text)';
          td.title = `${colaborador.nome} — ${clienteNomeDoProjeto(projeto)} / ${projeto.nome}: ${formatHm(minutos)}`;
          td.textContent = formatHm(minutos);
        } else {
          td.textContent = '–';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    els.heatmapTable.appendChild(tbody);
  }

  /** Interpola a rampa sequencial --heat-min → --heat-max conforme a fração
   * (0 a 1) do maior valor da matriz. */
  function heatColor(fracao) {
    const min = [0xcd, 0xe2, 0xfb];
    const max = [0x0d, 0x36, 0x6b];
    const rgb = min.map((c, i) => Math.round(c + (max[i] - c) * fracao));
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function formatHm(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${h}h${String(m).padStart(2, '0')}`;
  }

  /* ------------------------------- Equipe ------------------------------- */

  const EQUIPE_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  function addDaysLocal(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function isHolidayLocal(date) {
    const dow = date.getDay();
    return dow !== 0 && dow !== 6 && !Holidays.isBusinessDay(date);
  }

  /** Segunda-feira antes de um feriado de terça, ou sexta-feira depois de um
   * feriado de quinta, contam como "emenda" — não-úteis pra dimensionamento
   * de capacidade, mesmo sem ser feriado oficial. Cálculo local (só usado
   * aqui) — não altera Holidays.isBusinessDay nem o painel de conformidade
   * ou os lembretes por e-mail, que continuam cobrando apontamento nesses
   * dias normalmente. */
  function isEmendaBridgeDay(date) {
    if (!Holidays.isBusinessDay(date)) return false;
    const dow = date.getDay();
    if (dow === 1) return isHolidayLocal(addDaysLocal(date, 1));
    if (dow === 5) return isHolidayLocal(addDaysLocal(date, -1));
    return false;
  }

  function diasUteisNoMes(year, monthIndex) {
    const totalDias = new Date(year, monthIndex + 1, 0).getDate();
    let uteis = 0;
    for (let d = 1; d <= totalDias; d++) {
      const date = new Date(year, monthIndex, d);
      if (Holidays.isBusinessDay(date) && !isEmendaBridgeDay(date)) uteis++;
    }
    return uteis;
  }

  function diasCorridosNoAno(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  }

  function equipeStatusColor(pctDeLiquida) {
    if (pctDeLiquida > 100) return 'var(--status-critical)';
    if (pctDeLiquida >= equipeTetoPercent) return 'var(--status-warning)';
    return 'var(--status-good)';
  }

  /** Eixo de horas: arredonda o maior valor pra um teto "redondo" e devolve
   * 5 ticks igualmente espaçados — evita eixos com valores máximos exatos
   * (que cortam a barra mais alta rente ao topo) sem depender de dado fixo. */
  function equipeAxisScale(maxRaw) {
    const max = Math.max(maxRaw, 1);
    const rough = max * 1.15;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const niceMax = Math.ceil(rough / magnitude) * magnitude;
    const step = niceMax / 4;
    return { max: niceMax, ticks: [0, step, step * 2, step * 3, niceMax].map((v) => Math.round(v)) };
  }

  /** Mesma ideia do eixo de horas, mas pra contagens pequenas (colaboradores/
   * projetos por mês) — passo inteiro de 1 quando o total é baixo. */
  function equipeCountTicks(maxCount) {
    const max = Math.max(maxCount, 2);
    const step = max <= 6 ? 1 : Math.ceil(max / 5);
    const niceMax = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= niceMax; v += step) ticks.push(v);
    return { max: niceMax, ticks };
  }

  function populateEquipeAnoSelect() {
    const anoAtual = new Date().getFullYear();
    const anos = new Set([anoAtual]);
    state.apontamentos.forEach((a) => {
      if (a.data) anos.add(Number(a.data.slice(0, 4)));
    });
    const ordenados = Array.from(anos).sort((a, b) => b - a);
    const anterior = els.equipeAnoSelect.value ? Number(els.equipeAnoSelect.value) : anoAtual;
    els.equipeAnoSelect.innerHTML = ordenados.map((a) => `<option value="${a}">${a}</option>`).join('');
    els.equipeAnoSelect.value = ordenados.includes(anterior) ? anterior : anoAtual;
  }

  function renderEquipe() {
    const year = Number(els.equipeAnoSelect.value) || new Date().getFullYear();
    const ativos = state.colaboradores.filter((c) => c.ativo);
    const somaDedicacao = ativos.reduce((acc, c) => acc + (Number(c.dedicacaoDiaria) || 8), 0);

    const capacidadeLiquida = EQUIPE_MESES.map((_, i) => Math.round(somaDedicacao * diasUteisNoMes(year, i)));
    const capacidadeSaudavel = capacidadeLiquida.map((v) => Math.round((v * equipeTetoPercent) / 100));

    const apontamentosDoAno = state.apontamentos.filter(
      (a) => a.duracaoMinutos != null && a.duracaoMinutos > 0 && a.data && a.data.slice(0, 4) === String(year)
    );

    const consumido = new Array(12).fill(0);
    const colabPorMes = Array.from({ length: 12 }, () => new Set());
    const projPorMes = Array.from({ length: 12 }, () => new Set());
    apontamentosDoAno.forEach((a) => {
      const mes = Number(a.data.slice(5, 7)) - 1;
      consumido[mes] += a.duracaoMinutos / 60;
      colabPorMes[mes].add(a.colaboradorId);
      projPorMes[mes].add(a.projetoId);
    });
    const consumidoArredondado = consumido.map((v) => Math.round(v));
    const colaboradoresPorMes = colabPorMes.map((s) => s.size);
    const projetosPorMes = projPorMes.map((s) => s.size);

    equipeRenderKpis(year, somaDedicacao, capacidadeLiquida, capacidadeSaudavel, consumidoArredondado);
    equipeRenderBarChart(capacidadeLiquida, capacidadeSaudavel, consumidoArredondado);
    equipeRenderPctChart(capacidadeLiquida, consumidoArredondado);
    equipeRenderDualAxisChart('equipeChartColabDual', capacidadeSaudavel, colaboradoresPorMes, 'colaboradores com apontamento no mês');
    equipeRenderDualAxisChart('equipeChartProjDual', capacidadeSaudavel, projetosPorMes, 'projetos com apontamento no mês');
    equipeRenderProjectBars(apontamentosDoAno);
    equipeRenderCargoDonut(apontamentosDoAno);
    equipeRenderHeatmap(apontamentosDoAno);
  }

  function equipeRenderKpis(year, somaDedicacao, capacidadeLiquida, capacidadeSaudavel, consumido) {
    const anoAtual = new Date().getFullYear();
    const mesesConsiderados = year === anoAtual ? new Date().getMonth() + 1 : 12;

    const totalBruta = Math.round(somaDedicacao * diasCorridosNoAno(year));
    const totalLiquida = capacidadeLiquida.reduce((a, b) => a + b, 0);
    const totalSaudavel = capacidadeSaudavel.reduce((a, b) => a + b, 0);
    const margem = totalLiquida - totalSaudavel;

    const consumidoAteAgora = consumido.slice(0, mesesConsiderados).reduce((a, b) => a + b, 0);
    const saudavelAteAgora = capacidadeSaudavel.slice(0, mesesConsiderados).reduce((a, b) => a + b, 0);
    const ocupacaoPct = saudavelAteAgora > 0 ? Math.round((consumidoAteAgora / saudavelAteAgora) * 1000) / 10 : 0;

    els.kpiCapacidadeBrutaValue.textContent = `${totalBruta.toLocaleString('pt-BR')}h`;
    els.kpiCapacidadeLiquidaValue.textContent = `${totalLiquida.toLocaleString('pt-BR')}h`;
    els.kpiTetoLabel.textContent = `Teto saudável (${equipeTetoPercent}%)`;
    els.kpiTetoValue.textContent = `${totalSaudavel.toLocaleString('pt-BR')}h`;
    els.kpiTetoSub.textContent = `margem de segurança de ${margem.toLocaleString('pt-BR')}h/ano`;
    els.kpiOcupacaoLabel.textContent = year === anoAtual ? 'Ocupação acumulada no ano' : `Ocupação em ${year}`;
    els.kpiOcupacaoValue.textContent = `${ocupacaoPct}%`;
    els.kpiColaboradoresAtivosValue.textContent = String(state.colaboradores.filter((c) => c.ativo).length);

    const projetosDoAno = new Set(
      state.apontamentos
        .filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0 && a.data && a.data.slice(0, 4) === String(year))
        .map((a) => a.projetoId)
    );
    els.kpiProjetosExecutadosValue.textContent = String(projetosDoAno.size);

    const pctsLiquida = capacidadeLiquida.map((liq, i) => (liq > 0 ? (consumido[i] / liq) * 100 : 0));
    const mesesSobrecarregados = EQUIPE_MESES.filter((_, i) => i < mesesConsiderados && pctsLiquida[i] >= equipeTetoPercent);
    const mesesCriticos = EQUIPE_MESES.filter((_, i) => i < mesesConsiderados && pctsLiquida[i] > 100);
    els.kpiSobrecarregadosValue.textContent = `${mesesSobrecarregados.length} de ${mesesConsiderados}`;
    els.equipeSobrecarregadosDetalhe.textContent =
      mesesSobrecarregados.length > 0
        ? `Sobrecarregado = mês em que a equipe consumiu mais que o teto saudável (${equipeTetoPercent}%). Meses acima do teto: ${mesesSobrecarregados.join(', ')}` +
          `${mesesCriticos.length > 0 ? ` · ${mesesCriticos.length} acima de 100% (${mesesCriticos.join(', ')})` : ''}.`
        : `Nenhum mês passou do teto saudável (${equipeTetoPercent}%) neste recorte.`;

    els.equipeLegendTetoGood.textContent = equipeTetoPercent;
    els.equipeLegendTetoWarn.textContent = equipeTetoPercent;
    els.equipeLegendTetoLine.textContent = equipeTetoPercent;
  }

  function equipeRenderBarChart(capacidadeLiquida, capacidadeSaudavel, consumido) {
    const svg = document.getElementById('equipeChartHoras');
    const semColaboradores = state.colaboradores.filter((c) => c.ativo).length === 0;
    els.equipeChartHorasEmptyState.classList.toggle('hidden', !semColaboradores);
    if (semColaboradores) {
      svg.innerHTML = '';
      return;
    }

    const W = 720, H = 300;
    const padL = 46, padR = 12, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const { max: maxVal, ticks } = equipeAxisScale(Math.max(...capacidadeSaudavel, ...consumido, 0));
    const n = EQUIPE_MESES.length;
    const slot = plotW / n;
    const barW = slot * 0.32;
    const barGap = slot * 0.04;

    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const svgParts = [];
    ticks.forEach((v) => {
      const y = yFor(v);
      svgParts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      svgParts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v}</text>`);
    });

    EQUIPE_MESES.forEach((m, i) => {
      const center = xForCenter(i);
      const pctDeLiquida = capacidadeLiquida[i] > 0 ? Math.round((consumido[i] / capacidadeLiquida[i]) * 1000) / 10 : 0;

      const yDisp = yFor(capacidadeSaudavel[i]);
      const hDisp = Math.max(padT + plotH - yDisp, 0);
      const xDisp = center - barGap / 2 - barW;
      svgParts.push(
        `<rect x="${xDisp}" y="${yDisp}" width="${barW}" height="${hDisp}" rx="3" fill="var(--capacity-bar)" stroke="var(--capacity-bar-border)">` +
          `<title>${m}: ${capacidadeSaudavel[i]}h disponíveis (teto saudável de ${equipeTetoPercent}%)</title></rect>`
      );

      const yCons = yFor(consumido[i]);
      const hCons = Math.max(padT + plotH - yCons, 0);
      const xCons = center + barGap / 2;
      svgParts.push(
        `<rect class="bar-consumido" x="${xCons}" y="${yCons}" width="${barW}" height="${hCons}" rx="3" fill="${equipeStatusColor(pctDeLiquida)}">` +
          `<title>${m}: ${consumido[i]}h consumidas de ${capacidadeLiquida[i]}h líquidas (${pctDeLiquida}% da capacidade líquida)</title></rect>`
      );
    });

    EQUIPE_MESES.forEach((m, i) => {
      svgParts.push(`<text class="month-tick" x="${xForCenter(i)}" y="${H - 8}" text-anchor="middle">${m}</text>`);
    });

    svg.innerHTML = svgParts.join('');
  }

  function equipeRenderPctChart(capacidadeLiquida, consumido) {
    const svg = document.getElementById('equipeChartPct');
    const W = 720, H = 130;
    const padL = 46, padR = 12, padT = 14, padB = 14;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const pctsPreview = capacidadeLiquida.map((liq, i) => (liq > 0 ? (consumido[i] / liq) * 100 : 0));
    const maxPct = Math.max(120, Math.max(...pctsPreview) + 15);
    const n = EQUIPE_MESES.length;
    const slot = plotW / n;

    const yFor = (v) => padT + plotH - (v / maxPct) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const svgParts = [];
    [0, 50, 100].forEach((v) => {
      const y = yFor(v);
      svgParts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      svgParts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v}%</text>`);
    });

    const yTeto = yFor(equipeTetoPercent), y100 = yFor(100);
    svgParts.push(`<line class="ref-line" x1="${padL}" y1="${yTeto}" x2="${W - padR}" y2="${yTeto}" stroke="var(--status-warning)" />`);
    svgParts.push(`<text class="ref-label" x="${W - padR}" y="${yTeto - 3}" text-anchor="end" fill="var(--status-warning)">${equipeTetoPercent}%</text>`);
    svgParts.push(`<line class="ref-line" x1="${padL}" y1="${y100}" x2="${W - padR}" y2="${y100}" stroke="var(--status-critical)" />`);
    svgParts.push(`<text class="ref-label" x="${W - padR}" y="${y100 - 3}" text-anchor="end" fill="var(--status-critical)">100%</text>`);

    const pcts = consumido.map((v, i) => (capacidadeLiquida[i] > 0 ? Math.round((v / capacidadeLiquida[i]) * 1000) / 10 : 0));
    const linePoints = pcts.map((p, i) => `${xForCenter(i)},${yFor(Math.min(p, maxPct))}`).join(' ');
    svgParts.push(`<polyline class="pct-line" points="${linePoints}" />`);
    pcts.forEach((p, i) => {
      svgParts.push(
        `<circle class="pct-dot" cx="${xForCenter(i)}" cy="${yFor(Math.min(p, maxPct))}" r="4" fill="${equipeStatusColor(p)}">` +
          `<title>${EQUIPE_MESES[i]}: ${p}% da capacidade líquida</title></circle>`
      );
    });

    EQUIPE_MESES.forEach((m, i) => {
      svgParts.push(`<text class="month-tick" x="${xForCenter(i)}" y="${H - 2}" text-anchor="middle">${m}</text>`);
    });

    svg.innerHTML = svgParts.join('');
  }

  /** Barra = horas disponíveis (eixo esquerdo). Linha = contagem (eixo
   * direito) — colaboradores ou projetos, conforme unitLabel/lineValues.
   * Eixo duplo: mitigado rotulando cada eixo na cor da própria série. */
  function equipeRenderDualAxisChart(svgId, barValues, lineValues, unitLabel) {
    const svg = document.getElementById(svgId);
    const W = 720, H = 300;
    const padL = 50, padR = 50, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const n = EQUIPE_MESES.length;
    const slot = plotW / n;
    const barW = slot * 0.5;

    const { max: barMax, ticks: barTicks } = equipeAxisScale(Math.max(...barValues, 0));
    const { max: lineMax, ticks: lineTicks } = equipeCountTicks(Math.max(...lineValues, 0));

    const yForBar = (v) => padT + plotH - (v / barMax) * plotH;
    const yForLine = (v) => padT + plotH - (v / lineMax) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const svgParts = [];
    barTicks.forEach((v) => {
      const y = yForBar(v);
      svgParts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      svgParts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end" fill="var(--color-primary-dark)">${v}</text>`);
    });
    lineTicks.forEach((v) => {
      const y = yForLine(v);
      svgParts.push(`<text class="value-tick" x="${W - padR + 8}" y="${y + 3}" text-anchor="start" fill="var(--count-line)">${v}</text>`);
    });

    barValues.forEach((v, i) => {
      const x = xForCenter(i) - barW / 2;
      const y = yForBar(v);
      const h = Math.max(padT + plotH - y, 0);
      svgParts.push(`<rect class="hours-bar" x="${x}" y="${y}" width="${barW}" height="${h}" rx="3"><title>${EQUIPE_MESES[i]}: ${v}h disponíveis</title></rect>`);
    });

    const points = lineValues.map((v, i) => `${xForCenter(i)},${yForLine(v)}`).join(' ');
    svgParts.push(`<polyline class="count-line" points="${points}" />`);
    lineValues.forEach((v, i) => {
      svgParts.push(`<circle class="count-dot" cx="${xForCenter(i)}" cy="${yForLine(v)}" r="4"><title>${EQUIPE_MESES[i]}: ${v} ${unitLabel}</title></circle>`);
    });

    EQUIPE_MESES.forEach((m, i) => svgParts.push(`<text class="month-tick" x="${xForCenter(i)}" y="${H - 8}" text-anchor="middle">${m}</text>`));

    svg.innerHTML = svgParts.join('');
  }

  /** Mesmo padrão visual de renderProjetoChart (aba Apontamentos), mas
   * escopado ao ano selecionado na aba Equipe. */
  function equipeRenderProjectBars(apontamentosDoAno) {
    els.equipeProjectBarsEmptyState.classList.toggle('hidden', apontamentosDoAno.length > 0);
    els.equipeProjectBarsContainer.innerHTML = '';
    if (apontamentosDoAno.length === 0) return;

    const activities = window.APP_DATA.ACTIVITIES;
    const colorFor = (index) => `var(--activity-${index + 1})`;

    const porProjeto = {};
    apontamentosDoAno.forEach((a) => {
      if (!porProjeto[a.projetoId]) {
        porProjeto[a.projetoId] = { nome: a.projetoNome, cliente: a.clienteNome, porAtividade: {}, total: 0 };
      }
      const bucket = porProjeto[a.projetoId];
      bucket.porAtividade[a.atividadeId] = (bucket.porAtividade[a.atividadeId] || 0) + a.duracaoMinutos;
      bucket.total += a.duracaoMinutos;
    });

    const linhas = Object.values(porProjeto).sort((a, b) => b.total - a.total);
    const maiorTotal = Math.max(...linhas.map((l) => l.total));

    const legend = document.createElement('div');
    legend.className = 'horas-chart__legend';
    activities.forEach((act, i) => {
      const item = document.createElement('span');
      item.className = 'horas-chart__legend-item';
      item.innerHTML = `<i style="background:${colorFor(i)}"></i>${escapeHtml(act.name)}`;
      legend.appendChild(item);
    });

    const rows = document.createElement('div');
    rows.className = 'horas-chart__rows';

    linhas.forEach((linha) => {
      const row = document.createElement('div');
      row.className = 'horas-chart__row';

      const label = document.createElement('div');
      label.className = 'horas-chart__label';
      label.innerHTML = `<span class="horas-chart__name">${escapeHtml(linha.nome)}</span><span class="horas-chart__total">${escapeHtml(linha.cliente)} · ${formatHm(linha.total)}</span>`;

      const track = document.createElement('div');
      track.className = 'horas-chart__track';
      track.style.width = `${Math.max(6, (linha.total / maiorTotal) * 100)}%`;

      activities.forEach((act, i) => {
        const minutos = linha.porAtividade[act.id];
        if (!minutos) return;
        const fracao = minutos / linha.total;
        const pct = formatPct(fracao);
        const segment = document.createElement('div');
        segment.className = 'horas-chart__segment';
        segment.style.background = colorFor(i);
        segment.style.flexBasis = `${fracao * 100}%`;
        segment.title = `${linha.nome} — ${act.name}: ${formatHm(minutos)} (${pct})`;
        if (fracao > 0.12) {
          const segLabel = document.createElement('span');
          segLabel.className = 'horas-chart__segment-label';
          segLabel.textContent = `${formatHm(minutos)} · ${pct}`;
          segment.appendChild(segLabel);
        }
        track.appendChild(segment);
      });

      row.appendChild(label);
      row.appendChild(track);
      rows.appendChild(row);
    });

    els.equipeProjectBarsContainer.appendChild(legend);
    els.equipeProjectBarsContainer.appendChild(rows);
  }

  /** Mesmo padrão visual de renderDepartamentoChart, agrupado por cargo em
   * vez de atividade — cores cíclicas da paleta categórica (nº de cargos é
   * variável, diferente das 6 atividades fixas). */
  function equipeRenderCargoDonut(apontamentosDoAno) {
    els.equipeCargoDonutEmptyState.classList.toggle('hidden', apontamentosDoAno.length > 0);
    els.equipeCargoDonutContainer.innerHTML = '';
    if (apontamentosDoAno.length === 0) return;

    const colaboradorById = {};
    state.colaboradores.forEach((c) => {
      colaboradorById[c.id] = c;
    });

    const porCargo = {};
    let totalGeral = 0;
    apontamentosDoAno.forEach((a) => {
      const colaborador = colaboradorById[a.colaboradorId];
      const cargo = (colaborador && colaborador.cargo) || 'Sem cargo definido';
      porCargo[cargo] = (porCargo[cargo] || 0) + a.duracaoMinutos;
      totalGeral += a.duracaoMinutos;
    });

    const fatias = Object.entries(porCargo)
      .map(([cargo, minutos]) => ({ cargo, minutos }))
      .sort((a, b) => b.minutos - a.minutos)
      .map((f, i) => ({ ...f, color: `var(--activity-${(i % 6) + 1})` }));

    const size = 200, cx = size / 2, cy = size / 2, rOuter = 90, rInner = 50;
    const svgParts = [];
    if (fatias.length === 1) {
      const f = fatias[0];
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${f.color}"><title>${escapeHtml(f.cargo)}: ${formatHm(f.minutos)} (100%)</title></circle>`);
      svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="var(--color-surface)"/>`);
    } else {
      let angulo = -90;
      fatias.forEach((f) => {
        const fracao = f.minutos / totalGeral;
        const inicio = angulo, fim = angulo + fracao * 360;
        angulo = fim;
        const d = donutSlicePath(cx, cy, rOuter, rInner, inicio, fim);
        svgParts.push(
          `<path class="departamento-chart__slice" d="${d}" fill="${f.color}" stroke="var(--color-surface)" stroke-width="2">` +
            `<title>${escapeHtml(f.cargo)}: ${formatHm(f.minutos)} (${formatPct(fracao)})</title></path>`
        );
      });
    }

    const svgWrap = document.createElement('div');
    svgWrap.className = 'departamento-chart__svg-wrap';
    svgWrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Composição de horas por cargo">${svgParts.join('')}</svg>`;

    const legend = document.createElement('div');
    legend.className = 'departamento-chart__legend';
    fatias.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'departamento-chart__legend-row';
      row.innerHTML = `
        <i style="background:${f.color}"></i>
        <span class="departamento-chart__legend-name">${escapeHtml(f.cargo)}</span>
        <span class="departamento-chart__legend-hours">${formatHm(f.minutos)}</span>
        <span class="departamento-chart__legend-pct">${formatPct(f.minutos / totalGeral)}</span>
      `;
      legend.appendChild(row);
    });

    els.equipeCargoDonutContainer.appendChild(svgWrap);
    els.equipeCargoDonutContainer.appendChild(legend);
  }

  /** Mesmo padrão visual do mapa de calor Colaborador×Projeto, com projetos
   * nas linhas e meses do ano selecionado nas colunas. */
  function equipeRenderHeatmap(apontamentosDoAno) {
    const projetoById = {};
    state.projetos.forEach((p) => {
      projetoById[p.id] = p;
    });

    const minutosPorCelula = {};
    let maiorMinutos = 0;
    const projetosComHoras = new Set();
    apontamentosDoAno.forEach((a) => {
      const mes = Number(a.data.slice(5, 7)) - 1;
      const chave = `${a.projetoId}::${mes}`;
      minutosPorCelula[chave] = (minutosPorCelula[chave] || 0) + a.duracaoMinutos;
      if (minutosPorCelula[chave] > maiorMinutos) maiorMinutos = minutosPorCelula[chave];
      projetosComHoras.add(a.projetoId);
    });

    els.equipeHeatmapTable.innerHTML = '';
    const semDados = projetosComHoras.size === 0;
    els.equipeHeatmapEmptyState.classList.toggle('hidden', !semDados);
    els.equipeHeatmapLegend.classList.toggle('hidden', semDados);
    if (semDados) return;

    const projetosOrdenados = Array.from(projetosComHoras)
      .map((id) => projetoById[id])
      .filter(Boolean)
      .sort((a, b) => clienteNomeDoProjeto(a).localeCompare(clienteNomeDoProjeto(b)) || a.nome.localeCompare(b.nome));

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    EQUIPE_MESES.forEach((m) => {
      const th = document.createElement('th');
      th.textContent = m;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    els.equipeHeatmapTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    projetosOrdenados.forEach((projeto) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.innerHTML = `${escapeHtml(projeto.nome)}<span>${escapeHtml(clienteNomeDoProjeto(projeto))}</span>`;
      tr.appendChild(th);

      for (let mes = 0; mes < 12; mes++) {
        const minutos = minutosPorCelula[`${projeto.id}::${mes}`] || 0;
        const td = document.createElement('td');
        td.className = 'cell' + (minutos === 0 ? ' empty' : '');
        if (minutos > 0) {
          const fracao = maiorMinutos > 0 ? minutos / maiorMinutos : 0;
          td.style.background = heatColor(fracao);
          td.style.color = fracao > 0.55 ? '#fff' : 'var(--color-text)';
          td.title = `${projeto.nome} — ${EQUIPE_MESES[mes]}: ${formatHm(minutos)}`;
          td.textContent = formatHm(minutos);
        } else {
          td.textContent = '–';
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    els.equipeHeatmapTable.appendChild(tbody);
  }

  async function onGerarResumoIA() {
    els.gerarResumoIAButton.disabled = true;
    els.resumoIAResultado.classList.remove('hidden', 'error');
    els.resumoIAResultado.classList.add('loading');
    els.resumoIAResultado.textContent = 'Gerando resumo com o Gemini (pode levar alguns segundos)...';

    try {
      const { resumo } = await Api.gerarResumoIA(state.session);
      els.resumoIAResultado.classList.remove('loading');
      els.resumoIAResultado.textContent = resumo;
    } catch (err) {
      if (isAuthError(err)) {
        toast('Sessão expirada ou inválida. Faça login novamente.', 'error');
        onLogout();
        return;
      }
      els.resumoIAResultado.classList.remove('loading');
      els.resumoIAResultado.classList.add('error');
      els.resumoIAResultado.textContent = `Não foi possível gerar o resumo: ${err.message}`;
    } finally {
      els.gerarResumoIAButton.disabled = false;
    }
  }

  /* ------------------------------- Utilitários ------------------------------- */

  function closeForm(formEl) {
    formEl.classList.add('hidden');
    formEl.reset();
  }

  function statusPill(ativo) {
    return ativo
      ? '<span class="status-pill status-pill--active">Ativo</span>'
      : '<span class="status-pill status-pill--inactive">Inativo</span>';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function toast(message, type) {
    const div = document.createElement('div');
    div.className = `toast toast--${type === 'error' ? 'error' : 'success'}`;
    div.textContent = message;
    els.toastArea.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
