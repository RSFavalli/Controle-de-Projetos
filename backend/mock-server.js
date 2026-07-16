/**
 * mock-server.js
 * ------------------------------------------------------------------
 * NÃO é o backend de produção. É um servidor local (Node puro, sem
 * dependências) que imita o mesmo contrato de API do Code.gs, para
 * você testar o Dashboard Admin no seu computador ANTES de configurar
 * o Google Sheets/Apps Script de verdade (ou para desenvolvimento).
 *
 * Os dados ficam só em memória — reiniciar o processo apaga tudo.
 *
 * Como usar:
 *   node backend/mock-server.js
 *   (sobe em http://localhost:8790)
 *
 * No Dashboard Admin, configure a URL da API como:
 *   http://localhost:8790
 *
 * Já vem com um usuário admin pronto para teste:
 *   e-mail: alexandre.cunha@empresa.com
 *   senha:  mudar123
 * ------------------------------------------------------------------
 */

const http = require('http');
const crypto = require('crypto');

const PORT = 8790;
const SALT = 'mock-salt-apenas-para-teste-local';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

function uuid() {
  return crypto.randomUUID();
}

/* ------------------------------- Dados em memória ------------------------------- */

const EMPLOYEE_NAMES = [
  'Alexandre Cunha',
  'Marcelo Mira',
  'Sérgio Ribeiro',
  'Tayse Rodrigues',
  'Antônio Neto',
  'Marcelo Costa',
];

const CLIENT_NAMES = ['John Deere', 'CASE', 'CNH', 'Netafim', 'Agricef', 'Raízen', 'BPBioenergy', 'Atvos'];

const db = {
  colaboradores: EMPLOYEE_NAMES.map((nome, i) => ({
    id: uuid(),
    nome,
    email: nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.') + '@empresa.com',
    senha_hash: hashPassword('mudar123'),
    papel: i === 0 ? 'admin' : 'colaborador', // primeiro colaborador já vem como admin, só para facilitar o teste local
    ativo: true,
    criado_em: new Date().toISOString(),
  })),
  clientes: CLIENT_NAMES.map((nome) => ({
    id: uuid(),
    nome,
    ativo: true,
    criado_em: new Date().toISOString(),
  })),
  projetos: [],
};

/* ---------------------------------- Handlers ------------------------------------ */

function login(email, senha) {
  if (!email || !senha) throw new Error('Informe e-mail e senha.');
  const colaborador = db.colaboradores.find((c) => c.email.toLowerCase() === String(email).toLowerCase());
  if (!colaborador) throw new Error('E-mail ou senha inválidos.');
  if (!colaborador.ativo) throw new Error('Este colaborador está inativo.');
  if (colaborador.senha_hash !== hashPassword(senha)) throw new Error('E-mail ou senha inválidos.');
  return { id: colaborador.id, nome: colaborador.nome, email: colaborador.email, papel: colaborador.papel };
}

function requireAdmin(email, senha) {
  const session = login(email, senha);
  if (session.papel !== 'admin') throw new Error('Este usuário não tem permissão de administrador.');
  return session;
}

function requireAuth(email, senha) {
  return login(email, senha);
}

function listColaboradores() {
  return db.colaboradores.map(({ senha_hash, ...rest }) => rest);
}

