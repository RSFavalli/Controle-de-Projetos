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

  // O Apps Script pode ficar bem lento (cold start, planilha grande, ou
  // simplesmente sobrecarregado) e, sem isso, um fetch() parado nunca dá
  // erro sozinho — fica pendurado até o navegador desistir por conta
  // própria, o que pode levar minutos. Com o timeout, uma resposta lenta
  // vira um erro claro e acionável em vez de uma tela "travada".
  const DEFAULT_TIMEOUT_MS = 20000;

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        const seconds = Math.round(timeoutMs / 1000);
        throw new Error(`O servidor demorou mais de ${seconds}s para responder. Pode estar sobrecarregado — tente novamente em instantes.`);
      }
      throw new Error('Não foi possível conectar à API. Verifique sua conexão com a internet e a URL configurada.');
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
      throw new Error('Resposta inesperada da API (não é JSON). Confira se a URL termina em "/exec" e se a implantação está ativa.');
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
    clearBaseUrl,
    call,
    ping,

    login: (email, senha) => call('login', { email, senha }),

    // Autentica uma vez só e devolve clientes+projetos+colaboradores numa
    // única chamada — usada pelo carregamento inicial do Dashboard no lugar
    // de 3 chamadas separadas em paralelo (cada uma reautenticando do zero).
    loadDashboardInit: (session) => call('loadDashboardInit', session),

    listClientes: (session) => call('listClientes', session),
    saveCliente: (session, cliente) => call('saveCliente', { ...session, cliente }),

    listProjetos: (session) => call('listProjetos', session),
    saveProjeto: (session, projeto) => call('saveProjeto', { ...session, projeto }),

    listColaboradores: (session) => call('listColaboradores', session),
    saveColaborador: (session, colaborador) => call('saveColaborador', { ...session, colaborador }),
    excluirColaborador: (session, id) => call('excluirColaborador', { ...session, id }),

    listApontamentos: (session, desde, ate) => call('listApontamentos', { ...session, desde, ate }),
    enviarReforcoApontamento: (session, colaboradorId, mensagem) =>
      call('enviarReforcoApontamento', { ...session, colaboradorId, mensagem }),

    gerarResumoIA: (session) => call('gerarResumoIA', session),

    contarApontamentosPorPeriodo: (session, desde, ate) => call('contarApontamentosPorPeriodo', { ...session, desde, ate }),
    excluirApontamentosPorPeriodo: (session, desde, ate) => call('excluirApontamentosPorPeriodo', { ...session, desde, ate }),

    listCenarios: (session) => call('listCenarios', session),
    saveCenario: (session, cenario) => call('saveCenario', { ...session, cenario }),
    excluirCenario: (session, id) => call('excluirCenario', { ...session, id }),
  };
})();

window.Api = Api;
