/**
 * Code.gs — Backend do Timesheet (Google Apps Script + Google Sheets)
 * ------------------------------------------------------------------
 * Este script transforma uma planilha do Google Sheets em uma API que o
 * Dashboard Admin (e, futuramente, o app de campo) chama pela internet.
 *
 * Abas esperadas na planilha (crie-as com esses nomes EXATOS, ou rode
 * a função seedDatabase() uma vez, que cria tudo automaticamente):
 *
 *   Colaboradores: id | nome | email | senha_hash | papel | cargo | ativo | criado_em
 *   Clientes:      id | nome | ativo | criado_em
 *   Projetos:      id | cliente_id | nome | ativo | criado_em
 *   Apontamentos:  id | colaborador_id | colaborador_nome | cliente_id | cliente_nome |
 *                  projeto_id | projeto_nome | atividade_id | atividade_nome | data |
 *                  hora_inicio | hora_fim | duracao_minutos | status | observacoes |
 *                  criado_em | atualizado_em | sincronizado_em
 *
 * "papel" em Colaboradores é "admin" ou "colaborador". Apenas quem tem
 * papel = admin consegue usar o Dashboard Admin.
 *
 * Este script também manda e-mail (via MailApp, usando a conta que publicou o
 * Web App): um lembrete diário automático (função enviarAlertasDiarios, ligada
 * por um gatilho — rode configurarAlertaDiario() uma vez pelo editor para
 * ativar) e um reforço manual disparado pelo Dashboard. Respostas dos
 * colaboradores caem em ADMIN_EMAIL, não na caixa de quem publicou o script.
 *
 * O resumo de projetos por IA (gerarResumoIA) chama a API do Gemini — precisa
 * da propriedade de script GEMINI_API_KEY configurada (veja SETUP.md).
 *
 * COMO PUBLICAR: veja o arquivo SETUP.md que acompanha este script.
 * ------------------------------------------------------------------
 */

const SHEET_COLABORADORES = 'Colaboradores';
const SHEET_CLIENTES = 'Clientes';
const SHEET_PROJETOS = 'Projetos';
const SHEET_APONTAMENTOS = 'Apontamentos';

const ADMIN_EMAIL = 'rafael.favalli@agricef.com.br';
const APP_URL = 'https://rsfavalli.github.io/Controle-de-Projetos/';

// Modelo do Gemini usado no resumo de projetos por IA (veja gerarResumoIA).
// Se um dia parar de funcionar de novo (Google descontinua modelo com alguma
// frequência), troque aqui — veja os nomes disponíveis em
// https://ai.google.dev/gemini-api/docs/models. A chave em si NÃO fica aqui:
// veja getGeminiApiKey().
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const HEADERS = {
  [SHEET_COLABORADORES]: ['id', 'nome', 'email', 'senha_hash', 'papel', 'cargo', 'ativo', 'criado_em'],
  [SHEET_CLIENTES]: ['id', 'nome', 'ativo', 'criado_em'],
  [SHEET_PROJETOS]: ['id', 'cliente_id', 'nome', 'ativo', 'criado_em'],
  [SHEET_APONTAMENTOS]: [
    'id', 'colaborador_id', 'colaborador_nome', 'cliente_id', 'cliente_nome',
    'projeto_id', 'projeto_nome', 'atividade_id', 'atividade_nome', 'data',
    'hora_inicio', 'hora_fim', 'duracao_minutos', 'status', 'observacoes',
    'criado_em', 'atualizado_em', 'sincronizado_em',
  ],
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

      case 'syncApontamentos': {
        const session = requireAuth(body.email, body.senha);
        data = syncApontamentos(session, body.entries, body.deletedIds);
        break;
      }

      case 'listApontamentos':
        requireAdmin(body.email, body.senha);
        data = listApontamentos(body.desde, body.ate);
        break;

      case 'enviarReforcoApontamento': {
        const admin = requireAdmin(body.email, body.senha);
        data = enviarReforcoApontamento(admin, body.colaboradorId, body.mensagem);
        break;
      }

      case 'gerarResumoIA':
        requireAdmin(body.email, body.senha);
        data = gerarResumoIA();
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

// Limite de tentativas de login por e-mail, para dificultar força bruta de
// senha. Usa CacheService (memória temporária do próprio Apps Script, sem
// precisar de aba na planilha) — os contadores somem sozinhos depois do
// tempo de janela, não precisa de limpeza manual.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_SECONDS = 15 * 60; // janela em que as tentativas erradas contam
const LOGIN_LOCKOUT_SECONDS = 15 * 60; // tempo bloqueado depois de estourar o limite

function login(email, senha) {
  if (!email || !senha) throw new Error('Informe e-mail e senha.');
  const emailKey = String(email).toLowerCase();
  const cache = CacheService.getScriptCache();

  if (cache.get('login_lock_' + emailKey)) {
    throw new Error('Muitas tentativas de login com este e-mail. Aguarde alguns minutos e tente novamente.');
  }

  const colaborador = findColaboradorByEmail(email);
  if (!colaborador || colaborador.senha_hash !== hashPassword(senha)) {
    registerFailedLogin(cache, emailKey);
    throw new Error('E-mail ou senha inválidos.');
  }

  // Senha certa: limpa o histórico de tentativas erradas deste e-mail.
  clearLoginAttempts(cache, emailKey);

  if (colaborador.ativo === false || colaborador.ativo === 'FALSE') {
    throw new Error('Este colaborador está inativo.');
  }

  return {
    id: colaborador.id,
    nome: colaborador.nome,
    email: colaborador.email,
    papel: colaborador.papel,
  };
}

function registerFailedLogin(cache, emailKey) {
  const attemptsKey = 'login_attempts_' + emailKey;
  const attempts = Number(cache.get(attemptsKey) || '0') + 1;
  cache.put(attemptsKey, String(attempts), LOGIN_ATTEMPT_WINDOW_SECONDS);
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    cache.put('login_lock_' + emailKey, '1', LOGIN_LOCKOUT_SECONDS);
  }
}

