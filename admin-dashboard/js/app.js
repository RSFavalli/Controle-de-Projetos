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
    colaboradorAtivo: document.getElementById('colaboradorAtivo'),
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
    horasChartContainer: document.getElementById('horasChartContainer'),
    horasChartEmptyState: document.getElementById('horasChartEmptyState'),
  };

  /* --------------------------------- Init --------------------------------- */

  function init() {
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
      state.session = { email, senha, nome: result.nome, papel: result.papel };
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
    els.tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== `tab-${tabName}`);
    });
    if (tabName === 'apontamentos') {
      loadApontamentos();
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
      els.projetoAtivo.checked = projeto.ativo;
    } else {
      els.projetoId.value = '';
      els.projetoCliente.value = '';
      els.projetoNome.value = '';
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

    state.projetos
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((projeto) => {
        const clienteNome = clienteById[projeto.clienteId] ? clienteById[projeto.clienteId].nome : '(cliente removido)';
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
      els.colaboradorAtivo.checked = colaborador.ativo;
      els.colaboradorSenha.placeholder = 'Deixe em branco para manter a atual';
    } else {
      els.colaboradorId.value = '';
      els.colaboradorNome.value = '';
      els.colaboradorEmail.value = '';
      els.colaboradorPapel.value = 'colaborador';
      els.colaboradorCargo.value = '';
      els.colaboradorAtivo.checked = true;
      els.colaboradorSenha.placeholder = 'Senha inicial';
    }
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
      ativo: els.colaboradorAtivo.checked,
    };
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
          <td>${statusPill(colaborador.ativo)}</td>
          <td></td>
        `;
        const actionsTd = tr.querySelector('td:last-child');
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => openColaboradorForm(colaborador));
        const rowActions = document.createElement('div');
        rowActions.className = 'row-actions';
        rowActions.appendChild(editBtn);
        actionsTd.appendChild(rowActions);
        els.colaboradoresTableBody.appendChild(tr);
      });
  }

  /* ------------------------------- Apontamentos ------------------------------- */

  async function loadApontamentos() {
    try {
      // Busca tudo de uma vez (a equipe é pequena, não compensa a complexidade
      // de paginar por período) — os filtros de tela recortam em cima disso,
      // sem precisar de uma chamada nova ao servidor a cada mudança de filtro.
      const apontamentos = await Api.listApontamentos(state.session, undefined, undefined);
      state.apontamentos = apontamentos;
      renderConformidade();
      renderCharts();
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
    renderHorasChart(filtrados);
  }

  function renderConformidade() {
    const dias = Number(els.apontamentosRangeSelect.value);
    const businessDays = Holidays.lastBusinessDays(dias);
    const hoje = Holidays.dateStr(new Date());
    const ativos = state.colaboradores.filter((c) => c.ativo);

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

  function formatHm(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${h}h${String(m).padStart(2, '0')}`;
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
