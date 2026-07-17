/**
 * app.js
 * ------------------------------------------------------------------
 * Wiring da tela principal do app de campo: configuração da API,
 * login (com fallback offline), cronômetro, lista de apontamentos do
 * dia e alertas.
 *
 * Sobre a senha em memória: depois do login, a senha digitada fica
 * apenas em uma variável JS (não é salva em localStorage) e é usada
 * para chamar a API quando for preciso sincronizar Clientes/Projetos.
 * Se a página for recarregada, essa variável se perde por design —
 * a sessão (quem está logado) continua salva e o app funciona
 * normalmente com os dados em cache, mas para sincronizar de novo o
 * app pede para confirmar a senha uma vez (tela "Confirmar senha").
 * Isso evita guardar a senha em texto puro no dispositivo enquanto
 * ainda permite uso 100% offline depois do primeiro login.
 * ------------------------------------------------------------------
 */

(function () {
  const END_OF_DAY_HOUR = 18; // a partir dessa hora, avisa sobre atividade aberta

  let inMemorySenha = null; // só dura enquanto a aba estiver aberta

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

    editEntryForm: document.getElementById('editEntryForm'),
    editEntryId: document.getElementById('editEntryId'),
    editEntryClient: document.getElementById('editEntryClient'),
    editEntryProject: document.getElementById('editEntryProject'),
    editEntryActivity: document.getElementById('editEntryActivity'),
    editEntryStart: document.getElementById('editEntryStart'),
    editEntryEnd: document.getElementById('editEntryEnd'),
    editEntryObservations: document.getElementById('editEntryObservations'),
    cancelEditEntryButton: document.getElementById('cancelEditEntryButton'),
    statusBar: document.getElementById('statusBar'),
    connectionText: document.getElementById('connectionText'),

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
      enterApp(session);
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
      inMemorySenha = senha;
      els.loginPassword.value = '';
      enterApp(profile);
      syncData(email, senha, { silent: true });
      syncEntries({ silent: true });
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
    setInterval(renderAlerts, 60 * 1000);
  }

  /* ------------------------------ Sincronização ----------------------------- */

  async function onSyncButtonClick() {
    const session = DB.getSession();
    if (!session) return;
    if (inMemorySenha) {
      await syncData(session.email, inMemorySenha);
      await syncEntries();
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
      await DB.cacheAuthSuccess(session.email, senha, profile);
      els.reauthPassword.value = '';
      showScreen('app');
      await syncData(session.email, senha);
      await syncEntries();
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

  async function syncEntries(opts = {}) {
    const session = DB.getSession();
    if (!session || !inMemorySenha) return;

    const pending = DB.getUnsyncedEntries(session.id);
    const deletedIds = DB.getPendingDeletes();
    if (pending.length === 0 && deletedIds.length === 0) {
      if (!opts.silent) toast('Nenhum apontamento pendente de sincronização.', 'success');
      updateEntriesSyncStatusUi();
      return;
    }

    try {
      await Api.syncApontamentos(session.email, inMemorySenha, pending, deletedIds);
      const now = new Date().toISOString();
      DB.markEntriesSynced(pending.map((e) => e.id), now);
      DB.clearPendingDeletes(deletedIds);
      DB.setLastEntriesSync(now);
      updateEntriesSyncStatusUi();
      if (!opts.silent) toast(`${pending.length} apontamento(s) sincronizado(s).`, 'success');
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
    els.editEntryId.value = entry.id;
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

  function closeEditEntryForm() {
    els.editEntryForm.classList.add('hidden');
    els.editEntryForm.reset();
  }

  function onEditEntrySubmit(e) {
    e.preventDefault();
    const entryId = els.editEntryId.value;
    const entries = DB.getEntries();
    const entry = entries.find((en) => en.id === entryId);
    if (!entry) {
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

    const [y, m, d] = entry.date.split('-').map(Number);
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    const startDate = new Date(y, m - 1, d, sh, sm, 0, 0);
    const endDate = new Date(y, m - 1, d, eh, em, 0, 0);

    if (endDate <= startDate) {
      toast('O horário de fim deve ser depois do horário de início.', 'error');
      return;
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
    entry.updatedAt = new Date().toISOString();

    DB.saveEntry(entry);
    closeEditEntryForm();
    refreshAppUi();
    toast('Apontamento atualizado com sucesso.', 'success');
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

  function renderEntries() {
    const session = DB.getSession();
    if (!session) return;
    const today = Timer.todayDateStr();
    const entries = DB.getEntriesByEmployeeAndDate(session.id, today).sort((a, b) =>
      (a.startTime || '').localeCompare(b.startTime || '')
    );

    els.entriesTableBody.innerHTML = '';
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
        syncEntries({ silent: true });
      }
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('[app] Falha ao registrar o service worker:', err);
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
