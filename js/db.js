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

  getActiveTimer,
  setActiveTimer,
  clearActiveTimer,

  getSession,
  setSession,
  clearSession,

  cacheAuthSuccess,
  verifyOfflineLogin,

  getCachedClientes,
  getCachedProjetos,
  getCachedProjetosByCliente,
  setSyncedData,
  getLastSync,
};