function clearLoginAttempts(cache, emailKey) {
  cache.remove('login_attempts_' + emailKey);
  cache.remove('login_lock_' + emailKey);
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
  ensureHeaders(SHEET_COLABORADORES);
  return sheetToObjects(SHEET_COLABORADORES).map((c) => ({
    id: c.id,
    nome: c.nome,
    email: c.email,
    papel: c.papel,
    cargo: c.cargo || '',
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

  ensureHeaders(SHEET_COLABORADORES);
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
      cargo: input.cargo !== undefined ? input.cargo : existing.cargo || '',
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
    cargo: input.cargo || '',
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
 * Apontamentos
 * ==================================================================== */

/**
 * Recebe apontamentos concluídos do app de campo e grava/atualiza na aba
 * Apontamentos (upsert por "id", que é gerado no próprio dispositivo).
 * O colaborador_id/nome sempre vem de quem está autenticado nesta chamada
 * (não do que o cliente mandou), para um colaborador não conseguir gravar
 * apontamento em nome de outro.
 */
function syncApontamentos(colaborador, entries, deletedIds) {
  entries = entries || [];
  deletedIds = deletedIds || [];

  ensureHeaders(SHEET_APONTAMENTOS);
  const sheet = getSheet(SHEET_APONTAMENTOS);
  const rows = sheetToObjects(SHEET_APONTAMENTOS);
  const rowIndexById = {};
  rows.forEach((r, i) => {
    rowIndexById[r.id] = i;
  });

  let syncedCount = 0;
  entries.forEach((entry) => {
    if (!entry || !entry.id) return;
    const existing = rows[rowIndexById[entry.id]];
    if (existing && existing.colaborador_id && existing.colaborador_id !== colaborador.id) {
      throw new Error('Apontamento não pertence a este colaborador.');
    }

    const record = {
      id: entry.id,
      colaborador_id: colaborador.id,
      colaborador_nome: colaborador.nome,
      cliente_id: entry.clienteId || '',
      cliente_nome: entry.clienteName || '',
      projeto_id: entry.projectId || '',
      projeto_nome: entry.projectName || '',
      atividade_id: entry.activityId || '',
      atividade_nome: entry.activityName || '',
      data: entry.date || '',
      hora_inicio: entry.startTime || '',
      hora_fim: entry.endTime || '',
      duracao_minutos: entry.durationMinutes != null ? entry.durationMinutes : '',
      status: entry.status || (entry.endTime ? 'concluido' : 'em_andamento'),
      observacoes: entry.observations || '',
      criado_em: entry.createdAt || '',
      atualizado_em: entry.updatedAt || '',
      sincronizado_em: new Date().toISOString(),
    };

    if (existing) {
      writeRow(sheet, rowIndexById[entry.id] + 2, record);
    } else {
      appendRow(sheet, record);
    }
    syncedCount++;
  });

  let deletedCount = 0;
  if (deletedIds.length > 0) {
    // Relê a planilha (entries acima podem ter acrescentado linhas) antes de excluir.
    const freshRows = sheetToObjects(SHEET_APONTAMENTOS);
    const rowNumbersToDelete = [];
    deletedIds.forEach((id) => {
      const idx = freshRows.findIndex((r) => r.id === id);
      if (idx !== -1 && (!freshRows[idx].colaborador_id || freshRows[idx].colaborador_id === colaborador.id)) {
        rowNumbersToDelete.push(idx + 2);
      }
    });
    // Exclui de baixo para cima para não bagunçar os índices das próximas linhas.
    rowNumbersToDelete
      .sort((a, b) => b - a)
      .forEach((rowNum) => {
        sheet.deleteRow(rowNum);
        deletedCount++;
      });
  }

  return { synced: syncedCount, deleted: deletedCount };
}

/**
 * Lista apontamentos para o Dashboard (uso de admin): gráfico de horas por
 * colaborador/atividade e o painel de conformidade. "desde"/"ate" são datas
 * 'YYYY-MM-DD' opcionais para limitar o período (comparação lexicográfica,
 * funciona porque o formato ISO já ordena cronologicamente).
 */
function listApontamentos(desde, ate) {
  ensureHeaders(SHEET_APONTAMENTOS);
  return sheetToObjects(SHEET_APONTAMENTOS)
    .map((r) => ({
      id: r.id,
      colaboradorId: r.colaborador_id,
      colaboradorNome: r.colaborador_nome,
      clienteId: r.cliente_id,
      clienteNome: r.cliente_nome,
      projetoId: r.projeto_id,
      projetoNome: r.projeto_nome,
      atividadeId: r.atividade_id,
      atividadeNome: r.atividade_nome,
      data: asDateStr(r.data),
      horaInicio: asTimeStr(r.hora_inicio),
      horaFim: asTimeStr(r.hora_fim),
      duracaoMinutos: r.duracao_minutos === '' || r.duracao_minutos == null ? null : Number(r.duracao_minutos),
      status: r.status || (r.hora_fim ? 'concluido' : 'em_andamento'),
      observacoes: r.observacoes,
      atualizadoEm: r.atualizado_em,
    }))
    .filter((r) => (!desde || r.data >= desde) && (!ate || r.data <= ate));
}

/* ========================================================================
 * Feriados — para saber quais dias têm apontamento obrigatório.
 * Sábados/domingos nunca são obrigatórios; feriados nacionais e municipais
 * de Paulínia/SP (onde a equipe está baseada) também não.
 * ==================================================================== */

// Data da Páscoa pelo algoritmo de Gauss/Meeus — feriados móveis (Carnaval,
// Sexta-feira Santa, Corpus Christi, Sagrado Coração de Jesus) partem dela.
function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

// Fixos + móveis. Carnaval e Corpus Christi são "ponto facultativo" a rigor,
// mas tratados aqui como não-úteis por serem universalmente observados nas
// empresas brasileiras.
function feriadosNacionais(year) {
  const pascoa = easterDate(year);
  return [
    new Date(year, 0, 1), // Confraternização Universal
    addDays(pascoa, -48), // Carnaval (segunda)
    addDays(pascoa, -47), // Carnaval (terça)
    addDays(pascoa, -2), // Sexta-feira Santa
    addDays(pascoa, 60), // Corpus Christi
    new Date(year, 3, 21), // Tiradentes
    new Date(year, 4, 1), // Dia do Trabalho
    new Date(year, 8, 7), // Independência do Brasil
    new Date(year, 9, 12), // Nossa Senhora Aparecida
    new Date(year, 10, 2), // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 10, 20), // Consciência Negra (feriado nacional desde a Lei 14.759/2023)
    new Date(year, 11, 25), // Natal
  ];
}

// Feriados municipais de Paulínia/SP: aniversário da cidade (28/fev, fixo) e o
// padroeiro Sagrado Coração de Jesus (móvel, Páscoa + 68 dias). Conferido contra
// o calendário oficial 2026 da Prefeitura (paulinia.sp.gov.br/feriados2026).
// Pontos facultativos extras decretados ao longo do ano não entram aqui — não
// dá pra prever; adicione manualmente em EXTRA_DIAS_NAO_UTEIS se precisar.
function feriadosPaulinia(year) {
  const pascoa = easterDate(year);
  return [
    new Date(year, 1, 28), // Aniversário de Paulínia
    addDays(pascoa, 68), // Sagrado Coração de Jesus (padroeiro)
  ];
}

const EXTRA_DIAS_NAO_UTEIS = []; // formato 'YYYY-MM-DD', para exceções pontuais

function isBusinessDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = domingo, 6 = sábado
  if (dow === 0 || dow === 6) return false;
  if (EXTRA_DIAS_NAO_UTEIS.indexOf(dateStr) !== -1) return false;
  const feriados = feriadosNacionais(y).concat(feriadosPaulinia(y)).map(formatDateStr);
  return feriados.indexOf(dateStr) === -1;
}

function formatDateStr(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* ========================================================================
 * Alertas de apontamento por e-mail
 * ==================================================================== */

/**
 * Para uma data específica, quais colaboradores ativos não apontaram nada, ou
 * deixaram alguma atividade sem encerrar (sem hora_fim). Um colaborador pode
 * aparecer por um motivo, outro, ou os dois.
 */
function pendenciasDoDia(dateStr) {
  ensureHeaders(SHEET_APONTAMENTOS);
  const colaboradores = sheetToObjects(SHEET_COLABORADORES).filter((c) => normalizeBool(c.ativo));
  const apontamentosDoDia = sheetToObjects(SHEET_APONTAMENTOS).filter((a) => asDateStr(a.data) === dateStr);

  return colaboradores
    .map((c) => {
      const doColaborador = apontamentosDoDia.filter((a) => a.colaborador_id === c.id);
      return {
        id: c.id,
        nome: c.nome,
        email: c.email,
        semApontamento: doColaborador.length === 0,
        naoFechou: doColaborador.some((a) => !asTimeStr(a.hora_fim)),
      };
    })
    .filter((c) => c.semApontamento || c.naoFechou);
}

/**
 * Roda uma vez por dia (gatilho criado por configurarAlertaDiario). Se hoje for
 * dia útil, manda um lembrete automático para quem não apontou ou não fechou
 * alguma atividade hoje. Resposta do colaborador cai em ADMIN_EMAIL.
 */
function enviarAlertasDiarios() {
  const hojeStr = formatDateStr(new Date());
  if (!isBusinessDay(hojeStr)) {
    Logger.log('Hoje (%s) não é dia útil de apontamento — nenhum alerta enviado.', hojeStr);
    return;
  }

  const pendencias = pendenciasDoDia(hojeStr);
  pendencias.forEach((p) => {
    const motivo = p.semApontamento
      ? 'não vimos nenhum apontamento seu hoje'
      : 'você deixou uma atividade em aberto hoje (sem horário de término)';
    const corpo = [
      `Olá, ${p.nome}!`,
      '',
      `Notamos que ${motivo}.`,
      '',
      'Se puder, regularize pelo app de campo:',
      APP_URL,
      '',
      'Se não deu para apontar por algum motivo (folga, ausência, imprevisto etc.), é só responder este e-mail contando o motivo.',
      '',
      'Obrigado!',
    ].join('\n');

    MailApp.sendEmail({
      to: p.email,
      replyTo: ADMIN_EMAIL,
      subject: 'Timesheet — lembrete de apontamento de hoje',
      body: corpo,
      name: 'Timesheet Agricef',
    });
  });

  Logger.log('Alertas diários enviados para %s colaborador(es) em %s.', pendencias.length, hojeStr);
}

/**
 * Rode esta função UMA VEZ pelo editor do Apps Script (menu de funções →
 * configurarAlertaDiario → Executar) para ligar o lembrete automático diário.
 * É seguro rodar de novo (remove o gatilho antigo antes de criar um novo, não
 * duplica). O horário (19h) é só o disparo do gatilho — pode ajustar abaixo.
 */
function configurarAlertaDiario() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === 'enviarAlertasDiarios') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('enviarAlertasDiarios').timeBased().everyDays(1).atHour(19).create();
  Logger.log('Gatilho diário configurado: enviarAlertasDiarios roda todo dia por volta das 19h (fuso do script).');
}

/**
 * Reforço manual disparado pelo Dashboard (botão "Notificar") para um
 * colaborador específico — usado quando o admin avalia, pelo painel de
 * conformidade, que o caso já merece uma cobrança direta.
 */
function enviarReforcoApontamento(admin, colaboradorId, mensagemPersonalizada) {
  if (!colaboradorId) throw new Error('Informe o colaborador.');
  const colaborador = sheetToObjects(SHEET_COLABORADORES).find((c) => c.id === colaboradorId);
  if (!colaborador) throw new Error('Colaborador não encontrado.');

  const corpoBase = [
    `Olá, ${colaborador.nome}!`,
    '',
    `${admin.nome} percebeu que seus apontamentos de horas estão atrasados com frequência.`,
    '',
    'Por favor, mantenha o apontamento em dia pelo app de campo:',
    APP_URL,
    '',
    'Se estiver enfrentando alguma dificuldade para apontar, responda este e-mail contando o que está acontecendo.',
  ].join('\n');

  const corpo = mensagemPersonalizada ? `${mensagemPersonalizada}\n\n---\n\n${corpoBase}` : corpoBase;

  MailApp.sendEmail({
    to: colaborador.email,
    replyTo: ADMIN_EMAIL,
    subject: 'Timesheet — reforço sobre apontamento de horas',
    body: corpo,
    name: 'Timesheet Agricef',
  });

  return { enviado: true, para: colaborador.email };
}

/* ========================================================================
 * Resumo de projetos por IA (Gemini)
 * ==================================================================== */

function getGeminiApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY não configurada. Veja backend/SETUP.md — crie a chave em aistudio.google.com/app/apikey e ' +
        'salve em Configurações do projeto → Propriedades do script.'
    );
  }
  return key;
}

