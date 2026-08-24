/**
 * db.js
 * ------------------------------------------------------------------
 * Camada de persistência local (offline-first) do app de campo.
 *
 * Duas categorias de dados:
 *
 * 1) Dados que SÓ existem localmente e nunca saem daqui nesta etapa:
 *    apontamentos (entries) e o timer ativo. Continuam salvos 100%
 *    em localStorage, como antes.
 *
 * 2) Dados que vêm do backend (Clientes, Projetos) e são cacheados
 *    aqui para o app continuar funcionando sem internet. O cache é
 *    atualizado sempre que js/app.js consegue falar com a API (login
 *    ou sincronização manual). Enquanto offline, o app usa a última
 *    cópia salva.
 *
 * Também guarda:
 *   - a sessão do colaborador logado (persistente, para não pedir
 *     login toda vez que abrir o app em campo);
 *   - um cache de verificador de senha por e-mail, que permite fazer
 *     login OFFLINE em um dispositivo onde essa pessoa já logou pelo
 *     menos uma vez online (veja js/app.js, função attemptLogin).
 * ------------------------------------------------------------------
 */

const DB_KEYS = {
  ENTRIES: 'ts_entries',
  ACTIVE_TIMER: 'ts_active_timer',
  SESSION: 'ts_session',
  AUTH_CACHE: 'ts_auth_cache',
  CLIENTES_CACHE: 'ts_clientes_cache',
  PROJETOS_CACHE: 'ts_projetos_cache',
  LAST_SYNC: 'ts_last_sync',
  PENDING_DELETES: 'ts_pending_deletes',
  LAST_ENTRIES_SYNC: 'ts_last_entries_sync',
  SENHA_DISPOSITIVO: 'ts_senha_dispositivo',
};

function dbRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[db] Falha ao ler "${key}" do localStorage:`, err);
    return fallback;
  }
}

function dbWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[db] Falha ao gravar "${key}" no localStorage:`, err);
    return false;
  }
}

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureSeeded() {
  if (dbRead(DB_KEYS.ENTRIES, null) === null) {
    dbWrite(DB_KEYS.ENTRIES, []);
  }
}

/* ---------------------- Apontamentos (entries) ---------------------- */

function getEntries() {
  return dbRead(DB_KEYS.ENTRIES, []);
}

function getEntriesByEmployee(employeeId) {
  return getEntries().filter((e) => e.employeeId === employeeId);
}

function getEntriesByEmployeeAndDate(employeeId, dateStr) {
  return getEntriesByEmployee(employeeId).filter((e) => e.date === dateStr);
}

function saveEntry(entry) {
  const entries = getEntries();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  dbWrite(DB_KEYS.ENTRIES, entries);
  return entry;
}

function deleteEntry(entryId) {
  const entries = getEntries().filter((e) => e.id !== entryId);
  dbWrite(DB_KEYS.ENTRIES, entries);
}

function getDanglingOpenEntries(employeeId, todayStr) {
  return getEntriesByEmployee(employeeId).filter(
    (e) => e.status === 'em_andamento' && e.date !== todayStr
  );
}

/* ---------------------- Sincronização de apontamentos ---------------------- */
/* Cada apontamento guarda um "syncedAt" (quando foi enviado com sucesso ao
 * backend pela última vez). Fica pendente sempre que syncedAt estiver vazio ou
 * for anterior a updatedAt (ex.: depois de editar ou de encerrar).
 *
 * Entradas "em_andamento" também sincronizam (sem hora_fim ainda) — é assim que
 * o Dashboard consegue enxergar, entre dispositivos, quando alguém esqueceu de
 * encerrar uma atividade. Ao encerrar, o updatedAt muda de novo e o mesmo
 * registro é reenviado (upsert por id), agora com a hora_fim preenchida. */

function getUnsyncedEntries(employeeId) {
  return getEntriesByEmployee(employeeId).filter(
    (e) => !e.syncedAt || new Date(e.updatedAt) > new Date(e.syncedAt)
  );
}

function markEntriesSynced(ids, timestamp) {
  if (!ids.length) return;
  const entries = getEntries();
  ids.forEach((id) => {
    const entry = entries.find((e) => e.id === id);
    if (entry) entry.syncedAt = timestamp;
  });
  dbWrite(DB_KEYS.ENTRIES, entries);
}

function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

/* Mescla apontamentos vindos do servidor (do próprio colaborador, de
 * qualquer aparelho) na lista local — sem isso, cada aparelho só enxerga o
 * que ele mesmo registrou, e quem aponta pelo celular de manhã e pelo
 * computador à tarde vê uma lista incompleta/diferente em cada um. Nunca
 * sobrescreve uma edição local ainda não sincronizada (evita perder uma
 * correção que só ainda não chegou ao servidor) e nunca remove localmente o
 * que o servidor não devolveu (evita apagar um apontamento novo que ainda
 * não foi sincronizado por não estar, claro, no que veio do servidor). */
function upsertEntriesFromServer(serverEntries) {
  const locais = getEntries();
  const porId = new Map(locais.map((e) => [e.id, e]));
  serverEntries.forEach((remoto) => {
    const local = porId.get(remoto.id);
    const localPendente = local && (!local.syncedAt || new Date(local.updatedAt) > new Date(local.syncedAt));
    if (localPendente) return;
    porId.set(remoto.id, {
      ...remoto,
      startTimestamp: combineDateAndTime(remoto.date, remoto.startTime),
      endTimestamp: remoto.endTime ? combineDateAndTime(remoto.date, remoto.endTime) : null,
      syncedAt: remoto.updatedAt || new Date().toISOString(),
    });
  });
  dbWrite(DB_KEYS.ENTRIES, Array.from(porId.values()));
}

