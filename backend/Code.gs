/**
 * Code.gs — Backend do Timesheet (Google Apps Script + Google Sheets)
 * ------------------------------------------------------------------
 * Este script transforma uma planilha do Google Sheets em uma API que o
 * Dashboard Admin (e, futuramente, o app de campo) chama pela internet.
 *
 * Abas esperadas na planilha (crie-as com esses nomes EXATOS, ou rode
 * a função seedDatabase() uma vez, que cria tudo automaticamente):
 *
 *   Colaboradores: id | nome | email | senha_hash | papel | ativo | criado_em
 *   Clientes:      id | nome | ativo | criado_em
 *   Projetos:      id | cliente_id | nome | ativo | criado_em
 *
 * "papel" em Colaboradores é "admin" ou "colaborador". Apenas quem tem
 * papel = admin consegue usar o Dashboard Admin.
 *
 * COMO PUBLICAR: veja o arquivo SETUP.md que acompanha este script.
 * ------------------------------------------------------------------
 */

const SHEET_COLABORADORES = 'Colaboradores';
const SHEET_CLIENTES = 'Clientes';
const SHEET_PROJETOS = 'Projetos';

const HEADERS = {
  [SHEET_COLABORADORES]: ['id', 'nome', 'email', 'senha_hash', 'papel', 'ativo', 'criado_em'],
  [SHEET_CLIENTES]: ['id', 'nome', 'ativo', 'criado_em'],
  [SHEET_PROJETOS]: ['id', 'cliente_id', 'nome', 'ativo', 'criado_em'],
};

/* ========================================================================
 * Entradas HTTP
 * ==================================================================== */

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null;
  if (action === 'ping') {
    return jsonOutput({ ok: true, message: 'Timesheet API online', time: new Date().toISOString() });
  }
  return jsonOutput({
    ok: false,
    error: 'Use POST para chamar a API. GET só é suportado com ?action=ping para teste rápido.',
  });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ ok: false, error: 'Corpo da requisição inválido (esperado JSON).' });
  }

  try {
    const action = body.action;
    let data;

    switch (action) {
      case 'ping':
        data = { message: 'Timesheet API online', time: new Date().toISOString() };
        break;

      case 'login':
        data = login(body.email, body.senha);
        break;

      case 'listColaboradores':
        requireAdmin(body.email, body.senha);
        data = listColaboradores();
        break;

      case 'saveColaborador':
        requireAdmin(body.email, body.senha);
        data = saveColaborador(body.colaborador);
        break;

      case 'listClientes':
        requireAuth(body.email, body.senha);
        data = listClientes();
        break;

      case 'saveCliente':
        requireAdmin(body.email, body.senha);
        data = saveCliente(body.cliente);
        break;

      case 'listProjetos':
        requireAuth(body.email, body.senha);
        data = listProjetos();
        break;

      case 'saveProjeto':
        requireAdmin(body.email, body.senha);
        data = saveProjeto(body.projeto);
        break;

      default:
        throw new Error('Ação desconhecida: ' + action);
    }

    return jsonOutput({ ok: true, data: data });
  } catch (err) {
    return jsonOutput({ ok: false, error: err.message });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ========================================================================
 * Autenticação
 * ==================================================================== */

function login(email, senha) {
  if (!email || !senha) throw new Error('Informe e-mail e senha.');
  const colaborador = findColaboradorByEmail(email);
  if (!colaborador) throw new Error('E-mail ou senha inválidos.');
  if (colaborador.ativo === false || colaborador.ativo === 'FALSE') {
    throw new Error('Este colaborador está inativo.');
  }
  if (colaborador.senha_hash !== hashPassword(senha)) {
    throw new Error('E-mail ou senha inválidos.');
  }
  return {
    id: colaborador.id,
    nome: colaborador.nome,
    email: colaborador.email,
    papel: colaborador.papel,
  };
}

/** Confere e-mail/senha e exige papel = admin. Lança erro se algo não bater. */
function requireAdmin(email, senha) {
  const session = login(email, senha);
  if (session.papel !== 'admin') {
    throw new Error('Este usuário não tem permissão de administrador.');
  }
  return session;
}

/** Confere e-mail/senha de qualquer colaborador ativo (não exige admin). Usado
 * pelo app de campo para ler clientes/projetos — leitura é liberada para
 * qualquer colaborador autenticado; só a escrita (saveCliente/saveProjeto/
 * saveColaborador) continua restrita a admin via requireAdmin. */
function requireAuth(email, senha) {
  return login(email, senha);
}

function hashPassword(password) {
  const salt = getSalt();
  const rawBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt);
  return rawBytes
    .map((b) => {
      const v = (b & 0xff).toString(16);
      return v.length === 1 ? '0' + v : v;
    })
    .join('');
}