/**
 * Agrega todos os apontamentos concluídos por projeto (total, por atividade e
 * por colaborador/cargo) e pede pro Gemini escrever um resumo executivo em
 * português. Os NÚMEROS são sempre calculados aqui (nunca pelo modelo) — a IA
 * só narra o que já foi somado, pra não arriscar inventar total errado.
 */
function gerarResumoIA() {
  const apontamentos = sheetToObjects(SHEET_APONTAMENTOS).filter(
    (a) => a.duracao_minutos !== '' && a.duracao_minutos != null && Number(a.duracao_minutos) > 0
  );
  if (apontamentos.length === 0) {
    throw new Error('Ainda não há apontamentos concluídos suficientes para gerar um resumo.');
  }

  const colaboradorPorId = {};
  sheetToObjects(SHEET_COLABORADORES).forEach((c) => {
    colaboradorPorId[c.id] = { nome: c.nome, cargo: c.cargo || '(sem cargo cadastrado)' };
  });

  const porProjeto = {};
  apontamentos.forEach((a) => {
    const key = a.projeto_id;
    if (!porProjeto[key]) {
      porProjeto[key] = {
        projeto: a.projeto_nome,
        cliente: a.cliente_nome,
        totalMinutos: 0,
        porAtividade: {},
        porColaborador: {},
        porCargo: {},
      };
    }
    const p = porProjeto[key];
    const minutos = Number(a.duracao_minutos);
    p.totalMinutos += minutos;
    p.porAtividade[a.atividade_nome] = (p.porAtividade[a.atividade_nome] || 0) + minutos;

    const colaborador = colaboradorPorId[a.colaborador_id] || { nome: a.colaborador_nome, cargo: '(sem cargo cadastrado)' };
    p.porColaborador[colaborador.nome] = (p.porColaborador[colaborador.nome] || 0) + minutos;
    p.porCargo[colaborador.cargo] = (p.porCargo[colaborador.cargo] || 0) + minutos;
  });

  const resumoNumerico = Object.values(porProjeto)
    .sort((a, b) => b.totalMinutos - a.totalMinutos)
    .map((p) => {
      const topAtividade = maiorChave(p.porAtividade);
      const topColaborador = maiorChave(p.porColaborador);
      const topCargo = maiorChave(p.porCargo);
      return {
        projeto: p.projeto,
        cliente: p.cliente,
        totalHoras: minutosParaHoras(p.totalMinutos),
        atividadePrincipal: topAtividade ? `${topAtividade} (${minutosParaHoras(p.porAtividade[topAtividade])}h)` : '—',
        colaboradorPrincipal: topColaborador ? `${topColaborador} (${minutosParaHoras(p.porColaborador[topColaborador])}h)` : '—',
        cargoPrincipal: topCargo ? `${topCargo} (${minutosParaHoras(p.porCargo[topCargo])}h)` : '—',
      };
    });

  const prompt = [
    'Você é um assistente que escreve resumos executivos curtos, em português do Brasil, para um gestor de consultoria',
    'agrícola acompanhar como as horas da equipe estão sendo investidas em cada projeto.',
    '',
    'Abaixo está uma lista JSON já calculada com, para cada projeto: total de horas, a atividade que mais consumiu horas,',
    'o colaborador que mais trabalhou nele, e o cargo que mais trabalhou nele. NÃO recalcule nem invente números — use',
    'exatamente os valores fornecidos.',
    '',
    JSON.stringify(resumoNumerico, null, 2),
    '',
    'Escreva um resumo em texto corrido (pode usar um parágrafo curto por projeto, ou tópicos — o que ficar mais legível),',
    'destacando: onde as horas estão concentradas, qual atividade domina em cada projeto, e quem (colaborador/cargo) é o',
    'principal recurso alocado. Se notar algo que pareça um desequilíbrio (ex.: um projeto muito dependente de uma única',
    'pessoa), pode comentar. Seja direto e objetivo — isto é para leitura rápida por um gestor, não um relatório longo.',
  ].join('\n');

  const texto = chamarGemini(prompt);
  return { resumo: texto, projetos: resumoNumerico.length };
}