function getPendingDeletes() {
  return dbRead(DB_KEYS.PENDING_DELETES, []);
}

function addPendingDelete(entryId) {
  const pending = getPendingDeletes();
  if (!pending.includes(entryId)) {
    pending.push(entryId);
    dbWrite(DB_KEYS.PENDING_DELETES, pending);
  }
}

function clearPendingDeletes(ids) {
  if (!ids.length) return;
  const pending = getPendingDeletes().filter((id) => !ids.includes(id));
  dbWrite(DB_KEYS.PENDING_DELETES, pending);
}

function getLastEntriesSync() {
  return dbRead(DB_KEYS.LAST_ENTRIES_SYNC, null);
}

function setLastEntriesSync(timestamp) {
  dbWrite(DB_KEYS.LAST_ENTRIES_SYNC, timestamp);
}

/* ---------------------- Timer ativo ---------------------- */

function getActiveTimer() {
  return dbRead(DB_KEYS.ACTIVE_TIMER, null);
}

function setActiveTimer(timerEntry) {
  dbWrite(DB_KEYS.ACTIVE_TIMER, timerEntry);
}

function clearActiveTimer() {
  localStorage.removeItem(DB_KEYS.ACTIVE_TIMER);
}

/* ---------------------- Sessão do colaborador logado ---------------------- */

function getSession() {
  return dbRead(DB_KEYS.SESSION, null);
}

function setSession(session) {
  dbWrite(DB_KEYS.SESSION, session);
}

function clearSession() {
  localStorage.removeItem(DB_KEYS.SESSION);
}

/* ---------------------- Senha do colaborador neste aparelho ---------------------- */
/* Guardada em texto puro no dispositivo por decisão explícita (trade-off de
 * segurança por conveniência) — sem ela, a senha só vive em memória e some a
 * cada vez que a página recarrega (comum em navegador de celular), o que
 * travava a sincronização automática silenciosamente e já causou perda de
 * apontamentos não sincronizados no campo. Sempre limpa no logout. */

function getSenhaDispositivo() {
  return dbRead(DB_KEYS.SENHA_DISPOSITIVO, null);
}

function setSenhaDispositivo(senha) {
  dbWrite(DB_KEYS.SENHA_DISPOSITIVO, senha);
}

function clearSenhaDispositivo() {
  localStorage.removeItem(DB_KEYS.SENHA_DISPOSITIVO);
}

/* ---------------------- Cache de autenticação offline ---------------------- */
/* Guarda, por e-mail, um verificador derivado da senha (SHA-256 local, com
 * "tempero" só deste app — nada a ver com o hash guardado no backend) e o
 * perfil retornado no último login bem-sucedido online. Isso permite logar
 * de novo sem internet, no mesmo dispositivo, sem guardar a senha em si. */

async function computeLocalVerifier(email, senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`timesheet-local-verifier::${email.toLowerCase()}::${senha}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAuthCache() {
  return dbRead(DB_KEYS.AUTH_CACHE, {});
}

async function cacheAuthSuccess(email, senha, profile) {
  const cache = getAuthCache();
  const verifier = await computeLocalVerifier(email, senha);
  cache[email.toLowerCase()] = { verifier, profile, cachedAt: new Date().toISOString() };
  dbWrite(DB_KEYS.AUTH_CACHE, cache);
}

async function verifyOfflineLogin(email, senha) {
  const cache = getAuthCache();
  const entry = cache[email.toLowerCase()];
  if (!entry) return null;
  const verifier = await computeLocalVerifier(email, senha);
  if (verifier !== entry.verifier) return null;
  return entry.profile;
}

/* ---------------------- Cache de Clientes / Projetos ---------------------- */

function getCachedClientes() {
  return dbRead(DB_KEYS.CLIENTES_CACHE, []);
}

function getCachedProjetos() {
  return dbRead(DB_KEYS.PROJETOS_CACHE, []);
}

function getCachedProjetosByCliente(clienteId) {
  return getCachedProjetos().filter((p) => p.clienteId === clienteId && p.ativo !== false);
}

function setSyncedData(clientes, projetos) {
  dbWrite(DB_KEYS.CLIENTES_CACHE, clientes);
  dbWrite(DB_KEYS.PROJETOS_CACHE, projetos);
  dbWrite(DB_KEYS.LAST_SYNC, new Date().toISOString());
}

function getLastSync() {
  return dbRead(DB_KEYS.LAST_SYNC, null);
}

window.DB = {
  KEYS: DB_KEYS,
  generateId,
  ensureSeeded,

  getEntries,
  getEntriesByEmployee,
  getEntriesByEmployeeAndDate,
  saveEntry,
  deleteEntry,
  getDanglingOpenEntries,

  getUnsyncedEntries,
  markEntriesSynced,
  upsertEntriesFromServer,
  getPendingDeletes,
  addPendingDelete,
  clearPendingDeletes,
  getLastEntriesSync,
  setLastEntriesSync,

  getActiveTimer,
  setActiveTimer,
  clearActiveTimer,

  getSession,
  setSession,
  clearSession,

  getSenhaDispositivo,
  setSenhaDispositivo,
  clearSenhaDispositivo,

  cacheAuthSuccess,
  verifyOfflineLogin,

  getCachedClientes,
  getCachedProjetos,
  getCachedProjetosByCliente,
  setSyncedData,
  getLastSync,
};
