/**
 * api.js
 * ------------------------------------------------------------------
 * Wrapper fino sobre fetch() para conversar com o backend (Google Apps
 * Script publicado como Web App — veja backend/Code.gs e SETUP.md).
 *
 * Detalhe importante: o POST é enviado com Content-Type "text/plain"
 * (em vez de "application/json") de propósito. Isso evita que o
 * navegador dispare uma requisição de preflight OPTIONS, que o Apps
 * Script não trata bem — é um padrão comum ao integrar fetch() com
 * Web Apps do Apps Script.
 * ------------------------------------------------------------------
 */

const Api = (() => {
  const STORAGE_KEY = 'admin_api_url';

  function getBaseUrl() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setBaseUrl(url) {
    localStorage.setItem(STORAGE_KEY, url.trim());
  }

  function clearBaseUrl() {
    localStorage.removeItem(STORAGE_KEY);
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
      throw new Error('Não foi possível conectar à API. Verifique sua conexão com a internet e a URL configurada.');
    }

    let json;
    try {
      json = await res.json();
    } catch (parseErr) {
      throw new Error('Resposta inesperada da API (não é JSON). Confira se a URL termina em "/exec" e se a implantação está ativa.');
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
    clearBaseUrl,
    call,
    ping,

    login: (email, senha) => call('login', { email, senha }),

    listClientes: (session) => call('listClientes', session),
    saveCliente: (session, cliente) => call('saveCliente', { ...session, cliente }),

    listProjetos: (session) => call('listProjetos', session),
    saveProjeto: (session, projeto) => call('saveProjeto', { ...session, projeto }),

    listColaboradores: (session) => call('listColaboradores', session),
    saveColaborador: (session, colaborador) => call('saveColaborador', { ...session, colaborador }),

    listApontamentos: (session, desde, ate) => call('listApontamentos', { ...session, desde, ate }),
    enviarReforcoApontamento: (session, colaboradorId, mensagem) =>
      call('enviarReforcoApontamento', { ...session, colaboradorId, mensagem }),
  };
})();

window.Api = Api;