function maiorChave(mapa) {
  let melhor = null;
  let melhorValor = -1;
  Object.keys(mapa).forEach((k) => {
    if (mapa[k] > melhorValor) {
      melhor = k;
      melhorValor = mapa[k];
    }
  });
  return melhor;
}

function minutosParaHoras(minutos) {
  return Math.round((minutos / 60) * 10) / 10;
}

function chamarGemini(prompt) {
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  let json;
  try {
    json = JSON.parse(response.getContentText());
  } catch (err) {
    throw new Error('Resposta inesperada da API do Gemini (não é JSON).');
  }

  if (status !== 200) {
    const msg = json && json.error && json.error.message ? json.error.message : `Erro HTTP ${status}`;
    throw new Error('Falha ao chamar o Gemini: ' + msg);
  }

  const texto =
    json.candidates &&
    json.candidates[0] &&
    json.candidates[0].content &&
    json.candidates[0].content.parts &&
    json.candidates[0].content.parts[0] &&
    json.candidates[0].content.parts[0].text;

  if (!texto) {
    throw new Error('O Gemini não retornou texto (resposta pode ter sido bloqueada por segurança).');
  }
  return texto.trim();
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

/**
 * Garante que a aba tem todas as colunas de HEADERS (acrescenta as que
 * faltarem, sem mexer nas existentes) — usado pela aba Apontamentos, que
 * ganhou a coluna "status" depois de já publicada em produção. Também força
 * formato de texto puro nas colunas de data/hora: sem isso, o Google Sheets
 * "adivinha" que "2026-07-17"/"09:30" são datas de verdade e troca o tipo da
 * célula sozinho, quebrando as comparações de string usadas nos alertas.
 */
function ensureHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  const lastCol = sheet.getLastColumn();
  const currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const expected = HEADERS[sheetName];
  const missing = expected.filter((h) => currentHeaders.indexOf(h) === -1);
  if (missing.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
  }

  if (sheetName === SHEET_APONTAMENTOS) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    ['data', 'hora_inicio', 'hora_fim'].forEach((colName) => {
      const colIndex = headers.indexOf(colName);
      if (colIndex !== -1) {
        sheet.getRange(1, colIndex + 1, Math.max(sheet.getMaxRows(), 2)).setNumberFormat('@');
      }
    });
  }
}

// Datas/horas às vezes voltam como objeto Date (quando o Sheets converteu a
// célula sozinho antes do formato de texto puro ser aplicado) — normaliza de
// volta para string, senão as comparações de data quebram silenciosamente.
function asDateStr(v) {
  return v instanceof Date ? formatDateStr(v) : v;
}
function asTimeStr(v) {
  return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm') : v;
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
