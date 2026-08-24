/**
 * app.js
 * ------------------------------------------------------------------
 * Wiring da tela principal do app de campo: configuração da API,
 * login (com fallback offline), cronômetro, lista de apontamentos do
 * dia e alertas.
 *
 * Sobre a senha do dispositivo: depois do login, a senha digitada é
 * salva neste aparelho (DB.setSenhaDispositivo, em js/db.js) além de
 * ficar em uma variável JS (inMemorySenha), usada para chamar a API
 * quando for preciso sincronizar Clientes/Projetos/Apontamentos. Se a
 * página recarregar, a variável em memória some, mas é restaurada a
 * partir do que foi salvo (ver init()) — assim a sincronização
 * automática continua funcionando sozinha em segundo plano, sem
 * depender de alguém reabrir a tela "Confirmar senha" manualmente.
 * A tela de reautenticação continua existindo como caminho manual
 * (ex.: sessões antigas de antes dessa mudança) e onLogout() limpa a
 * senha salva no dispositivo.
 * ------------------------------------------------------------------
 */

(function () {
  const END_OF_DAY_HOUR = 18; // a partir dessa hora, avisa sobre atividade aberta

  let inMemorySenha = null; // só dura enquanto a aba estiver aberta
  let alertsIntervalId = null;

  // Dia sendo exibido/editado na lista de apontamentos — null = hoje. Dá pra
  // navegar até ENTRIES_DAYS_BACK dias atrás pra corrigir um apontamento
  // esquecido (o cronômetro em si sempre aponta pra hoje, isso só afeta a
  // lista/edição de lançamentos já feitos).
  let entriesViewDate = null;
  const ENTRIES_DAYS_BACK = 30;
  const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const els = {
    clientSelect: document.getElementById('clientSelect'),
    projectSelect: document.getElementById('projectSelect'),
    activitySelect: document.getElementById('activitySelect'),
    observations: document.getElementById('observations'),
    timerClock: document.getElementById('timerClock'),
    timerRunningInfo: document.getElementById('timerRunningInfo'),
    startButton: document.getElementById('startButton'),
    stopButton: document.getElementById('stopButton'),
    alertsArea: document.getElementById('alertsArea'),
    entriesTableBody: document.getElementById('entriesTableBody'),
    entriesEmptyState: document.getElementById('entriesEmptyState'),
    todayTotal: document.getElementById('todayTotal'),
    entriesSyncStatus: document.getElementById('entriesSyncStatus'),
    entriesDayPrev: document.getElementById('entriesDayPrev'),
    entriesDayNext: document.getElementById('entriesDayNext'),
    entriesDayLabel: document.getElementById('entriesDayLabel'),
    entriesPendingElsewhereHint: document.getElementById('entriesPendingElsewhereHint'),
    addEntryButton: document.getElementById('addEntryButton'),

    editEntryForm: document.getElementById('editEntryForm'),
    editEntryFormTitle: document.getElementById('editEntryFormTitle'),
    editEntryId: document.getElementById('editEntryId'),
    editEntryDate: document.getElementById('editEntryDate'),
    editEntryClient: document.getElementById('editEntryClient'),
    editEntryProject: document.getElementById('editEntryProject'),
    editEntryActivity: document.getElementById('editEntryActivity'),
    editEntryStart: document.getElementById('editEntryStart'),
    editEntryEnd: document.getElementById('editEntryEnd'),
    editEntryObservations: document.getElementById('editEntryObservations'),
    cancelEditEntryButton: document.getElementById('cancelEditEntryButton'),
    statusBar: document.getElementById('statusBar'),
    connectionText: document.getElementById('connectionText'),
    updateBanner: document.getElementById('updateBanner'),
    updateBannerButton: document.getElementById('updateBannerButton'),

    configScreen: document.getElementById('configScreen'),
    loginScreen: document.getElementById('loginScreen'),
    reauthScreen: document.getElementById('reauthScreen'),
    appScreen: document.getElementById('appScreen'),

    configForm: document.getElementById('configForm'),
    apiUrlInput: document.getElementById('apiUrlInput'),
    configTestResult: document.getElementById('configTestResult'),

    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    loginHint: document.getElementById('loginHint'),
    changeApiUrlButton: document.getElementById('changeApiUrlButton'),

    reauthForm: document.getElementById('reauthForm'),
    reauthPassword: document.getElementById('reauthPassword'),
    cancelReauthButton: document.getElementById('cancelReauthButton'),

    sessionInfo: document.getElementById('sessionInfo'),
    sessionUserName: document.getElementById('sessionUserName'),
    syncStatus: document.getElementById('syncStatus'),
    syncButton: document.getElementById('syncButton'),
    logoutButton: document.getElementById('logoutButton'),

    toastArea: document.getElementById('toastArea'),
  };

  /* ---------------------------- Setup inicial ---------------------------- */

  function init() {
    DB.ensureSeeded();
    populateActivities();
    wireHandlers();

    window.addEventListener('online', onConnectivityChange);
    window.addEventListener('offline', onConnectivityChange);
    onConnectivityChange();

    window.addEventListener('beforeunload', (e) => {
      const active = Timer.getActiveEntry();
      if (active) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    registerServiceWorker();

    if (!Api.getBaseUrl()) {
      showScreen('config');
      return;
    }

    const session = DB.getSession();
    if (session) {
      // Restaura a senha salva neste aparelho (se houver) — sem isso, a
      // sessão volta "logada" mas a sincronização automática ficava
      // travada em silêncio até alguém abrir a tela de confirmar senha
      // manualmente, e apontamentos ficavam parados sem ninguém perceber.
      const senhaSalva = DB.getSenhaDispositivo();
      if (senhaSalva) inMemorySenha = senhaSalva;
      enterApp(session);
      if (inMemorySenha) {
        syncData(session.email, inMemorySenha, { silent: true });
        syncEntries({ silent: true, pull: true });
      }
    } else {
      showScreen('login');
    }
  }

  function wireHandlers() {
    els.configForm.addEventListener('submit', onConfigSubmit);
    els.loginForm.addEventListener('submit', onLoginSubmit);
    els.changeApiUrlButton.addEventListener('click', () => {
      showScreen('config');
      els.apiUrlInput.value = Api.getBaseUrl();
    });
    els.reauthForm.addEventListener('submit', onReauthSubmit);
    els.cancelReauthButton.addEventListener('click', () => showScreen('app'));

    els.logoutButton.addEventListener('click', onLogout);
    els.syncButton.addEventListener('click', onSyncButtonClick);

    els.clientSelect.addEventListener('change', onClientChange);
    els.startButton.addEventListener('click', onStartClick);
    els.stopButton.addEventListener('click', onStopClick);

    els.editEntryForm.addEventListener('submit', onEditEntrySubmit);
    els.cancelEditEntryButton.addEventListener('click', closeEditEntryForm);
    els.editEntryClient.addEventListener('change', () => {
      populateEditProjectSelect(els.editEntryClient.value);
    });
    els.addEntryButton.addEventListener('click', () => {
      openAddEntryForm(entriesViewDate || Timer.todayDateStr());
    });

    els.entriesDayPrev.addEventListener('click', () => onEntriesDayNav(-1));
    els.entriesDayNext.addEventListener('click', () => onEntriesDayNav(1));

    els.updateBannerButton.addEventListener('click', () => window.location.reload());
  }

  function showScreen(name) {
    els.configScreen.classList.toggle('hidden', name !== 'config');
    els.loginScreen.classList.toggle('hidden', name !== 'login');
    els.reauthScreen.classList.toggle('hidden', name !== 'reauth');
    els.appScreen.classList.toggle('hidden', name !== 'app');
    els.sessionInfo.classList.toggle('hidden', name !== 'app');
  }

  function populateActivities() {
    els.activitySelect.innerHTML = '';
    fillActivityOptions(els.activitySelect);
  }

  function fillActivityOptions(selectEl, placeholderText) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = placeholderText || 'Selecione a atividade';
    selectEl.appendChild(placeholder);
    window.APP_DATA.ACTIVITIES.forEach((activity) => {
      const opt = document.createElement('option');
      opt.value = activity.id;
      opt.textContent = `${activity.order}. ${activity.name}`;
      selectEl.appendChild(opt);
    });
  }

  /* ------------------------------ Configuração da API ----------------------------- */

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
        const session = DB.getSession();
        showScreen(session ? 'app' : 'login');
        if (session) refreshAppUi();
      }, 500);
    } catch (err) {
      els.configTestResult.textContent = `Não foi possível conectar: ${err.message}. Se estiver offline, você pode configurar depois que tiver internet.`;
      els.configTestResult.classList.add('error');
    }
  }

  /* --------------------------------- Login --------------------------------- */

  async function onLoginSubmit(e) {
    e.preventDefault();
    const email = els.loginEmail.value.trim();
    const senha = els.loginPassword.value;
    els.loginHint.textContent = '';

    try {
      const profile = await Api.login(email, senha);
      await DB.cacheAuthSuccess(email, senha, profile);
      DB.setSession(profile);
      DB.setSenhaDispositivo(senha);
      inMemorySenha = senha;
      els.loginPassword.value = '';
      enterApp(profile);
      syncData(email, senha, { silent: true });
      syncEntries({ silent: true, pull: true });
      return;
    } catch (err) {
      if (!err.isNetworkError) {
        toast(err.message, 'error');
        return;
      }
      // Sem conexão: tenta login offline com credencial já usada antes neste dispositivo.
      const cachedProfile = await DB.verifyOfflineLogin(email, senha);
      if (cachedProfile) {
        DB.setSession(cachedProfile);
        DB.setSenhaDispositivo(senha);
        inMemorySenha = senha;
        els.loginPassword.value = '';
        toast('Login offline (sem conexão). Sincronize quando tiver internet novamente.', 'success');
        enterApp(cachedProfile);
      } else {
        toast(
          'Sem conexão com a internet e nenhum login salvo neste dispositivo para este e-mail. Conecte-se à internet pelo menos uma vez para habilitar o uso offline.',
          'error'
        );
      }
    }
  }

  function onLogout() {
    inMemorySenha = null;
    DB.clearSession();
    DB.clearSenhaDispositivo();
    els.loginEmail.value = '';
    els.loginPassword.value = '';
    showScreen('login');
  }

  function enterApp(session) {
    showScreen('app');
    els.sessionUserName.textContent = session.nome;
    populateClientSelect();
    updateSyncStatusUi();
    refreshAppUi();
    Timer.startTicking(tickClock);
    if (alertsIntervalId) clearInterval(alertsIntervalId);
    alertsIntervalId = setInterval(renderAlerts, 60 * 1000);
  }

  /* ------------------------------ Sincronização ----------------------------- */

  async function onSyncButtonClick() {
    const session = DB.getSession();
    if (!session) return;
    if (inMemorySenha) {
      await syncData(session.email, inMemorySenha);
      await syncEntries({ pull: true });
    } else {
      showScreen('reauth');
      els.reauthPassword.focus();
    }
  }

  async function onReauthSubmit(e) {
    e.preventDefault();
    const session = DB.getSession();
    const senha = els.reauthPassword.value;
    try {
      const profile = await Api.login(session.email, senha);
      inMemorySenha = senha;
      DB.setSenhaDispositivo(senha);
      await DB.cacheAuthSuccess(session.email, senha, profile);
      els.reauthPassword.value = '';
      showScreen('app');
      await syncData(session.email, senha);
      await syncEntries({ pull: true });
    } catch (err) {
      toast(err.isNetworkError ? 'Sem conexão. Tente novamente quando estiver online.' : err.message, 'error');
    }
  }

  async function syncData(email, senha, opts = {}) {
    try {
      const [clientes, projetos] = await Promise.all([Api.listClientes(email, senha), Api.listProjetos(email, senha)]);
      DB.setSyncedData(clientes, projetos);
      populateClientSelect();
      updateSyncStatusUi();
      if (!opts.silent) toast('Clientes e projetos sincronizados.', 'success');
    } catch (err) {
      updateSyncStatusUi();
      if (!opts.silent) {
        toast(err.isNetworkError ? 'Sem conexão para sincronizar agora. Os dados salvos localmente continuam disponíveis.' : err.message, 'error');
      }
    }
  }

  function updateSyncStatusUi() {
    const last = DB.getLastSync();
    if (!last) {
      els.syncStatus.textContent = 'Nunca sincronizado';
      return;
    }
    const date = new Date(last);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    els.syncStatus.textContent = `Sincronizado às ${hh}:${mm}`;
  }

  /* ------------------------ Sincronização de apontamentos ------------------------ */

  // opts.pull: além de enviar o que está pendente, busca de volta os
  // apontamentos do próprio colaborador (de qualquer aparelho) e mescla
  // localmente — sem isso, quem usa celular e computador no mesmo dia vê uma
  // lista incompleta/diferente em cada um, já que cada aparelho só enxerga o
  // que ele mesmo registrou. Só usado nos pontos "de virada" (abrir o app,
  // logar, reautenticar, sincronizar manualmente, voltar a ficar online) —
  // não em toda ação isolada (iniciar/encerrar/editar), pra não buscar o
  // período inteiro de novo a cada clique.
  async function syncEntries(opts = {}) {
    const session = DB.getSession();
    if (!session || !inMemorySenha) return;

    const pending = DB.getUnsyncedEntries(session.id);
    const deletedIds = DB.getPendingDeletes();
    const temPendente = pending.length > 0 || deletedIds.length > 0;

    if (!temPendente && !opts.pull) {
      if (!opts.silent) toast('Nenhum apontamento pendente de sincronização.', 'success');
      updateEntriesSyncStatusUi();
      return;
    }

    try {
      if (temPendente) {
        await Api.syncApontamentos(session.email, inMemorySenha, pending, deletedIds);
        DB.markEntriesSynced(pending.map((e) => e.id), new Date().toISOString());
        DB.clearPendingDeletes(deletedIds);
      }

      if (opts.pull) {
        await pullMeusApontamentos(session);
      }

      // Registra "sincronizado" tanto ao enviar pendentes quanto ao só puxar
      // do servidor — do contrário, um pull sem nada pendente pra enviar
      // deixava o status preso em "Ainda não sincronizado" mesmo tendo
      // acabado de falar com o servidor com sucesso.
      DB.setLastEntriesSync(new Date().toISOString());
      updateEntriesSyncStatusUi();
      renderEntries();
      if (!opts.silent) {
        toast(temPendente ? `${pending.length} apontamento(s) sincronizado(s).` : 'Apontamentos atualizados.', 'success');
      }
    } catch (err) {
      updateEntriesSyncStatusUi();
      if (!opts.silent) {
        toast(
          err.isNetworkError ? 'Sem conexão para sincronizar os apontamentos agora.' : err.message,
          'error'
        );
      }
    }
  }

  async function pullMeusApontamentos(session) {
    const hoje = Timer.todayDateStr();
    const desde = addDaysToDateStr(hoje, -ENTRIES_DAYS_BACK);
    const doServidor = await Api.listMeusApontamentos(session.email, inMemorySenha, desde, hoje);
    // Não mexe no apontamento que este aparelho tem ativo agora — evita
    // truncar o startTimestamp (o servidor só guarda HH:MM, sem segundos) de
    // um cronômetro que está rodando ao vivo nesta mesma aba.
    const ativo = DB.getActiveTimer();
    const ativoId = ativo ? ativo.entryId : null;
    DB.upsertEntriesFromServer(doServidor.filter((e) => e.id !== ativoId));
  }

  function updateEntriesSyncStatusUi() {
    const session = DB.getSession();
    if (!session) return;
    const pendingCount = DB.getUnsyncedEntries(session.id).length + DB.getPendingDeletes().length;
    els.entriesSyncStatus.classList.toggle('entries-card__sync-status--pending', pendingCount > 0);
    if (pendingCount > 0) {
      els.entriesSyncStatus.textContent = `${pendingCount} pendente(s) de sincronização`;
    } else {
      const last = DB.getLastEntriesSync();
      els.entriesSyncStatus.textContent = last ? 'Apontamentos sincronizados' : 'Ainda não sincronizado';
    }
  }

  /* ------------------------------ Cliente / Projeto ----------------------------- */

  function populateClientSelect() {
    const clientes = DB.getCachedClientes().filter((c) => c.ativo !== false);
    const placeholder = els.clientSelect.querySelector('option[value=""]') || document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = clientes.length ? 'Selecione o cliente' : 'Nenhum cliente sincronizado ainda';

    els.clientSelect.innerHTML = '';
    els.clientSelect.appendChild(placeholder);
    clientes
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((cliente) => {
        const opt = document.createElement('option');
        opt.value = cliente.id;
        opt.textContent = cliente.nome;
        els.clientSelect.appendChild(opt);
      });

    els.projectSelect.innerHTML = '<option value="" disabled selected>Selecione o cliente primeiro</option>';
    els.projectSelect.disabled = true;
  }

  function onClientChange() {
    populateProjectsForClient(els.clientSelect.value);
  }

  function populateProjectsForClient(clienteId) {
    const projetos = DB.getCachedProjetosByCliente(clienteId);
    els.projectSelect.innerHTML = '';

    if (projetos.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = 'Nenhum projeto cadastrado para este cliente';
      els.projectSelect.appendChild(opt);
      els.projectSelect.disabled = true;
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Selecione o projeto';
    els.projectSelect.appendChild(placeholder);

    projetos
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((projeto) => {
        const opt = document.createElement('option');
        opt.value = projeto.id;
        opt.textContent = projeto.nome;
        els.projectSelect.appendChild(opt);
      });

    els.projectSelect.disabled = false;
  }

  /* ------------------------------ Cronômetro ----------------------------- */

  function onStartClick() {
    const session = DB.getSession();
    const activeEntry = Timer.getActiveEntry();

    if (activeEntry) {
      toast('Já existe um cronômetro em andamento. Encerre-o antes de iniciar outro.', 'error');
      return;
    }

    if (!els.clientSelect.value || !els.projectSelect.value || !els.activitySelect.value) {
      toast('Selecione Cliente, Projeto e Atividade antes de iniciar o cronômetro.', 'error');
      return;
    }

    const cliente = DB.getCachedClientes().find((c) => c.id === els.clientSelect.value);
    const projeto = DB.getCachedProjetos().find((p) => p.id === els.projectSelect.value);
    const activity = window.APP_DATA.ACTIVITIES.find((a) => a.id === els.activitySelect.value);

    Timer.start({
      employeeId: session.id,
      employeeName: session.nome,
      clientId: cliente.id,
      clientName: cliente.nome,
      projectId: projeto.id,
      projectName: projeto.nome,
      activityId: activity.id,
      activityName: activity.name,
      observations: els.observations.value,
    });

    setFormLockedForRunning(true);
    refreshAppUi();
    syncEntries({ silent: true });
  }

  function onStopClick() {
    const active = Timer.getActiveEntry();
    if (!active) return;
    Timer.stop(els.observations.value);
    setFormLockedForRunning(false);
    els.observations.value = '';
    els.clientSelect.value = '';
    els.projectSelect.innerHTML = '<option value="" disabled selected>Selecione o cliente primeiro</option>';
    els.projectSelect.disabled = true;
    els.activitySelect.value = '';
    refreshAppUi();
    syncEntries({ silent: true });
  }

  function onCloseDanglingEntry(entryId) {
    Timer.closeEntryManually(entryId, '23:59');
    refreshAppUi();
    syncEntries({ silent: true });
  }

  function onDeleteEntry(entryId) {
    const confirmed = confirm('Excluir este apontamento? Essa ação não pode ser desfeita.');
    if (!confirmed) return;
    const entry = DB.getEntries().find((e) => e.id === entryId);
    if (entry && entry.syncedAt) {
      DB.addPendingDelete(entryId);
    }
    DB.deleteEntry(entryId);
    refreshAppUi();
    syncEntries({ silent: true });
  }

  /* ------------------------ Edição de apontamento ------------------------ */

  function populateEditClientSelect(selectedClientId) {
    const clientes = DB.getCachedClientes().filter((c) => c.ativo !== false);
    els.editEntryClient.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.textContent = 'Selecione o cliente';
    els.editEntryClient.appendChild(placeholder);
    clientes
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((cliente) => {
        const opt = document.createElement('option');
        opt.value = cliente.id;
        opt.textContent = cliente.nome;
        els.editEntryClient.appendChild(opt);
      });
    els.editEntryClient.value = selectedClientId || '';
  }

  function populateEditProjectSelect(clienteId, selectedProjectId) {
    const projetos = DB.getCachedProjetosByCliente(clienteId);
    els.editEntryProject.innerHTML = '';

    if (!clienteId || projetos.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = clienteId ? 'Nenhum projeto cadastrado para este cliente' : 'Selecione o cliente primeiro';
      els.editEntryProject.appendChild(opt);
      els.editEntryProject.disabled = true;
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.textContent = 'Selecione o projeto';
    els.editEntryProject.appendChild(placeholder);

    projetos
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((projeto) => {
        const opt = document.createElement('option');
        opt.value = projeto.id;
        opt.textContent = projeto.nome;
        els.editEntryProject.appendChild(opt);
      });

    els.editEntryProject.disabled = false;
    els.editEntryProject.value = selectedProjectId || '';
  }

  function openEditEntryForm(entry) {
    els.editEntryFormTitle.textContent = 'Editar apontamento';
    els.editEntryId.value = entry.id;
    els.editEntryDate.value = entry.date;
    populateEditClientSelect(entry.clientId);
    populateEditProjectSelect(entry.clientId, entry.projectId);

    els.editEntryActivity.innerHTML = '';
    fillActivityOptions(els.editEntryActivity);
    els.editEntryActivity.value = entry.activityId;

    els.editEntryStart.value = entry.startTime || '';
    els.editEntryEnd.value = entry.endTime || '';
    els.editEntryObservations.value = entry.observations || '';

    els.editEntryForm.classList.remove('hidden');
    els.editEntryForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Reaproveita o mesmo formulário de edição para lançar um apontamento
  // esquecido num dia que não tem nenhum registro ainda — sem isso, só dava
  // pra corrigir apontamentos já existentes, nunca criar um que nunca chegou
  // a ser feito.
  function openAddEntryForm(dateStr) {
    els.editEntryFormTitle.textContent = `Adicionar apontamento — ${formatDiaLabel(dateStr)}`;
    els.editEntryId.value = '';
    els.editEntryDate.value = dateStr;
    populateEditClientSelect('');
    populateEditProjectSelect('');

    els.editEntryActivity.innerHTML = '';
    fillActivityOptions(els.editEntryActivity);

    els.editEntryStart.value = '';
    els.editEntryEnd.value = '';
    els.editEntryObservations.value = '';

    els.editEntryForm.classList.remove('hidden');
    els.editEntryForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeEditEntryForm() {
    els.editEntryForm.classList.add('hidden');
    els.editEntryForm.reset();
  }

  function onEditEntrySubmit(e) {
    e.preventDefault();
    const entryId = els.editEntryId.value;
    const isNovo = !entryId;
    const entries = DB.getEntries();
    let entry = isNovo ? null : entries.find((en) => en.id === entryId);
    if (!isNovo && !entry) {
      closeEditEntryForm();
      return;
    }

    const clientId = els.editEntryClient.value;
    const projectId = els.editEntryProject.value;
    const activityId = els.editEntryActivity.value;
    const startTimeStr = els.editEntryStart.value;
    const endTimeStr = els.editEntryEnd.value;

    if (!clientId || !projectId || !activityId || !startTimeStr || !endTimeStr) {
      toast('Preencha Cliente, Projeto, Atividade, Início e Fim.', 'error');
      return;
    }

    const cliente = DB.getCachedClientes().find((c) => c.id === clientId);
    const projeto = DB.getCachedProjetos().find((p) => p.id === projectId);
    const activity = window.APP_DATA.ACTIVITIES.find((a) => a.id === activityId);
    const dateStr = isNovo ? els.editEntryDate.value : entry.date;

    const [y, m, d] = dateStr.split('-').map(Number);
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    const startDate = new Date(y, m - 1, d, sh, sm, 0, 0);
    const endDate = new Date(y, m - 1, d, eh, em, 0, 0);

    if (endDate <= startDate) {
      toast('O horário de fim deve ser depois do horário de início.', 'error');
      return;
    }

    const agora = new Date().toISOString();
    if (isNovo) {
      const session = DB.getSession();
      entry = {
        id: DB.generateId(),
        employeeId: session.id,
        employeeName: session.nome,
        date: dateStr,
        status: 'concluido',
        createdAt: agora,
      };
    }

    entry.clientId = cliente.id;
    entry.clientName = cliente.nome;
    entry.projectId = projeto.id;
    entry.projectName = projeto.nome;
    entry.activityId = activity.id;
    entry.activityName = activity.name;
    entry.startTime = startTimeStr;
    entry.endTime = endTimeStr;
    entry.startTimestamp = startDate.getTime();
    entry.endTimestamp = endDate.getTime();
    entry.durationMinutes = Math.round((endDate - startDate) / 60000);
    entry.observations = els.editEntryObservations.value;
    entry.updatedAt = agora;

    DB.saveEntry(entry);
    closeEditEntryForm();
    refreshAppUi();
    toast(isNovo ? 'Apontamento adicionado com sucesso.' : 'Apontamento atualizado com sucesso.', 'success');
    syncEntries({ silent: true });
  }

  function setFormLockedForRunning(isRunning) {
    els.clientSelect.disabled = isRunning;
    els.projectSelect.disabled = isRunning || !els.clientSelect.value;
    els.activitySelect.disabled = isRunning;
    els.startButton.disabled = isRunning;
    els.stopButton.disabled = !isRunning;
  }

  function tickClock() {
    const session = DB.getSession();
    const active = Timer.getActiveEntry();
    if (!session || !active || active.employeeId !== session.id) {
      els.timerClock.textContent = '00:00:00';
      els.timerRunningInfo.classList.add('hidden');
      return;
    }
    const elapsed = Timer.getElapsedSeconds(active);
    els.timerClock.textContent = Timer.formatHms(elapsed);
    els.timerRunningInfo.textContent = `${active.clientName} · ${active.projectName} · ${active.activityName} (desde ${active.startTime})`;
    els.timerRunningInfo.classList.remove('hidden');
  }

  /* ------------------------------ Renderização ---------------------------- */

  function addDaysToDateStr(dateStr, delta) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    return Timer.todayDateStr(date);
  }

  function formatDiaLabel(dateStr) {
    const hoje = Timer.todayDateStr();
    if (dateStr === hoje) return 'Hoje';
    if (dateStr === addDaysToDateStr(hoje, -1)) return 'Ontem';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${DIAS_SEMANA[date.getDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  }

  function onEntriesDayNav(delta) {
    const hoje = Timer.todayDateStr();
    const limite = addDaysToDateStr(hoje, -ENTRIES_DAYS_BACK);
    const atual = entriesViewDate || hoje;
    const proximo = addDaysToDateStr(atual, delta);
    if (proximo > hoje || proximo < limite) return;
    goToEntriesDay(proximo);
  }

  function updateEntriesDayNav(dateStr) {
    const hoje = Timer.todayDateStr();
    const limite = addDaysToDateStr(hoje, -ENTRIES_DAYS_BACK);
    els.entriesDayLabel.textContent = formatDiaLabel(dateStr);
    els.entriesDayNext.disabled = dateStr >= hoje;
    els.entriesDayPrev.disabled = dateStr <= limite;
  }

  function goToEntriesDay(dateStr) {
    entriesViewDate = dateStr === Timer.todayDateStr() ? null : dateStr;
    closeEditEntryForm();
    renderEntries();
  }

  // Se houver apontamento pendente de sincronização num dia diferente do que
  // está sendo exibido, mostra um aviso clicável apontando pra lá — sem isso,
  // quem abre o app direto na tela "Hoje" (vazia) não tem motivo pra imaginar
  // que precisa navegar pelas setas pra achar o que falta sincronizar (foi
  // exatamente essa confusão que gerou a dúvida de uma colaboradora em campo).
  function updateEntriesPendingElsewhereHint(session, viewDate) {
    const hintEl = els.entriesPendingElsewhereHint;
    const outrosDias = Array.from(
      new Set(DB.getUnsyncedEntries(session.id).map((e) => e.date).filter((d) => d && d !== viewDate))
    ).sort();

    if (outrosDias.length === 0) {
      hintEl.classList.add('hidden');
      hintEl.onclick = null;
      return;
    }

    const alvo = outrosDias[outrosDias.length - 1];
    const extra = outrosDias.length > 1 ? ` (e mais ${outrosDias.length - 1} dia(s))` : '';
    hintEl.textContent = `⚠ Há apontamento(s) pendente(s) de sincronização em outro dia. Toque aqui para ver ${formatDiaLabel(alvo)}${extra}.`;
    hintEl.classList.remove('hidden');
    hintEl.onclick = () => goToEntriesDay(alvo);
  }

  function renderEntries() {
    const session = DB.getSession();
    if (!session) return;
    const viewDate = entriesViewDate || Timer.todayDateStr();
    updateEntriesDayNav(viewDate);
    updateEntriesPendingElsewhereHint(session, viewDate);
    const entries = DB.getEntriesByEmployeeAndDate(session.id, viewDate).sort((a, b) =>
      (a.startTime || '').localeCompare(b.startTime || '')
    );

    els.entriesTableBody.innerHTML = '';
    els.entriesEmptyState.textContent =
      viewDate === Timer.todayDateStr() ? 'Nenhum apontamento registrado hoje ainda.' : 'Nenhum apontamento registrado neste dia.';
    els.entriesEmptyState.classList.toggle('hidden', entries.length !== 0);

    let totalMinutes = 0;

    entries.forEach((entry) => {
      const tr = document.createElement('tr');
      if (entry.status === 'em_andamento') tr.classList.add('is-open');

      const duration =
        entry.status === 'em_andamento'
          ? Timer.formatHm(Timer.getElapsedSeconds(entry) / 60)
          : Timer.formatHm(entry.durationMinutes || 0);

      totalMinutes += entry.status === 'concluido' ? entry.durationMinutes || 0 : Timer.getElapsedSeconds(entry) / 60;

      tr.innerHTML = `
        <td>${escapeHtml(entry.clientName)}</td>
        <td>${escapeHtml(entry.projectName)}</td>
        <td>${escapeHtml(entry.activityName)}</td>
        <td>${entry.startTime || '-'}</td>
        <td>${entry.endTime || '<span class="entry-status">em aberto</span>'}</td>
        <td>${duration}</td>
        <td>${escapeHtml(entry.observations || '')}</td>
        <td></td>
      `;

      const actionsTd = tr.querySelector('td:last-child');
      const rowActions = document.createElement('div');
      rowActions.className = 'row-actions';
      if (entry.status !== 'em_andamento') {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'row-actions__edit';
        editBtn.title = 'Editar apontamento';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => openEditEntryForm(entry));
        rowActions.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.title = 'Excluir apontamento';
        delBtn.textContent = '🗑';
        delBtn.addEventListener('click', () => onDeleteEntry(entry.id));
        rowActions.appendChild(delBtn);
      }
      actionsTd.appendChild(rowActions);
      els.entriesTableBody.appendChild(tr);
    });

    els.todayTotal.textContent = `Total: ${Timer.formatHm(totalMinutes)}`;
  }

  function renderAlerts() {
    const session = DB.getSession();
    if (!session) return;
    els.alertsArea.innerHTML = '';
    const today = Timer.todayDateStr();

    const dangling = DB.getDanglingOpenEntries(session.id, today);
    dangling.forEach((entry) => {
      const div = document.createElement('div');
      div.className = 'alert alert--danger';
      div.innerHTML = `
        <strong>Apontamento sem encerramento encontrado</strong>
        <span>${escapeHtml(entry.clientName)} · ${escapeHtml(entry.projectName)} · ${escapeHtml(entry.activityName)} — iniciado em ${entry.date} às ${entry.startTime} e nunca encerrado.</span>
      `;
      const actions = document.createElement('div');
      actions.className = 'alert__actions';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn--small btn--ghost';
      closeBtn.textContent = 'Encerrar às 23:59 daquele dia';
      closeBtn.addEventListener('click', () => onCloseDanglingEntry(entry.id));
      actions.appendChild(closeBtn);
      div.appendChild(actions);
      els.alertsArea.appendChild(div);
    });

    const now = new Date();
    const active = Timer.getActiveEntry();
    if (active && active.employeeId === session.id && active.date === today && now.getHours() >= END_OF_DAY_HOUR) {
      const div = document.createElement('div');
      div.className = 'alert alert--warning';
      div.innerHTML = `
        <strong>Já passou das ${END_OF_DAY_HOUR}h e há uma atividade em aberto</strong>
        <span>${escapeHtml(active.clientName)} · ${escapeHtml(active.projectName)} · ${escapeHtml(active.activityName)} — iniciada às ${active.startTime}. Não esqueça de encerrar o cronômetro antes de sair.</span>
      `;
      els.alertsArea.appendChild(div);
    }
  }

  function refreshAppUi() {
    const session = DB.getSession();
    if (!session) return;
    const active = Timer.getActiveEntry();
    const isRunningForThisEmployee = !!active && active.employeeId === session.id;

    if (isRunningForThisEmployee) {
      els.clientSelect.value = active.clientId;
      populateProjectsForClient(active.clientId);
      els.projectSelect.value = active.projectId;
      els.activitySelect.value = active.activityId;
      els.observations.value = active.observations || '';
    }
    setFormLockedForRunning(isRunningForThisEmployee);

    tickClock();
    renderEntries();
    renderAlerts();
    updateEntriesSyncStatusUi();
  }

  /* ------------------------------ Utilitários ----------------------------- */

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
    setTimeout(() => div.remove(), 4500);
  }

  function onConnectivityChange() {
    const online = navigator.onLine;
    els.statusBar.classList.toggle('offline', !online);
    els.connectionText.textContent = online
      ? 'Online — dados salvos localmente'
      : 'Offline — seus apontamentos continuam sendo salvos neste dispositivo';

    // Volta a conexão: tenta sincronizar sozinho se já tiver a senha em memória.
    if (online) {
      const session = DB.getSession();
      if (session && inMemorySenha) {
        syncData(session.email, inMemorySenha, { silent: true });
        syncEntries({ silent: true, pull: true });
      }
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((registration) => {
          // Uma aba deixada aberta por dias (comum em campo) nunca percebe
          // sozinha que existe uma versão nova do app — o navegador só
          // reconfere o sw.js em certos momentos de navegação, não com a
          // aba já aberta parada. Sem isso, quem nunca fecha a aba fica
          // preso numa versão antiga do app indefinidamente.
          setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);

          registration.addEventListener('updatefound', () => {
            const novoWorker = registration.installing;
            if (!novoWorker) return;
            novoWorker.addEventListener('statechange', () => {
              // "installed" com um controller já ativo = havia uma versão
              // anterior rodando, ou seja, isto é uma atualização (não a
              // primeira instalação do service worker).
              if (novoWorker.state === 'installed' && navigator.serviceWorker.controller) {
                els.updateBanner.classList.remove('hidden');
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[app] Falha ao registrar o service worker:', err);
        });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
