/**
 * api.js
 * ------------------------------------------------------------------
 * Wrapper fino sobre fetch() para o app de campo conversar com o
 * mesmo backend do Dashboard Admin (Google Apps Script Web App).
 * Veja admin-dashboard/js/api.js — é o mesmo padrão, adaptado para o
 * conjunto de ações que o app de campo usa (login e leitura de
 * clientes/projetos; não grava nada nessas coleções).
 * ------------------------------------------------------------------
 */

const Api = (() => {
  const STORAGE_KEY = 'ts_api_url';

  function getBaseUrl() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setBaseUrl(url) {
    localStorage.setItem(STORAGE_KEY, url.trim());
  }

  // O Apps Script pode ficar bem lento (cold start, planilha grande, ou
  // simplesmente sobrecarregado) e, sem isso, um fetch() parado nunca dá
  // erro sozinho — fica pendurado até o navegador desistir por conta
  // própria, o que pode levar minutos. Com o timeout, uma resposta lenta
  // vira um erro rápido e claro — e, como é marcado como isNetworkError,
  // o app de campo cai automaticamente no mesmo caminho de login
  // offline / apontamento salvo localmente que já usa para "sem conexão",
  // em vez de deixar quem está em campo esperando sem noção do que houve.
  const DEFAULT_TIMEOUT_MS = 20000;

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (networkErr) {
      const err = new Error(
        networkErr.name === 'AbortError'
          ? `O servidor demorou mais de ${Math.round(timeoutMs / 1000)}s para responder. Pode estar sobrecarregado.`
          : 'Sem conexão com a API.'
      );
      err.isNetworkError = true;
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function call(action, payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('URL da API não configurada.');
    }

    const res = await fetchWithTimeout(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    }, timeoutMs);

    let json;
    try {
      json = await res.json();
    } catch (parseErr) {
      throw new Error('Resposta inesperada da API. Confira a URL configurada.');
    }

    if (!json.ok) {
      throw new Error(json.error || 'Erro desconhecido na API.');
    }
    return json.data;
  }

  async function ping(baseUrlOverride, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const url = (baseUrlOverride || getBaseUrl()) + (baseUrlOverride && baseUrlOverride.includes('?') ? '&' : '?') + 'action=ping';
    const res = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Falha ao testar a API.');
    return json;
  }

  return {
    getBaseUrl,
    setBaseUrl,
    call,
    ping,

    login: (email, senha) => call('login', { email, senha }),
    listClientes: (email, senha) => call('listClientes', { email, senha }),
    listProjetos: (email, senha) => call('listProjetos', { email, senha }),
    syncApontamentos: (email, senha, entries, deletedIds) =>
      call('syncApontamentos', { email, senha, entries, deletedIds }),
    listMeusApontamentos: (email, senha, desde, ate) =>
      call('listMeusApontamentos', { email, senha, desde, ate }),
  };
})();

window.Api = Api;