function getSalt() {
  const configured = PropertiesService.getScriptProperties().getProperty('PASSWORD_SALT');
  if (configured) return configured;
  // Fallback apenas para não quebrar; troque em Project Settings > Script Properties.
  return 'timesheet-salt-padrao-TROCAR';
}

/* ========================================================================
 * Colaboradores
 * ==================================================================== */

function listColaboradores() {
  return sheetToObjects(SHEET_COLABORADORES).map((c) => ({
    id: c.id,
    nome: c.nome,
    email: c.email,
    papel: c.papel,
    ativo: normalizeBool(c.ativo),
    criadoEm: c.criado_em,
    // senha_hash nunca é devolvida ao front-end.
  }));
}

function saveColaborador(input) {
  if (!input || !input.nome || !input.email || !input.papel) {
    throw new Error('Nome, e-mail e papel são obrigatórios.');
  }
  if (input.papel !== 'admin' && input.papel !== 'colaborador') {
    throw new Error('Papel inválido (use "admin" ou "colaborador").');
  }

  const sheet = getSheet(SHEET_COLABORADORES);
  const rows = sheetToObjects(SHEET_COLABORADORES);

  if (input.id) {
    // Atualização
    const idx = rows.findIndex((r) => r.id === input.id);
    if (idx === -1) throw new Error('Colaborador não encontrado.');

    const existing = rows[idx];
    const emailConflict = rows.some((r) => r.id !== input.id && r.email.toLowerCase() === input.email.toLowerCase());
    if (emailConflict) throw new Error('Já existe outro colaborador com este e-mail.');

    const updated = {
      id: existing.id,
      nome: input.nome,
      email: input.email,
      senha_hash: input.senha ? hashPassword(input.senha) : existing.senha_hash,
      papel: input.papel,
      ativo: input.ativo !== undefined ? input.ativo : normalizeBool(existing.ativo),
      criado_em: existing.criado_em,
    };
    writeRow(sheet, idx + 2, updated);
    return { ...updated, ativo: normalizeBool(updated.ativo), senha_hash: undefined };
  }

  // Criação
  if (!input.senha) throw new Error('Defina uma senha inicial para o novo colaborador.');
  const emailConflict = rows.some((r) => r.email.toLowerCase() === input.email.toLowerCase());
  if (emailConflict) throw new Error('Já existe um colaborador com este e-mail.');

  const novo = {
    id: Utilities.getUuid(),
    nome: input.nome,
    email: input.email,
    senha_hash: hashPassword(input.senha),
    papel: input.papel,
    ativo: input.ativo !== undefined ? input.ativo : true,
    criado_em: new Date().toISOString(),
  };
  appendRow(sheet, novo);
  return { ...novo, senha_hash: undefined };
}

function findColaboradorByEmail(email) {
  const rows = sheetToObjects(SHEET_COLABORADORES);
  return rows.find((r) => r.email && r.email.toLowerCase() === String(email).toLowerCase());
}

/* ========================================================================
 * Clientes
 * ==================================================================== */

function listClientes() {
  return sheetToObjects(SHEET_CLIENTES).map((c) => ({
    id: c.id,
    nome: c.nome,
    ativo: normalizeBool(c.ativo),
    criadoEm: c.criado_em,
  }));
}

function saveCliente(input) {
  if (!input || !input.nome) throw new Error('Nome do cliente é obrigatório.');

  const sheet = getSheet(SHEET_CLIENTES);
  const rows = sheetToObjects(SHEET_CLIENTES);

  if (input.id) {
    const idx = rows.findIndex((r) => r.id === input.id);
    if (idx === -1) throw new Error('Cliente não encontrado.');
    const existing = rows[idx];
    const updated = {
      id: existing.id,
      nome: input.nome,
      ativo: input.ativo !== undefined ? input.ativo : normalizeBool(existing.ativo),
      criado_em: existing.criado_em,
    };
    writeRow(sheet, idx + 2, updated);
    return { ...updated, ativo: normalizeBool(updated.ativo) };
  }

  const novo = {
    id: Utilities.getUuid(),
    nome: input.nome,
    ativo: input.ativo !== undefined ? input.ativo : true,
    criado_em: new Date().toISOString(),
  };
  appendRow(sheet, novo);
  return novo;
}

