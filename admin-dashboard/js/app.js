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
    colaboradorAtivo: document.getElementById('colaboradorAtivo'),
    cancelColaboradorButton: document.getElementById('cancelColaboradorButton'),
    colaboradoresTableBody: document.getElementById('colaboradoresTableBody'),
    colaboradoresEmptyState: document.getElementById('colaboradoresEmptyState'),
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
      els.colaboradorAtivo.checked = colaborador.ativo;
      els.colaboradorSenha.placeholder = 'Deixe em branco para manter a atual';
    } else {
      els.colaboradorId.value = '';
      els.colaboradorNome.value = '';
      els.colaboradorEmail.value = '';
      els.colaboradorPapel.value = 'colaborador';
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
