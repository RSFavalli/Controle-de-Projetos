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
  const TEAM_STORAGE_KEY = 'admin_team_id'; // não escopado por time — é a "ponteira" de qual time está ativo

  let state = {
    session: null, // { email, senha, nome, papel }
    clientes: [],
    projetos: [],
    colaboradores: [],
    apontamentos: [],
    cenarios: [],
    periodo: null, // { modo: 'mes'|'ano'|'tudo', ano, mes } — filtro global, ver "Período global"
  };

  let currentTeam = null;
  let abaAtiva = 'clientes';

  const els = {
    teamScreen: document.getElementById('teamScreen'),
    loginScreen: document.getElementById('loginScreen'),
    dashboardScreen: document.getElementById('dashboardScreen'),
    sessionInfo: document.getElementById('sessionInfo'),
    adminSidebar: document.getElementById('adminSidebar'),
    sessionUserName: document.getElementById('sessionUserName'),
    logoutButton: document.getElementById('logoutButton'),
    loadingBar: document.getElementById('loadingBar'),
    loadingStatus: document.getElementById('loadingStatus'),
    tabLoadingOverlay: document.getElementById('tabLoadingOverlay'),
    tabLoadingSpinner: document.getElementById('tabLoadingSpinner'),
    tabLoadingText: document.getElementById('tabLoadingText'),
    tabLoadingRetryButton: document.getElementById('tabLoadingRetryButton'),

    teamList: document.getElementById('teamList'),
    teamTestResult: document.getElementById('teamTestResult'),

    loginForm: document.getElementById('loginForm'),
    loginTeamName: document.getElementById('loginTeamName'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    loginSubmitButton: document.getElementById('loginSubmitButton'),
    loginSubmitText: document.getElementById('loginSubmitText'),
    loginSubmitSpinner: document.getElementById('loginSubmitSpinner'),
    changeTeamButton: document.getElementById('changeTeamButton'),

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
    projetoHorasEstimadas: document.getElementById('projetoHorasEstimadas'),
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
    refreshApontamentosButton: document.getElementById('refreshApontamentosButton'),
    conformidadeTableBody: document.getElementById('conformidadeTableBody'),
    conformidadeEmptyState: document.getElementById('conformidadeEmptyState'),
    kpiAderenciaEquipeValue: document.getElementById('kpiAderenciaEquipeValue'),
    kpiAderenciaEquipeSub: document.getElementById('kpiAderenciaEquipeSub'),
    kpiAderenciaEmDiaValue: document.getElementById('kpiAderenciaEmDiaValue'),
    kpiAderenciaMinValue: document.getElementById('kpiAderenciaMinValue'),
    kpiAderenciaMinSub: document.getElementById('kpiAderenciaMinSub'),
    aderenciaChartEmptyState: document.getElementById('aderenciaChartEmptyState'),
    aderenciaTendenciaDesc: document.getElementById('aderenciaTendenciaDesc'),
    aderenciaTableBody: document.getElementById('aderenciaTableBody'),
    aderenciaEmptyState: document.getElementById('aderenciaEmptyState'),
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
    gerarResumoIAButton: document.getElementById('gerarResumoIAButton'),
    resumoIAResultado: document.getElementById('resumoIAResultado'),
    exportPdfButton: document.getElementById('exportPdfButton'),
    shareHtmlButton: document.getElementById('shareHtmlButton'),
    shareHtmlModal: document.getElementById('shareHtmlModal'),
    shareHtmlSecaoApontamentos: document.getElementById('shareHtmlSecaoApontamentos'),
    shareHtmlSecaoEquipe: document.getElementById('shareHtmlSecaoEquipe'),
    shareHtmlSecaoFinanceiroWrap: document.getElementById('shareHtmlSecaoFinanceiroWrap'),
    shareHtmlSecaoFinanceiro: document.getElementById('shareHtmlSecaoFinanceiro'),
    shareHtmlColaboradoresWrap: document.getElementById('shareHtmlColaboradoresWrap'),
    shareHtmlColaboradoresList: document.getElementById('shareHtmlColaboradoresList'),
    shareHtmlColaboradoresTodos: document.getElementById('shareHtmlColaboradoresTodos'),
    shareHtmlColaboradoresNenhum: document.getElementById('shareHtmlColaboradoresNenhum'),
    shareHtmlCancelButton: document.getElementById('shareHtmlCancelButton'),
    shareHtmlConfirmButton: document.getElementById('shareHtmlConfirmButton'),
    printReportHeader: document.getElementById('printReportHeader'),
    printReportHeaderMeta: document.getElementById('printReportHeaderMeta'),

    periodoBar: document.getElementById('periodoBar'),
    periodoMesSelect: document.getElementById('periodoMesSelect'),
    periodoAnoSelect: document.getElementById('periodoAnoSelect'),
    periodoBarResumo: document.getElementById('periodoBarResumo'),
    shareHtmlPeriodoMes: document.getElementById('shareHtmlPeriodoMes'),
    shareHtmlPeriodoAno: document.getElementById('shareHtmlPeriodoAno'),
    shareHtmlPeriodoResumo: document.getElementById('shareHtmlPeriodoResumo'),
    themeToggleButton: document.getElementById('themeToggleButton'),

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
    equipeNotaForaOcupacao: document.getElementById('equipeNotaForaOcupacao'),
    equipeChartHorasEmptyState: document.getElementById('equipeChartHorasEmptyState'),
    equipeLegendTetoGood: document.getElementById('equipeLegendTetoGood'),
    equipeLegendTetoWarn: document.getElementById('equipeLegendTetoWarn'),
    equipeLegendTetoLine: document.getElementById('equipeLegendTetoLine'),
    equipeLegendTetoTend: document.getElementById('equipeLegendTetoTend'),
    equipeLegendProjecao: document.getElementById('equipeLegendProjecao'),
    equipeTendenciaTitulo: document.getElementById('equipeTendenciaTitulo'),
    equipeTendenciaBadge: document.getElementById('equipeTendenciaBadge'),
    equipeTendenciaDescricao: document.getElementById('equipeTendenciaDescricao'),
    equipeTendenciaEmptyState: document.getElementById('equipeTendenciaEmptyState'),
    equipeTendenciaConteudo: document.getElementById('equipeTendenciaConteudo'),
    equipeTendKpi3: document.getElementById('equipeTendKpi3'),
    equipeTendKpi4: document.getElementById('equipeTendKpi4'),
    equipeTendKpi1Label: document.getElementById('equipeTendKpi1Label'),
    equipeTendKpi1Value: document.getElementById('equipeTendKpi1Value'),
    equipeTendKpi1Sub: document.getElementById('equipeTendKpi1Sub'),
    equipeTendKpi2Label: document.getElementById('equipeTendKpi2Label'),
    equipeTendKpi2Value: document.getElementById('equipeTendKpi2Value'),
    equipeTendKpi2Sub: document.getElementById('equipeTendKpi2Sub'),
    equipeTendKpi3Label: document.getElementById('equipeTendKpi3Label'),
    equipeTendKpi3Value: document.getElementById('equipeTendKpi3Value'),
    equipeTendKpi3Sub: document.getElementById('equipeTendKpi3Sub'),
    equipeTendKpi4Label: document.getElementById('equipeTendKpi4Label'),
    equipeTendKpi4Value: document.getElementById('equipeTendKpi4Value'),
    equipeTendKpi4Sub: document.getElementById('equipeTendKpi4Sub'),
    equipeProjectBarsEmptyState: document.getElementById('equipeProjectBarsEmptyState'),
    equipeProjectBarsContainer: document.getElementById('equipeProjectBarsContainer'),
    equipeCargoDonutEmptyState: document.getElementById('equipeCargoDonutEmptyState'),
    equipeCargoDonutContainer: document.getElementById('equipeCargoDonutContainer'),
    equipeHeatmapTable: document.getElementById('equipeHeatmapTable'),
    equipeHeatmapEmptyState: document.getElementById('equipeHeatmapEmptyState'),
    equipeHeatmapLegend: document.getElementById('equipeHeatmapLegend'),

    horasDiariasColaborador: document.getElementById('horasDiariasColaborador'),
    horasDiariasEmptyState: document.getElementById('horasDiariasEmptyState'),
    horasDiariasZoomOut: document.getElementById('horasDiariasZoomOut'),
    horasDiariasZoomIn: document.getElementById('horasDiariasZoomIn'),
    horasDiariasZoomLevel: document.getElementById('horasDiariasZoomLevel'),
    rankingComparativoSelect: document.getElementById('rankingComparativoSelect'),


    kpiCustoAnoLabel: document.getElementById('kpiCustoAnoLabel'),
    kpiCustoAnoSub: document.getElementById('kpiCustoAnoSub'),
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
    relatorioVoltarButton: document.getElementById('relatorioVoltarButton'),
    relatorioExportPdfButton: document.getElementById('relatorioExportPdfButton'),
    relatorioShareHtmlButton: document.getElementById('relatorioShareHtmlButton'),
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

  // Indicador global de carregamento — contador em vez de booleano porque
  // vários carregamentos podem se sobrepor (ex.: trocar de aba rápido demais
  // dispara dois loadApontamentos ao mesmo tempo); só esconde quando o
  // último terminar, não no primeiro que resolver.
  let loadingCount = 0;
  function beginLoading() {
    loadingCount++;
    els.loadingBar.classList.remove('hidden');
    els.loadingStatus.classList.remove('hidden');
    // O overlay é um elemento único, reaproveitado: move pra dentro de
    // qualquer que seja a aba visível no momento, então sempre cobre a aba
    // certa mesmo trocando de aba entre um carregamento e outro.
    const painelAtivo = document.querySelector('.tab-panel:not(.hidden)');
    if (painelAtivo) {
      painelAtivo.appendChild(els.tabLoadingOverlay);
      els.tabLoadingOverlay.classList.remove('hidden');
    }
    // Garante que o overlay volta pro estado "carregando" — se a última vez
    // tiver terminado em falha (showLoadFailure), sem isso ele reapareceria
    // já mostrando o erro anterior por um instante.
    els.tabLoadingOverlay.classList.remove('tab-loading-overlay--error');
    els.tabLoadingSpinner.classList.remove('hidden');
    els.tabLoadingText.textContent = 'Carregando…';
    els.tabLoadingRetryButton.classList.add('hidden');
  }
  function endLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
      els.loadingBar.classList.add('hidden');
      els.loadingStatus.classList.add('hidden');
      // Se showLoadFailure() acabou de colocar o overlay em modo de erro,
      // deixa ele visível (com o botão de tentar novamente) em vez de
      // escondê-lo aqui — senão o aviso pisca e some antes do usuário ler.
      if (!els.tabLoadingOverlay.classList.contains('tab-loading-overlay--error')) {
        els.tabLoadingOverlay.classList.add('hidden');
      }
    }
  }

  // Ao contrário do toast (que some sozinho em 4s), esse aviso fica na tela
  // até o usuário agir — pensado pra situação relatada de "clico, demora, e
  // não sei se travou ou se está carregando": em vez de deixar a aba vazia
  // e silenciosa, mostra o motivo e um jeito de tentar de novo sem precisar
  // deslogar/atualizar/fechar o navegador.
  function showLoadFailure(message, onRetry) {
    const painelAtivo = document.querySelector('.tab-panel:not(.hidden)');
    if (painelAtivo) painelAtivo.appendChild(els.tabLoadingOverlay);
    els.tabLoadingOverlay.classList.remove('hidden');
    els.tabLoadingOverlay.classList.add('tab-loading-overlay--error');
    els.tabLoadingSpinner.classList.add('hidden');
    els.tabLoadingText.textContent = message;
    els.tabLoadingRetryButton.classList.remove('hidden');
    els.tabLoadingRetryButton.onclick = () => {
      els.tabLoadingOverlay.classList.add('hidden');
      onRetry();
    };
  }

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

  /* ------------------------- Rodapé: data da última revisão ------------------------- */

  /** Data de revisão de referência — só vale se o servidor não informar a data
   * de modificação dos arquivos (cabeçalho HTTP Last-Modified). Atualize ao
   * publicar uma nova versão caso o servidor local não envie esse cabeçalho. */
  const REVISAO_FALLBACK = '2026-10-26';

  const ARQUIVOS_DO_DASHBOARD = [
    'index.html',
    'css/styles.css',
    'js/data.js',
    'js/holidays.js',
    'js/api.js',
    'js/app.js',
    'js/trator-calc.js',
    'js/trator-i18n.js',
    'js/trator-dash.js',
    'js/trator-export.js',
    'js/trator-migracao.js',
    'js/trator.js',
    'css/trator.css',
    '../js/teams.js',
  ];

  function formatarMesAno(date) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[date.getMonth()]} de ${date.getFullYear()}`;
  }

  /** Descobre a data da última revisão sozinho: pega a modificação mais
   * recente entre os arquivos do dashboard, perguntando ao servidor (HEAD →
   * Last-Modified). Assim, ao publicar uma nova versão, o rodapé se atualiza
   * sem ninguém editar texto. Se o servidor não informar a data, usa
   * REVISAO_FALLBACK. */
  async function atualizarRodapeRevisao() {
    const el = document.getElementById('footerUltimaRevisao');
    if (!el) return;
    const datas = [];
    await Promise.all(
      ARQUIVOS_DO_DASHBOARD.map(async (arquivo) => {
        try {
          const resp = await fetch(arquivo, { method: 'HEAD', cache: 'no-cache' });
          const lm = resp.ok ? resp.headers.get('Last-Modified') : null;
          const d = lm ? new Date(lm) : null;
          if (d && !Number.isNaN(d.getTime())) datas.push(d);
        } catch (err) {
          /* sem rede/servidor para este arquivo: ignora e segue */
        }
      })
    );
    // Obs.: document.lastModified NÃO é usado — sem o cabeçalho, o navegador
    // devolve "agora", o que faria o rodapé mostrar sempre o mês atual.
    let data = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null;
    if (!data) data = new Date(`${REVISAO_FALLBACK}T12:00:00`);
    el.textContent = `última atualização em ${formatarMesAno(data)}`;
    el.title = `Última revisão: ${data.toLocaleString('pt-BR')}`;
  }

  /** Cabeçalho fixo: publica a altura dele em --header-h para a barra lateral
   * (também fixa) parar logo abaixo, sem ficar escondida atrás do cabeçalho. */
  function initCabecalhoFixo() {
    const header = document.querySelector('.admin-header');
    if (!header) return;
    const medir = () => {
      const fixo = window.getComputedStyle(header).position === 'sticky';
      document.documentElement.style.setProperty('--header-h', fixo ? `${header.offsetHeight}px` : '0px');
    };
    medir();
    window.addEventListener('resize', medir);
    if (typeof ResizeObserver === 'function') new ResizeObserver(medir).observe(header);
  }

  function init() {
    initTheme();
    initCabecalhoFixo();
    atualizarRodapeRevisao();
    wireStaticHandlers();

    const team = resolveActiveTeam();
    if (!team) {
      renderTeamList();
      showScreen('team');
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

  /* -------------------------------- Time ativo ------------------------------- */

  // Lê o time salvo (se houver) e deixa a API e a lista de atividades (usada
  // pelos gráficos) apontando pra esse time. Retorna null se nenhum time
  // válido está salvo ainda (primeiro acesso neste navegador, ou id
  // desatualizado).
  function resolveActiveTeam() {
    const teamId = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!teamId) return null;
    const team = window.TEAMS_DATA.getTeamById(teamId);
    if (!team) return null;
    if (!ensureTeamApiUrl(team, false)) return null;
    activateTeam(team);
    return team;
  }

  // Times sem URL fixa em js/teams.js (hoje: Trator Autônomo, que tem backend
  // próprio publicado por você) guardam a URL do Web App neste navegador. Na
  // primeira escolha do time pede a URL; depois lembra. Com pedir=false só
  // consulta o que já está salvo (usado ao restaurar o time ao abrir a página).
  function ensureTeamApiUrl(team, pedir) {
    if (team.apiUrl) return true;
    const key = `team_api_url_${team.id}`;
    let url = localStorage.getItem(key) || '';
    if (!url && pedir) {
      url = (window.prompt(`Cole a URL do Web App da equipe ${team.nome} (termina em /exec):`) || '').trim();
      if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) return false;
      localStorage.setItem(key, url);
    }
    if (!url) return false;
    team.apiUrl = url;
    return true;
  }

  function forgetTeamApiUrl(team) {
    // Só esquece a URL que foi digitada neste navegador (nunca a de teams.js).
    if (team.tipo === 'trator') {
      localStorage.removeItem(`team_api_url_${team.id}`);
      team.apiUrl = '';
    }
  }

  function activateTeam(team) {
    currentTeam = team;
    // O CSS usa isto para trocar o menu e as telas do time Trator Autônomo
    // (tipo "trator") sem mexer nas telas de Registro de Tempo.
    document.body.dataset.teamTipo = team.tipo || 'timesheet';
    Api.setBaseUrl(team.apiUrl);
    window.APP_DATA = {
      ACTIVITIES: window.TEAMS_DATA.buildActivities(team),
      slugify: window.TEAMS_DATA.slugify,
    };
    // Mantém o selo "Time selecionado" da tela de login sempre coerente com
    // o time realmente ativo (inclusive ao restaurar o time salvo no
    // carregamento da página, não só ao trocar manualmente).
    els.loginTeamName.textContent = team.nome;
  }

  function renderTeamList() {
    els.teamList.innerHTML = '';
    (window.TEAMS_DATA.ADMIN_TEAMS || window.TEAMS_DATA.TEAMS).forEach((team) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--start';
      btn.textContent = team.nome;
      btn.addEventListener('click', () => onTeamSelect(team.id));
      els.teamList.appendChild(btn);
    });
    els.teamTestResult.textContent = '';
    els.teamTestResult.className = 'config-test-result';
  }

  // Trocar de time sempre exige login de novo (a sessão de um time não vale
  // para o backend de outro) — evita qualquer ambiguidade sobre qual base o
  // admin está enxergando.
  async function onTeamSelect(teamId) {
    const team = window.TEAMS_DATA.getTeamById(teamId);
    if (!team) return;
    els.teamTestResult.className = 'config-test-result';
    if (!ensureTeamApiUrl(team, true)) {
      els.teamTestResult.textContent = 'URL do Web App não informada ou inválida (deve começar com https://script.google.com e terminar em /exec).';
      els.teamTestResult.classList.add('error');
      return;
    }
    els.teamTestResult.textContent = 'Testando conexão...';
    try {
      await Api.ping(team.apiUrl);
      localStorage.setItem(TEAM_STORAGE_KEY, team.id);
      activateTeam(team);
      state.session = null;
      state.clientes = [];
      state.projetos = [];
      state.colaboradores = [];
      state.apontamentos = [];
      state.periodo = null;
      state.cenarios = [];
      clearSession();
      els.teamTestResult.textContent = `Conectado ao time ${team.nome}.`;
      els.teamTestResult.classList.add('ok');
      setTimeout(() => showScreen('login'), 500);
    } catch (err) {
      forgetTeamApiUrl(team);
      els.teamTestResult.textContent = `Não foi possível conectar: ${err.message}`;
      els.teamTestResult.classList.add('error');
    }
  }

  function wireStaticHandlers() {
    els.loginForm.addEventListener('submit', onLoginSubmit);
    els.changeTeamButton.addEventListener('click', () => {
      renderTeamList();
      showScreen('team');
    });
    els.logoutButton.addEventListener('click', onLogout);

    els.tabButtons.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    els.exportPdfButton.addEventListener('click', exportReportPdf);
    els.shareHtmlButton.addEventListener('click', openShareHtmlModal);
    els.shareHtmlCancelButton.addEventListener('click', closeShareHtmlModal);
    els.shareHtmlModal.addEventListener('click', (e) => {
      if (e.target === els.shareHtmlModal) closeShareHtmlModal();
    });
    els.shareHtmlSecaoApontamentos.addEventListener('change', () => {
      els.shareHtmlColaboradoresWrap.classList.toggle('hidden', !els.shareHtmlSecaoApontamentos.checked);
    });
    els.shareHtmlColaboradoresTodos.addEventListener('click', () => {
      els.shareHtmlColaboradoresList
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => { cb.checked = true; });
    });
    els.shareHtmlColaboradoresNenhum.addEventListener('click', () => {
      els.shareHtmlColaboradoresList
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => { cb.checked = false; });
    });
    els.shareHtmlConfirmButton.addEventListener('click', onShareHtmlConfirm);

    els.equipeTetoInput.addEventListener('input', (e) => {
      const v = Number(e.target.value);
      if (!v || v < 50 || v > 100) return;
      equipeTetoPercent = v;
      renderEquipe();
    });
    els.periodoBar.querySelectorAll('.periodo-seg__btn').forEach((btn) => {
      btn.addEventListener('click', () => onPeriodoModoClick(btn.dataset.modo));
    });
    els.periodoMesSelect.addEventListener('change', () => {
      const [ano, mes] = els.periodoMesSelect.value.split('-').map(Number);
      onPeriodoChange({ modo: 'mes', ano, mes });
    });
    els.periodoAnoSelect.addEventListener('change', () => {
      garantirPeriodo();
      onPeriodoChange({ ...state.periodo, modo: 'ano', ano: Number(els.periodoAnoSelect.value) });
    });
    document.querySelectorAll('input[name="shareHtmlPeriodoModo"]').forEach((r) => {
      r.addEventListener('change', atualizarModalPeriodoUi);
    });
    els.shareHtmlPeriodoMes.addEventListener('change', atualizarModalPeriodoUi);
    els.shareHtmlPeriodoAno.addEventListener('change', atualizarModalPeriodoUi);

    els.horasDiariasColaborador.addEventListener('change', renderHorasDiarias);
    els.rankingComparativoSelect.addEventListener('change', renderRankingEquipe);
    els.horasDiariasZoomIn.addEventListener('click', () => {
      horasDiariasZoom = Math.min(HORAS_DIARIAS_ZOOM_MAX, horasDiariasZoom + HORAS_DIARIAS_ZOOM_STEP);
      applyHorasDiariasZoom();
    });
    els.horasDiariasZoomOut.addEventListener('click', () => {
      horasDiariasZoom = Math.max(HORAS_DIARIAS_ZOOM_MIN, horasDiariasZoom - HORAS_DIARIAS_ZOOM_STEP);
      applyHorasDiariasZoom();
    });

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
    els.relatorioVoltarButton.addEventListener('click', () => switchTab('colaboradores'));
    els.relatorioExportPdfButton.addEventListener('click', exportRelatorioColaboradorPdf);
    els.relatorioShareHtmlButton.addEventListener('click', shareRelatorioColaboradorHtml);

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
    els.horasFiltroCliente.addEventListener('change', () => {
      populateHorasFiltroProjetoSelect();
      renderCharts();
    });
    els.horasFiltroProjeto.addEventListener('change', () => renderCharts());
    els.limparFiltroHorasButton.addEventListener('click', () => {
      els.horasFiltroCliente.value = '';
      populateHorasFiltroProjetoSelect();
      renderCharts();
    });
    els.gerarResumoIAButton.addEventListener('click', onGerarResumoIA);
  }

  function showScreen(name) {
    els.teamScreen.classList.toggle('hidden', name !== 'team');
    els.loginScreen.classList.toggle('hidden', name !== 'login');
    els.dashboardScreen.classList.toggle('hidden', name !== 'dashboard');
    els.sessionInfo.classList.toggle('hidden', name !== 'dashboard');
    els.adminSidebar.classList.toggle('hidden', name !== 'dashboard');
  }

  /* --------------------------------- Login --------------------------------- */

  async function onLoginSubmit(e) {
    e.preventDefault();
    const email = els.loginEmail.value.trim();
    const senha = els.loginPassword.value;
    setLoginSubmitting(true);
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
    } finally {
      setLoginSubmitting(false);
    }
  }

  // Dá retorno visual imediato ao tocar em "Entrar" — sem isso, o botão
  // ficava "parado" durante o tempo de resposta do backend, e não dava pra
  // saber se o toque tinha sido registrado ou se estava carregando.
  function setLoginSubmitting(isSubmitting) {
    els.loginSubmitButton.disabled = isSubmitting;
    els.loginSubmitText.textContent = isSubmitting ? 'Entrando…' : 'Entrar';
    els.loginSubmitSpinner.classList.toggle('hidden', !isSubmitting);
  }

  function onLogout() {
    state.session = null;
    state.periodo = null;
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
    if (currentTeam && currentTeam.tipo === 'trator') {
      window.TratorAdmin.enter({
        getSession: () => state.session,
        toast,
        onAuthError: () => {
          toast('Sessão expirada ou inválida. Faça login novamente.', 'error');
          onLogout();
        },
        onSessionChange: (campos) => {
          state.session = { ...state.session, ...campos };
          saveSession(state.session);
          els.sessionUserName.textContent = `${state.session.nome} (admin)`;
        },
        beginLoading,
        endLoading,
      });
      return;
    }
    els.financeiraTabButton.classList.toggle('hidden', !state.session.acessoFinanceiro);
    els.estrategiaTabButton.classList.toggle('hidden', !state.session.acessoFinanceiro);
    switchTab('clientes');
    await loadAll();
  }

  async function loadAll() {
    beginLoading();
    try {
      const { clientes, projetos, colaboradores } = await Api.loadDashboardInit(state.session);
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
        showLoadFailure(`Não deu para carregar os dados: ${err.message}`, loadAll);
      }
    } finally {
      endLoading();
    }
  }

  function isAuthError(err) {
    return /senha|permissão|inválid/i.test(err.message || '');
  }

  function switchTab(tabName) {
    if ((tabName === 'financeira' || tabName === 'estrategia') && !state.session.acessoFinanceiro) return;
    abaAtiva = tabName;
    els.tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== `tab-${tabName}`);
    });
    renderPeriodoBar();
    // Os botões globais exportam o relatório de Registro de Tempo/Equipe/Financeira;
    // a aba Análise de Projeto tem os seus próprios (no cabeçalho do painel).
    els.exportPdfButton.classList.toggle('hidden', tabName === 'analise-projeto');
    els.shareHtmlButton.classList.toggle('hidden', tabName === 'analise-projeto');
    if (tabName === 'apontamentos') {
      loadApontamentos();
    } else if (tabName === 'equipe') {
      loadApontamentos().then(() => {
        renderEquipe();
      });
    } else if (tabName === 'financeira') {
      loadApontamentos().then(() => {
        renderFinanceira();
      });
    } else if (tabName === 'estrategia') {
      loadEstrategiaCenarios();
    } else if (tabName === 'analise-projeto') {
      apAbrir();
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
    renderEquipe();
    if (state.session.acessoFinanceiro) {
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
      `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` +
      ` · Período analisado: ${getPeriodo().label}`;

    const restore = () => {
      panels.forEach((panel, i) => panel.classList.toggle('hidden', previouslyHidden[i]));
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    window.print();
  }

  /* ------------------- Compartilhar relatório em HTML (arquivo) ------------------- */
  /*
   * Alternativa ao Exportar PDF: em vez de imprimir, gera um arquivo .html
   * autocontido (CSS e logos embutidos, sem depender de nenhum outro arquivo
   * do projeto) com um snapshot estático das mesmas seções do relatório, e
   * baixa esse arquivo no computador do usuário. O arquivo pode ser
   * compartilhado por e-mail, WhatsApp, Drive etc. e abre "bonito" em
   * qualquer navegador — sem os problemas de layout que o PDF tem.
   */

  const SHARE_HTML_STRIP_SELECTORS = [
    '.no-print', '.admin-header__session', '.admin-sidebar', '.watermark',
    '.theme-toggle', 'form', '.panel-header__controls', '.row-actions',
    '.chart-zoom-controls', '.loading-bar', '#tabLoadingOverlay', '#toastArea',
    // Diferente do .chart-zoom-controls da Financeira (que divide espaço com a
    // legenda em .projecao-toolbar), o de "Tempo registrado por dia" mora
    // sozinho dentro de .horas-diarias-filtro — sem essa linha, sobraria uma
    // caixa com borda vazia no arquivo exportado depois que os controles de
    // zoom (only-print, não fazem sentido num HTML estático) são removidos.
    '.horas-diarias-filtro',
  ];

  // Mesmos valores de --color-* usados no PDF (ver @media print em
  // css/styles.css), pra garantir tema claro no HTML compartilhado mesmo se
  // o dashboard estiver no modo escuro no momento da geração.
  const SHARE_HTML_LIGHT_THEME_CSS = `
    :root, :root[data-theme="dark"] {
      --color-primary: #1f6f54;
      --color-primary-dark: #16503d;
      --color-primary-light: #e6f2ee;
      --color-text: #1e2422;
      --color-text-muted: #5c6863;
      --color-border: #d9e0dc;
      --color-bg: #ffffff;
      --color-surface: #ffffff;
      --status-good: #0ca30c;
      --status-good-bg: #e3f7e3;
      --status-warning: #8a6d1a;
      --status-warning-bg: #fdf0d9;
      --status-critical: #b3271f;
      --status-critical-bg: #fbe3e3;
      --capacity-bar: #aab8c2;
      --capacity-bar-border: #8a9aa5;
      --count-line: #6b4fa0;
      --weekend-band: #eef1f0;
      --holiday-band: #f3ecd6;
    }
    .admin-header { position: static; }
    .admin-header__logo-exa { filter: none !important; }
    body { padding: 0; background: var(--color-bg); }
    .admin-shell { display: block; max-width: 960px; margin: 0 auto; padding: 24px 20px 48px; }
    .admin-main { max-width: 100%; padding: 0; }
    .card { box-shadow: none; border: 1px solid var(--color-border); margin-bottom: 24px; }
    .print-report-header { display: block; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid var(--color-primary); }
    /* Um bloco "Tempo registrado por dia" por colaborador, na exportação em
       HTML — ver buildTodosColaboradoresHorasDiariasHtml(). */
    .horas-diarias-colaborador-bloco { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--color-border); }
    .horas-diarias-colaborador-bloco:first-child { margin-top: 12px; padding-top: 0; border-top: none; }
    .horas-diarias-colaborador-nome { margin: 0 0 10px; font-size: 1rem; font-weight: 700; color: var(--color-primary-dark); }
  `;

  // Lê o CSS já aplicado na página via CSSOM (document.styleSheets) em vez de
  // buscar o arquivo de novo com fetch(). Isso é proposital: o dashboard
  // costuma ser aberto direto como arquivo local (file://) e, nesse caso,
  // fetch() de outro arquivo local é bloqueado pelo navegador por política
  // de CORS — ler as regras já carregadas funciona em file:// e em http://.
  function collectPageCssTextForShare() {
    const parts = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules || []).forEach((rule) => parts.push(rule.cssText));
      } catch (err) {
        // Stylesheet não acessível via CSSOM (ex.: veio de outra origem) — ignora.
      }
    });
    return parts.join('\n');
  }

  // Mesma lógica: em vez de baixar a imagem de novo com fetch() (bloqueado em
  // file://), desenha o <img> que já está carregado na tela num <canvas> e lê
  // o resultado como data URL — funciona independente de como a página foi aberta.
  function imageElementToDataUrlForShare(imgEl) {
    try {
      const w = imgEl.naturalWidth || imgEl.width;
      const h = imgEl.naturalHeight || imgEl.height;
      if (!w || !h) return imgEl.src;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h);
      return canvas.toDataURL('image/png');
    } catch (err) {
      // Canvas "tainted" ou outra restrição — mantém o caminho original da imagem.
      return imgEl.src;
    }
  }

  function stripForShareHtml(node) {
    SHARE_HTML_STRIP_SELECTORS.forEach((sel) => {
      node.querySelectorAll(sel).forEach((el) => el.remove());
    });
    return node;
  }

  /** Monta o documento HTML autocontido com o cabeçalho + os painéis
   * indicados. Assume que quem chamou já atualizou printReportHeaderMeta e
   * carregou/renderizou os dados desses painéis.
   *
   * `options.horasDiariasTodosHtml`, se informado, substitui o conteúdo de
   * "Tempo registrado por dia" (que ao vivo mostra só o colaborador
   * selecionado no filtro) pelo HTML de todos os colaboradores — ver
   * buildTodosColaboradoresHorasDiariasHtml(). */
  async function buildShareHtmlDocument(panelIds, options) {
    options = options || {};
    const cssText = collectPageCssTextForShare();

    const originalHeaderImgs = Array.from(document.querySelectorAll('.admin-header img'));
    const headerClone = document.querySelector('.admin-header').cloneNode(true);
    stripForShareHtml(headerClone);
    Array.from(headerClone.querySelectorAll('img')).forEach((img, i) => {
      const original = originalHeaderImgs[i];
      if (original) img.src = imageElementToDataUrlForShare(original);
    });

    const reportHeaderClone = els.printReportHeader.cloneNode(true);

    const panelsHtml = panelIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((panel) => {
        const clone = stripForShareHtml(panel.cloneNode(true));
        // O painel pode estar com a classe "hidden" no DOM ao vivo (se a aba
        // não é a que está ativa no momento) — remove pra garantir que
        // apareça no arquivo exportado independente da aba atual.
        clone.classList.remove('hidden');
        if (options.transformClone) options.transformClone(clone, panel.id);
        if (panel.id === 'tab-apontamentos' && options.horasDiariasTodosHtml) {
          const secao = clone.querySelector('#horasDiariasSecaoConteudo');
          if (secao) secao.innerHTML = options.horasDiariasTodosHtml;
        }
        return clone.outerHTML;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Gestão de Pessoas — Relatório</title>
<style>
${cssText}
${SHARE_HTML_LIGHT_THEME_CSS}
</style>
</head>
<body>
<div class="admin-shell">
${headerClone.outerHTML}
${reportHeaderClone.outerHTML}
<main class="admin-main">
${panelsHtml}
</main>
</div>
</body>
</html>`;
  }

  function downloadHtmlFile(htmlString, filenamePrefix) {
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}-${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /** Abre o modal de seleção do que entra no HTML compartilhado: quais seções
   * (Apontamentos / Equipe / Financeira e Estratégia — esta última só se o
   * admin logado tem acesso financeiro) e, dentro de Apontamentos, quais
   * colaboradores aparecem em "Tempo registrado por dia". */
  function openShareHtmlModal() {
    els.shareHtmlSecaoApontamentos.checked = true;
    els.shareHtmlSecaoEquipe.checked = true;
    els.shareHtmlSecaoFinanceiro.checked = true;
    els.shareHtmlSecaoFinanceiroWrap.classList.toggle('hidden', !state.session.acessoFinanceiro);

    populateShareHtmlColaboradoresList();
    els.shareHtmlColaboradoresWrap.classList.remove('hidden');

    // O seletor de período do modal começa igual ao filtro global da tela e
    // vale só para este arquivo (não muda o filtro da tela).
    garantirPeriodo();
    popularSelectsPeriodo(els.shareHtmlPeriodoMes, els.shareHtmlPeriodoAno, { ano: state.periodo.ano, mes: state.periodo.mes });
    document.querySelectorAll('input[name="shareHtmlPeriodoModo"]').forEach((r) => {
      r.checked = r.value === state.periodo.modo;
    });
    atualizarModalPeriodoUi();

    els.shareHtmlModal.classList.remove('hidden');
  }

  function lerPeriodoDoModal() {
    const radio = document.querySelector('input[name="shareHtmlPeriodoModo"]:checked');
    const modo = radio ? radio.value : 'mes';
    const [anoMes, mesMes] = els.shareHtmlPeriodoMes.value.split('-').map(Number);
    const anoSel = Number(els.shareHtmlPeriodoAno.value);
    if (modo === 'ano') return { modo, ano: anoSel, mes: state.periodo ? state.periodo.mes : 1 };
    if (modo === 'mes') return { modo, ano: anoMes, mes: mesMes };
    return { modo: 'tudo', ano: state.periodo.ano, mes: state.periodo.mes };
  }

  function atualizarModalPeriodoUi() {
    const p = lerPeriodoDoModal();
    els.shareHtmlPeriodoMes.classList.toggle('hidden', p.modo !== 'mes');
    els.shareHtmlPeriodoAno.classList.toggle('hidden', p.modo !== 'ano');
    const periodo = getPeriodo(p);
    els.shareHtmlPeriodoResumo.textContent =
      p.modo === 'tudo' ? periodo.label : `${periodo.label} (${resumoDoPeriodo(periodo)})`;
  }

  function closeShareHtmlModal() {
    els.shareHtmlModal.classList.add('hidden');
  }

  function populateShareHtmlColaboradoresList() {
    const ativos = state.colaboradores
      .filter((c) => c.ativo)
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));
    els.shareHtmlColaboradoresList.innerHTML = ativos
      .map((c) => `<label><input type="checkbox" value="${c.id}" checked /> ${escapeHtml(c.nome)}</label>`)
      .join('') || '<p class="muted">Nenhum colaborador ativo.</p>';
  }

  function onShareHtmlConfirm() {
    const selecao = {
      apontamentos: els.shareHtmlSecaoApontamentos.checked,
      equipe: els.shareHtmlSecaoEquipe.checked,
      financeiro: state.session.acessoFinanceiro && els.shareHtmlSecaoFinanceiro.checked,
      colaboradorIds: Array.from(
        els.shareHtmlColaboradoresList.querySelectorAll('input[type="checkbox"]:checked')
      ).map((cb) => cb.value),
      periodo: lerPeriodoDoModal(),
    };

    if (!selecao.apontamentos && !selecao.equipe && !selecao.financeiro) {
      toast('Selecione ao menos uma seção para compartilhar.', 'error');
      return;
    }

    closeShareHtmlModal();
    shareReportHtml(selecao);
  }

  async function shareReportHtml(selecao) {
    const REPORT_PANEL_IDS = [];
    if (selecao.apontamentos) REPORT_PANEL_IDS.push('tab-apontamentos');
    if (selecao.equipe) REPORT_PANEL_IDS.push('tab-equipe');
    if (selecao.financeiro) REPORT_PANEL_IDS.push('tab-financeira', 'tab-estrategia');

    els.shareHtmlButton.disabled = true;
    // O período escolhido no modal vale só para este arquivo: troca o filtro
    // global temporariamente, gera o HTML e devolve o filtro como estava.
    const periodoDaTela = state.periodo;
    try {
      state.periodo = selecao.periodo;
      const carregou = await loadApontamentos();
      if (!carregou) throw new Error('não foi possível carregar os registros para o período escolhido.');
      if (selecao.equipe) renderEquipe();
      if (selecao.financeiro) {
        renderFinanceira();
        await loadEstrategiaCenarios();
      }
      atualizarBadgesPeriodo();

      // Confere que TODOS os blocos de Registro de Tempo foram renderizados
      // com o período escolhido — nunca gera um arquivo misturando períodos.
      if (selecao.apontamentos) {
        const esperado = getPeriodo().label;
        const desatualizados = Array.from(document.querySelectorAll('#tab-apontamentos [data-periodo-tag]')).filter(
          (el) => el.textContent !== esperado
        );
        if (desatualizados.length) {
          throw new Error('alguns blocos de Registro de Tempo não foram atualizados para o período escolhido.');
        }
      }

      const agora = new Date();
      els.printReportHeaderMeta.textContent =
        `Relatório gerado em ${agora.toLocaleDateString('pt-BR')} às ` +
        `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` +
        ` · Período analisado: ${getPeriodo().label}`;

      // "Tempo registrado por dia" ao vivo mostra 1 colaborador por vez (filtro
      // no topo); no arquivo compartilhado, mostra só quem foi marcado no
      // modal — ver buildTodosColaboradoresHorasDiariasHtml().
      const horasDiariasTodosHtml = selecao.apontamentos
        ? buildTodosColaboradoresHorasDiariasHtml(selecao.colaboradorIds)
        : '';

      const html = await buildShareHtmlDocument(REPORT_PANEL_IDS, { horasDiariasTodosHtml });
      downloadHtmlFile(html, 'gestao-de-pessoas');
      toast('Arquivo HTML gerado. Confira sua pasta de downloads.', 'success');
    } catch (err) {
      toast(`Não foi possível gerar o HTML: ${err.message}`, 'error');
    } finally {
      state.periodo = periodoDaTela;
      renderPeriodoBar();
      renderTodasAnalisesPorPeriodo();
      els.shareHtmlButton.disabled = false;
    }
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
      els.projetoHorasEstimadas.value = projeto.horasEstimadas || '';
      els.projetoInicioPrevisto.value = projeto.dataInicioPrevista || '';
      els.projetoTerminoPrevisto.value = projeto.dataTerminoPrevista || '';
      els.projetoDataConclusao.value = projeto.dataConclusao || '';
      els.projetoAtivo.checked = projeto.ativo;
    } else {
      els.projetoId.value = '';
      els.projetoCliente.value = '';
      els.projetoNome.value = '';
      els.projetoValorOrcado.value = '';
      els.projetoHorasEstimadas.value = '';
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
      horasEstimadas: Number(els.projetoHorasEstimadas.value) || 0,
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
          <td>${projeto.horasEstimadas ? `${formatNumeroBR(projeto.horasEstimadas)}h` : '—'}</td>
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

  // Cargos são fixos por time (definidos em js/teams.js, mesma regra de
  // negócio das atividades — não editáveis pelo admin). Se o colaborador já
  // tiver um cargo salvo que não está mais na lista fixa do time (cadastro
  // antigo, de antes dessa mudança, ou o time mudou a lista), mantém esse
  // valor como uma opção extra no topo — assim o formulário nunca troca o
  // cargo de alguém sem o admin escolher isso de propósito.
  function populateColaboradorCargoSelect(currentValue) {
    els.colaboradorCargo.innerHTML = '';
    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = 'Sem cargo definido';
    els.colaboradorCargo.appendChild(vazio);

    const cargosDoTime = (currentTeam && currentTeam.cargos) || [];
    if (currentValue && !cargosDoTime.includes(currentValue)) {
      const legado = document.createElement('option');
      legado.value = currentValue;
      legado.textContent = `${currentValue} (fora da lista atual do time)`;
      els.colaboradorCargo.appendChild(legado);
    }

    cargosDoTime.forEach((cargo) => {
      const opt = document.createElement('option');
      opt.value = cargo;
      opt.textContent = cargo;
      els.colaboradorCargo.appendChild(opt);
    });

    els.colaboradorCargo.value = currentValue || '';
  }

  function openColaboradorForm(colaborador) {
    els.colaboradorForm.classList.remove('hidden');
    els.colaboradorSenha.value = '';
    if (colaborador) {
      els.colaboradorId.value = colaborador.id;
      els.colaboradorNome.value = colaborador.nome;
      els.colaboradorEmail.value = colaborador.email;
      els.colaboradorPapel.value = colaborador.papel;
      populateColaboradorCargoSelect(colaborador.cargo || '');
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
      populateColaboradorCargoSelect('');
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
        // Não deixa excluir o próprio usuário logado (o backend também
        // recusa) — some o botão em vez de deixar clicar e dar erro.
        // Compara por e-mail (não por id): a sessão do Dashboard não guarda o
        // id do colaborador, só e-mail/nome/papel/acessoFinanceiro.
        if (colaborador.email.toLowerCase() !== state.session.email.toLowerCase()) {
          const delBtn = document.createElement('button');
          delBtn.title = 'Excluir colaborador';
          delBtn.textContent = '🗑';
          delBtn.addEventListener('click', () => onExcluirColaborador(colaborador));
          rowActions.appendChild(delBtn);
        }
        actionsTd.appendChild(rowActions);
        els.colaboradoresTableBody.appendChild(tr);
      });
  }

  async function onExcluirColaborador(colaborador) {
    const confirmado = confirm(
      `Excluir o colaborador "${colaborador.nome}"? Essa ação não pode ser desfeita. Os registros que ele já lançou continuam no histórico, só não será mais possível ele entrar no sistema.`
    );
    if (!confirmado) return;
    try {
      await Api.excluirColaborador(state.session, colaborador.id);
      toast('Colaborador excluído.', 'success');
      await loadAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ------------------------------ Período global ------------------------------ */
  /*
   * Um único filtro de período controla TODAS as análises das abas Registro de
   * Tempo, Equipe, Financeira e Relatório individual (antes cada bloco tinha o
   * seu próprio seletor de mês/ano, o que confundia). Três modos:
   *   - 'mes'  → um mês específico (state.periodo.ano + state.periodo.mes, 1–12)
   *   - 'ano'  → o ano todo (state.periodo.ano), de 1º/jan a 31/dez
   *   - 'tudo' → da data do primeiro registro até hoje
   * getPeriodo() converte isso num objeto pronto pra consumo (datas de
   * início/fim, lista de meses, rótulo). Nos gráficos mensais de Equipe e
   * Financeira, `mesesGrafico` é o eixo X: no modo 'mes' mostra o ano do mês
   * escolhido (com o mês destacado, pra dar contexto); nos outros, os meses do
   * próprio período.
   */

  const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function mesKeyDe(ano, mesIdx) {
    return `${ano}-${pad2(mesIdx + 1)}`;
  }

  function formatDataBR(dataStr) {
    const [y, m, d] = dataStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function primeiraDataComRegistro() {
    let min = null;
    state.apontamentos.forEach((a) => {
      if (a.data && (min === null || a.data < min)) min = a.data;
    });
    return min;
  }

  function mesesComRegistro() {
    const set = new Set();
    state.apontamentos.forEach((a) => {
      if (a.data) set.add(a.data.slice(0, 7));
    });
    return set;
  }

  /** Padrão: o mês mais recente que já tem registro (não o mês corrente do
   * calendário, pra não abrir sempre num mês vazio). */
  function periodoPadrao() {
    const hoje = new Date();
    const maisRecente = Array.from(mesesComRegistro()).sort().reverse()[0];
    const key = maisRecente || mesKeyDe(hoje.getFullYear(), hoje.getMonth());
    const [ano, mes] = key.split('-').map(Number);
    return { modo: 'mes', ano, mes };
  }

  function garantirPeriodo() {
    if (!state.periodo) state.periodo = periodoPadrao();
  }

  function listaMeses(anoIni, mesIdxIni, anoFim, mesIdxFim) {
    const lista = [];
    let a = anoIni;
    let m = mesIdxIni;
    while (a < anoFim || (a === anoFim && m <= mesIdxFim)) {
      lista.push({ ano: a, mesIdx: m, key: mesKeyDe(a, m) });
      m += 1;
      if (m > 11) {
        m = 0;
        a += 1;
      }
    }
    return lista;
  }

  function getPeriodo(p) {
    p = p || state.periodo || periodoPadrao();
    const hoje = new Date();
    const hojeStr = Holidays.dateStr(hoje);
    const modo = ['mes', 'ano', 'tudo'].includes(p.modo) ? p.modo : 'mes';
    const ano = Number(p.ano) || hoje.getFullYear();
    const mes = Number(p.mes) || hoje.getMonth() + 1;

    let inicio, fim, meses, label, labelCurto;
    if (modo === 'ano') {
      inicio = `${ano}-01-01`;
      fim = `${ano}-12-31`;
      meses = listaMeses(ano, 0, ano, 11);
      label = `Ano de ${ano}`;
      labelCurto = `ano de ${ano}`;
    } else if (modo === 'tudo') {
      let primeira = primeiraDataComRegistro() || hojeStr;
      if (primeira > hojeStr) primeira = hojeStr;
      inicio = primeira;
      fim = hojeStr;
      const [ai, mi] = primeira.split('-').map(Number);
      meses = listaMeses(ai, mi - 1, hoje.getFullYear(), hoje.getMonth());
      label = `Desde o início do registro (${formatDataBR(primeira)}) até hoje (${formatDataBR(hojeStr)})`;
      labelCurto = 'desde o início do registro';
    } else {
      const ultimoDia = new Date(ano, mes, 0).getDate();
      inicio = `${ano}-${pad2(mes)}-01`;
      fim = `${ano}-${pad2(mes)}-${pad2(ultimoDia)}`;
      meses = listaMeses(ano, mes - 1, ano, mes - 1);
      label = formatMesAno(`${ano}-${pad2(mes)}`);
      labelCurto = label;
    }

    const mesesGraficoBase = modo === 'mes' ? listaMeses(ano, 0, ano, 11) : meses;
    const multiAno = mesesGraficoBase.length > 0 && mesesGraficoBase[0].ano !== mesesGraficoBase[mesesGraficoBase.length - 1].ano;
    const rotular = (m) => ({ ...m, label: multiAno ? `${MES_ABREV[m.mesIdx]}/${String(m.ano).slice(2)}` : MES_ABREV[m.mesIdx] });

    return {
      modo,
      ano,
      mes,
      inicio,
      fim,
      meses: meses.map(rotular),
      mesesGrafico: mesesGraficoBase.map(rotular),
      multiAno,
      destaqueKey: modo === 'mes' ? `${ano}-${pad2(mes)}` : null,
      label,
      labelCurto,
    };
  }

  function dataNoPeriodo(dataStr, periodo) {
    return !!dataStr && dataStr >= periodo.inicio && dataStr <= periodo.fim;
  }

  function opcoesMesesPeriodo(incluir) {
    const hoje = new Date();
    const set = mesesComRegistro();
    set.add(mesKeyDe(hoje.getFullYear(), hoje.getMonth()));
    if (incluir) set.add(incluir);
    return Array.from(set).sort().reverse();
  }

  function opcoesAnosPeriodo(incluir) {
    const set = new Set([new Date().getFullYear()]);
    mesesComRegistro().forEach((k) => set.add(Number(k.slice(0, 4))));
    if (incluir) set.add(Number(incluir));
    return Array.from(set).sort((a, b) => b - a);
  }

  /** Preenche e posiciona os <select> de mês e ano — usado tanto pela barra
   * global quanto pelo seletor do modal de exportação em HTML. */
  function popularSelectsPeriodo(mesSel, anoSel, p) {
    const keyMes = mesKeyDe(p.ano, p.mes - 1);
    mesSel.innerHTML = opcoesMesesPeriodo(keyMes)
      .map((k) => `<option value="${k}">${formatMesAno(k)}</option>`)
      .join('');
    mesSel.value = keyMes;
    anoSel.innerHTML = opcoesAnosPeriodo(p.ano)
      .map((a) => `<option value="${a}">${a}</option>`)
      .join('');
    anoSel.value = String(p.ano);
  }

  function resumoDoPeriodo(periodo) {
    return `${formatDataBR(periodo.inicio)} a ${formatDataBR(periodo.fim)}`;
  }

  const ABAS_COM_PERIODO = ['apontamentos', 'equipe', 'financeira', 'relatorio'];

  /** Etiqueta de período do PRÓPRIO bloco: cada análise grava aqui o período
   * que usou na hora de renderizar. Assim, no HTML exportado dá pra ver (e o
   * código confere) que nenhum bloco ficou com um período diferente. */
  function setPeriodoTag(anchorEl, periodo) {
    const secao = anchorEl && anchorEl.closest('.apontamentos-secao');
    const tag = secao && secao.querySelector('[data-periodo-tag]');
    if (tag) tag.textContent = periodo.label;
  }

  function atualizarBadgesPeriodo() {
    if (!state.periodo) return;
    const texto = `Período analisado: ${getPeriodo().label}`;
    document.querySelectorAll('[data-periodo-badge]').forEach((el) => {
      el.textContent = texto;
    });
  }

  function renderPeriodoBar() {
    const visivel = !!state.periodo && ABAS_COM_PERIODO.includes(abaAtiva);
    els.periodoBar.classList.toggle('hidden', !visivel);
    if (!state.periodo) return;

    const p = state.periodo;
    popularSelectsPeriodo(els.periodoMesSelect, els.periodoAnoSelect, { ano: p.ano, mes: p.mes });
    els.periodoMesSelect.classList.toggle('hidden', p.modo !== 'mes');
    els.periodoAnoSelect.classList.toggle('hidden', p.modo !== 'ano');
    els.periodoBar.querySelectorAll('.periodo-seg__btn').forEach((btn) => {
      const ativo = btn.dataset.modo === p.modo;
      btn.classList.toggle('is-active', ativo);
      btn.setAttribute('aria-checked', ativo ? 'true' : 'false');
    });
    els.periodoBarResumo.textContent = resumoDoPeriodo(getPeriodo());
    atualizarBadgesPeriodo();
  }

  function onPeriodoChange(novo) {
    state.periodo = novo;
    renderPeriodoBar();
    renderAnalisesDaAbaAtiva();
  }

  function onPeriodoModoClick(modo) {
    garantirPeriodo();
    onPeriodoChange({ ...state.periodo, modo });
  }

  /** Renderiza cada bloco de Registro de Tempo isoladamente: se um falhar
   * (ex.: dado fora do padrão), os demais continuam atualizados e o erro é
   * informado — em vez de deixar blocos antigos na tela sem avisar. Devolve a
   * lista de blocos que falharam. */
  function renderAnalisesApontamentos() {
    const blocos = [
      ['Tempo registrado por dia', renderHorasDiarias],
      ['Ranking da equipe', renderRankingEquipe],
      ['Conformidade de registro', renderConformidade],
      ['Taxa de Aderência', renderAderencia],
      ['Filtro de horas', renderCharts],
    ];
    const falhas = [];
    blocos.forEach(([nome, fn]) => {
      try {
        fn();
      } catch (err) {
        console.error(`Falha ao renderizar "${nome}":`, err);
        falhas.push(nome);
      }
    });
    if (falhas.length) toast(`Não foi possível atualizar: ${falhas.join(', ')}.`, 'error');
    return falhas;
  }

  function renderAnalisesDaAbaAtiva() {
    if (!state.periodo) return;
    if (abaAtiva === 'apontamentos') renderAnalisesApontamentos();
    else if (abaAtiva === 'equipe') renderEquipe();
    else if (abaAtiva === 'financeira') renderFinanceira();
    else if (abaAtiva === 'relatorio') renderRelatorio();
  }

  /** Re-renderiza tudo que depende do período — usado depois de uma
   * exportação que trocou o período temporariamente. */
  function renderTodasAnalisesPorPeriodo() {
    if (!state.periodo) return;
    renderAnalisesApontamentos();
    renderEquipe();
    if (state.session && state.session.acessoFinanceiro) renderFinanceira();
    if (els.relatorioColaboradorSelect.value) renderRelatorio();
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

  function applyHorasDiariasZoom() {
    const width = HORAS_DIARIAS_BASE_WIDTH * horasDiariasZoom;
    document.getElementById('chartHorasDiariasStatus').style.width = `${width}px`;
    document.getElementById('chartHorasDiariasAtividade').style.width = `${width}px`;
    els.horasDiariasZoomLevel.textContent = `${Math.round(horasDiariasZoom * 100)}%`;
    els.horasDiariasZoomOut.disabled = horasDiariasZoom <= HORAS_DIARIAS_ZOOM_MIN;
    els.horasDiariasZoomIn.disabled = horasDiariasZoom >= HORAS_DIARIAS_ZOOM_MAX;
  }

  /** Dados dia a dia de um colaborador dentro do período. `dias` é sempre
   * diário (usado nas contas: dias úteis, carga prevista, ranking…).
   * `diasGrafico` é o que os gráficos de "Tempo registrado por dia" desenham:
   * o próprio `dias` quando o período é um mês; nos períodos longos (ano todo
   * ou desde o início), uma barra por mês com a MÉDIA de horas por dia útil —
   * centenas de barras diárias seriam ilegíveis. */
  function gerarDadosPeriodo(colaboradorId, periodo) {
    const colaborador = state.colaboradores.find((c) => c.id === colaboradorId);
    if (!colaborador) return null;
    const meta = Number(colaborador.dedicacaoDiaria) || 8;
    const obrigatorio = colaborador.obrigatorioApontamento !== false;

    const porDia = {};
    state.apontamentos.forEach((a) => {
      if (a.colaboradorId !== colaboradorId || a.duracaoMinutos == null || a.duracaoMinutos <= 0) return;
      if (!dataNoPeriodo(a.data, periodo)) return;
      if (!porDia[a.data]) porDia[a.data] = { minutos: 0, porAtividade: {} };
      porDia[a.data].minutos += a.duracaoMinutos;
      porDia[a.data].porAtividade[a.atividadeId] = (porDia[a.data].porAtividade[a.atividadeId] || 0) + a.duracaoMinutos;
    });

    const hojeStr = Holidays.dateStr(new Date());
    const dias = [];
    const [yi, mi, di] = periodo.inicio.split('-').map(Number);
    const [yf, mf, df] = periodo.fim.split('-').map(Number);
    const fimDate = new Date(yf, mf - 1, df);
    for (let date = new Date(yi, mi - 1, di); date <= fimDate; date.setDate(date.getDate() + 1)) {
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = !isWeekend && isHolidayLocal(date);
      const dataStr = Holidays.dateStr(date);
      const registro = porDia[dataStr];
      dias.push({
        dia: date.getDate(),
        data: dataStr,
        isNonBusiness: isWeekend || isHoliday,
        isHoliday,
        // Dia do calendário ainda não chegou — não é "esquecido", é só cedo
        // demais pra cobrar registro dele.
        isFuture: dataStr > hojeStr,
        // Dia já totalmente decorrido (estritamente antes de hoje) — hoje em
        // si NÃO conta como "passado" ainda, porque o dia não terminou: quem
        // ainda vai registrar à tarde/noite não deveria aparecer como "sem
        // registro" só porque é cedo.
        isPast: dataStr < hojeStr,
        horas: registro ? registro.minutos / 60 : 0,
        porAtividade: registro ? registro.porAtividade : {},
      });
    }

    const diasGrafico = periodo.modo === 'mes' ? dias : agruparDiasPorMes(dias, periodo, obrigatorio);
    return { colaborador, meta, obrigatorio, dias, diasGrafico, periodo };
  }

  /** Uma entrada por mês, no mesmo formato de um "dia" dos gráficos, com
   * `horas` = média de horas por dia útil já decorrido (e `porAtividade` em
   * minutos médios por dia útil). */
  function agruparDiasPorMes(dias, periodo, obrigatorio) {
    const grupos = new Map();
    dias.forEach((d) => {
      const key = d.data.slice(0, 7);
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(d);
    });
    const rotuloPorKey = new Map(periodo.meses.map((m) => [m.key, m.label]));
    return Array.from(grupos.entries()).map(([key, grupo]) => {
      const uteisPassados = grupo.filter((d) => !d.isNonBusiness && d.isPast);
      const semRegistro = uteisPassados.filter((d) => d.horas === 0).length;
      const porAtividadeTotal = {};
      let totalMin = 0;
      grupo.forEach((d) => {
        Object.entries(d.porAtividade).forEach(([id, min]) => {
          porAtividadeTotal[id] = (porAtividadeTotal[id] || 0) + min;
          totalMin += min;
        });
      });
      const denom = uteisPassados.length || (totalMin > 0 ? 1 : 0);
      const porAtividade = {};
      Object.entries(porAtividadeTotal).forEach(([id, min]) => {
        porAtividade[id] = denom > 0 ? min / denom : 0;
      });
      return {
        dia: null,
        data: `${key}-01`,
        agregado: true,
        rotulo: rotuloPorKey.get(key) || key,
        titulo: formatMesAno(key),
        isNonBusiness: false,
        isHoliday: false,
        isFuture: grupo.every((d) => d.isFuture),
        isPast: uteisPassados.length > 0,
        diasUteis: uteisPassados.length,
        diasSemRegistro: semRegistro,
        horas: denom > 0 ? totalMin / 60 / denom : 0,
        porAtividade,
      };
    });
  }

  /** Versão de um mês só — mantida para as comparações mês a mês do relatório
   * individual e do ranking (comparativo com meses anteriores). */
  function gerarDadosHorasDiarias(colaboradorId, year, month) {
    return gerarDadosPeriodo(colaboradorId, getPeriodo({ modo: 'mes', ano: year, mes: month }));
  }

  function tituloBarraDia(d) {
    if (d.agregado) {
      return `${d.titulo}: média de ${formatHm(Math.round(d.horas * 60))} por dia útil (${d.diasUteis} dia(s) útil(eis), ${d.diasSemRegistro} sem registro)`;
    }
    return `Dia ${d.dia}: ${formatHm(Math.round(d.horas * 60))} registradas`;
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
    const n = Math.max(dias.length, 1);
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
    const passo = Math.max(1, Math.ceil(dias.length / 14));
    dias.forEach((d, i) => {
      if (d.agregado) {
        if (i % passo === 0) {
          parts.push(`<text class="day-tick" x="${xForCenter(i)}" y="${ctx.H - 10}" text-anchor="middle">${d.rotulo}</text>`);
        }
      } else if (dias.length <= 20 || d.dia % 2 === 1) {
        parts.push(`<text class="day-tick" x="${xForCenter(i)}" y="${ctx.H - 10}" text-anchor="middle">${d.dia}</text>`);
      }
    });
  }

  function renderHorasDiariasStatus(dados, targetId) {
    const { meta, obrigatorio } = dados;
    const dias = dados.diasGrafico || dados.dias;
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
            `<title>${tituloBarraDia(d)}</title></rect>`
        );
      } else if (!d.isNonBusiness && obrigatorio && d.isPast) {
        const yBase = yFor(0);
        parts.push(
          `<rect class="day-bar" x="${x}" y="${yBase - 6}" width="${barW}" height="6" rx="1" fill="var(--status-critical)">` +
            `<title>${d.agregado ? `${d.titulo}: sem registro em ${d.diasUteis} dia(s) útil(eis)` : `Dia ${d.dia}: sem registro`}</title></rect>`
        );
      }
    });

    renderHorasDiariasRodape(ctx, dias);
    document.getElementById(targetId || 'chartHorasDiariasStatus').innerHTML = ctx.parts.join('');
  }

  function renderHorasDiariasAtividade(dados, targetId, legendId) {
    const { meta } = dados;
    const dias = dados.diasGrafico || dados.dias;
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
            `<title>${d.agregado ? `${escapeHtml(d.titulo)} — ${escapeHtml(act.name)}: média de ${formatHm(Math.round(minutos))} por dia útil` : `Dia ${d.dia} — ${escapeHtml(act.name)}: ${formatHm(minutos)}`}</title></rect>`
        );
        acumulado += horasAtividade;
      });
    });

    renderHorasDiariasRodape(ctx, dias);
    document.getElementById(targetId || 'chartHorasDiariasAtividade').innerHTML = ctx.parts.join('');
  }

  function renderHorasDiarias() {
    const colaboradorId = els.horasDiariasColaborador.value;
    if (!colaboradorId || !state.periodo) return;

    const periodo = getPeriodo();
    setPeriodoTag(els.horasDiariasEmptyState, periodo);
    const dados = gerarDadosPeriodo(colaboradorId, periodo);
    if (!dados) return;

    const temApontamento = dados.dias.some((d) => d.horas > 0);
    els.horasDiariasEmptyState.classList.toggle('hidden', temApontamento);

    renderHorasDiariasStatus(dados);
    renderHorasDiariasAtividade(dados);
    applyHorasDiariasZoom();
  }

  /** Gera o HTML de "Tempo registrado por dia" para os colaboradores marcados
   * no modal de compartilhamento (ou todos os ativos, se `colaboradorIds` não
   * for informado), no mês selecionado no filtro — usado só na exportação/
   * compartilhamento em HTML (ver shareReportHtml), já que a tela ao vivo
   * mostra um colaborador por vez (ver renderHorasDiarias acima). Renderiza
   * cada colaborador num container temporário fora da tela (reaproveitando
   * renderHorasDiariasStatus/renderHorasDiariasAtividade, que escrevem no
   * elemento pelo id) e junta o resultado de cada um num bloco com o nome
   * da pessoa. */
  function buildTodosColaboradoresHorasDiariasHtml(colaboradorIds) {
    if (!state.periodo) return '';
    const periodo = getPeriodo();

    const idsSet = colaboradorIds ? new Set(colaboradorIds) : null;
    const colaboradoresAtivos = state.colaboradores
      .filter((c) => c.ativo && (!idsSet || idsSet.has(c.id)))
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));

    if (!colaboradoresAtivos.length) {
      return '<p class="empty-state">Nenhum colaborador selecionado para este relatório.</p>';
    }

    const temp = document.createElement('div');
    temp.style.cssText = 'position:absolute; left:-99999px; top:-99999px; width:1px; height:1px; overflow:hidden;';
    document.body.appendChild(temp);

    const blocos = colaboradoresAtivos.map((colaborador) => {
      const dados = gerarDadosPeriodo(colaborador.id, periodo);
      if (!dados) return '';

      temp.innerHTML =
        '<svg id="chartHorasDiariasStatus_tmp"></svg>' +
        '<svg id="chartHorasDiariasAtividade_tmp"></svg>' +
        '<div id="legendHorasDiariasAtividade_tmp"></div>';
      renderHorasDiariasStatus(dados, 'chartHorasDiariasStatus_tmp');
      renderHorasDiariasAtividade(dados, 'chartHorasDiariasAtividade_tmp', 'legendHorasDiariasAtividade_tmp');
      const statusInner = document.getElementById('chartHorasDiariasStatus_tmp').innerHTML;
      const atividadeInner = document.getElementById('chartHorasDiariasAtividade_tmp').innerHTML;
      const legendInner = document.getElementById('legendHorasDiariasAtividade_tmp').innerHTML;
      const temApontamento = dados.dias.some((d) => d.horas > 0);

      return `
        <div class="horas-diarias-colaborador-bloco">
          <h4 class="horas-diarias-colaborador-nome">${escapeHtml(colaborador.nome)}</h4>
          <p class="empty-state${temApontamento ? ' hidden' : ''}">Nenhum registro concluído neste período para este colaborador.</p>
          <p class="muted"><strong>Situação do dia</strong> — cor conforme as horas registradas frente à dedicação diária (linha tracejada).</p>
          <div class="chart-wrap">
            <svg height="260" viewBox="0 0 820 260" role="img" aria-label="Tempo registrado por dia, coloridas pela situação — ${escapeHtml(colaborador.nome)}">${statusInner}</svg>
          </div>
          <div class="legend-row">
            <span><i style="background: var(--status-good)"></i>Na meta ou acima</span>
            <span><i style="background: var(--status-warning)"></i>Abaixo da meta</span>
            <span><i style="background: var(--status-critical)"></i>Sem registro (dia útil)</span>
            <span><i style="background: var(--weekend-band); border: 1px solid var(--color-border);"></i>Fim de semana</span>
            <span><i style="background: var(--holiday-band); border: 1px solid var(--color-border);"></i>Feriado</span>
            <span><i class="line"></i>Dedicação diária</span>
          </div>
          <p class="muted" style="margin-top: var(--space-4);"><strong>Composição por atividade</strong> — mesmo eixo, mostrando em que a pessoa trabalhou naquele dia.</p>
          <div class="chart-wrap">
            <svg height="260" viewBox="0 0 820 260" role="img" aria-label="Tempo registrado por dia, por atividade — ${escapeHtml(colaborador.nome)}">${atividadeInner}</svg>
          </div>
          <div class="legend-row">${legendInner}</div>
        </div>
      `;
    }).join('');

    document.body.removeChild(temp);
    return blocos;
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

  function renderFinanceira() {
    garantirPeriodo();
    const periodo = getPeriodo();
    definirEixoMeses(periodo);

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

    // Custo acumulado por projeto = "vida inteira" do projeto ATÉ O FIM do
    // período selecionado — margem, % do orçamento e projeção só fazem sentido
    // olhando o projeto desde o começo, não um recorte de calendário. Já a
    // composição "custo por projeto e atividade" mostra só o custo DENTRO do
    // período.
    const ateFimDoPeriodo = concluidos.filter((a) => a.data <= periodo.fim);
    const doPeriodo = concluidos.filter((a) => dataNoPeriodo(a.data, periodo));
    const custoAcumuladoPorProjeto = {};
    const custoPorProjetoPorMes = {};
    ateFimDoPeriodo.forEach((a) => {
      const custo = custoDoApontamento(a);
      custoAcumuladoPorProjeto[a.projetoId] = (custoAcumuladoPorProjeto[a.projetoId] || 0) + custo;
      const chave = `${a.projetoId}::${a.data.slice(0, 7)}`;
      custoPorProjetoPorMes[chave] = (custoPorProjetoPorMes[chave] || 0) + custo;
    });

    const projetosOrcados = state.projetos.filter(
      (p) => Number(p.valorOrcado) > 0 && (custoAcumuladoPorProjeto[p.id] || 0) > 0
    );

    const hoje = new Date();
    const keyHoje = mesKeyDe(hoje.getFullYear(), hoje.getMonth());
    const mesReferencia = periodo.fim.slice(0, 7) < keyHoje ? periodo.fim.slice(0, 7) : keyHoje;
    const dataReferencia = periodo.fim < Holidays.dateStr(hoje) ? periodo.fim : Holidays.dateStr(hoje);

    renderFinanceiraKpis(periodo, custoMensalTotal, projetosOrcados, custoAcumuladoPorProjeto, dataReferencia);
    renderFinanceiraCustoMensal(periodo, custoMensalTotal);
    renderFinanceiraMargem(projetosOrcados, custoAcumuladoPorProjeto);
    renderFinanceiraOrcamento(projetosOrcados, custoAcumuladoPorProjeto);

    const projecaoDados = computeFinanceiraProjecaoList(custoAcumuladoPorProjeto, custoPorProjetoPorMes, mesReferencia);
    renderFinanceiraProjecaoLegend(projecaoDados);
    renderFinanceiraProjecao(projecaoDados);
    applyFinanceiraProjecaoZoom();
    renderFinanceiraBolhas(projecaoDados);

    renderFinanceiraCustoCargo(ativos, periodo.meses.length);
    renderFinanceiraCustoProjetoAtividade(doPeriodo, custoDoApontamento);
  }

  function renderFinanceiraKpis(periodo, custoMensalTotal, projetosOrcados, custoAcumuladoPorProjeto, dataReferencia) {
    const nMeses = periodo.meses.length;
    els.kpiCustoAnoLabel.textContent =
      periodo.modo === 'mes' ? 'Custo do departamento no mês' : periodo.modo === 'ano' ? 'Custo do departamento no ano' : 'Custo do departamento no período';
    els.kpiCustoAnoValue.textContent = formatBRL(custoMensalTotal * nMeses);
    els.kpiCustoAnoSub.textContent = `soma do custo mensal dos colaboradores ativos × ${nMeses} ${nMeses === 1 ? 'mês' : 'meses'}`;

    const orcadoTotal = projetosOrcados.reduce((a, p) => a + Number(p.valorOrcado), 0);
    els.kpiOrcadoAnoValue.textContent = formatBRL(orcadoTotal);

    const custoTotal = projetosOrcados.reduce((a, p) => a + (custoAcumuladoPorProjeto[p.id] || 0), 0);
    const margem = orcadoTotal - custoTotal;
    els.kpiMargemAnoValue.textContent = formatBRL(margem);
    els.kpiMargemAnoValue.className = 'kpi__value ' + (margem >= 0 ? 'pos' : 'neg');
    const margemPct = orcadoTotal > 0 ? (margem / orcadoTotal) * 100 : 0;
    els.kpiMargemAnoSub.textContent = `${margem >= 0 ? '+' : ''}${Math.round(margemPct * 10) / 10}% do orçado · custo acumulado até ${formatDataBR(dataReferencia)}`;

    const prejuizo = projetosOrcados.filter((p) => (custoAcumuladoPorProjeto[p.id] || 0) > Number(p.valorOrcado)).length;
    els.kpiProjetosPrejuizoValue.textContent = `${prejuizo} de ${projetosOrcados.length}`;
  }

  function renderFinanceiraCustoMensal(periodo, custoMensalTotal) {
    const svg = document.getElementById('chartFinanceiraCustoMensal');
    els.financeiraCustoMensalEmptyState.classList.toggle('hidden', custoMensalTotal > 0);
    if (custoMensalTotal <= 0) {
      svg.innerHTML = '';
      return;
    }

    const nEixo = EQUIPE_MESES.length;
    const custoMes = new Array(nEixo).fill(custoMensalTotal);
    const receitaMes = new Array(nEixo).fill(0);
    const projetosDoMes = Array.from({ length: nEixo }, () => []);
    state.projetos.forEach((p) => {
      if (Number(p.valorOrcado) > 0 && p.dataConclusao) {
        const mesIdx = indiceMesDaData(p.dataConclusao);
        if (mesIdx < 0) return;
        receitaMes[mesIdx] += Number(p.valorOrcado);
        projetosDoMes[mesIdx].push(p.nome);
      }
    });
    const mediaReceita = receitaMes.reduce((a, b) => a + b, 0) / nEixo;

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
    parts.push(bandaDestaqueMes(padL, slot, padT, plotH));
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
        `<title>Receita média do período exibido: ${formatBRL(mediaReceita)}/mês</title></line>`
    );
    parts.push(`<text class="revenue-avg-label" x="${padL + 4}" y="${yMedia - 5}">Receita média: ${formatBRL(mediaReceita)}/mês</text>`);

    EQUIPE_MESES.forEach((m, i) => parts.push((mesTickVisivel(i) ? `<text class="month-tick" x="${xForCenter(i)}" y="${H - 8}" text-anchor="middle">${m}</text>` : '')));

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
  function computeFinanceiraProjecaoList(custoAcumuladoPorProjeto, custoPorProjetoPorMes, mesReferencia) {
    // mesReferencia (YYYY-MM): o mês "de hoje" da projeção — o mês atual, ou o
    // último mês do período selecionado quando ele já terminou.
    const hojeStr = mesReferencia;
    const [refAno, refMes] = mesReferencia.split('-').map(Number);

    function taxaRecente(projetoId) {
      let soma = 0;
      for (let i = 0; i < 3; i++) {
        const d = new Date(refAno, refMes - 1 - i, 1);
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
    // Reaproveita a paleta categórica de 8 cores validadas (slot 9 é
    // reservado ao cinza neutro da atividade "Capacitação e Treinamento" no
    // time de Drone, não entra no ciclo de cores de projeto/cargo).
    return `var(--activity-${(i % 8) + 1})`;
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

  function renderFinanceiraCustoCargo(ativos, nMeses) {
    const container = els.financeiraCustoCargoContainer;
    const temDados = ativos.some((c) => (Number(c.custoMensal) || 0) > 0);
    els.financeiraCustoCargoEmptyState.classList.toggle('hidden', temDados);
    container.innerHTML = '';
    if (!temDados) return;

    const porCargo = {};
    ativos.forEach((c) => {
      const cargo = c.cargo || 'Sem cargo definido';
      porCargo[cargo] = (porCargo[cargo] || 0) + (Number(c.custoMensal) || 0) * nMeses;
    });
    const total = Object.values(porCargo).reduce((a, b) => a + b, 0);
    const fatias = Object.entries(porCargo)
      .map(([cargo, valor]) => ({ cargo, valor }))
      .sort((a, b) => b.valor - a.valor)
      .map((f, i) => ({ ...f, color: `var(--activity-${(i % 8) + 1})` }));

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
    beginLoading();
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
    } finally {
      endLoading();
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
  }

  /** Soma de horas registradas por um colaborador num mês específico, só nos
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
    if (!colaboradorId || !state.periodo) return;

    const periodo = getPeriodo();
    definirEixoMeses(periodo);
    const dados = gerarDadosPeriodo(colaboradorId, periodo);
    if (!dados) return;

    els.relatorioSubtitle.textContent = `${dados.colaborador.nome} · ${periodo.label}`;

    // Hoje e dias futuros do mês corrente ficam fora da conta — hoje ainda
    // não terminou (quem registrar à tarde não pode aparecer como "atrasado"
    // de manhã), e dias futuros nem chegaram. Senão "carga prevista"/"dias
    // sem apontamento" cobram o mês inteiro mesmo faltando semanas pra ele
    // acabar. Os gráficos continuam mostrando o período inteiro
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
    // O comparativo com o mês anterior e com a média do ano só existe quando o
    // período é um mês específico (nos outros períodos não há "mês" a comparar).
    const ehMes = periodo.modo === 'mes';
    const year = periodo.ano, month = periodo.mes;
    let mesAnteriorAno = year, mesAnteriorMes = month - 1;
    if (mesAnteriorMes < 1) { mesAnteriorMes = 12; mesAnteriorAno -= 1; }
    const horasMesAnterior = ehMes ? totalHorasMesColaborador(colaboradorId, mesAnteriorAno, mesAnteriorMes) : null;
    const mediaAno = ehMes ? mediaMensalDoAno(colaboradorId, year) : null;

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
      els.relatorioResumoBox.innerHTML = `${nome} não registrou nada em ${periodo.label}.${trechoComparativo}`;
    } else if (diasSemApontamento === 0) {
      els.relatorioResumoBox.classList.add('is-ok');
      els.relatorioResumoBox.innerHTML =
        `${nome} registrou <strong>todos os ${diasUteis.length} dias úteis</strong> do ${periodo.modo === 'mes' ? 'mês' : 'período'}${sufixoAteHoje} — parabéns pela consistência! ` +
        `Total de <strong>${Math.round(totalHoras)}h</strong> registradas, média de <strong>${Math.round(mediaPorDiaUtil * 10) / 10}h</strong> por dia útil ` +
        `(${pctCarga}% da carga prevista${sufixoAteHoje} de ${Math.round(cargaPrevista)}h).${trechoAtividade}${trechoComparativo}`;
    } else {
      els.relatorioResumoBox.innerHTML =
        `${nome} registrou <strong>${Math.round(totalHoras)}h</strong> em <strong>${diasTrabalhados.length} dos ${diasUteis.length}</strong> dias úteis do ${periodo.modo === 'mes' ? 'mês' : 'período'}${sufixoAteHoje}, ` +
        `faltando <strong>${diasSemApontamento} registro${diasSemApontamento > 1 ? 's' : ''}</strong>. Média de <strong>${Math.round(mediaPorDiaUtil * 10) / 10}h</strong> ` +
        `por dia útil — ${pctCarga}% da carga prevista${sufixoAteHoje} de ${Math.round(cargaPrevista)}h.${trechoAtividade}${trechoComparativo}`;
    }

    renderHorasDiariasStatus(dados, 'chartRelatorioStatus');
    renderHorasDiariasAtividade(dados, 'chartRelatorioAtividade', 'legendRelatorioAtividade');

    const apontamentosAnoColaborador = state.apontamentos.filter(
      (a) =>
        a.colaboradorId === colaboradorId &&
        a.duracaoMinutos != null &&
        a.duracaoMinutos > 0 &&
        a.data &&
        indiceMesDaData(a.data) >= 0
    );
    renderAtividadeLineChart(
      'chartRelatorioAtividadeMensal',
      'legendRelatorioAtividadeMensal',
      'relatorioAtividadeMensalEmptyState',
      computeAtividadeMensal(apontamentosAnoColaborador)
    );

    renderRelatorioPizza(totaisPorAtividade, totalMinutos, diasUteis.length);
    renderRelatorioHeatmap(colaboradorId, periodo);
    renderRelatorioComportamento(colaboradorId, periodo);
  }

  /** Mapa de calor Projeto × Atividade do colaborador no mês — mesmo padrão
   * visual do mapa de calor Colaboradores × Projetos da aba Apontamentos.
   * Projetos ordenados do que mais consumiu tempo pro que menos. */
  function renderRelatorioHeatmap(colaboradorId, periodo) {
    const activities = window.APP_DATA.ACTIVITIES;
    const doColaborador = state.apontamentos.filter(
      (a) =>
        a.colaboradorId === colaboradorId &&
        a.duracaoMinutos != null &&
        a.duracaoMinutos > 0 &&
        a.data &&
        dataNoPeriodo(a.data, periodo)
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
  function renderRelatorioComportamento(colaboradorId, periodo) {
    const doColaborador = state.apontamentos.filter(
      (a) =>
        a.colaboradorId === colaboradorId &&
        a.duracaoMinutos != null &&
        a.duracaoMinutos > 0 &&
        a.data &&
        dataNoPeriodo(a.data, periodo) &&
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
      resumo = `Costuma registrar no mesmo dia em que trabalha — hábito consistente e em dia, sem indício de registro em lote.`;
    } else if (fracaoFimDeMes >= 0.4) {
      resumo = `Concentra ${Math.round(fracaoFimDeMes * 100)}% dos registros nos últimos dias do mês trabalhado — indício de registro em lote no fim do mês, não dia a dia.`;
    } else if (concentradoNumDia && ehFimDeSemanaDia) {
      resumo = `Concentra ${Math.round(fracaoMaiorDia * 100)}% das horas registradas às ${nomeDiaMaior}s, com atraso médio de ${Math.round(atrasoMedio * 10) / 10} dia(s) — indício de registro em lote no fim de semana, em vez de diário.`;
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

  async function shareRelatorioColaboradorHtml() {
    els.relatorioShareHtmlButton.disabled = true;
    try {
      const agora = new Date();
      els.printReportHeaderMeta.textContent =
        `${els.relatorioSubtitle.textContent} · gerado em ${agora.toLocaleDateString('pt-BR')} às ` +
        `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      const html = await buildShareHtmlDocument(['tab-relatorio']);
      downloadHtmlFile(html, 'relatorio-colaborador');
      toast('Arquivo HTML gerado. Confira sua pasta de downloads.', 'success');
    } catch (err) {
      toast(`Não foi possível gerar o HTML: ${err.message}`, 'error');
    } finally {
      els.relatorioShareHtmlButton.disabled = false;
    }
  }

  /* ============================ Análise de Projeto ============================ */
  /*
   * Aba que olha UM projeto por inteiro (do 1º ao último registro de horas),
   * sem o filtro global de período. Entram todos os colaboradores que
   * registraram horas no projeto — inclusive isentos de registro e inativos.
   *
   * "Horas equivalentes": cada hora real é multiplicada por um fator conforme
   * o dia (domingo/feriado) e o horário (noturno), pra comparar com a
   * estimativa do projeto considerando o custo das horas especiais. Os
   * fatores são editáveis e ficam salvos neste navegador, por equipe.
   */

  const AP_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const AP_DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const AP_FATORES_PADRAO = {
    domingo: 2,
    feriado: 2,
    noturnoInicio: 22,
    noturnoFim: 5,
    adicionalNoturno: 20,
    horaReduzida: true,
  };
  const AP_SEM_CARGO = 'Sem cargo definido';
  const AP_COLABS_KEY = '__colabs';

  const apState = {
    clienteId: '',
    projetoId: '',
    granularidade: 'semana',
    modoHoras: 'real',
    heatColab: 'real',
    heatCargo: 'real',
    hidden: new Set(),
    fatores: null,
    compensados: new Set(),
    analise: null,
    pronto: false,
  };
  const apTipoCache = new Map();

  /* ---- util ---- */

  function formatNumeroBR(v, casas) {
    const d = casas == null ? 0 : casas;
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  /** minutos → "12,5h" (sem zeros à direita). */
  function apH(min) {
    return `${(Math.round(min / 6) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
  }
  function apPct(fracao) {
    return `${(Math.round(fracao * 1000) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  function apDataBR(ds) {
    return `${ds.slice(8, 10)}/${ds.slice(5, 7)}/${ds.slice(0, 4)}`;
  }
  function apDM(ds) {
    return `${ds.slice(8, 10)}/${ds.slice(5, 7)}`;
  }
  function apAddDias(date, n) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }
  function apStorageGet(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }
  function apStorageSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      /* armazenamento indisponível: segue sem salvar */
    }
  }
  function apTeamId() {
    return (currentTeam && currentTeam.id) || 'default';
  }
  function apCompKey() {
    return `agricef_ap_compensados_${apTeamId()}_${apState.projetoId}`;
  }

  /* ---- fatores de ponderação ---- */

  function apSanearFatores(f) {
    const num = (v, def, min, max) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    };
    return {
      domingo: num(f.domingo, 2, 1, 10),
      feriado: num(f.feriado, 2, 1, 10),
      noturnoInicio: Math.round(num(f.noturnoInicio, 22, 0, 23)),
      noturnoFim: Math.round(num(f.noturnoFim, 5, 0, 23)),
      adicionalNoturno: num(f.adicionalNoturno, 20, 0, 200),
      horaReduzida: f.horaReduzida !== false,
    };
  }
  function apCarregarFatores() {
    const salvo = apStorageGet(`agricef_ap_fatores_${apTeamId()}`);
    apState.fatores = apSanearFatores(Object.assign({}, AP_FATORES_PADRAO, salvo || {}));
  }
  /** Acréscimo da hora noturna sobre a hora normal: (reduzida × adicional) − 1.
   * Urbano: 60/52,5 × 1,20 − 1 ≈ 0,3714. */
  function apAcrescimoNoturno(f) {
    return (f.horaReduzida ? 60 / 52.5 : 1) * (1 + f.adicionalNoturno / 100) - 1;
  }
  function apNoiteIntervalos(f) {
    const i = f.noturnoInicio * 60;
    const e = f.noturnoFim * 60;
    if (i === e) return [];
    return i > e ? [[i, 1440], [0, e]] : [[i, e]];
  }
  function apNoiteHoras(f) {
    const out = [];
    if (f.noturnoInicio === f.noturnoFim) return out;
    let h = f.noturnoInicio;
    do {
      out.push(h);
      h = (h + 1) % 24;
    } while (h !== f.noturnoFim);
    return out;
  }
  function apOverlap(a0, a1, intervalos) {
    let t = 0;
    intervalos.forEach(([s, e]) => {
      t += Math.max(0, Math.min(a1, e) - Math.max(a0, s));
    });
    return t;
  }
  function apHH(h) {
    return `${String(h).padStart(2, '0')}h`;
  }

  /* ---- calendário ---- */

  /** domingo → 'dom'; feriado (seg–sáb) → 'fer'; sábado → 'sab'; resto → 'util'. */
  function apTipoDia(ds) {
    let t = apTipoCache.get(ds);
    if (t) return t;
    const d = Holidays.parseDateStr(ds);
    const dow = d.getDay();
    t = dow === 0 ? 'dom' : Holidays.isHoliday(d) ? 'fer' : dow === 6 ? 'sab' : 'util';
    apTipoCache.set(ds, t);
    return t;
  }
  function apParseHora(h) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(h || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  /** Quebra um registro em trechos por dia de calendário (um registro que
   * atravessa a meia-noite vira dois trechos, cada um classificado pela data
   * em que de fato ocorreu). Sem horário de início, vira um trecho único
   * (conta como diurno). */
  function apSegmentos(a) {
    const dur = a.duracaoMinutos;
    const ini = apParseHora(a.horaInicio);
    if (ini == null) return [{ data: a.data, ini: null, len: dur }];
    const segs = [];
    let resto = dur;
    let data = a.data;
    let cur = ini;
    for (let k = 0; k < 4 && resto > 0; k++) {
      const len = Math.min(resto, 1440 - cur);
      segs.push({ data, ini: cur, len });
      resto -= len;
      data = Holidays.dateStr(apAddDias(Holidays.parseDateStr(data), 1));
      cur = 0;
    }
    return segs;
  }

  /* ---- análise ---- */

  function apAcum(map, key, real, eq) {
    const cur = map.get(key) || { real: 0, eq: 0 };
    cur.real += real;
    cur.eq += eq;
    map.set(key, cur);
  }

  function apAnalisar(projetoId) {
    const f = apState.fatores;
    const comp = apState.compensados;
    const noite = apNoiteIntervalos(f);
    const acrNoite = apAcrescimoNoturno(f);
    const horasNoite = apNoiteHoras(f);

    const regs = state.apontamentos.filter(
      (a) => a.projetoId === projetoId && a.duracaoMinutos != null && a.duracaoMinutos > 0 && a.data
    );
    if (!regs.length) return null;

    const colabPorId = Object.fromEntries(state.colaboradores.map((c) => [c.id, c]));
    const atividades = (window.APP_DATA.ACTIVITIES || []).map((x) => ({ id: x.id, name: x.name }));
    const idxAtiv = new Map(atividades.map((x, i) => [x.id, i]));

    const catMap = new Map(); // `${base}|${noite}|${comp}` → {real, eq}
    const horaNoiteMin = new Map(horasNoite.map((h) => [h, 0]));
    const dias = new Map(); // data do registro → {real, eq, ativ: Map(ia → {real, eq}), colabs: Set}
    const espDias = { dom: new Map(), fer: new Map() }; // data do trecho → minutos
    const noiteDias = new Set();
    const noiteColabs = new Set();
    const noiteTipo = { util: 0, dom: 0, fer: 0 };
    const porAtiv = new Map(); // ia → {real, eq}
    const porColab = new Map(); // colabId → Map(ia → {real, eq})
    const porCargo = new Map(); // cargo → Map(ia → {real, eq})
    const diaPessoa = new Set();
    let realMin = 0;
    let eqMin = 0;
    let noiteMin = 0;
    let inicio = regs[0].data;
    let fim = regs[0].data;

    regs.forEach((a) => {
      if (a.data < inicio) inicio = a.data;
      if (a.data > fim) fim = a.data;

      let ia = idxAtiv.get(a.atividadeId);
      if (ia === undefined) {
        ia = atividades.length;
        atividades.push({ id: a.atividadeId || `?${ia}`, name: a.atividadeNome || 'Outras atividades' });
        idxAtiv.set(a.atividadeId, ia);
      }
      const colab = colabPorId[a.colaboradorId];
      const cargo = (colab && colab.cargo) || AP_SEM_CARGO;

      let recReal = 0;
      let recEq = 0;
      apSegmentos(a).forEach((s) => {
        const tipo = apTipoDia(s.data);
        const base = tipo === 'sab' ? 'util' : tipo;
        const compensado = (base === 'dom' || base === 'fer') && comp.has(s.data);
        const dayF = base === 'dom' ? (compensado ? 1 : f.domingo) : base === 'fer' ? (compensado ? 1 : f.feriado) : 1;
        const nMin = s.ini == null ? 0 : apOverlap(s.ini, s.ini + s.len, noite);
        const dMin = s.len - nMin;
        const eq = s.len * dayF + nMin * acrNoite;
        recReal += s.len;
        recEq += eq;

        const flag = compensado ? 1 : 0;
        if (dMin > 0) apAcum(catMap, `${base}|0|${flag}`, dMin, dMin * dayF);
        if (nMin > 0) {
          apAcum(catMap, `${base}|1|${flag}`, nMin, nMin * (dayF + acrNoite));
          noiteMin += nMin;
          noiteTipo[base] += nMin;
          noiteDias.add(a.data);
          noiteColabs.add(a.colaboradorId);
          horasNoite.forEach((h) => {
            horaNoiteMin.set(h, horaNoiteMin.get(h) + apOverlap(s.ini, s.ini + s.len, [[h * 60, h * 60 + 60]]));
          });
        }
        if (base === 'dom' || base === 'fer') {
          espDias[base].set(s.data, (espDias[base].get(s.data) || 0) + s.len);
        }
      });

      realMin += recReal;
      eqMin += recEq;
      apAcum(porAtiv, ia, recReal, recEq);
      [[porColab, a.colaboradorId], [porCargo, cargo]].forEach(([mapa, chave]) => {
        let m = mapa.get(chave);
        if (!m) {
          m = new Map();
          mapa.set(chave, m);
        }
        apAcum(m, ia, recReal, recEq);
      });

      let dia = dias.get(a.data);
      if (!dia) {
        dia = { real: 0, eq: 0, ativ: new Map(), colabs: new Set() };
        dias.set(a.data, dia);
      }
      dia.real += recReal;
      dia.eq += recEq;
      dia.colabs.add(a.colaboradorId);
      apAcum(dia.ativ, ia, recReal, recEq);
      diaPessoa.add(`${a.colaboradorId}|${a.data}`);
    });

    /* calendário do início ao fim */
    const cal = { corridos: 0, util: 0, sab: 0, dom: 0, fer: 0 };
    const trab = { util: 0, sab: 0, dom: 0, fer: 0 };
    const listaDias = [];
    let pausaAtual = 0;
    let pausaIni = '';
    let pausa = { dias: 0, ini: '', fim: '' };
    for (let d = Holidays.parseDateStr(inicio), fimD = Holidays.parseDateStr(fim); d <= fimD; d = apAddDias(d, 1)) {
      const ds = Holidays.dateStr(d);
      const tipo = apTipoDia(ds);
      const trabalhado = dias.has(ds);
      cal.corridos += 1;
      cal[tipo] += 1;
      if (trabalhado) {
        trab[tipo] += 1;
        pausaAtual = 0;
      } else {
        if (pausaAtual === 0) pausaIni = ds;
        pausaAtual += 1;
        if (pausaAtual > pausa.dias) pausa = { dias: pausaAtual, ini: pausaIni, fim: ds };
      }
      listaDias.push({ ds, tipo, dow: d.getDay(), trabalhado, real: trabalhado ? dias.get(ds).real : 0 });
    }
    const diasTrabalhados = trab.util + trab.sab + trab.dom + trab.fer;

    /* colaboradores */
    const colabIds = Array.from(porColab.keys());
    const isentos = colabIds.filter((id) => colabPorId[id] && colabPorId[id].obrigatorioApontamento === false).length;
    const inativos = colabIds.filter((id) => colabPorId[id] && !colabPorId[id].ativo).length;
    const removidos = colabIds.filter((id) => !colabPorId[id]).length;

    /* categorias da ponderação, em ordem fixa */
    const ordemBase = ['util', 'dom', 'fer'];
    const catRows = [];
    ordemBase.forEach((base) => {
      [0, 1].forEach((n) => {
        [0, 1].forEach((c) => {
          const v = catMap.get(`${base}|${n}|${c}`);
          if (!v || v.real <= 0) return;
          const nome =
            base === 'util'
              ? n
                ? 'Noturno em dia comum'
                : 'Normal (diurno, dia comum)'
              : `${base === 'dom' ? 'Domingo' : 'Feriado'} ${n ? 'noturno' : 'diurno'}${c ? ' — compensado' : ''}`;
          catRows.push({ nome, real: v.real, eq: v.eq, fator: v.eq / v.real });
        });
      });
    });

    const projeto = state.projetos.find((p) => p.id === projetoId) || {};
    return {
      projeto,
      cliente: clienteNomeDoProjeto(projeto),
      inicio,
      fim,
      realMin,
      eqMin,
      noiteMin,
      atividades,
      porAtiv,
      porColab,
      porCargo,
      colabPorId,
      cal,
      trab,
      diasTrabalhados,
      diaPessoa: diaPessoa.size,
      pausa,
      listaDias,
      dias,
      colabIds,
      isentos,
      inativos,
      removidos,
      espDias,
      noiteDias: noiteDias.size,
      noiteColabs: noiteColabs.size,
      noiteTipo,
      horaNoiteMin,
      horasNoite,
      catRows,
      acrNoite,
      estimativa: Number(projeto.horasEstimadas) || 0,
    };
  }

  /* ---- séries (linha e curva S) ---- */

  function apChaveBucket(ds, gran) {
    if (gran === 'dia') return ds;
    if (gran === 'mes') return ds.slice(0, 7);
    const d = Holidays.parseDateStr(ds);
    return Holidays.dateStr(apAddDias(d, -((d.getDay() + 6) % 7))); // segunda-feira
  }

  function apSerie(A, gran, modo) {
    const nAtiv = A.atividades.length;
    const mapa = new Map();
    const lista = [];
    A.listaDias.forEach((d) => {
      const k = apChaveBucket(d.ds, gran);
      let b = mapa.get(k);
      if (!b) {
        b = { key: k, ini: d.ds, fim: d.ds, vals: new Array(nAtiv).fill(0), colabs: new Set(), total: 0 };
        mapa.set(k, b);
        lista.push(b);
      }
      b.fim = d.ds;
    });
    A.dias.forEach((dia, ds) => {
      const b = mapa.get(apChaveBucket(ds, gran));
      dia.ativ.forEach((v, ia) => {
        const min = modo === 'eq' ? v.eq : v.real;
        b.vals[ia] += min / 60;
        b.total += min / 60;
      });
      dia.colabs.forEach((c) => b.colabs.add(c));
    });
    lista.forEach((b) => {
      const ini = Holidays.parseDateStr(b.ini);
      if (gran === 'dia') {
        b.label = apDM(b.ini);
        b.titulo = `${apDataBR(b.ini)} (${AP_DIAS_SEMANA[ini.getDay()]})`;
      } else if (gran === 'semana') {
        b.label = apDM(b.ini);
        b.titulo = b.ini === b.fim ? apDataBR(b.ini) : `Semana de ${apDM(b.ini)} a ${apDM(b.fim)}`;
      } else {
        b.label = `${AP_MESES[ini.getMonth()]}/${String(ini.getFullYear()).slice(2)}`;
        b.titulo = `${AP_MESES[ini.getMonth()]}/${ini.getFullYear()}`;
      }
    });
    return lista;
  }

  /* ---- HTML: blocos ---- */

  function apKpi(label, valor, sub, extraClass) {
    return `<div class="kpi"><span class="kpi__label">${label}</span><span class="kpi__value${extraClass ? ' ' + extraClass : ''}">${valor}</span>${
      sub ? `<span class="kpi__sub">${sub}</span>` : ''
    }</div>`;
  }

  function apSecResumo(A) {
    const partes = [];
    if (A.isentos) partes.push(`${A.isentos} ${A.isentos === 1 ? 'isento' : 'isentos'} de registro`);
    if (A.inativos) partes.push(`${A.inativos} ${A.inativos === 1 ? 'inativo' : 'inativos'}`);
    if (A.removidos) partes.push(`${A.removidos} removido${A.removidos === 1 ? '' : 's'} do cadastro`);
    const subColab = partes.length ? `sendo ${partes.join(' e ')}` : 'todos com registro obrigatório e ativos';
    const diasUteis = A.cal.util;
    const mediaUtil = diasUteis > 0 ? `média de ${apH((A.realMin / diasUteis))} por dia útil` : 'sem dias úteis no período';
    return `
      <h3 class="section-subheading">Resumo do projeto</h3>
      <div class="ap-grid4">
        ${apKpi('Início', apDataBR(A.inicio), 'primeiro registro de horas')}
        ${apKpi('Fim', apDataBR(A.fim), 'último registro de horas')}
        ${apKpi('Total de horas', apH(A.realMin), `${mediaUtil} · <b class="ap-eq-txt">${apH(A.eqMin)} equivalentes</b>`, 'accent')}
        ${apKpi('Colaboradores', String(A.colabIds.length), subColab)}
      </div>

      <h3 class="section-subheading">Calendário do projeto</h3>
      <div class="ap-grid5">
        ${apKpi('Dias corridos', String(A.cal.corridos), 'prazo do projeto')}
        ${apKpi('Dias úteis', String(A.cal.util), 'seg–sex, sem feriados')}
        ${apKpi('Sábados', String(A.cal.sab), 'sem feriados')}
        ${apKpi('Domingos', String(A.cal.dom))}
        ${apKpi('Feriados', String(A.cal.fer), 'seg–sáb (feriado em domingo conta como domingo)')}
      </div>
      <p class="chart-footnote">Dias úteis + sábados + domingos + feriados = dias corridos (${A.cal.util} + ${A.cal.sab} + ${A.cal.dom} + ${A.cal.fer} = ${A.cal.corridos}).</p>`;
  }

  function apSecDiasTrabalhados(A) {
    const t = A.trab;
    const especiais = t.sab + t.dom + t.fer;
    const parados = A.cal.util - t.util;
    const hDiaPessoa = A.diaPessoa > 0 ? A.realMin / 60 / A.diaPessoa : 0;
    const pessoasDia = A.diasTrabalhados > 0 ? A.diaPessoa / A.diasTrabalhados : 0;

    const maxH = Math.max(1, ...A.listaDias.map((d) => d.real)) / 60;
    const nivel = (h) => (h <= maxH * 0.25 ? 1 : h <= maxH * 0.5 ? 2 : h <= maxH * 0.75 ? 3 : 4);

    // semanas de domingo a sábado
    const primeiro = Holidays.parseDateStr(A.listaDias[0].ds);
    const ultimo = Holidays.parseDateStr(A.listaDias[A.listaDias.length - 1].ds);
    const gridIni = apAddDias(primeiro, -primeiro.getDay());
    const nSem = Math.ceil((apAddDias(ultimo, 6 - ultimo.getDay()) - gridIni) / 86400000 / 7 + 0.5);
    const porData = new Map(A.listaDias.map((d) => [d.ds, d]));

    let cab = '<div></div>';
    let ultimoMes = -1;
    for (let c = 0; c < nSem; c++) {
      const d = apAddDias(gridIni, c * 7 + 3);
      cab += `<div class="ap-cal__mes">${d.getMonth() !== ultimoMes ? AP_MESES[d.getMonth()] : ''}</div>`;
      ultimoMes = d.getMonth();
    }
    let corpo = '';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((rot, r) => {
      corpo += `<div class="ap-cal__rot">${rot}</div>`;
      for (let c = 0; c < nSem; c++) {
        const d = apAddDias(gridIni, c * 7 + r);
        const x = porData.get(Holidays.dateStr(d));
        if (!x) {
          corpo += '<div class="ap-cal__c"></div>';
          continue;
        }
        const titulo = `${apDataBR(x.ds)} (${AP_DIAS_SEMANA[x.dow]}${x.tipo === 'fer' ? ', feriado' : ''}): ${x.trabalhado ? apH(x.real) : 'sem registro'}`;
        let cls = 'ap-cal__c';
        if (x.trabalhado) cls += ` n${nivel(x.real / 60)}`;
        else cls += x.tipo === 'util' ? ' parado' : ' folga';
        if (x.tipo === 'fer') cls += ' fer';
        corpo += `<div class="${cls}" title="${titulo}"></div>`;
      }
    });

    return `
      <h3 class="section-subheading">Dias trabalhados <span class="ap-sub">(dias com registro de horas no projeto)</span></h3>
      <p class="muted">Nem todo dia do calendário teve trabalho. Aqui o projeto é medido pelos dias em que de fato houve horas registradas.</p>
      <div class="ap-grid5">
        ${apKpi('Dias trabalhados', String(A.diasTrabalhados), `${apPct(A.diasTrabalhados / A.cal.corridos)} dos dias corridos`)}
        ${apKpi('Úteis com registro', `${t.util} de ${A.cal.util}`, `${apPct(A.cal.util ? t.util / A.cal.util : 0)} dos dias úteis`)}
        ${apKpi('Sáb., dom. e feriados', String(especiais), `${t.sab} sáb. · ${t.dom} dom. · ${t.fer} feriados`)}
        ${apKpi('Dias úteis parados', String(parados), A.pausa.dias > 0 ? `maior pausa: ${A.pausa.dias} ${A.pausa.dias === 1 ? 'dia' : 'dias'} (${apDM(A.pausa.ini)} a ${apDM(A.pausa.fim)})` : 'sem pausas')}
        ${apKpi('Dias-pessoa', formatNumeroBR(A.diaPessoa), `${formatNumeroBR(hDiaPessoa, 1)}h por dia-pessoa · ${formatNumeroBR(pessoasDia, 1)} pessoas/dia`)}
      </div>
      <p class="ap-cal__titulo">Calendário de atividade — cada quadrado é um dia; a cor indica as horas registradas no projeto</p>
      <div class="ap-cal-wrap"><div class="ap-cal" style="grid-template-columns:18px repeat(${nSem}, minmax(11px, 26px))">${cab}${corpo}</div></div>
      <div class="ap-cal__legenda">
        <span><i class="parado"></i>Dia útil sem registro</span>
        <span><i class="folga"></i>Fim de semana/feriado sem registro</span>
        <span>Com registro:</span>
        <span><i class="n1"></i>até ${apH(maxH * 15)}</span><span><i class="n2"></i>até ${apH(maxH * 30)}</span><span><i class="n3"></i>até ${apH(maxH * 45)}</span><span><i class="n4"></i>até ${apH(maxH * 60)}</span>
        <span><i class="fer"></i>Feriado</span>
      </div>
      <div class="ap-ref">
        <div><b>Dias corridos → prazo</b>Duração do cronograma: quando começou, quando terminou, quanto durou.</div>
        <div><b>Dias úteis → capacidade</b>Quanto calendário "normal" existia. Base da ocupação (úteis com registro ÷ úteis).</div>
        <div class="rec"><b>Dias trabalhados → ritmo</b>Mede o cronograma real: dias com trabalho, pausas e uso de fim de semana/feriado.</div>
        <div class="rec"><b>Dias-pessoa → esforço</b>Soma de (colaborador × dia com registro). Base recomendada para dimensionar projetos futuros: horas por dia-pessoa.</div>
      </div>`;
  }

  function apCorAtiv(i) {
    return `var(--activity-${(i % 9) + 1})`;
  }

  /** Rosca + tabela. `fatias`: [{nome, cor, real, eq}] */
  function apRosca(titulo, fatias, totalReal, totalEq, rotuloNome) {
    const cx = 100;
    const cy = 100;
    const rOuter = 90;
    const rInner = 50;
    const partes = [];
    if (fatias.length === 1) {
      const f = fatias[0];
      partes.push(`<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${f.cor}"><title>${escapeHtml(f.nome)}: ${apH(f.real)} (100%)</title></circle>`);
      partes.push(`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="var(--color-surface)"/>`);
    } else {
      let angulo = -90;
      fatias.forEach((f) => {
        const fracao = f.real / totalReal;
        const ini = angulo;
        angulo += fracao * 360;
        partes.push(
          `<path d="${donutSlicePath(cx, cy, rOuter, rInner, ini, angulo)}" fill="${f.cor}" stroke="var(--color-surface)" stroke-width="2">` +
            `<title>${escapeHtml(f.nome)}: ${apH(f.real)} (${apPct(fracao)})</title></path>`
        );
      });
    }
    partes.push(`<text x="${cx}" y="${cy - 2}" text-anchor="middle" class="ap-donut__total">${apH(totalReal)}</text>`);
    partes.push(`<text x="${cx}" y="${cy + 15}" text-anchor="middle" class="ap-donut__sub">total</text>`);
    const linhas = fatias
      .map(
        (f) => `<tr>
          <td class="atividade-table__nome"><i style="background:${f.cor}"></i>${escapeHtml(f.nome)}</td>
          <td>${apH(f.real)}</td>
          <td>${apPct(f.real / totalReal)}</td>
          <td class="ap-eq-txt">${apH(f.eq)}</td>
        </tr>`
      )
      .join('');
    return `
      <div class="atividade-split">
        <div class="atividade-split__svg"><svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="${escapeHtml(titulo)}">${partes.join('')}</svg></div>
        <table class="atividade-table">
          <thead><tr><th>${rotuloNome}</th><th>Horas reais</th><th>%</th><th class="ap-eq-txt">Equivalentes</th></tr></thead>
          <tbody>${linhas}<tr class="ap-total"><td>Total</td><td>${apH(totalReal)}</td><td>100%</td><td class="ap-eq-txt">${apH(totalEq)}</td></tr></tbody>
        </table>
      </div>`;
  }

  function apSecDistribuicao(A) {
    const fatiasAtiv = A.atividades
      .map((a, i) => ({ nome: a.name, cor: apCorAtiv(i), real: (A.porAtiv.get(i) || { real: 0 }).real, eq: (A.porAtiv.get(i) || { eq: 0 }).eq }))
      .filter((f) => f.real > 0)
      .sort((a, b) => b.real - a.real);

    const cargos = new Map();
    A.porCargo.forEach((m, cargo) => {
      let real = 0;
      let eq = 0;
      m.forEach((v) => {
        real += v.real;
        eq += v.eq;
      });
      cargos.set(cargo, { real, eq });
    });
    const fatiasCargo = Array.from(cargos.entries())
      .map(([nome, v]) => ({ nome, real: v.real, eq: v.eq }))
      .sort((a, b) => b.real - a.real)
      .map((f, i) => ({ ...f, cor: apCorAtiv(i) }));

    return `
      <h3 class="section-subheading">Distribuição por atividade</h3>
      <p class="muted">Horas absolutas e percentual de cada atividade sobre o total do projeto. A coluna "Equivalentes" aplica a ponderação por domingo, feriado e noturno.</p>
      ${apRosca('Distribuição de horas por atividade', fatiasAtiv, A.realMin, A.eqMin, 'Atividade')}

      <h3 class="section-subheading">Distribuição por cargo</h3>
      <p class="muted">Horas consumidas no projeto por cargo (soma dos colaboradores de cada cargo, inclusive isentos e inativos).</p>
      ${apRosca('Distribuição de horas por cargo', fatiasCargo, A.realMin, A.eqMin, 'Cargo')}`;
  }

  function apToggle(attr, opcoes, ativo) {
    return `<span class="periodo-seg ap-seg" role="group">${opcoes
      .map((o) => `<button type="button" class="periodo-seg__btn${o[0] === ativo ? ' is-active' : ''}" ${attr}="${o[0]}">${o[1]}</button>`)
      .join('')}</span>`;
  }

  function apSecLinhas(A) {
    const gran = apState.granularidade;
    const modo = apState.modoHoras;
    const serie = apSerie(A, gran, modo);
    A.serieAtual = serie;
    const legenda = A.atividades
      .map((a, i) =>
        A.porAtiv.has(i)
          ? `<span class="legend-toggle${apState.hidden.has(a.id) ? ' is-off' : ''}" data-ap-leg="${escapeHtml(a.id)}"><i style="background:${apCorAtiv(i)}"></i>${escapeHtml(a.name)}</span>`
          : ''
      )
      .join('');
    const legendaColab = `<span class="legend-toggle${apState.hidden.has(AP_COLABS_KEY) ? ' is-off' : ''}" data-ap-leg="${AP_COLABS_KEY}"><i class="ap-colab-key"></i>Colaboradores atuando (eixo direito)</span>`;
    const unidade = gran === 'dia' ? 'dia' : gran === 'semana' ? 'semana' : 'mês';
    return `
      <h3 class="section-subheading">Consumo de horas ao longo do projeto</h3>
      <p class="muted">Uma curva por atividade (eixo esquerdo, horas ${modo === 'eq' ? 'equivalentes' : 'reais'}) e, no mesmo gráfico, a curva de colaboradores atuando no projeto (eixo direito).</p>
      <div class="ap-toolbar">
        <span class="ap-toolbar__grupo">
          ${apToggle('data-ap-gran', [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']], gran)}
          ${apToggle('data-ap-modo', [['real', 'Horas reais'], ['eq', 'Horas equivalentes']], modo)}
        </span>
        <span class="muted ap-dica">Clique na legenda para mostrar/esconder curvas · passe o mouse sobre o gráfico para ver os valores de cada ${unidade}</span>
      </div>
      <div class="chart-wrap ap-linhas-wrap">
        <svg id="apChartLinhas" viewBox="0 0 960 330" width="100%" style="max-width:960px" role="img" aria-label="Consumo de horas ao longo do projeto">${apSvgLinhas(A, serie)}</svg>
      </div>
      <div class="legend-row ap-legenda">${legenda}${legendaColab}</div>`;
  }

  function apSvgLinhas(A, serie) {
    const W = 960;
    const H = 330;
    const padL = 48;
    const padR = 48;
    const padT = 18;
    const padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = serie.length;
    const xFor = (i) => (n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
    const modo = apState.modoHoras;

    const visiveis = A.atividades.map((a, i) => ({ a, i })).filter(({ a, i }) => A.porAtiv.has(i) && !apState.hidden.has(a.id));
    const maxH = Math.max(0, ...serie.flatMap((b) => visiveis.map(({ i }) => b.vals[i])));
    const eixo = equipeAxisScale(maxH);
    const yFor = (v) => padT + plotH - (v / eixo.max) * plotH;
    const maxC = Math.max(0, ...serie.map((b) => b.colabs.size));
    const eixoC = equipeCountTicks(maxC);
    const yC = (v) => padT + plotH - (v / eixoC.max) * plotH;
    const mostraColab = !apState.hidden.has(AP_COLABS_KEY);

    const partes = [];
    eixo.ticks.forEach((v) => {
      const y = yFor(v);
      partes.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      partes.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v}h</text>`);
    });
    if (mostraColab) {
      eixoC.ticks.forEach((v) => {
        partes.push(`<text class="value-tick ap-colab-tick" x="${W - padR + 8}" y="${yC(v) + 3}">${v}</text>`);
      });
    }
    partes.push(`<text class="ap-eixo-rotulo" x="${padL}" y="11">Horas por ${apState.granularidade === 'dia' ? 'dia' : apState.granularidade === 'semana' ? 'semana' : 'mês'} (${modo === 'eq' ? 'equivalentes' : 'reais'}, por atividade)</text>`);
    if (mostraColab) partes.push(`<text class="ap-eixo-rotulo ap-colab-tick" x="${W - padR}" y="11" text-anchor="end">Colaboradores atuando</text>`);

    visiveis.forEach(({ i }) => {
      const pts = serie.map((b, k) => `${xFor(k)},${yFor(b.vals[i])}`).join(' ');
      partes.push(`<polyline points="${pts}" fill="none" stroke="${apCorAtiv(i)}" stroke-width="2" stroke-linejoin="round" />`);
      if (n <= 40) serie.forEach((b, k) => partes.push(`<circle cx="${xFor(k)}" cy="${yFor(b.vals[i])}" r="3" fill="var(--color-surface)" stroke="${apCorAtiv(i)}" stroke-width="2" />`));
    });
    if (mostraColab) {
      const pts = serie.map((b, k) => `${xFor(k)},${yC(b.colabs.size)}`).join(' ');
      partes.push(`<polyline points="${pts}" fill="none" class="ap-colab-line" stroke-width="2.4" stroke-dasharray="6 4" stroke-linejoin="round" />`);
    }

    const nTicks = Math.min(n, 8);
    const usados = new Set();
    for (let t = 0; t < nTicks; t++) {
      const k = nTicks === 1 ? 0 : Math.round((t * (n - 1)) / (nTicks - 1));
      if (usados.has(k)) continue;
      usados.add(k);
      partes.push(`<text class="month-tick" x="${xFor(k)}" y="${H - 10}" text-anchor="middle">${serie[k].label}</text>`);
    }

    partes.push(`<line class="line-chart-crosshair" x1="0" y1="${padT}" x2="0" y2="${padT + plotH}" style="opacity:0" />`);
    const larg = n === 1 ? plotW : plotW / (n - 1);
    serie.forEach((b, k) => {
      const x0 = Math.max(padL, xFor(k) - larg / 2);
      const x1 = Math.min(W - padR, xFor(k) + larg / 2);
      const linhas = [b.titulo]
        .concat(visiveis.map(({ a, i }) => `${a.name}: ${apH(b.vals[i] * 60)}`))
        .concat(mostraColab ? [`Colaboradores atuando: ${b.colabs.size}`] : []);
      partes.push(
        `<rect class="line-chart-hit" tabindex="0" data-ap-i="${k}" data-tip="${escapeHtml(linhas.join('\n'))}" x="${x0}" y="${padT}" width="${Math.max(1, x1 - x0)}" height="${plotH}" />`
      );
    });
    A.geoLinhas = { W, padL, padR, padT, plotW, plotH, n, xFor, yFor, yC, visiveis, mostraColab };
    return partes.join('');
  }

  /** Hover: crosshair + tooltip único com todas as curvas visíveis. */
  function apBindLinhas(A) {
    const svg = document.getElementById('apChartLinhas');
    if (!svg || !A.geoLinhas) return;
    const wrap = svg.closest('.chart-wrap');
    const g = A.geoLinhas;
    let tooltip = wrap.querySelector('.line-chart-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'line-chart-tooltip';
      wrap.appendChild(tooltip);
    }
    const crosshair = svg.querySelector('.line-chart-crosshair');
    const serie = A.serieAtual;

    function mostrar(k) {
      const b = serie[k];
      const x = g.xFor(k);
      crosshair.setAttribute('x1', x);
      crosshair.setAttribute('x2', x);
      crosshair.style.opacity = '1';
      const linhas = g.visiveis
        .map(({ a, i }) => ({ nome: a.name, valor: b.vals[i], cor: apCorAtiv(i) }))
        .sort((p, q) => q.valor - p.valor);
      tooltip.innerHTML =
        `<div class="line-chart-tooltip__title">${escapeHtml(b.titulo)}</div>` +
        linhas
          .map(
            (l) =>
              `<div class="line-chart-tooltip__row"><span class="line-chart-tooltip__key" style="background:${l.cor}"></span>` +
              `<span class="line-chart-tooltip__name">${escapeHtml(l.nome)}</span>` +
              `<span class="line-chart-tooltip__value">${apH(l.valor * 60)}</span></div>`
          )
          .join('') +
        (g.mostraColab
          ? `<div class="line-chart-tooltip__row"><span class="line-chart-tooltip__key ap-colab-key"></span>` +
            `<span class="line-chart-tooltip__name">Colaboradores atuando</span>` +
            `<span class="line-chart-tooltip__value">${b.colabs.size}</span></div>`
          : '');
      const svgRect = svg.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const escala = svgRect.width / g.W;
      const xPx = svgRect.left - wrapRect.left + wrap.scrollLeft + x * escala;
      const larg = tooltip.offsetWidth || 190;
      let left = xPx + 14;
      if (left + larg > wrap.clientWidth + wrap.scrollLeft) left = xPx - larg - 14;
      tooltip.style.left = `${Math.max(4, left)}px`;
      tooltip.classList.add('is-visible');
    }
    function esconder() {
      crosshair.style.opacity = '0';
      tooltip.classList.remove('is-visible');
    }
    svg.onmousemove = (ev) => {
      const hit = ev.target.closest('.line-chart-hit');
      if (hit) mostrar(Number(hit.dataset.apI));
    };
    svg.onmouseleave = esconder;
    svg.onfocusin = (ev) => {
      const hit = ev.target.closest('.line-chart-hit');
      if (hit) mostrar(Number(hit.dataset.apI));
    };
    svg.onfocusout = esconder;
  }

  function apSecDomFer(A) {
    const diasDom = A.espDias.dom.size;
    const diasFer = A.espDias.fer.size;
    let minDom = 0;
    A.espDias.dom.forEach((v) => (minDom += v));
    let minFer = 0;
    A.espDias.fer.forEach((v) => (minFer += v));
    const tile = (titulo, min, dias, total, rotulo, cor) => `
      <div class="kpi"><span class="kpi__label">${titulo}</span>
        <span class="kpi__value">${apH(min)} <small>· ${apPct(min / A.realMin)}</small></span>
        <div class="ap-bar"><i style="width:${Math.min(100, (min / A.realMin) * 100)}%;background:${cor}"></i></div>
        <span class="kpi__sub">em ${dias} dos ${total} ${rotulo}</span></div>`;
    return `
      <h3 class="section-subheading">Horas em domingos e feriados</h3>
      <p class="muted">Quanto do consumo total do projeto ocorreu em domingos e feriados, com o percentual sobre o total de horas do projeto.</p>
      <div class="ap-grid2">
        ${tile('Domingos', minDom, Math.min(diasDom, A.cal.dom), A.cal.dom, 'domingos', 'var(--activity-4)')}
        ${tile('Feriados', minFer, Math.min(diasFer, A.cal.fer), A.cal.fer, 'feriados', 'var(--activity-2)')}
      </div>
      <p class="chart-footnote">Considera a data em que a hora foi trabalhada (um registro que atravessa a meia-noite é dividido entre os dois dias). Feriado que cai em domingo conta como domingo.</p>`;
  }

  function apSecNoturno(A) {
    const f = apState.fatores;
    const janela = `${apHH(f.noturnoInicio)} às ${apHH(f.noturnoFim)}`;
    const nt = A.noiteTipo;
    const totNoite = A.noiteMin;
    const maxHora = Math.max(1, ...Array.from(A.horaNoiteMin.values()));
    const W2 = 460;
    const H2 = 170;
    const pl = 34;
    const pb = 24;
    const pt = 14;
    const horas = A.horasNoite;
    const bw = horas.length ? (W2 - pl - 10) / horas.length : 0;
    const { max: mx, ticks } = equipeAxisScale(maxHora / 60);
    const barras = [];
    ticks.forEach((v) => {
      const y = pt + (H2 - pt - pb) * (1 - v / mx);
      barras.push(`<line class="gridline" x1="${pl}" x2="${W2 - 6}" y1="${y}" y2="${y}"/><text class="value-tick" x="${pl - 5}" y="${y + 3}" text-anchor="end">${v}h</text>`);
    });
    horas.forEach((h, i) => {
      const v = (A.horaNoiteMin.get(h) || 0) / 60;
      const bh = (H2 - pt - pb) * (v / mx);
      const x = pl + i * bw + 6;
      const y = H2 - pb - bh;
      barras.push(
        `<rect x="${x}" y="${y}" width="${Math.max(2, bw - 12)}" height="${bh}" rx="3" fill="var(--activity-7)"><title>${apHH(h)}: ${apH(v * 60)}</title></rect>` +
          (v > 0 ? `<text x="${x + (bw - 12) / 2}" y="${y - 4}" text-anchor="middle" class="ap-bar-val">${apH(v * 60)}</text>` : '') +
          `<text x="${x + (bw - 12) / 2}" y="${H2 - 8}" text-anchor="middle" class="month-tick">${apHH(h)}</text>`
      );
    });

    const pctTipo = (m) => (totNoite > 0 ? (m / totNoite) * 100 : 0);
    const linhaTipo = (nome, m) =>
      `<tr><td>${nome}</td><td>${apH(m)}</td><td>${apPct(totNoite > 0 ? m / totNoite : 0)}</td></tr>`;

    const semNoite = totNoite <= 0;
    return `
      <h3 class="section-subheading">Trabalho noturno <span class="ap-sub">(${janela})</span></h3>
      <p class="muted">Análise própria do período noturno, separada de domingos e feriados — o noturno também aparece dentro deles, e o quadro abaixo mostra exatamente onde.</p>
      <div class="ap-grid4">
        <div class="kpi"><span class="kpi__label">Horas noturnas</span>
          <span class="kpi__value">${apH(totNoite)} <small>· ${apPct(totNoite / A.realMin)}</small></span>
          <div class="ap-bar"><i style="width:${Math.min(100, (totNoite / A.realMin) * 100)}%;background:var(--activity-7)"></i></div>
          <span class="kpi__sub">do total de ${apH(A.realMin)} do projeto</span></div>
        ${apKpi('Dias com trabalho noturno', String(A.noiteDias), `de ${A.diasTrabalhados} dias trabalhados`)}
        ${apKpi('Colaboradores no noturno', String(A.noiteColabs), `de ${A.colabIds.length} no projeto`)}
        ${apKpi('Acréscimo noturno', `+${formatNumeroBR(A.acrNoite, 2)}`, `${f.adicionalNoturno}% de adicional${f.horaReduzida ? ' + hora reduzida (52′30″)' : ', sem hora reduzida'}`)}
      </div>
      ${
        semNoite
          ? '<p class="muted" style="margin-top:12px">Nenhuma hora registrada neste projeto dentro da janela noturna.</p>'
          : `<div class="ap-noite">
        <div><strong class="ap-mini-titulo">Horas noturnas por hora do dia</strong>
          <svg viewBox="0 0 ${W2} ${H2}" width="100%" role="img" aria-label="Horas noturnas por hora do dia">${barras.join('')}</svg></div>
        <div><strong class="ap-mini-titulo">Onde ocorreram as ${apH(totNoite)} noturnas</strong>
          <div class="ap-stack">
            <span style="width:${pctTipo(nt.util)}%;background:var(--activity-7)">${nt.util ? 'dia comum' : ''}</span>
            <span style="width:${pctTipo(nt.dom)}%;background:var(--activity-4)">${nt.dom ? 'dom.' : ''}</span>
            <span style="width:${pctTipo(nt.fer)}%;background:var(--activity-2)"></span>
          </div>
          <table class="ap-eq"><tbody>
            ${linhaTipo('Em dia comum (seg–sáb)', nt.util)}
            ${linhaTipo('Em domingo', nt.dom)}
            ${linhaTipo('Em feriado', nt.fer)}
            <tr class="tot"><td>Total noturno</td><td>${apH(totNoite)}</td><td>100%</td></tr>
          </tbody></table></div>
      </div>`
      }`;
  }

  function apInputNum(chave, valor, passo, min, max) {
    return `<input type="number" class="ap-param__input" data-ap-fator="${chave}" value="${valor}" step="${passo}" min="${min}" max="${max}" />`;
  }

  function apSecPonderacao(A) {
    const f = apState.fatores;
    const linhas = A.catRows
      .map((r) => {
        const acr = r.eq - r.real;
        return `<tr><td>${r.nome}</td><td>${apH(r.real)}</td><td class="fx">× ${formatNumeroBR(r.fator, 2)}</td><td>${apH(r.eq)}</td><td>${acr > 0.5 ? `+${apH(acr)}` : '–'}</td></tr>`;
      })
      .join('');
    const acrTotal = A.eqMin - A.realMin;

    // domingos e feriados trabalhados (para marcar os compensados com folga)
    const diasEsp = [];
    ['dom', 'fer'].forEach((tipo) => {
      A.espDias[tipo].forEach((min, ds) => diasEsp.push({ ds, tipo, min }));
    });
    diasEsp.sort((a, b) => (a.ds < b.ds ? -1 : 1));
    const nComp = diasEsp.filter((d) => apState.compensados.has(d.ds)).length;
    const listaComp = diasEsp.length
      ? `<details class="ap-comp"${nComp ? ' open' : ''}>
          <summary>Folga compensatória — domingos e feriados trabalhados (${diasEsp.length}${nComp ? `, ${nComp} marcado${nComp === 1 ? '' : 's'} como compensado${nComp === 1 ? '' : 's'}` : ''})</summary>
          <p class="muted">Dia compensado com folga volta ao fator 1,00 (o adicional noturno continua valendo). Marque só os dias em que houve folga compensatória de fato.</p>
          <table class="ap-eq"><thead><tr><th>Data</th><th>Dia</th><th>Horas</th><th>Compensado</th></tr></thead><tbody>
          ${diasEsp
            .map(
              (d) =>
                `<tr><td>${apDataBR(d.ds)}</td><td>${d.tipo === 'dom' ? 'Domingo' : `Feriado (${AP_DIAS_SEMANA[Holidays.parseDateStr(d.ds).getDay()].toLowerCase()})`}</td><td>${apH(d.min)}</td>` +
                `<td><input type="checkbox" data-ap-comp="${d.ds}"${apState.compensados.has(d.ds) ? ' checked' : ''} /></td></tr>`
            )
            .join('')}
          </tbody></table>
        </details>`
      : '';

    return `
      <h3 class="section-subheading">Horas equivalentes <span class="ap-sub">(ponderação por domingo, feriado e noturno)</span></h3>
      <p class="muted">Cada hora registrada é multiplicada por um fator conforme o dia e o horário. O resultado são as <strong>horas equivalentes</strong>, o número a comparar com a estimativa do projeto. As categorias se somam (domingo noturno = 1 + acréscimo de domingo + acréscimo noturno).</p>
      <div class="ap-params">
        <label class="ap-param"><span>Domingo (fator)</span><span>× ${apInputNum('domingo', f.domingo, 0.01, 1, 10)}</span></label>
        <label class="ap-param"><span>Feriado (fator)</span><span>× ${apInputNum('feriado', f.feriado, 0.01, 1, 10)}</span></label>
        <label class="ap-param"><span>Período noturno</span><span>das ${apInputNum('noturnoInicio', f.noturnoInicio, 1, 0, 23)} às ${apInputNum('noturnoFim', f.noturnoFim, 1, 0, 23)} h</span></label>
        <label class="ap-param"><span>Adicional noturno</span><span>${apInputNum('adicionalNoturno', f.adicionalNoturno, 1, 0, 200)} %</span></label>
        <label class="ap-param ap-param--check"><span>Hora noturna reduzida</span><span><input type="checkbox" data-ap-fator="horaReduzida"${f.horaReduzida ? ' checked' : ''} /> 52′30″</span></label>
        <div class="ap-param ap-param--res"><span>Acréscimo da hora noturna</span><span><b>+${formatNumeroBR(A.acrNoite, 4)}</b> (× ${formatNumeroBR(1 + A.acrNoite, 2)})</span></div>
        <button type="button" class="btn btn--ghost btn--small no-print ap-param__reset" data-ap-reset="1">Restaurar padrão</button>
      </div>
      <table class="ap-eq">
        <thead><tr><th>Categoria da hora</th><th>Horas reais</th><th>Fator</th><th>Horas equivalentes</th><th>Acréscimo</th></tr></thead>
        <tbody>${linhas}<tr class="tot"><td>Total do projeto</td><td>${apH(A.realMin)}</td><td></td><td>${apH(A.eqMin)}</td><td>+${apH(acrTotal)} (+${apPct(A.realMin ? acrTotal / A.realMin : 0)})</td></tr></tbody>
      </table>
      ${listaComp}
      <div class="ap-aviso"><strong>Atenção:</strong> os fatores são editáveis e ficam salvos neste navegador, por equipe. Os valores iniciais seguem a referência da CLT (art. 73 — noturno urbano 22h–05h, hora reduzida de 52′30″, adicional de 20% — e Súmula 146 do TST — domingo/feriado trabalhado e não compensado é pago em dobro), mas devem ser validados com o RH/contabilidade e a convenção coletiva da categoria. Se o vínculo for rural (Lei 5.889/73), ajuste: lavoura 21h–05h, pecuária 20h–04h, adicional de 25% e sem hora reduzida.</div>`;
  }

  function apSvgCurvaS(A) {
    const W = 960;
    const H = 230;
    const padL = 56;
    const padR = 100;
    const padT = 14;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = A.listaDias.length;
    let ar = 0;
    let ae = 0;
    const real = [];
    const eq = [];
    A.listaDias.forEach((d) => {
      const dia = A.dias.get(d.ds);
      if (dia) {
        ar += dia.real / 60;
        ae += dia.eq / 60;
      }
      real.push(ar);
      eq.push(ae);
    });
    const est = A.estimativa;
    const eixo = equipeAxisScale(Math.max(ar, ae, est));
    const xFor = (i) => (n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
    const yFor = (v) => padT + plotH - (v / eixo.max) * plotH;
    const partes = [];
    eixo.ticks.forEach((v) => {
      partes.push(`<line class="gridline" x1="${padL}" x2="${W - padR}" y1="${yFor(v)}" y2="${yFor(v)}"/><text class="value-tick" x="${padL - 8}" y="${yFor(v) + 3}" text-anchor="end">${formatNumeroBR(v)}h</text>`);
    });
    if (est > 0) {
      partes.push(`<line class="ap-est-line" x1="${padL}" x2="${W - padR}" y1="${yFor(est)}" y2="${yFor(est)}" stroke-width="2" stroke-dasharray="7 5"/>`);
      partes.push(`<text class="ap-est-txt" x="${padL + 6}" y="${yFor(est) - 6}">Estimado ${formatNumeroBR(est)}h</text>`);
    }
    partes.push(`<polyline points="${real.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ')}" fill="none" class="ap-real-line" stroke-width="2.4" stroke-linejoin="round"/>`);
    partes.push(`<polyline points="${eq.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ')}" fill="none" class="ap-eqv-line" stroke-width="2.4" stroke-linejoin="round"/>`);
    if (est > 0) {
      const cruzou = eq.findIndex((v) => v >= est);
      if (cruzou > 0) {
        partes.push(`<circle cx="${xFor(cruzou)}" cy="${yFor(eq[cruzou])}" r="5" class="ap-est-dot" stroke="var(--color-surface)" stroke-width="2"/>`);
        partes.push(`<text class="ap-est-txt" x="${xFor(cruzou) - 10}" y="${yFor(est) - 12}" text-anchor="end">equivalente ultrapassa a estimativa em ${apDM(A.listaDias[cruzou].ds)}</text>`);
      }
    }
    partes.push(`<text class="ap-real-txt" x="${W - padR + 8}" y="${yFor(ar) + (ae - ar > eixo.max * 0.06 ? 14 : 16)}">real ${formatNumeroBR(ar)}h</text>`);
    partes.push(`<text class="ap-eqv-txt" x="${W - padR + 8}" y="${yFor(ae) - 2}">equiv. ${formatNumeroBR(ae)}h</text>`);
    const nTicks = Math.min(n, 8);
    const usados = new Set();
    for (let t = 0; t < nTicks; t++) {
      const k = nTicks === 1 ? 0 : Math.round((t * (n - 1)) / (nTicks - 1));
      if (usados.has(k)) continue;
      usados.add(k);
      partes.push(`<text class="month-tick" x="${xFor(k)}" y="${H - 8}" text-anchor="middle">${apDM(A.listaDias[k].ds)}</text>`);
    }
    return partes.join('');
  }

  function apSecEstimado(A) {
    const est = A.estimativa;
    const real = A.realMin / 60;
    const eq = A.eqMin / 60;
    let kpis;
    let nota;
    if (est > 0) {
      const saldo = est - eq;
      const estourou = eq > est;
      kpis = `
        ${apKpi('Horas estimadas', `${formatNumeroBR(est)}h`, 'dimensionamento do projeto')}
        ${apKpi('Consumo real', apH(A.realMin), `${apPct(real / est)} da estimativa`)}
        ${apKpi('Consumo equivalente', apH(A.eqMin), `${apPct(eq / est)} da estimativa`, estourou ? 'neg' : 'pos')}
        ${apKpi('Saldo (equivalente)', `${saldo < 0 ? '−' : ''}${apH(Math.abs(saldo) * 60)}`, estourou ? `estourou ${apPct((eq - est) / est)}${real <= est ? ' — no real parecia dentro' : ''}` : `${apPct(saldo / est)} da estimativa ainda disponível`, estourou ? 'neg' : 'pos')}`;
      nota = '';
    } else {
      kpis = `
        ${apKpi('Horas estimadas', '—', 'não informado')}
        ${apKpi('Consumo real', apH(A.realMin))}
        ${apKpi('Consumo equivalente', apH(A.eqMin))}
        ${apKpi('Saldo', '—', 'precisa da estimativa')}`;
      nota = '<p class="muted ap-sem-est">Este projeto ainda não tem <strong>Horas estimadas</strong>. Informe o valor em Projetos → Editar para comparar a estimativa com o consumo.</p>';
    }
    return `
      <h3 class="section-subheading">Horas estimadas × consumidas</h3>
      <p class="muted">Compara o dimensionamento do projeto com o consumo real e com o consumo equivalente (que considera domingo, feriado e noturno).</p>
      <div class="ap-grid4">${kpis}</div>
      ${nota}
      <strong class="ap-mini-titulo" style="display:block;margin-top:14px">Consumo acumulado (curva S)</strong>
      <div class="chart-wrap"><svg viewBox="0 0 960 230" width="100%" style="max-width:960px" role="img" aria-label="Consumo acumulado de horas">${apSvgCurvaS(A)}</svg></div>
      <div class="legend-row">
        <span><i class="ap-real-key"></i>Acumulado real</span>
        <span><i class="ap-eqv-key"></i>Acumulado equivalente</span>
        ${est > 0 ? `<span><i class="ap-est-key"></i>Horas estimadas (${formatNumeroBR(est)}h)</span>` : ''}
      </div>`;
  }

  function apHeatmap(titulo, subtitulo, atr, modo, linhas, A) {
    // linhas: [{nome, tags, sub, vals: Map(ia → {real, eq})}]
    const ativ = A.atividades.map((a, i) => ({ a, i })).filter(({ i }) => A.porAtiv.has(i));
    const campo = modo === 'eq' ? 'eq' : 'real';
    const totais = linhas.map((l) => {
      let t = 0;
      l.vals.forEach((v) => (t += v[campo]));
      return t;
    });
    let max = 0;
    linhas.forEach((l) => l.vals.forEach((v) => (max = Math.max(max, v[campo]))));
    const ordem = linhas.map((l, i) => i).sort((a, b) => totais[b] - totais[a]);
    const head = `<thead><tr><th></th>${ativ.map(({ a }) => `<th>${escapeHtml(a.name)}</th>`).join('')}<th>Total</th></tr></thead>`;
    const corpo = ordem
      .map((idx) => {
        const l = linhas[idx];
        const cels = ativ
          .map(({ a, i }) => {
            const v = l.vals.get(i);
            const min = v ? v[campo] : 0;
            if (min <= 0) return '<td class="cell empty">–</td>';
            const fr = max > 0 ? min / max : 0;
            return `<td class="cell" style="background:${heatColor(fr)};color:${fr > 0.55 ? '#fff' : 'var(--color-text)'}" title="${escapeHtml(l.nome)} — ${escapeHtml(a.name)}: ${apH(min)}">${apH(min)}</td>`;
          })
          .join('');
        return `<tr><th>${escapeHtml(l.nome)}${l.tags || ''}${l.sub ? `<span>${escapeHtml(l.sub)}</span>` : ''}</th>${cels}<td class="cell ap-heat-total">${apH(totais[idx])}</td></tr>`;
      })
      .join('');
    return `
      <h3 class="section-subheading">${titulo}</h3>
      <div class="ap-toolbar"><span class="muted">${subtitulo}</span>${apToggle(atr, [['real', 'Horas reais'], ['eq', 'Horas equivalentes']], modo)}</div>
      <div class="heatmap-wrap"><table class="heatmap ap-heatmap">${head}<tbody>${corpo}</tbody></table></div>`;
  }

  function apSecHeatmaps(A) {
    const linhasColab = A.colabIds.map((id) => {
      const c = A.colabPorId[id];
      let tags = '';
      if (c && c.obrigatorioApontamento === false) tags += '<em class="ap-tag">isento</em>';
      if (c && !c.ativo) tags += '<em class="ap-tag ap-tag--off">inativo</em>';
      if (!c) tags += '<em class="ap-tag ap-tag--off">removido</em>';
      return { nome: c ? c.nome : 'Colaborador removido', tags, sub: (c && c.cargo) || AP_SEM_CARGO, vals: A.porColab.get(id) };
    });
    const linhasCargo = Array.from(A.porCargo.entries()).map(([cargo, vals]) => ({ nome: cargo, tags: '', sub: '', vals }));
    return (
      apHeatmap('Mapa de calor — Colaboradores × Atividades', 'Horas de cada colaborador envolvido no projeto em cada atividade. Quanto mais escura a célula, mais horas.', 'data-ap-heat-colab', apState.heatColab, linhasColab, A) +
      apHeatmap('Mapa de calor — Cargos × Atividades', 'Horas consumidas por cargo em cada atividade (soma dos colaboradores de cada cargo).', 'data-ap-heat-cargo', apState.heatCargo, linhasCargo, A)
    );
  }

  /* ---- controle da aba ---- */

  function apInit() {
    apCarregarFatores();
    const selCliente = document.getElementById('apCliente');
    const selProjeto = document.getElementById('apProjeto');
    selCliente.addEventListener('change', () => {
      apState.clienteId = selCliente.value;
      apPopularProjetos(true);
      apRender();
    });
    selProjeto.addEventListener('change', () => {
      apState.projetoId = selProjeto.value;
      apRender();
    });
    document.getElementById('apExportPdfButton').addEventListener('click', apExportPdf);
    document.getElementById('apShareHtmlButton').addEventListener('click', apShareHtml);

    const cont = document.getElementById('apConteudo');
    cont.addEventListener('click', (ev) => {
      const alvo = ev.target.closest('button, .legend-toggle');
      if (!alvo) return;
      if (alvo.dataset.apGran) apState.granularidade = alvo.dataset.apGran;
      else if (alvo.dataset.apModo) apState.modoHoras = alvo.dataset.apModo;
      else if (alvo.dataset.apHeatColab) apState.heatColab = alvo.dataset.apHeatColab;
      else if (alvo.dataset.apHeatCargo) apState.heatCargo = alvo.dataset.apHeatCargo;
      else if (alvo.dataset.apLeg) {
        const id = alvo.dataset.apLeg;
        if (apState.hidden.has(id)) apState.hidden.delete(id);
        else apState.hidden.add(id);
      } else if (alvo.dataset.apReset) {
        apState.fatores = apSanearFatores(AP_FATORES_PADRAO);
        apStorageSet(`agricef_ap_fatores_${apTeamId()}`, apState.fatores);
      } else return;
      apRender();
    });
    cont.addEventListener('change', (ev) => {
      const el = ev.target;
      if (el.dataset && el.dataset.apFator) {
        const novo = Object.assign({}, apState.fatores);
        novo[el.dataset.apFator] = el.type === 'checkbox' ? el.checked : el.value;
        apState.fatores = apSanearFatores(novo);
        apStorageSet(`agricef_ap_fatores_${apTeamId()}`, apState.fatores);
        apRender();
      } else if (el.dataset && el.dataset.apComp) {
        if (el.checked) apState.compensados.add(el.dataset.apComp);
        else apState.compensados.delete(el.dataset.apComp);
        apStorageSet(apCompKey(), Array.from(apState.compensados));
        apRender();
      }
    });
    apState.pronto = true;
  }

  /** Clientes que têm algum projeto; projeto padrão = o de registro mais recente. */
  function apPopularSelects() {
    const selCliente = document.getElementById('apCliente');
    const clientesComProjeto = state.clientes
      .filter((c) => state.projetos.some((p) => p.clienteId === c.id))
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));
    selCliente.innerHTML = clientesComProjeto.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join('');

    const projetoValido = state.projetos.some((p) => p.id === apState.projetoId);
    if (!projetoValido) {
      let melhor = null;
      state.apontamentos.forEach((a) => {
        if (a.projetoId && a.data && (!melhor || a.data > melhor.data) && state.projetos.some((p) => p.id === a.projetoId)) melhor = a;
      });
      const p0 = melhor ? state.projetos.find((p) => p.id === melhor.projetoId) : null;
      apState.projetoId = p0 ? p0.id : '';
      apState.clienteId = p0 ? p0.clienteId : (clientesComProjeto[0] || {}).id || '';
    } else {
      apState.clienteId = state.projetos.find((p) => p.id === apState.projetoId).clienteId;
    }
    selCliente.value = apState.clienteId;
    apPopularProjetos(false);
  }

  function apPopularProjetos(trocouCliente) {
    const selProjeto = document.getElementById('apProjeto');
    const doCliente = state.projetos
      .filter((p) => p.clienteId === apState.clienteId)
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));
    selProjeto.innerHTML = doCliente.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)}${p.ativo ? '' : ' (inativo)'}</option>`).join('');
    if (trocouCliente || !doCliente.some((p) => p.id === apState.projetoId)) {
      // ao trocar de cliente, escolhe o projeto do cliente com registro mais recente
      let melhor = null;
      state.apontamentos.forEach((a) => {
        if (doCliente.some((p) => p.id === a.projetoId) && a.data && (!melhor || a.data > melhor.data)) melhor = a;
      });
      apState.projetoId = melhor ? melhor.projetoId : (doCliente[0] || {}).id || '';
    }
    selProjeto.value = apState.projetoId;
  }

  async function apAbrir() {
    if (!apState.pronto) apInit();
    document.getElementById('apVazio').textContent = 'Carregando os registros do projeto…';
    document.getElementById('apVazio').classList.remove('hidden');
    document.getElementById('apConteudo').innerHTML = '';
    const ok = await loadApontamentos();
    if (!ok || abaAtiva !== 'analise-projeto') return;
    apPopularSelects();
    apRender();
  }

  function apRender() {
    const cont = document.getElementById('apConteudo');
    const vazio = document.getElementById('apVazio');
    const titulo = document.getElementById('apTitulo');
    if (!apState.projetoId) {
      cont.innerHTML = '';
      titulo.textContent = '';
      vazio.textContent = state.projetos.length ? 'Selecione um cliente e um projeto.' : 'Nenhum projeto cadastrado ainda.';
      vazio.classList.remove('hidden');
      apState.analise = null;
      return;
    }
    apState.compensados = new Set(apStorageGet(apCompKey()) || []);
    const A = apAnalisar(apState.projetoId);
    apState.analise = A;
    if (!A) {
      cont.innerHTML = '';
      const p = state.projetos.find((x) => x.id === apState.projetoId);
      titulo.textContent = p ? `${clienteNomeDoProjeto(p)} — ${p.nome}` : '';
      vazio.textContent = 'Este projeto ainda não tem horas registradas.';
      vazio.classList.remove('hidden');
      return;
    }
    vazio.classList.add('hidden');
    titulo.textContent = `${A.cliente} — ${A.projeto.nome} · ${apDataBR(A.inicio)} a ${apDataBR(A.fim)}`;
    cont.innerHTML = [
      apSecResumo(A),
      apSecDiasTrabalhados(A),
      apSecDistribuicao(A),
      apSecLinhas(A),
      apSecDomFer(A),
      apSecNoturno(A),
      apSecPonderacao(A),
      apSecEstimado(A),
      apSecHeatmaps(A),
    ].join('');
    apBindLinhas(A);
  }

  /* ---- exportação (PDF e HTML) ---- */

  function apMetaRelatorio() {
    const agora = new Date();
    const A = apState.analise;
    return (
      `Análise de projeto: ${A ? `${A.cliente} — ${A.projeto.nome}` : ''} · gerada em ${agora.toLocaleDateString('pt-BR')} às ` +
      `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    );
  }

  async function apExportPdf() {
    if (!apState.analise) {
      toast('Selecione um projeto com horas registradas para exportar.', 'error');
      return;
    }
    const panels = Array.from(document.querySelectorAll('.tab-panel'));
    const antes = panels.map((p) => p.classList.contains('hidden'));
    panels.forEach((p) => p.classList.toggle('hidden', p.id !== 'tab-analise-projeto'));
    els.printReportHeaderMeta.textContent = apMetaRelatorio();
    const restore = () => {
      panels.forEach((p, i) => p.classList.toggle('hidden', antes[i]));
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  /** O HTML compartilhado é estático: troca os controles interativos por
   * texto, deixa as dicas de hover como tooltip nativo (<title>) e abre as
   * listas recolhíveis. */
  function apPrepararCloneParaExportar(clone) {
    clone.querySelectorAll('.ap-seg').forEach((seg) => {
      const ativo = seg.querySelector('.is-active');
      const span = document.createElement('span');
      span.className = 'ap-estado';
      span.textContent = ativo ? ativo.textContent : '';
      seg.replaceWith(span);
    });
    clone.querySelectorAll('.line-chart-hit[data-tip]').forEach((rect) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = rect.getAttribute('data-tip');
      rect.appendChild(t);
    });
    clone.querySelectorAll('.ap-dica, .ap-param__reset, .line-chart-tooltip').forEach((el) => el.remove());
    clone.querySelectorAll('input').forEach((i) => i.setAttribute('disabled', ''));
    clone.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
  }

  async function apShareHtml() {
    if (!apState.analise) {
      toast('Selecione um projeto com horas registradas para compartilhar.', 'error');
      return;
    }
    const botao = document.getElementById('apShareHtmlButton');
    botao.disabled = true;
    try {
      els.printReportHeaderMeta.textContent = apMetaRelatorio();
      const html = await buildShareHtmlDocument(['tab-analise-projeto'], { transformClone: apPrepararCloneParaExportar });
      downloadHtmlFile(html, 'analise-de-projeto');
      toast('Arquivo HTML gerado. Confira sua pasta de downloads.', 'success');
    } catch (err) {
      toast(`Não foi possível gerar o HTML: ${err.message}`, 'error');
    } finally {
      botao.disabled = false;
    }
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
      computeRankingEquipe(getPeriodo({ modo: 'mes', ano: y, mes: m })).forEach((c) => {
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
   * ignorando quem tem 0 (não dá pra falar em "posição" sem ter registrado). */
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

  function computeRankingEquipe(periodo) {
    const ativos = state.colaboradores.filter((c) => c.ativo);
    return ativos.map((c) => {
      const dados = gerarDadosPeriodo(c.id, periodo);
      // Hoje e dias futuros não contam contra ninguém — hoje ainda não
      // terminou, e dias futuros nem chegaram.
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
    if (!state.periodo) return;
    const periodo = getPeriodo();
    setPeriodoTag(els.rankingEquipeGrid, periodo);
    const equipe = computeRankingEquipe(periodo);

    const hojeStr = Holidays.dateStr(new Date());
    const emAndamento = periodo.inicio <= hojeStr && periodo.fim >= hojeStr;
    els.rankPresencaTotalDesc.textContent = emAndamento
      ? '100% de presença até ontem (considera só quem é obrigado a registrar).'
      : '100% de presença no período (considera só quem é obrigado a registrar).';

    // O comparativo com meses anteriores só faz sentido quando o período é um
    // mês específico — nos períodos longos não há "mês anterior" comparável.
    const comparativoDisponivel = periodo.modo === 'mes';
    els.rankingComparativoSelect.classList.toggle('hidden', !comparativoDisponivel);

    const temDados = equipe.some((c) => c.totalMinutos > 0);
    els.rankingEquipeEmptyState.classList.toggle('hidden', temDados);
    els.rankingEquipeGrid.classList.toggle('hidden', !temDados);
    if (!temDados) return;

    const monthsBack = comparativoDisponivel ? Number(els.rankingComparativoSelect.value) || 0 : 0;
    const baseline = monthsBack > 0 ? computeRankingBaseline(monthsBack, periodo.ano, periodo.mes) : null;

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
      : '<li class="ranking-empty">Nenhum registro neste período.</li>';

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

    // 3) Quem registrou todos os dias úteis — "bateu 100% ou não" não tem um
    // "período anterior" comparável (não é uma métrica numérica), fica sem comparativo.
    const presencaTotal = equipe
      .filter((c) => c.obrigatorio && c.diasUteis > 0 && c.diasSemApontamento === 0)
      .sort((a, b) => b.totalMinutos - a.totalMinutos);
    els.rankPresencaTotalContainer.innerHTML = presencaTotal.length
      ? `<div style="display:flex; flex-wrap:wrap; gap:8px;">${presencaTotal.map((c) => `<span class="badge-full">✓ ${escapeHtml(c.nome)}</span>`).join('')}</div>`
      : '<p class="ranking-empty">Ninguém bateu 100% de presença neste período.</p>';

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
      : '<li class="ranking-empty">Ninguém registrou fora dos dias úteis neste período.</li>';
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
    beginLoading();
    try {
      const apontamentos = await fetchTodosApontamentos(state.session);
      state.apontamentos = apontamentos;
      garantirPeriodo();
      renderPeriodoBar();
      populateHorasDiariasColaboradorSelect();
      renderAnalisesApontamentos();
      return true;
    } catch (err) {
      if (isAuthError(err)) {
        toast('Sessão expirada ou inválida. Faça login novamente.', 'error');
        onLogout();
      } else {
        toast(`Erro ao carregar registros: ${err.message}`, 'error');
        showLoadFailure(`Não deu para carregar os registros: ${err.message}`, loadApontamentos);
      }
      return false;
    } finally {
      endLoading();
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
    const periodo = getPeriodo();
    const clienteId = els.horasFiltroCliente.value;
    const projetoId = els.horasFiltroProjeto.value;
    return state.apontamentos.filter((a) => {
      if (!dataNoPeriodo(a.data, periodo)) return false;
      if (clienteId && a.clienteId !== clienteId) return false;
      if (projetoId && a.projetoId !== projetoId) return false;
      return true;
    });
  }

  function renderCharts() {
    if (!state.periodo) return;
    setPeriodoTag(els.horasFiltroCliente, getPeriodo());
    const filtrados = getFilteredApontamentosParaGraficos();
    renderDepartamentoChart(filtrados);
    renderHeatmap(filtrados);
    renderHorasChart(filtrados);
  }

  function renderConformidade() {
    if (!state.periodo) return;
    const periodo = getPeriodo();
    setPeriodoTag(els.conformidadeTableBody, periodo);
    const businessDays = diasUteisEntreAteOntem(periodo.inicio, periodo.fim);
    const hoje = Holidays.dateStr(new Date());
    const ativos = state.colaboradores.filter((c) => c.ativo && c.obrigatorioApontamento !== false);

    // Num período longo, o total de dias sem registro cresce só por ser
    // longo — pra "Atenção/Crítico" continuar fazendo sentido, a gravidade
    // usa o equivalente a um mês de 22 dias úteis.
    const fatorJanela = businessDays.length > 22 ? 22 / businessDays.length : 1;

    const linhas = ativos.map((colaborador) => {
      const doColaborador = state.apontamentos.filter((a) => a.colaboradorId === colaborador.id);
      const diasComApontamento = new Set(doColaborador.map((a) => a.data));
      const diasSemApontamento = businessDays.filter((d) => !diasComApontamento.has(d)).length;
      // Uma atividade em aberto de HOJE é normal (a pessoa está trabalhando
      // nela agora) — só conta como pendência se sobrou aberta de outro dia.
      // Atividades em aberto mostram a situação ATUAL (não dependem do período).
      const atividadesEmAberto = doColaborador.filter((a) => a.status === 'em_andamento' && a.data !== hoje).length;
      const faltasNormalizadas = diasSemApontamento > 0 ? Math.max(1, Math.round(diasSemApontamento * fatorJanela)) : 0;
      return {
        colaborador,
        diasSemApontamento,
        atividadesEmAberto,
        score: diasSemApontamento + atividadesEmAberto,
        scoreGravidade: faltasNormalizadas + atividadesEmAberto,
      };
    });

    linhas.sort((a, b) => b.scoreGravidade - a.scoreGravidade || b.score - a.score);

    els.conformidadeTableBody.innerHTML = '';
    els.conformidadeEmptyState.classList.toggle('hidden', linhas.length > 0);

    linhas.forEach(({ colaborador, diasSemApontamento, atividadesEmAberto, score, scoreGravidade }) => {
      const severidade = severityFor(scoreGravidade);
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

  /** Dias úteis de um mês civil, do dia 1 até ontem (hoje não conta — ainda
   * está em curso — e dias futuros nem chegaram). Pra um mês totalmente no
   * passado isso cobre o mês inteiro. Mesma definição de "dia útil" usada em
   * Conformidade/Ranking (Holidays.isBusinessDay, sem a exceção de emenda que
   * só vale pro dimensionamento de capacidade da aba Equipe). */
  function diasUteisDoMesAteOntem(year, monthIndex) {
    const ultimoDia = new Date(year, monthIndex + 1, 0).getDate();
    return diasUteisEntreAteOntem(`${year}-${pad2(monthIndex + 1)}-01`, `${year}-${pad2(monthIndex + 1)}-${pad2(ultimoDia)}`);
  }

  /** Dias úteis (YYYY-MM-DD) entre duas datas, só até ontem — hoje não conta
   * (ainda está em curso) e dias futuros nem chegaram. */
  function diasUteisEntreAteOntem(inicioStr, fimStr) {
    const ontem = new Date();
    ontem.setHours(0, 0, 0, 0);
    ontem.setDate(ontem.getDate() - 1);
    const [yi, mi, di] = inicioStr.split('-').map(Number);
    const [yf, mf, df] = fimStr.split('-').map(Number);
    const fim = new Date(yf, mf - 1, df);
    const limite = fim < ontem ? fim : ontem;
    const dias = [];
    for (let date = new Date(yi, mi - 1, di); date <= limite; date.setDate(date.getDate() + 1)) {
      if (Holidays.isBusinessDay(date)) dias.push(Holidays.dateStr(date));
    }
    return dias;
  }

  /** Últimos N meses civis terminando no mês informado (mais antigo primeiro). */
  function ultimosMesesAte(year, monthIndex, quantidade) {
    const result = [];
    for (let i = quantidade - 1; i >= 0; i--) {
      let y = year;
      let m = monthIndex - i;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      result.push({ year: y, month: m });
    }
    return result;
  }

  function aderenciaSeverity(pct) {
    if (pct >= 100) return { label: 'Em dia', cls: 'status-pill--good', icon: '\u25cf' };
    if (pct >= 80) return { label: 'Aten\u00e7\u00e3o', cls: 'status-pill--warning', icon: '\u25b2' };
    return { label: 'Cr\u00edtico', cls: 'status-pill--critical', icon: '\u25a0' };
  }

  /** Taxa de Aderência: de todos os dias úteis esperados num mês, quantos a
   * equipe (e cada colaborador) efetivamente registrou alguma atividade —
   * não entra em quantas horas, só "registrou ou não registrou aquele dia".
   * Propositalmente separado da Conformidade (janela rolante de dias úteis +
   * atividades em aberto, pensada pros lembretes automáticos): aqui o recorte
   * é sempre por mês civil, com tendência — o objetivo é ter uma base de
   * dados completa, dia a dia, pra estimar com confiança quanto tempo as
   * atividades consomem, não fiscalizar horário. */
  function renderAderencia() {
    if (!state.periodo) return;
    const periodo = getPeriodo();
    setPeriodoTag(els.aderenciaTableBody, periodo);
    const ativos = state.colaboradores.filter((c) => c.ativo && c.obrigatorioApontamento !== false);

    const registrosPorColaborador = new Map(ativos.map((c) => [c.id, new Set()]));
    state.apontamentos.forEach((a) => {
      const set = registrosPorColaborador.get(a.colaboradorId);
      if (set && a.data) set.add(a.data);
    });

    function pctEquipeNosDias(dias) {
      if (dias.length === 0) return null;
      let somaUteis = 0;
      let somaComRegistro = 0;
      ativos.forEach((colaborador) => {
        const diasComRegistro = registrosPorColaborador.get(colaborador.id);
        somaUteis += dias.length;
        somaComRegistro += dias.filter((d) => diasComRegistro.has(d)).length;
      });
      return somaUteis > 0 ? (somaComRegistro / somaUteis) * 100 : null;
    }

    // Tendência mensal: num mês específico, os 6 meses até ele (contexto); no
    // ano todo ou desde o início, um ponto por mês do próprio período.
    const mesesTendencia =
      periodo.modo === 'mes'
        ? ultimosMesesAte(periodo.ano, periodo.mes - 1, 6).map(({ year, month }) => ({
            ano: year,
            mesIdx: month,
            key: mesKeyDe(year, month),
          }))
        : periodo.meses;
    const multiAno = mesesTendencia.length > 0 && mesesTendencia[0].ano !== mesesTendencia[mesesTendencia.length - 1].ano;
    const pctsEquipePorMes = mesesTendencia.map((m) => pctEquipeNosDias(diasUteisDoMesAteOntem(m.ano, m.mesIdx)));

    els.aderenciaTendenciaDesc.textContent =
      periodo.modo === 'mes'
        ? 'Tendência da aderência da equipe nos últimos 6 meses (até o mês selecionado).'
        : 'Aderência da equipe mês a mês, no período selecionado.';
    renderAderenciaChart(mesesTendencia, pctsEquipePorMes, multiAno);

    // Snapshot por colaborador no período inteiro.
    const diasUteisPeriodo = diasUteisEntreAteOntem(periodo.inicio, periodo.fim);
    const linhas = ativos.map((colaborador) => {
      const diasComRegistro = registrosPorColaborador.get(colaborador.id);
      const diasRegistrados = diasUteisPeriodo.filter((d) => diasComRegistro.has(d)).length;
      const pct = diasUteisPeriodo.length > 0 ? (diasRegistrados / diasUteisPeriodo.length) * 100 : null;
      return { colaborador, diasRegistrados, pct };
    });

    els.aderenciaTableBody.innerHTML = '';
    els.aderenciaEmptyState.classList.toggle('hidden', linhas.length > 0);

    linhas
      .slice()
      .sort((a, b) => (a.pct == null ? 101 : a.pct) - (b.pct == null ? 101 : b.pct))
      .forEach(({ colaborador, diasRegistrados, pct }) => {
        const tr = document.createElement('tr');
        const pctTexto = pct == null ? '\u2014' : `${Math.round(pct)}%`;
        let situacaoHtml = '\u2014';
        if (pct != null) {
          const sev = aderenciaSeverity(pct);
          situacaoHtml = `<span class="status-pill ${sev.cls}">${sev.icon} ${sev.label}</span>`;
        }
        tr.innerHTML = `
          <td>${escapeHtml(colaborador.nome)}</td>
          <td>${diasUteisPeriodo.length}</td>
          <td>${diasRegistrados}</td>
          <td>${pctTexto}</td>
          <td>${situacaoHtml}</td>
        `;
        els.aderenciaTableBody.appendChild(tr);
      });

    const pctEquipePeriodo = pctEquipeNosDias(diasUteisPeriodo);
    els.kpiAderenciaEquipeValue.textContent = pctEquipePeriodo == null ? '\u2014' : `${Math.round(pctEquipePeriodo)}%`;
    els.kpiAderenciaEquipeSub.textContent = `${diasUteisPeriodo.length} dia(s) \u00fatil(eis) considerado(s) \u00b7 ${periodo.labelCurto}`;

    const comPct = linhas.filter((l) => l.pct != null);
    els.kpiAderenciaEmDiaValue.textContent = comPct.length ? String(comPct.filter((l) => l.pct >= 100).length) : '\u2014';

    if (comPct.length) {
      const pior = comPct.slice().sort((a, b) => a.pct - b.pct)[0];
      els.kpiAderenciaMinValue.textContent = `${Math.round(pior.pct)}%`;
      els.kpiAderenciaMinSub.textContent = pior.colaborador.nome;
    } else {
      els.kpiAderenciaMinValue.textContent = '\u2014';
      els.kpiAderenciaMinSub.textContent = '';
    }
  }

  /** Mesmo padrão visual das linhas de percentual da aba Equipe (0–100%), mas sem teto
   * saudável — aqui é taxa de cumprimento, não de capacidade. Meses sem dado
   * (diasUteis = 0, ex.: mês corrente no dia 1º) ficam com um "buraco" na
   * linha em vez de cair pra zero, pra não sugerir uma queda que não houve. */
  function renderAderenciaChart(meses, pcts, multiAno) {
    const svg = document.getElementById('chartAderenciaTendencia');
    const temDados = pcts.some((p) => p != null);
    els.aderenciaChartEmptyState.classList.toggle('hidden', temDados);
    if (!temDados) {
      svg.innerHTML = '';
      return;
    }

    const W = 720, H = 130;
    const padL = 46, padR = 12, padT = 14, padB = 20;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const n = meses.length;
    const slot = plotW / n;

    const yFor = (v) => padT + plotH - (v / 100) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const svgParts = [];
    [0, 50, 100].forEach((v) => {
      const y = yFor(v);
      svgParts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      svgParts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v}%</text>`);
    });

    const pontosValidos = pcts
      .map((p, i) => (p == null ? null : `${xForCenter(i)},${yFor(p)}`))
      .filter((p) => p != null);
    svgParts.push(`<polyline class="pct-line" points="${pontosValidos.join(' ')}" />`);
    pcts.forEach((p, i) => {
      if (p == null) return;
      const cor = p >= 100 ? 'var(--status-good)' : p >= 80 ? 'var(--status-warning)' : 'var(--status-critical)';
      const mesStr = meses[i].key;
      svgParts.push(
        `<circle class="pct-dot" cx="${xForCenter(i)}" cy="${yFor(p)}" r="4" fill="${cor}">` +
          `<title>${formatMesAno(mesStr)}: ${Math.round(p)}% de ader\u00eancia</title></circle>`
      );
    });
    const passoTick = Math.max(1, Math.ceil(n / 12));
    meses.forEach(({ ano, mesIdx }, i) => {
      if (i % passoTick !== 0) return;
      const rotulo = multiAno ? `${MES_ABREV[mesIdx]}/${String(ano).slice(2)}` : MES_ABREV[mesIdx];
      svgParts.push(`<text class="month-tick" x="${xForCenter(i)}" y="${H - 4}" text-anchor="middle">${rotulo}</text>`);
    });

    svg.innerHTML = svgParts.join('');
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

  // Eixo X mensal ATUAL dos gráficos de Equipe, Financeira e do relatório
  // individual — muda conforme o período global (12 meses de um ano, ou todos
  // os meses desde o primeiro registro). Ver definirEixoMeses().
  let EQUIPE_MESES = MES_ABREV.slice();
  let EQUIPE_MES_KEYS = MES_ABREV.map((_, i) => `0000-${pad2(i + 1)}`);
  let EQUIPE_MES_INDEX = new Map(EQUIPE_MES_KEYS.map((k, i) => [k, i]));
  let EQUIPE_DESTAQUE_IDX = -1;

  function definirEixoMeses(periodo) {
    EQUIPE_MESES = periodo.mesesGrafico.map((m) => m.label);
    EQUIPE_MES_KEYS = periodo.mesesGrafico.map((m) => m.key);
    EQUIPE_MES_INDEX = new Map(EQUIPE_MES_KEYS.map((k, i) => [k, i]));
    EQUIPE_DESTAQUE_IDX = periodo.destaqueKey ? EQUIPE_MES_INDEX.get(periodo.destaqueKey) ?? -1 : -1;
  }

  function indiceMesDaData(dataStr) {
    const i = EQUIPE_MES_INDEX.get(dataStr.slice(0, 7));
    return i === undefined ? -1 : i;
  }

  /** Com muitos meses no eixo (período longo), mostra só alguns rótulos. */
  function mesTickVisivel(i) {
    const n = EQUIPE_MESES.length;
    return n <= 14 || i % Math.ceil(n / 12) === 0;
  }

  /** Faixa de fundo marcando o mês selecionado nos gráficos anuais de contexto. */
  function bandaDestaqueMes(padL, slot, padT, plotH) {
    if (EQUIPE_DESTAQUE_IDX < 0) return '';
    return `<rect class="mes-destaque-band" x="${padL + slot * EQUIPE_DESTAQUE_IDX}" y="${padT}" width="${slot}" height="${plotH}"><title>Mês selecionado</title></rect>`;
  }

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

  function formatHorasCurta(v) {
    const arredondado = Math.round(v * 10) / 10;
    return `${arredondado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
  }

  /** Agrupa apontamentos em horas totais por atividade × mês (jan..dez),
   * alinhado à ordem fixa de window.APP_DATA.ACTIVITIES — mesma ordem usada
   * em todos os outros gráficos "por atividade", pra cor e legenda ficarem
   * consistentes em qualquer lugar do dashboard. Usado tanto pelo relatório
   * individual (apontamentos já filtrados por colaborador) quanto pela aba
   * Equipe (apontamentosDoAno, já filtrado por ano + colaboradores ativos). */
  function computeAtividadeMensal(apontamentos) {
    const activities = window.APP_DATA.ACTIVITIES;
    const indexById = new Map(activities.map((a, i) => [a.id, i]));
    const totais = activities.map(() => new Array(EQUIPE_MESES.length).fill(0));
    apontamentos.forEach((a) => {
      if (!a.data || a.duracaoMinutos == null || a.duracaoMinutos <= 0) return;
      const idx = indexById.get(a.atividadeId);
      if (idx == null) return;
      const mes = indiceMesDaData(a.data);
      if (mes < 0) return;
      totais[idx][mes] += a.duracaoMinutos / 60;
    });
    return activities.map((act, i) => ({ id: act.id, name: act.name, values: totais[i].map((v) => Math.round(v * 10) / 10) }));
  }

  // Lembra quais atividades foram escondidas pela legenda, por gráfico —
  // assim alternar mês/colaborador/ano não reseta o filtro que a pessoa
  // já tinha escolhido.
  const ATIVIDADE_LINE_HIDDEN = {};

  /** Um gráfico de linhas por atividade (uma linha por atividade, meses no
   * eixo X, horas totais no eixo Y) — compartilhado pelo relatório
   * individual e pela aba Equipe. Mesmo esqueleto geométrico de
   * equipeRenderDualAxisChart, mas com N séries em vez de barra+1 linha, e
   * com hover (crosshair + tooltip único com todas as atividades daquele
   * mês) e legenda clicável pra mostrar/esconder atividades. */
  function renderAtividadeLineChart(svgId, legendId, emptyStateId, series) {
    const svg = document.getElementById(svgId);
    const emptyStateEl = emptyStateId ? document.getElementById(emptyStateId) : null;
    const wrap = svg.closest('.chart-wrap');
    const colorFor = (index) => `var(--activity-${index + 1})`;
    const hidden = ATIVIDADE_LINE_HIDDEN[svgId] || (ATIVIDADE_LINE_HIDDEN[svgId] = new Set());

    // Qualquer novo render (troca de mês/colaborador/ano, ou clique na
    // legenda) invalida o hover em andamento — o tooltip antigo pode estar
    // descrevendo uma série que acabou de ser escondida.
    const tooltipExistente = wrap ? wrap.querySelector('.line-chart-tooltip') : null;
    if (tooltipExistente) tooltipExistente.classList.remove('is-visible');

    const temDados = series.some((s) => s.values.some((v) => v > 0));
    if (emptyStateEl) emptyStateEl.classList.toggle('hidden', temDados);
    if (!temDados) {
      svg.innerHTML = '';
      const legendElVazio = document.getElementById(legendId);
      if (legendElVazio) legendElVazio.innerHTML = '';
      return;
    }

    // Legenda — clicar numa atividade mostra/esconde a linha dela.
    const legendEl = document.getElementById(legendId);
    legendEl.innerHTML = series
      .map(
        (s, i) =>
          `<span class="legend-toggle${hidden.has(s.id) ? ' is-off' : ''}" data-activity-id="${escapeHtml(s.id)}">` +
          `<i style="background:${colorFor(i)}"></i>${escapeHtml(s.name)}</span>`
      )
      .join('');
    legendEl.onclick = (ev) => {
      const item = ev.target.closest('.legend-toggle');
      if (!item) return;
      const id = item.dataset.activityId;
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      renderAtividadeLineChart(svgId, legendId, emptyStateId, series);
    };

    const W = 720, H = 300;
    const padL = 44, padR = 20, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const n = EQUIPE_MESES.length;
    const slot = plotW / n;
    const xForCenter = (i) => padL + slot * i + slot / 2;

    const visible = series.filter((s) => !hidden.has(s.id));
    const allValues = visible.flatMap((s) => s.values);
    const { max, ticks } = equipeAxisScale(Math.max(...allValues, 0));
    const yFor = (v) => padT + plotH - (v / max) * plotH;

    const parts = [bandaDestaqueMes(padL, slot, padT, plotH)];
    ticks.forEach((v) => {
      const y = yFor(v);
      parts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      parts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v}</text>`);
    });

    series.forEach((s, i) => {
      if (hidden.has(s.id)) return;
      const color = colorFor(i);
      const points = s.values.map((v, mi) => `${xForCenter(mi)},${yFor(v)}`).join(' ');
      parts.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />`);
      s.values.forEach((v, mi) => {
        parts.push(`<circle cx="${xForCenter(mi)}" cy="${yFor(v)}" r="3.5" fill="var(--color-surface)" stroke="${color}" stroke-width="2" />`);
      });
    });

    EQUIPE_MESES.forEach((m, i) => parts.push((mesTickVisivel(i) ? `<text class="month-tick" x="${xForCenter(i)}" y="${H - 8}" text-anchor="middle">${m}</text>` : '')));

    // Crosshair (escondido até o primeiro hover) + uma faixa de hit-test por
    // mês — os pontos são mensais, então o hover trava no mês mais próximo
    // em vez de seguir o mouse livremente.
    parts.push(`<line class="line-chart-crosshair" x1="0" y1="${padT}" x2="0" y2="${padT + plotH}" style="opacity:0" />`);
    for (let i = 0; i < n; i++) {
      parts.push(`<rect class="line-chart-hit" tabindex="0" data-mes-index="${i}" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${plotH}" />`);
    }

    svg.innerHTML = parts.join('');

    let tooltip = wrap ? wrap.querySelector('.line-chart-tooltip') : null;
    if (wrap && !tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'line-chart-tooltip';
      wrap.appendChild(tooltip);
    }
    const crosshair = svg.querySelector('.line-chart-crosshair');

    function showTooltip(mesIndex) {
      const x = xForCenter(mesIndex);
      crosshair.setAttribute('x1', x);
      crosshair.setAttribute('x2', x);
      crosshair.style.opacity = '1';
      if (!tooltip) return;

      const linhas = visible
        .map((s) => ({ nome: s.name, valor: s.values[mesIndex], color: colorFor(series.indexOf(s)) }))
        .sort((a, b) => b.valor - a.valor);

      tooltip.innerHTML =
        `<div class="line-chart-tooltip__title">${escapeHtml(EQUIPE_MESES[mesIndex])}</div>` +
        linhas
          .map(
            (l) =>
              `<div class="line-chart-tooltip__row"><span class="line-chart-tooltip__key" style="background:${l.color}"></span>` +
              `<span class="line-chart-tooltip__name">${escapeHtml(l.nome)}</span>` +
              `<span class="line-chart-tooltip__value">${formatHorasCurta(l.valor)}</span></div>`
          )
          .join('');

      const svgRect = svg.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const scale = svgRect.width / W;
      const xPx = svgRect.left - wrapRect.left + x * scale;
      const tooltipWidth = tooltip.offsetWidth || 170;
      let left = xPx + 14;
      if (left + tooltipWidth > wrap.clientWidth) left = xPx - tooltipWidth - 14;
      tooltip.style.left = `${Math.max(4, left)}px`;
      tooltip.classList.add('is-visible');
    }

    function hideTooltip() {
      crosshair.style.opacity = '0';
      if (tooltip) tooltip.classList.remove('is-visible');
    }

    svg.onmousemove = (ev) => {
      const hit = ev.target.closest('.line-chart-hit');
      if (!hit) return;
      showTooltip(Number(hit.dataset.mesIndex));
    };
    svg.onmouseleave = hideTooltip;
    svg.onfocusin = (ev) => {
      const hit = ev.target.closest('.line-chart-hit');
      if (hit) showTooltip(Number(hit.dataset.mesIndex));
    };
    svg.onfocusout = hideTooltip;
  }

  /** Define quem entra na CAPACIDADE (e, pela mesma base de comparação, no
   * consumido/ocupação) da aba Equipe: ativos obrigados a registrar. Isentos
   * (gerência/coordenação, normalmente) e inativos não entram na oferta de
   * horas — contar a dedicação diária de quem raramente registra só infla a
   * capacidade e derruba a ocupação artificialmente.
   *
   * As horas de isentos e inativos NÃO somem da aba: os gráficos de
   * composição (projetos, cargos, atividades, colaboradores/projetos por
   * mês) contam todo mundo que registrou. Financeira conta o custo de todos
   * (salário é despesa real, isento ou não). */
  function equipeColaboradorConta(c) {
    return c.ativo && c.obrigatorioApontamento !== false;
  }

  function renderEquipe() {
    garantirPeriodo();
    const periodo = getPeriodo();
    definirEixoMeses(periodo);
    const nMeses = EQUIPE_MESES.length;

    const ativos = state.colaboradores.filter(equipeColaboradorConta);
    const ativosIds = new Set(ativos.map((c) => c.id));
    const somaDedicacao = ativos.reduce((acc, c) => acc + (Number(c.dedicacaoDiaria) || 8), 0);

    const capacidadeLiquida = periodo.mesesGrafico.map((m) => Math.round(somaDedicacao * diasUteisNoMes(m.ano, m.mesIdx)));
    const capacidadeSaudavel = capacidadeLiquida.map((v) => Math.round((v * equipeTetoPercent) / 100));

    // Todos os registros concluídos (isentos e inativos inclusive) — base dos
    // gráficos de composição. Só os de quem compõe a capacidade entram em
    // consumido/ocupação (mesma base de comparação da capacidade).
    const concluidos = state.apontamentos.filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0 && a.data);
    // Gráficos mensais: todos os meses do eixo (no modo "mês específico", o
    // ano inteiro, com o mês destacado). Quebras por projeto/cargo e KPIs:
    // só o período selecionado.
    const apontamentosEixo = concluidos.filter((a) => indiceMesDaData(a.data) >= 0);
    const apontamentosPeriodo = concluidos.filter((a) => dataNoPeriodo(a.data, periodo));

    const consumido = new Array(nMeses).fill(0);
    const colabPorMes = Array.from({ length: nMeses }, () => new Set());
    const projPorMes = Array.from({ length: nMeses }, () => new Set());
    apontamentosEixo.forEach((a) => {
      const mes = indiceMesDaData(a.data);
      if (ativosIds.has(a.colaboradorId)) consumido[mes] += a.duracaoMinutos / 60;
      colabPorMes[mes].add(a.colaboradorId);
      projPorMes[mes].add(a.projetoId);
    });

    // Horas de isentos/inativos no período: contam nos gráficos de composição,
    // mas ficam fora da ocupação — avisa quanto é, em vez de esconder.
    const minForaOcupacao = apontamentosPeriodo
      .filter((a) => !ativosIds.has(a.colaboradorId))
      .reduce((acc, a) => acc + a.duracaoMinutos, 0);
    els.equipeNotaForaOcupacao.textContent =
      minForaOcupacao > 0
        ? `No período, colaboradores isentos de registro ou inativos registraram ${formatHm(minForaOcupacao)}: contam nos gráficos de projetos, cargos, atividades e mapa de calor, mas ficam fora do consumido e da ocupação (que comparam com a capacidade de quem é obrigado a registrar).`
        : '';
    const consumidoArredondado = consumido.map((v) => Math.round(v));
    const colaboradoresPorMes = colabPorMes.map((s) => s.size);
    const projetosPorMes = projPorMes.map((s) => s.size);

    const periodoKeys = new Set(periodo.meses.map((m) => m.key));
    const idxPeriodo = EQUIPE_MES_KEYS.map((k, i) => (periodoKeys.has(k) ? i : -1)).filter((i) => i >= 0);

    equipeRenderKpis(periodo, ativos.length, somaDedicacao, capacidadeLiquida, capacidadeSaudavel, consumidoArredondado, idxPeriodo);

    // Tendência do mês (corrente, ou o último mês já iniciado do período).
    const hoje = new Date();
    const horasPorDia = new Map();
    concluidos.forEach((a) => {
      if (ativosIds.has(a.colaboradorId)) horasPorDia.set(a.data, (horasPorDia.get(a.data) || 0) + a.duracaoMinutos / 60);
    });
    const mesTendKey = ativos.length > 0 ? equipeMesDaTendencia(idxPeriodo, hoje) : null;
    const tendencia = mesTendKey ? equipeCalcTendencia(horasPorDia, somaDedicacao, mesTendKey, hoje, equipeTetoPercent) : null;
    const mesEmAndamento = tendencia && tendencia.situacao === 'corrente' && tendencia.fim != null
      ? { idx: EQUIPE_MES_INDEX.get(tendencia.mesKey), fim: tendencia.fim, pct: tendencia.pctFim, horasHoje: tendencia.realizado }
      : null;
    equipeRenderBarChart(ativos.length, capacidadeLiquida, capacidadeSaudavel, consumidoArredondado, mesEmAndamento);
    equipeRenderTendencia(tendencia);
    equipeRenderDualAxisChart('equipeChartColabDual', capacidadeSaudavel, colaboradoresPorMes, 'colaboradores com registro no mês');
    equipeRenderDualAxisChart('equipeChartProjDual', capacidadeSaudavel, projetosPorMes, 'projetos com registro no mês');
    equipeRenderProjectBars(apontamentosPeriodo);
    equipeRenderCargoDonut(apontamentosPeriodo);
    equipeRenderHeatmap(apontamentosEixo);
    renderAtividadeLineChart(
      'equipeChartAtividadeMensal',
      'equipeLegendAtividadeMensal',
      'equipeAtividadeMensalEmptyState',
      computeAtividadeMensal(apontamentosEixo)
    );
  }

  function equipeRenderKpis(periodo, ativosCount, somaDedicacao, capacidadeLiquida, capacidadeSaudavel, consumido, idxPeriodo) {
    const hoje = new Date();
    const keyHoje = mesKeyDe(hoje.getFullYear(), hoje.getMonth());
    // Meses já iniciados dentro do período (mês futuro não entra na ocupação).
    const consideradosIdx = idxPeriodo.filter((i) => EQUIPE_MES_KEYS[i] <= keyHoje);
    const soma = (arr, idxs) => idxs.reduce((acc, i) => acc + arr[i], 0);

    const totalBruta = Math.round(
      somaDedicacao * periodo.meses.reduce((acc, m) => acc + new Date(m.ano, m.mesIdx + 1, 0).getDate(), 0)
    );
    const totalLiquida = soma(capacidadeLiquida, idxPeriodo);
    const totalSaudavel = soma(capacidadeSaudavel, idxPeriodo);
    const margem = totalLiquida - totalSaudavel;

    const consumidoAteAgora = soma(consumido, consideradosIdx);
    const saudavelAteAgora = soma(capacidadeSaudavel, consideradosIdx);
    const ocupacaoPct = saudavelAteAgora > 0 ? Math.round((consumidoAteAgora / saudavelAteAgora) * 1000) / 10 : 0;

    els.kpiCapacidadeBrutaValue.textContent = `${totalBruta.toLocaleString('pt-BR')}h`;
    els.kpiCapacidadeLiquidaValue.textContent = `${totalLiquida.toLocaleString('pt-BR')}h`;
    els.kpiTetoLabel.textContent = `Teto saudável (${equipeTetoPercent}%)`;
    els.kpiTetoValue.textContent = `${totalSaudavel.toLocaleString('pt-BR')}h`;
    els.kpiTetoSub.textContent = `margem de segurança de ${margem.toLocaleString('pt-BR')}h no período`;
    if (periodo.modo === 'mes') {
      els.kpiOcupacaoLabel.textContent = `Ocupação em ${periodo.label}`;
    } else if (periodo.modo === 'ano') {
      els.kpiOcupacaoLabel.textContent = periodo.ano === hoje.getFullYear() ? 'Ocupação acumulada no ano' : `Ocupação em ${periodo.ano}`;
    } else {
      els.kpiOcupacaoLabel.textContent = 'Ocupação acumulada no período';
    }
    els.kpiOcupacaoValue.textContent = `${ocupacaoPct}%`;
    els.kpiColaboradoresAtivosValue.textContent = String(ativosCount);

    const projetosDoPeriodo = new Set(
      state.apontamentos
        .filter((a) => a.duracaoMinutos != null && a.duracaoMinutos > 0 && dataNoPeriodo(a.data, periodo))
        .map((a) => a.projetoId)
    );
    els.kpiProjetosExecutadosValue.textContent = String(projetosDoPeriodo.size);

    const pctsLiquida = capacidadeLiquida.map((liq, i) => (liq > 0 ? (consumido[i] / liq) * 100 : 0));
    const mesesSobrecarregados = consideradosIdx.filter((i) => pctsLiquida[i] >= equipeTetoPercent).map((i) => EQUIPE_MESES[i]);
    const mesesCriticos = consideradosIdx.filter((i) => pctsLiquida[i] > 100).map((i) => EQUIPE_MESES[i]);
    els.kpiSobrecarregadosValue.textContent = `${mesesSobrecarregados.length} de ${consideradosIdx.length}`;
    els.equipeSobrecarregadosDetalhe.textContent =
      mesesSobrecarregados.length > 0
        ? `Sobrecarregado = mês em que a equipe consumiu mais que o teto saudável (${equipeTetoPercent}%). Meses acima do teto: ${mesesSobrecarregados.join(', ')}` +
          `${mesesCriticos.length > 0 ? ` · ${mesesCriticos.length} acima de 100% (${mesesCriticos.join(', ')})` : ''}.`
        : `Nenhum mês passou do teto saudável (${equipeTetoPercent}%) neste recorte.`;

    els.equipeLegendTetoGood.textContent = equipeTetoPercent;
    els.equipeLegendTetoWarn.textContent = equipeTetoPercent;
    els.equipeLegendTetoLine.textContent = equipeTetoPercent;
  }

  /* --------- Equipe: limites no gráfico mensal + tendência do mês --------- */

  function equipeDiaUtil(date) {
    return Holidays.isBusinessDay(date) && !isEmendaBridgeDay(date);
  }

  function equipeIsoDe(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function equipeDiaMesRotulo(date) {
    return `${date.getDate()}/${MES_ABREV[date.getMonth()].toLowerCase()}`;
  }

  function equipeFmtH(v) {
    return `${Math.round(v).toLocaleString('pt-BR')} h`;
  }

  function equipeFmtDelta(v) {
    return `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('pt-BR')} h`;
  }

  /** Mês exibido na tendência: o mês corrente, se estiver no eixo; senão o
   * último mês já iniciado do período (só realizado, sem projeção). */
  function equipeMesDaTendencia(idxPeriodo, hoje) {
    const keyHoje = mesKeyDe(hoje.getFullYear(), hoje.getMonth());
    if (EQUIPE_MES_INDEX.has(keyHoje)) return keyHoje;
    const iniciados = idxPeriodo.filter((i) => EQUIPE_MES_KEYS[i] <= keyHoje);
    return iniciados.length ? EQUIPE_MES_KEYS[iniciados[iniciados.length - 1]] : null;
  }

  /** Cálculo puro da tendência de um mês (testável): acumulado dia a dia,
   * ritmo dos últimos 5 dias úteis completos, projeção até o fim do mês,
   * datas em que o acumulado cruza o desejado e o limite de 100%.
   * horasPorDia: Map 'AAAA-MM-DD' → horas de quem compõe a capacidade. */
  function equipeCalcTendencia(horasPorDia, somaDedicacao, mesKey, hoje, tetoPct) {
    const [ano, mesNum] = mesKey.split('-').map(Number);
    const mesIdx = mesNum - 1;
    const nDias = new Date(ano, mesIdx + 1, 0).getDate();
    const hojeIso = equipeIsoDe(hoje);
    const keyHoje = mesKeyDe(hoje.getFullYear(), hoje.getMonth());
    const situacao = mesKey < keyHoje ? 'passado' : mesKey === keyHoje ? 'corrente' : 'futuro';

    const liquida = Math.round(somaDedicacao * diasUteisNoMes(ano, mesIdx));
    const saudavel = Math.round((liquida * tetoPct) / 100);

    const dias = [];
    let acc = 0;
    for (let d = 1; d <= nDias; d++) {
      const date = new Date(ano, mesIdx, d);
      const iso = equipeIsoDe(date);
      const util = equipeDiaUtil(date);
      const naoFuturo = situacao === 'passado' || (situacao === 'corrente' && iso <= hojeIso);
      const horas = naoFuturo ? horasPorDia.get(iso) || 0 : 0;
      if (naoFuturo) acc += horas;
      dias.push({ d, date, iso, util, horas, real: naoFuturo ? acc : null, proj: null });
    }
    const realizado = situacao === 'futuro' ? 0 : acc;
    const diasUteisTotal = dias.filter((x) => x.util).length;

    // Ritmo: média de horas dos últimos 5 dias úteis COMPLETOS antes de hoje
    // (pode atravessar a virada do mês, pro começo do mês não ficar sem base).
    let ritmo = null;
    let diasNoRitmo = 0;
    let projFinal = null;
    let completarHoje = 0;
    if (situacao === 'corrente') {
      const amostra = [];
      for (let k = 1; k <= 60 && amostra.length < 5; k++) {
        const dt = addDaysLocal(hoje, -k);
        if (equipeDiaUtil(dt)) amostra.push(horasPorDia.get(equipeIsoDe(dt)) || 0);
      }
      diasNoRitmo = amostra.length;
      if (diasNoRitmo > 0) {
        ritmo = amostra.reduce((a, b) => a + b, 0) / diasNoRitmo;
        const hojeInfo = dias.find((x) => x.iso === hojeIso);
        if (hojeInfo && hojeInfo.util) completarHoje = Math.max(0, ritmo - hojeInfo.horas);
        let a = realizado + completarHoje;
        let primeiro = true;
        dias.forEach((x) => {
          if (x.iso <= hojeIso) return;
          if (x.util) a += ritmo;
          x.proj = a;
          primeiro = false;
        });
        projFinal = a;
        if (primeiro) projFinal = realizado + completarHoje; // hoje é o último dia útil
      }
    }
    const fim = situacao === 'corrente' ? projFinal : situacao === 'passado' ? realizado : null;

    const cruza = (meta) => {
      for (const x of dias) {
        if (x.real != null && x.real >= meta && meta > 0) return { dia: x.date, projetado: false };
      }
      for (const x of dias) {
        if (x.proj != null && x.proj >= meta && meta > 0) return { dia: x.date, projetado: true };
      }
      return null;
    };

    const uteisRestantes =
      situacao === 'corrente'
        ? dias.filter((x) => x.util && x.iso > hojeIso).length + (dias.find((x) => x.iso === hojeIso)?.util ? 1 : 0)
        : 0;
    const ritmoPara = (meta) => (uteisRestantes > 0 ? Math.max(0, (meta - realizado) / uteisRestantes) : null);

    const uteisDecorridos = dias.filter((x) => x.util && (situacao === 'passado' || x.iso < hojeIso)).length;
    const pctFim = fim != null && liquida > 0 ? (fim / liquida) * 100 : null;
    let status = null;
    if (pctFim != null) status = pctFim > 100 ? 'critico' : pctFim >= tetoPct ? 'atencao' : 'ok';

    return {
      mesKey, ano, mesIdx, nDias, situacao, dias, liquida, saudavel, realizado, diasUteisTotal, uteisDecorridos,
      ritmo, diasNoRitmo, completarHoje, projFinal, fim, pctFim, status,
      cruzaDesejado: cruza(saudavel), cruzaLimite: cruza(liquida),
      ritmoParaDesejado: ritmoPara(saudavel), ritmoParaLimite: ritmoPara(liquida), uteisRestantes,
      hojeIso,
    };
  }

  function equipeRenderTendencia(t) {
    const svg = document.getElementById('equipeChartTendencia');
    const vazio = els.equipeTendenciaEmptyState;
    const conteudo = els.equipeTendenciaConteudo;
    if (!t || t.liquida <= 0 || t.situacao === 'futuro') {
      vazio.classList.remove('hidden');
      conteudo.classList.add('hidden');
      vazio.textContent = !t || t.situacao === 'futuro'
        ? 'O mês ainda não começou — a tendência aparece a partir do primeiro dia do mês.'
        : 'Nenhum colaborador ativo cadastrado.';
      svg.innerHTML = '';
      return;
    }
    vazio.classList.add('hidden');
    conteudo.classList.remove('hidden');

    const corrente = t.situacao === 'corrente';
    const mesNome = `${MES_NOMES[t.mesIdx]} de ${t.ano}`;
    const mesNomeMin = mesNome.charAt(0).toLowerCase() + mesNome.slice(1);
    els.equipeTendenciaTitulo.textContent = corrente
      ? `Tendência do mês atual — ${mesNomeMin}`
      : `Realizado em ${mesNomeMin} frente aos limites`;
    const hojeDate = new Date(t.hojeIso + 'T12:00:00');
    els.equipeTendenciaDescricao.textContent = corrente
      ? `Horas acumuladas dia a dia contra os dois limites do mês, com projeção até o último dia útil. A projeção usa o ritmo dos últimos ${t.diasNoRitmo === 5 ? '5' : t.diasNoRitmo} dias úteis completos (horas médias por dia útil) multiplicado pelos dias úteis restantes${t.completarHoje > 0 ? ', completando também o dia de hoje' : ''}.`
      : 'Mês já encerrado: horas acumuladas dia a dia contra os dois limites (sem projeção).';

    const des = t.saudavel, liq = t.liquida;
    const kpis = [];
    const pctReal = (t.realizado / liq) * 100;
    els.equipeTendKpi1Label.textContent = corrente ? `Realizado até hoje (${equipeDiaMesRotulo(hojeDate)})` : `Realizado em ${MES_ABREV[t.mesIdx].toLowerCase()}/${t.ano}`;
    els.equipeTendKpi1Value.textContent = equipeFmtH(t.realizado);
    const ritmoMes = t.uteisDecorridos > 0 ? t.realizado / t.uteisDecorridos : null;
    els.equipeTendKpi1Sub.textContent =
      `${pctReal.toFixed(1).replace('.', ',')}% da líquida · ${t.uteisDecorridos} de ${t.diasUteisTotal} dias úteis` +
      (ritmoMes != null ? ` · ${Math.round(ritmoMes)} h/dia útil` : '');

    const fim = t.fim;
    const semProjecao = corrente && fim == null;
    els.equipeTendKpi2Label.textContent = corrente ? 'Projeção no fim do mês' : 'Fechamento do mês';
    els.equipeTendKpi2Value.innerHTML = semProjecao
      ? '—'
      : `${equipeFmtH(fim)} <small>(${t.pctFim.toFixed(1).replace('.', ',')}%)</small>`;
    els.equipeTendKpi2Sub.textContent = semProjecao
      ? 'sem dias úteis completos para estimar o ritmo'
      : corrente
        ? `ritmo dos últimos ${t.diasNoRitmo} dias úteis: ${Math.round(t.ritmo)} h/dia útil`
        : `capacidade líquida do mês: ${equipeFmtH(liq)}`;

    const dDes = semProjecao ? null : fim - des;
    const dLim = semProjecao ? null : fim - liq;
    const rotulo = (c) => (c ? equipeDiaMesRotulo(c.dia) : '');
    els.equipeTendKpi3Label.textContent = `Frente ao desejado (${equipeFmtH(des)})`;
    els.equipeTendKpi3Value.textContent = dDes == null ? '—' : equipeFmtDelta(dDes);
    els.equipeTendKpi3.classList.toggle('kpi--warn', dDes != null && dDes > 0);
    els.equipeTendKpi3.classList.toggle('kpi--good', dDes != null && dDes <= 0);
    let sub3 = '';
    if (dDes != null) {
      if (dDes > 0) {
        sub3 = t.cruzaDesejado ? `${t.cruzaDesejado.projetado ? 'ultrapassa em ≈' : 'ultrapassou em'} ${rotulo(t.cruzaDesejado)}` : 'acima do desejado';
      } else {
        sub3 = `folga de ${equipeFmtH(-dDes)} sobre o desejado`;
      }
      if (corrente && t.ritmoParaDesejado != null && dDes > 0 && t.realizado < des) {
        sub3 += ` · para fechar em ${equipeTetoPercent}%: máx. ${Math.round(t.ritmoParaDesejado)} h/dia útil`;
      }
    }
    els.equipeTendKpi3Sub.textContent = sub3;

    els.equipeTendKpi4Label.textContent = `Frente ao limite 100% (${equipeFmtH(liq)})`;
    els.equipeTendKpi4Value.textContent = dLim == null ? '—' : equipeFmtDelta(dLim);
    els.equipeTendKpi4.classList.toggle('kpi--crit', dLim != null && dLim > 0);
    els.equipeTendKpi4.classList.toggle('kpi--good', dLim != null && dLim <= 0);
    let sub4 = '';
    if (dLim != null) {
      if (dLim > 0) {
        sub4 = t.cruzaLimite ? `${t.cruzaLimite.projetado ? 'estoura em ≈' : 'estourou em'} ${rotulo(t.cruzaLimite)}` : 'acima do limite';
      } else {
        sub4 = corrente ? 'não deve atingir o limite' : 'dentro do limite';
        if (corrente && t.ritmoParaLimite != null) sub4 += ` · só estoura acima de ${Math.round(t.ritmoParaLimite)} h/dia útil`;
      }
    }
    els.equipeTendKpi4Sub.textContent = sub4;

    const badge = els.equipeTendenciaBadge;
    badge.className = 'tend-badge';
    if (t.status == null) {
      badge.classList.add('hidden');
    } else {
      badge.classList.remove('hidden');
      badge.classList.add(`tend-badge--${t.status}`);
      const futuro = corrente;
      badge.textContent =
        t.status === 'critico'
          ? `CRÍTICO · ${futuro ? 'deve ultrapassar' : 'ultrapassou'} o limite de 100%`
          : t.status === 'atencao'
            ? `ATENÇÃO · ${futuro ? 'deve passar do' : 'passou do'} desejado`
            : `OK · ${futuro ? 'dentro do' : 'dentro do'} desejado (${equipeTetoPercent}%)`;
    }

    // ---- gráfico ----
    const W = 720, H = 300;
    const padL = 46, padR = 92, padT = 18, padB = 34;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxRaw = Math.max(liq, des, t.realizado, fim || 0);
    const { max: maxVal, ticks } = equipeAxisScale(maxRaw);
    const slot = plotW / t.nDias;
    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
    const xFor = (d) => padL + slot * (d - 1) + slot / 2;
    const parts = [];

    parts.push(`<rect x="${padL}" y="${yFor(liq)}" width="${plotW}" height="${Math.max(yFor(des) - yFor(liq), 0)}" fill="var(--status-warning)" fill-opacity="0.10" />`);
    parts.push(`<rect x="${padL}" y="${padT}" width="${plotW}" height="${Math.max(yFor(liq) - padT, 0)}" fill="var(--status-critical)" fill-opacity="0.09" />`);
    t.dias.forEach((x) => {
      if (x.util) return;
      const feriado = x.date.getDay() !== 0 && x.date.getDay() !== 6;
      parts.push(`<rect class="${feriado ? 'holiday-band' : 'weekend-band'}" x="${xFor(x.d) - slot / 2}" y="${padT}" width="${slot}" height="${plotH}"><title>${equipeDiaMesRotulo(x.date)} — ${feriado ? 'feriado/emenda' : 'fim de semana'}</title></rect>`);
    });
    ticks.forEach((v) => {
      const y = yFor(v);
      parts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" />`);
      parts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v.toLocaleString('pt-BR')}</text>`);
    });
    const passoRotulo = t.nDias > 28 ? 2 : 1;
    t.dias.forEach((x) => {
      if ((x.d - 1) % passoRotulo === 0 || x.d === t.nDias) {
        parts.push(`<text class="month-tick" x="${xFor(x.d)}" y="${H - 16}" text-anchor="middle" style="font-size:10px">${x.d}</text>`);
      }
    });
    parts.push(`<text class="month-tick" x="${padL}" y="${H - 3}" style="font-size:10px">${MES_NOMES[t.mesIdx].toLowerCase()}/${t.ano}</text>`);

    parts.push(`<line class="ref-line tend-ref" x1="${padL}" y1="${yFor(liq)}" x2="${padL + plotW}" y2="${yFor(liq)}" stroke="var(--status-critical)" />`);
    parts.push(`<line class="ref-line tend-ref" x1="${padL}" y1="${yFor(des)}" x2="${padL + plotW}" y2="${yFor(des)}" stroke="var(--status-warning)" />`);
    parts.push(`<text class="ref-label" style="font-size:10px" x="${padL + plotW + 6}" y="${yFor(liq) + 3}" fill="var(--status-critical)">Limite 100%</text>`);
    parts.push(`<text class="ref-label" style="font-size:9px" x="${padL + plotW + 6}" y="${yFor(liq) + 14}" fill="var(--status-critical)">${equipeFmtH(liq)}</text>`);
    const sobrepoe = Math.abs(yFor(des) - yFor(liq)) < 30;
    parts.push(`<text class="ref-label" style="font-size:10px" x="${padL + plotW + 6}" y="${yFor(des) + (sobrepoe ? 17 : 3)}" fill="var(--status-warning)">Desejado ${equipeTetoPercent}%</text>`);
    parts.push(`<text class="ref-label" style="font-size:9px" x="${padL + plotW + 6}" y="${yFor(des) + (sobrepoe ? 28 : 14)}" fill="var(--status-warning)">${equipeFmtH(des)}</text>`);

    const reais = t.dias.filter((x) => x.real != null);
    if (reais.length) {
      parts.push(`<polyline class="tend-real" points="${reais.map((x) => `${xFor(x.d)},${yFor(x.real)}`).join(' ')}" />`);
      reais.forEach((x) => {
        if (!x.util && x.horas === 0) return;
        parts.push(`<circle class="tend-dot" cx="${xFor(x.d)}" cy="${yFor(x.real)}" r="2.6"><title>${equipeDiaMesRotulo(x.date)}: ${equipeFmtH(x.horas)} no dia · ${equipeFmtH(x.real)} acumuladas (${((x.real / liq) * 100).toFixed(1).replace('.', ',')}% da líquida)</title></circle>`);
      });
    }

    if (corrente && fim != null) {
      const hojeInfo = t.dias.find((x) => x.iso === t.hojeIso);
      const futuros = t.dias.filter((x) => x.proj != null);
      const pontos = [[hojeInfo.d, hojeInfo.real], ...futuros.map((x) => [x.d, x.proj])];
      if (futuros.length === 0) pontos.push([hojeInfo.d, t.realizado + t.completarHoje]);
      parts.push(`<polyline class="tend-proj" points="${pontos.map(([d, v]) => `${xFor(d)},${yFor(v)}`).join(' ')}" />`);
      const ultimo = pontos[pontos.length - 1];
      const corFim = t.status === 'critico' ? 'var(--status-critical)' : t.status === 'atencao' ? 'var(--status-warning)' : 'var(--status-good)';
      parts.push(`<circle cx="${xFor(ultimo[0])}" cy="${yFor(ultimo[1])}" r="5" fill="${corFim}" stroke="var(--color-surface)" stroke-width="2"><title>Projeção no fim do mês: ${equipeFmtH(fim)} (${t.pctFim.toFixed(1).replace('.', ',')}% da líquida)</title></circle>`);
      const ancoraDireita = xFor(ultimo[0]) > padL + plotW * 0.55;
      parts.push(`<text x="${xFor(ultimo[0]) + (ancoraDireita ? -9 : 9)}" y="${yFor(ultimo[1]) + (ultimo[1] > liq ? 16 : -10)}" text-anchor="${ancoraDireita ? 'end' : 'start'}" font-size="11" font-weight="700" fill="var(--color-text)" style="paint-order:stroke;stroke:var(--color-surface);stroke-width:3px">fim do mês: ${equipeFmtH(fim)} (${t.pctFim.toFixed(1).replace('.', ',')}%)</text>`);
      futuros.forEach((x) => {
        if (!x.util) return;
        parts.push(`<circle class="tend-dot tend-dot--proj" cx="${xFor(x.d)}" cy="${yFor(x.proj)}" r="2.2"><title>${equipeDiaMesRotulo(x.date)} (projeção): ${equipeFmtH(x.proj)} acumuladas</title></circle>`);
      });
      if (t.cruzaDesejado && t.cruzaDesejado.projetado) {
        parts.push(`<circle cx="${xFor(t.cruzaDesejado.dia.getDate())}" cy="${yFor(des)}" r="6" fill="none" stroke="var(--status-warning)" stroke-width="2"><title>Cruza o desejado ≈ ${rotulo(t.cruzaDesejado)}</title></circle>`);
      }
      if (t.cruzaLimite && t.cruzaLimite.projetado) {
        parts.push(`<circle cx="${xFor(t.cruzaLimite.dia.getDate())}" cy="${yFor(liq)}" r="6" fill="none" stroke="var(--status-critical)" stroke-width="2"><title>Cruza o limite ≈ ${rotulo(t.cruzaLimite)}</title></circle>`);
      }
      parts.push(`<line x1="${xFor(hojeInfo.d)}" y1="${padT}" x2="${xFor(hojeInfo.d)}" y2="${padT + plotH}" stroke="var(--color-text-muted)" stroke-dasharray="2 3" /><text x="${xFor(hojeInfo.d)}" y="${padT - 5}" text-anchor="middle" font-size="10" fill="var(--color-text-muted)">hoje</text>`);
    }
    svg.innerHTML = parts.join('');

    els.equipeLegendProjecao.classList.toggle('hidden', !corrente);
    els.equipeLegendTetoTend.textContent = equipeTetoPercent;
  }

  function equipeRenderBarChart(ativosCount, capacidadeLiquida, capacidadeSaudavel, consumido, mesEmAndamento) {
    const svg = document.getElementById('equipeChartHoras');
    const semColaboradores = ativosCount === 0;
    els.equipeChartHorasEmptyState.classList.toggle('hidden', !semColaboradores);
    if (semColaboradores) {
      svg.innerHTML = '';
      return;
    }

    const W = 720, H = 300;
    const padL = 46, padR = 12, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const { max: maxVal, ticks } = equipeAxisScale(
      Math.max(...capacidadeLiquida, ...consumido, mesEmAndamento ? mesEmAndamento.fim : 0, 0)
    );
    const n = EQUIPE_MESES.length;
    const slot = plotW / n;
    const barW = Math.min(slot * 0.56, 46);

    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
    const xForCenter = (i) => padL + slot * i + slot / 2;
    const corStatus = (pct) => equipeStatusColor(pct);

    const svgParts = [];
    svgParts.push(
      '<defs>' +
        [['Good', 'var(--status-good)'], ['Warn', 'var(--status-warning)'], ['Crit', 'var(--status-critical)']]
          .map(([k, cor]) => `<pattern id="eqHatch${k}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="${cor}" /></pattern>`)
          .join('') +
        '</defs>'
    );
    svgParts.push(bandaDestaqueMes(padL, slot, padT, plotH));
    ticks.forEach((v) => {
      const y = yFor(v);
      svgParts.push(`<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />`);
      svgParts.push(`<text class="value-tick" x="${padL - 8}" y="${y + 3}" text-anchor="end">${v}</text>`);
    });

    EQUIPE_MESES.forEach((m, i) => {
      const center = xForCenter(i);
      const pctDeLiquida = capacidadeLiquida[i] > 0 ? Math.round((consumido[i] / capacidadeLiquida[i]) * 1000) / 10 : 0;
      const yCons = yFor(consumido[i]);
      const hCons = Math.max(padT + plotH - yCons, 0);
      const x = center - barW / 2;
      if (mesEmAndamento && mesEmAndamento.idx === i) {
        const k = mesEmAndamento.pct > 100 ? 'Crit' : mesEmAndamento.pct >= equipeTetoPercent ? 'Warn' : 'Good';
        const cor = corStatus(mesEmAndamento.pct);
        svgParts.push(
          `<rect class="bar-consumido" x="${x}" y="${yCons}" width="${barW}" height="${hCons}" rx="3" fill="url(#eqHatch${k})" stroke="${cor}">` +
            `<title>${m}: ${consumido[i]}h registradas até hoje (mês em andamento) · projeção de fechamento: ${Math.round(mesEmAndamento.fim)}h (${mesEmAndamento.pct.toFixed(1).replace('.', ',')}% da líquida)</title></rect>`
        );
        const yProj = yFor(mesEmAndamento.fim);
        svgParts.push(`<rect x="${x}" y="${yProj}" width="${barW}" height="${Math.max(yCons - yProj, 0)}" rx="3" fill="none" stroke="${cor}" stroke-dasharray="3 3"><title>Projeção de fechamento: ${Math.round(mesEmAndamento.fim)}h</title></rect>`);
      } else {
        svgParts.push(
          `<rect class="bar-consumido" x="${x}" y="${yCons}" width="${barW}" height="${hCons}" rx="3" fill="${corStatus(pctDeLiquida)}">` +
            `<title>${m}: ${consumido[i]}h consumidas de ${capacidadeLiquida[i]}h líquidas (${pctDeLiquida}% da capacidade líquida)</title></rect>`
        );
      }
    });

    // Curvas de referência (em horas): limite de 100% (capacidade líquida do
    // mês) e ocupação desejada (teto saudável). Variam com os dias úteis.
    const curva = (valores, cor, rotulo) => {
      svgParts.push(`<polyline class="tend-ref-curve" points="${valores.map((v, i) => `${xForCenter(i)},${yFor(v)}`).join(' ')}" stroke="${cor}" />`);
      valores.forEach((v, i) => {
        svgParts.push(`<circle class="tend-ref-dot" cx="${xForCenter(i)}" cy="${yFor(v)}" r="3.2" stroke="${cor}"><title>${EQUIPE_MESES[i]}: ${rotulo} ${v}h</title></circle>`);
      });
    };
    curva(capacidadeLiquida, 'var(--status-critical)', 'limite de 100% (capacidade líquida)');
    curva(capacidadeSaudavel, 'var(--status-warning)', `ocupação desejada (${equipeTetoPercent}%)`);

    EQUIPE_MESES.forEach((m, i) => {
      svgParts.push((mesTickVisivel(i) ? `<text class="month-tick" x="${xForCenter(i)}" y="${H - 8}" text-anchor="middle">${m}</text>` : ''));
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
    svgParts.push(bandaDestaqueMes(padL, slot, padT, plotH));
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

    EQUIPE_MESES.forEach((m, i) => svgParts.push((mesTickVisivel(i) ? `<text class="month-tick" x="${xForCenter(i)}" y="${H - 8}" text-anchor="middle">${m}</text>` : '')));

    svg.innerHTML = svgParts.join('');
  }

  /** Gráfico de barras empilhadas por projeto, escopado ao ano selecionado na aba Equipe. */
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
      .map((f, i) => ({ ...f, color: `var(--activity-${(i % 8) + 1})` }));

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
      const mes = indiceMesDaData(a.data);
      if (mes < 0) return;
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
    EQUIPE_MESES.forEach((m, mi) => {
      const th = document.createElement('th');
      th.textContent = m;
      if (mi === EQUIPE_DESTAQUE_IDX) th.classList.add('is-destaque');
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

      for (let mes = 0; mes < EQUIPE_MESES.length; mes++) {
        const minutos = minutosPorCelula[`${projeto.id}::${mes}`] || 0;
        const td = document.createElement('td');
        td.className = 'cell' + (minutos === 0 ? ' empty' : '') + (mes === EQUIPE_DESTAQUE_IDX ? ' is-destaque' : '');
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