/* ========================================================================
 * Projetos
 * ==================================================================== */

function listProjetos() {
  return sheetToObjects(SHEET_PROJETOS).map((p) => ({
    id: p.id,
    clienteId: p.cliente_id,
    nome: p.nome,
    ativo: normalizeBool(p.ativo),
    criadoEm: p.criado_em,
  }));
}

function saveProjeto(input) {
  if (!input || !input.nome || !input.clienteId) {
    throw new Error('Nome do projeto e cliente são obrigatórios.');
  }

  const clientes = sheetToObjects(SHEET_CLIENTES);
  if (!clientes.some((c) => c.id === input.clienteId)) {
    throw new Error('Cliente informado não existe.');
  }

  const sheet = getSheet(SHEET_PROJETOS);
  const rows = sheetToObjects(SHEET_PROJETOS);

  if (input.id) {
    const idx = rows.findIndex((r) => r.id === input.id);
    if (idx === -1) throw new Error('Projeto não encontrado.');
    const existing = rows[idx];
    const updated = {
      id: existing.id,
      cliente_id: input.clienteId,
      nome: input.nome,
      ativo: input.ativo !== undefined ? input.ativo : normalizeBool(existing.ativo),
      criado_em: existing.criado_em,
    };
    writeRow(sheet, idx + 2, updated);
    return { id: updated.id, clienteId: updated.cliente_id, nome: updated.nome, ativo: normalizeBool(updated.ativo), criadoEm: updated.criado_em };
  }

  const novo = {
    id: Utilities.getUuid(),
    cliente_id: input.clienteId,
    nome: input.nome,
    ativo: input.ativo !== undefined ? input.ativo : true,
    criado_em: new Date().toISOString(),
  };
  appendRow(sheet, novo);
  return { id: novo.id, clienteId: novo.cliente_id, nome: novo.nome, ativo: novo.ativo, criadoEm: novo.criado_em };
}

/* ========================================================================
 * Helpers de planilha
 * ==================================================================== */

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error(`Aba "${name}" não encontrada. Rode seedDatabase() primeiro (veja SETUP.md).`);
  }
  return sheet;
}

function sheetToObjects(name) {
  const sheet = getSheet(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function writeRow(sheet, rowNumber, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = headers.map((h) => (obj[h] !== undefined ? obj[h] : ''));
  sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
}

function appendRow(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = headers.map((h) => (obj[h] !== undefined ? obj[h] : ''));
  sheet.appendRow(values);
}

function normalizeBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toUpperCase() === 'TRUE';
  return !!v;
}

/* ========================================================================
 * Seed inicial — rode manualmente UMA VEZ pelo editor do Apps Script
 * (selecione a função "seedDatabase" no menu e clique em Executar).
 * ==================================================================== */

function seedDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(HEADERS).forEach((sheetName) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[sheetName]);
      sheet.setFrozenRows(1);
    }
  });

  const colaboradoresSheet = ss.getSheetByName(SHEET_COLABORADORES);
  if (colaboradoresSheet.getLastRow() <= 1) {
    const nomes = [
      'Alexandre Cunha',
      'Marcelo Mira',
      'Sérgio Ribeiro',
      'Tayse Rodrigues',
      'Antônio Neto',
      'Marcelo Costa',
    ];
    const senhaInicial = 'mudar123';
    nomes.forEach((nome) => {
      const email = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.') + '@empresa.com';
      appendRow(colaboradoresSheet, {
        id: Utilities.getUuid(),
        nome: nome,
        email: email,
        senha_hash: hashPassword(senhaInicial),
        papel: 'colaborador',
        ativo: true,
        criado_em: new Date().toISOString(),
      });
    });
    Logger.log('Colaboradores criados com senha inicial "%s". Troque o papel de ao menos um deles para "admin" na planilha antes de usar o Dashboard.', senhaInicial);
  }

  const clientesSheet = ss.getSheetByName(SHEET_CLIENTES);
  if (clientesSheet.getLastRow() <= 1) {
    const clientes = ['John Deere', 'CASE', 'CNH', 'Netafim', 'Agricef', 'Raízen', 'BPBioenergy', 'Atvos'];
    clientes.forEach((nome) => {
      appendRow(clientesSheet, {
        id: Utilities.getUuid(),
        nome: nome,
        ativo: true,
        criado_em: new Date().toISOString(),
      });
    });
  }

  // Projetos fica vazio de propósito — cadastre pelo Dashboard Admin.

  Logger.log('seedDatabase() concluído.');
}