function saveColaborador(input) {
  if (!input || !input.nome || !input.email || !input.papel) throw new Error('Nome, e-mail e papel são obrigatórios.');
  if (input.papel !== 'admin' && input.papel !== 'colaborador') throw new Error('Papel inválido.');

  if (input.id) {
    const existing = db.colaboradores.find((c) => c.id === input.id);
    if (!existing) throw new Error('Colaborador não encontrado.');
    const conflict = db.colaboradores.some((c) => c.id !== input.id && c.email.toLowerCase() === input.email.toLowerCase());
    if (conflict) throw new Error('Já existe outro colaborador com este e-mail.');
    existing.nome = input.nome;
    existing.email = input.email;
    if (input.senha) existing.senha_hash = hashPassword(input.senha);
    existing.papel = input.papel;
    existing.ativo = input.ativo !== undefined ? input.ativo : existing.ativo;
    const { senha_hash, ...rest } = existing;
    return rest;
  }

  if (!input.senha) throw new Error('Defina uma senha inicial para o novo colaborador.');
  const conflict = db.colaboradores.some((c) => c.email.toLowerCase() === input.email.toLowerCase());
  if (conflict) throw new Error('Já existe um colaborador com este e-mail.');
  const novo = {
    id: uuid(),
    nome: input.nome,
    email: input.email,
    senha_hash: hashPassword(input.senha),
    papel: input.papel,
    ativo: input.ativo !== undefined ? input.ativo : true,
    criado_em: new Date().toISOString(),
  };
  db.colaboradores.push(novo);
  const { senha_hash, ...rest } = novo;
  return rest;
}

function listClientes() {
  return db.clientes;
}

function saveCliente(input) {
  if (!input || !input.nome) throw new Error('Nome do cliente é obrigatório.');
  if (input.id) {
    const existing = db.clientes.find((c) => c.id === input.id);
    if (!existing) throw new Error('Cliente não encontrado.');
    existing.nome = input.nome;
    existing.ativo = input.ativo !== undefined ? input.ativo : existing.ativo;
    return existing;
  }
  const novo = { id: uuid(), nome: input.nome, ativo: input.ativo !== undefined ? input.ativo : true, criado_em: new Date().toISOString() };
  db.clientes.push(novo);
  return novo;
}

function listProjetos() {
  return db.projetos;
}

function saveProjeto(input) {
  if (!input || !input.nome || !input.clienteId) throw new Error('Nome do projeto e cliente são obrigatórios.');
  if (!db.clientes.some((c) => c.id === input.clienteId)) throw new Error('Cliente informado não existe.');
  if (input.id) {
    const existing = db.projetos.find((p) => p.id === input.id);
    if (!existing) throw new Error('Projeto não encontrado.');
    existing.nome = input.nome;
    existing.clienteId = input.clienteId;
    existing.ativo = input.ativo !== undefined ? input.ativo : existing.ativo;
    return existing;
  }
  const novo = { id: uuid(), clienteId: input.clienteId, nome: input.nome, ativo: input.ativo !== undefined ? input.ativo : true, criado_em: new Date().toISOString() };
  db.projetos.push(novo);
  return novo;
}

/* ----------------------------------- Servidor ------------------------------------ */

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET') {
    if (url.searchParams.get('action') === 'ping') {
      sendJson(res, { ok: true, message: 'Mock Timesheet API online', time: new Date().toISOString() });
      return;
    }
    sendJson(res, { ok: false, error: 'Use POST para chamar a API.' });
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const { action, email, senha } = parsed;
        let data;
        switch (action) {
          case 'ping':
            data = { message: 'Mock Timesheet API online' };
            break;
          case 'login':
            data = login(email, senha);
            break;
          case 'listColaboradores':
            requireAdmin(email, senha);
            data = listColaboradores();
            break;
          case 'saveColaborador':
            requireAdmin(email, senha);
            data = saveColaborador(parsed.colaborador);
            break;
          case 'listClientes':
            requireAuth(email, senha);
            data = listClientes();
            break;
          case 'saveCliente':
            requireAdmin(email, senha);
            data = saveCliente(parsed.cliente);
            break;
          case 'listProjetos':
            requireAuth(email, senha);
            data = listProjetos();
            break;
          case 'saveProjeto':
            requireAdmin(email, senha);
            data = saveProjeto(parsed.projeto);
            break;
          default:
            throw new Error('Ação desconhecida: ' + action);
        }
        sendJson(res, { ok: true, data });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message });
      }
    });
    return;
  }

  res.writeHead(405);
  res.end();
});

function sendJson(res, obj) {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify(obj));
}

server.listen(PORT, () => {
  console.log(`Mock Timesheet API rodando em http://localhost:${PORT}`);
  console.log(`Login de teste: ${db.colaboradores[0].email} / mudar123`);
});
