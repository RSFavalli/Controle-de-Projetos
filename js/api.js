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

  async function call(action, payload = {}) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('URL da API não configurada.');
    }

    let res;
    try {
      res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch (networkErr) {
      const err = new Error('Sem conexão com a API.');
      err.isNetworkError = true;
      throw err;
    }

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

  async function ping(baseUrlOverride) {
    const url = (baseUrlOverride || getBaseUrl()) + (baseUrlOverride && baseUrlOverride.includes('?') ? '&' : '?') + 'action=ping';
    const res = await fetch(url, { method: 'GET' });
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
  };
})();

window.Api = Api;
