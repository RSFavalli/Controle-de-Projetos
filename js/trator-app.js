/**
 * trator-app.js
 * ------------------------------------------------------------------
 * App do técnico da equipe "Trator Autônomo" (Fase 2).
 *
 * Funciona 100% sem internet: turnos e eventos são gravados primeiro neste
 * aparelho e enviados ao servidor (syncTurnos) quando houver conexão. O envio
 * é idempotente (ids criados aqui), então reenviar nunca duplica nada.
 *
 * Cronômetro: o evento guarda a HORA DE INÍCIO; o relógio da tela é só
 * "agora − início". Fechar o app, bloquear o celular ou ficar sem sinal não
 * para nem perde o cronômetro. Aviso de 1 em 1 hora: com o app aberto (ou ao
 * reabrir), pergunta se o evento atual continua o mesmo.
 *
 * Integração com js/app.js: window.TratorApp.enter(ctx) / .sync() / .leave().
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  const ALERTA_MS = 60 * 60 * 1000; // aviso de 1 em 1 hora
  const DIAS_HISTORICO = 30;
  // Botões do técnico: Operação autônoma / Operação manual (trator "Manual") / Parada (trator "Não disponível").
  const DISP_DO_MODO = { autonomo: 'Autônomo', manual: 'Manual', parada: 'Não disponível' };
  const OUTRAS = '__outras';
  const MOTIVOS_PADRAO = ['Feriado', 'Folga', 'Chuva', 'Sem acompanhamento'];
  const TEAM_PREFIX = 'trator-autonomo::';
  const ERROS_DE_LOGIN = /E-mail ou senha inválidos|Este usuário está inativo|não tem permissão/;

  let ctx = null; // { session, getSenha, toast, onAuthError, requestPassword, setSyncStatus }
  let state = null;
  let listas = { usinas: [], tratores: [], implementos: [], causas: [], metas: [], motivos: MOTIVOS_PADRAO, nomes: {} };
  let view = { name: 'home' };
  let tickId = null;
  let syncing = false;
  let syncTimer = null;
  let bannerKey = '';
  const root = () => document.getElementById('tratorApp');

  /* ------------------------------- Utilitários ------------------------------ */

  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const nowMs = () => Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

  function localDate(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function fmtHora(isoStr) {
    const d = new Date(isoStr);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fmtDia(dataStr) {
    const [y, m, d] = String(dataStr).split('-');
    return `${d}/${m}`;
  }
  function fmtDiaLongo(dataStr) {
    const [y, m, d] = String(dataStr).split('-').map(Number);
    const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return `${dias[new Date(y, m - 1, d).getDay()]}, ${pad(d)}/${pad(m)}`;
  }
  function fmtRelogio(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }
  function fmtDuracao(ms) {
    const min = Math.max(0, Math.round(ms / 60000));
    return `${Math.floor(min / 60)} h ${pad(min % 60)} min`;
  }
  function fmtNum(n) {
    if (n === '' || n === null || n === undefined) return '—';
    return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
  function toLocalInput(isoStr) {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(v) {
    const t = new Date(v).getTime();
    return isNaN(t) ? null : t;
  }
  /** Campo de data/hora de edição: se o valor não foi mexido, mantém o instante original (com segundos). */
  function lerDataHora(inp) {
    if (inp.dataset.orig && inp.value === toLocalInput(inp.dataset.orig)) return Date.parse(inp.dataset.orig);
    return fromLocalInput(inp.value);
  }
  function parseHa(v, rotulo) {
    const txt = String(v == null ? '' : v).trim().replace(',', '.');
    if (txt === '') throw new Error(`${rotulo}: informe os hectares (use 0 se não houve).`);
    const n = Number(txt);
    if (!isFinite(n) || n < 0 || n > 5000) throw new Error(`${rotulo}: número de hectares inválido.`);
    return Math.round(n * 100) / 100;
  }

  /** "08:30" -> instante (ms) mais recente com essa hora que não esteja no futuro. */
  function resolverHora(hhmm, minMs, rotulo) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    if (!m) throw new Error(`${rotulo}: informe a hora.`);
    const agora = nowMs();
    const d = new Date(agora);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    let t = d.getTime();
    if (t > agora + 60000) t -= 86400000; // hora de "ontem" (turno que virou a meia-noite)
    if (minMs != null && t < minMs) {
      // O campo de hora não tem segundos: "10:05" para um evento iniciado às 10:05:30
      // é o mesmo minuto, então aceita (usa o instante mínimo). Só recusa se for de fato antes.
      if (minMs - t < 60000) t = minMs;
      else throw new Error(`${rotulo}: a hora não pode ser antes de ${fmtHora(iso(minMs))} (início do evento atual).`);
    }
    return Math.min(Math.max(t, minMs != null ? minMs : t), agora);
  }

  /* ------------------------------- Persistência ----------------------------- */

  function chaveEstado() {
    return `${TEAM_PREFIX}tr_estado::${String(ctx.session.email).toLowerCase()}`;
  }
  const CHAVE_LISTAS = `${TEAM_PREFIX}tr_listas`;

  function lerJson(chave, padrao) {
    try {
      const raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : padrao;
    } catch (e) {
      return padrao;
    }
  }
  function gravarJson(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.error('[trator] não foi possível gravar no aparelho:', e);
      return false;
    }
  }
  function salvar() {
    if (!gravarJson(chaveEstado(), state)) {
      ctx.toast('Não foi possível salvar no aparelho (armazenamento cheio?). Sincronize e libere espaço.', 'error');
    }
  }
  function carregarEstado() {
    state = lerJson(chaveEstado(), null) || { turnos: {}, ultimaSync: null, abertosOutros: [], confirmacoes: {} };
    state.turnos = state.turnos || {};
    state.confirmacoes = state.confirmacoes || {};
    state.abertosOutros = state.abertosOutros || [];
    const l = lerJson(CHAVE_LISTAS, null);
    if (l) listas = Object.assign({ usinas: [], tratores: [], implementos: [], causas: [], metas: [], motivos: MOTIVOS_PADRAO, nomes: {} }, l);
  }
  function salvarListas() {
    gravarJson(CHAVE_LISTAS, listas);
  }

  /* -------------------------------- Nomes/listas ---------------------------- */

  const nomeDe = (id) => (listas.nomes && listas.nomes[id]) || id || '—';
  const porNome = (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR');

  function aplicarListas(dados) {
    listas.usinas = dados.usinas || [];
    listas.tratores = dados.tratores || [];
    listas.implementos = dados.implementos || [];
    listas.causas = dados.causas || [];
    listas.metas = dados.metas || [];
    listas.motivos = dados.motivosSemOperacao && dados.motivosSemOperacao.length ? dados.motivosSemOperacao : MOTIVOS_PADRAO;
    listas.nomes = listas.nomes || {};
    listas.usinas.concat(listas.tratores, listas.implementos, listas.causas).forEach((x) => { listas.nomes[x.id] = x.nome; });
    salvarListas();
  }

  /* ------------------------------ Regras do turno --------------------------- */

  const todosTurnos = () => Object.keys(state.turnos).map((k) => state.turnos[k]);
  const turnoAbertoDoUsuario = () => todosTurnos().find((t) => t.status === 'aberto') || null;
  const eventoAtual = (t) => (t.eventos || []).find((e) => !e.fim_iso) || null;
  const ordenados = (t) => (t.eventos || []).slice().sort((a, b) => Date.parse(a.inicio_iso) - Date.parse(b.inicio_iso));

  function implementoAtual(t) {
    const evs = ordenados(t);
    const ultimo = evs[evs.length - 1];
    return (ultimo && ultimo.implemento_id) || t.implemento_id;
  }
  /** 'autonomo' | 'manual' | 'parada' (eventos antigos: Manual = operação manual; Não disponível = parada). */
  function modoDe(e) {
    if (e.tipo === 'autonomo') return 'autonomo';
    return e.disponibilidade === 'Manual' ? 'manual' : 'parada';
  }
  const ehTrocaImplemento = (e) => /^Troca de implemento/.test(e.descricao_original || '');
  function rotuloEvento(e) {
    const m = modoDe(e);
    if (m === 'autonomo') return 'Operação autônoma';
    if (m === 'manual') return ehTrocaImplemento(e) ? 'Troca de implemento' : 'Operação manual';
    return 'Parada';
  }
  /** Causas da lista de cada botão, na ordem do cadastro. */
  function causasDoModo(modo) {
    const campo = modo === 'manual' ? 'uso_manual' : 'uso_parada';
    return (listas.causas || []).filter((c) => c[campo]);
  }
  const tratorDeTeste = (id) => !!(listas.tratores || []).find((x) => x.id === id && x.teste);
  function msEvento(e, ate) {
    const ini = Date.parse(e.inicio_iso);
    const fim = e.fim_iso ? Date.parse(e.fim_iso) : (ate || nowMs());
    return Math.max(0, fim - ini);
  }
  function totalTurnoMs(t) {
    return (t.eventos || []).reduce((s, e) => s + msEvento(e), 0);
  }
  function tocar(t) {
    t.atualizado_em = iso(nowMs());
    t._pend = true;
    delete t._erro;
  }
  function paraEnvio(t) {
    return {
      id: t.id, usina_id: t.usina_id, trator_id: t.trator_id || '', implemento_id: t.implemento_id || '',
      data: t.data, inicio_iso: t.inicio_iso, fim_iso: t.fim_iso || '', status: t.status,
      ha_autonomo: t.ha_autonomo === undefined ? '' : t.ha_autonomo, ha_manual: t.ha_manual === undefined ? '' : t.ha_manual,
      observacao: t.observacao || '', criado_em: t.criado_em, atualizado_em: t.atualizado_em,
      eventos: (t.eventos || []).map((e) => ({
        id: e.id, inicio_iso: e.inicio_iso, fim_iso: e.fim_iso || '', tipo: e.tipo, disponibilidade: e.disponibilidade || '',
        descricao_original: e.descricao_original || '', observacao: e.observacao || '', causa_id: e.causa_id || '', implemento_id: e.implemento_id || t.implemento_id,
      })),
    };
  }
  function ocupadoPorOutro(tratorId) {
    return state.abertosOutros.find((o) => o.trator_id === tratorId) || null;
  }

  /* ---------------------------------- Ações --------------------------------- */

  function criarEvento(dados, inicioMs, implementoId) {
    const modo = dados.modo;
    const causa = dados.causa_id ? (listas.causas || []).find((c) => c.id === dados.causa_id) : null;
    return {
      id: uuid(), inicio_iso: iso(inicioMs), fim_iso: '', tipo: modo === 'autonomo' ? 'autonomo' : 'parada',
      disponibilidade: DISP_DO_MODO[modo],
      descricao_original: modo === 'autonomo' ? '' : (causa ? causa.nome : dados.desc),
      causa_id: modo === 'autonomo' ? '' : (causa ? causa.id : ''),
      observacao: modo === 'autonomo' ? '' : String(dados.obs || '').trim(),
      implemento_id: implementoId,
    };
  }
  function lerEventoDoForm(f) {
    const modoEl = f.querySelector('[name=tipo]:checked');
    if (!modoEl) throw new Error('Escolha como o trator está: operação autônoma, operação manual ou parada.');
    const modo = modoEl.value;
    if (modo === 'autonomo') return { modo };
    const causaEl = f.querySelector('[name=causa]:checked');
    if (!causaEl) throw new Error('Escolha a causa na lista ou toque em “Outras”.');
    const obsEl = f.querySelector('[name=obs_ev]');
    const obs = obsEl ? obsEl.value.trim() : '';
    if (causaEl.value === OUTRAS) {
      const desc = f.querySelector('[name=desc]').value.trim();
      if (!desc) throw new Error('Em “Outras”, descreva o motivo.');
      return { modo, causa_id: '', desc, obs };
    }
    return { modo, causa_id: causaEl.value, obs };
  }

  function acaoIniciarTurno(f) {
    if (turnoAbertoDoUsuario()) throw new Error('Você já tem um turno aberto. Encerre-o antes de iniciar outro.');
    const usina = f.querySelector('[name=usina]').value;
    const trator = f.querySelector('[name=trator]').value;
    const implemento = f.querySelector('[name=implemento]').value;
    if (!usina) throw new Error('Escolha a usina.');
    if (!trator) throw new Error('Escolha o trator.');
    if (!implemento) throw new Error('Escolha o implemento.');
    const outro = ocupadoPorOutro(trator);
    if (outro) throw new Error(`O ${nomeDe(trator)} já tem um turno aberto (${outro.tecnico_nome || 'outro técnico'}). Peça para encerrar ou escolha outro trator.`);
    const inicio = resolverHora(f.querySelector('[name=hora]').value, nowMs() - 24 * 3600000, 'Hora de início');
    const evDados = lerEventoDoForm(f);
    const t = {
      id: uuid(), usina_id: usina, trator_id: trator, implemento_id: implemento,
      data: localDate(inicio), inicio_iso: iso(inicio), fim_iso: '', status: 'aberto',
      ha_autonomo: '', ha_manual: '', observacao: '', criado_em: iso(nowMs()), atualizado_em: iso(nowMs()),
      eventos: [criarEvento(evDados, inicio, implemento)], _pend: true, _novo: true,
    };
    state.turnos[t.id] = t;
    state.confirmacoes[t.id] = nowMs();
    salvar();
    agendarSync();
    view = { name: 'turno' };
    ctx.toast('Turno iniciado.', 'success');
  }

  function acaoTrocarEvento(f) {
    const t = turnoAbertoDoUsuario();
    const atual = t && eventoAtual(t);
    if (!atual) throw new Error('Não há turno em andamento.');
    const dados = lerEventoDoForm(f);
    const troca = resolverHora(f.querySelector('[name=hora]').value, Date.parse(atual.inicio_iso) + 1000, 'Hora da troca');
    atual.fim_iso = iso(troca);
    t.eventos.push(criarEvento(dados, troca, implementoAtual(t)));
    tocar(t);
    state.confirmacoes[t.id] = nowMs();
    salvar();
    agendarSync();
    view = { name: 'turno' };
    ctx.toast('Evento registrado.', 'success');
  }

  function acaoTrocarImplemento(f) {
    const t = turnoAbertoDoUsuario();
    const atual = t && eventoAtual(t);
    if (!atual) throw new Error('Não há turno em andamento.');
    const novo = f.querySelector('[name=implemento]').value;
    if (!novo) throw new Error('Escolha o novo implemento.');
    const antigo = implementoAtual(t);
    if (novo === antigo) throw new Error('Este já é o implemento em uso.');
    const troca = resolverHora(f.querySelector('[name=hora]').value, Date.parse(atual.inicio_iso) + 1000, 'Hora da troca');
    atual.fim_iso = iso(troca);
    t.eventos.push(criarEvento({ modo: 'manual', causa_id: '', desc: `Troca de implemento (de ${nomeDe(antigo)} para ${nomeDe(novo)})` }, troca, novo));
    tocar(t);
    state.confirmacoes[t.id] = nowMs();
    salvar();
    agendarSync();
    view = { name: 'turno' };
    ctx.toast('Troca de implemento registrada. Quando voltar a operar, escolha a operação em “Trocar de evento”.', 'success');
  }

  function acaoEncerrar(f) {
    const t = turnoAbertoDoUsuario();
    const atual = t && eventoAtual(t);
    if (!atual) throw new Error('Não há turno em andamento.');
    const fim = resolverHora(f.querySelector('[name=hora]').value, Date.parse(atual.inicio_iso) + 1000, 'Hora de término');
    const haA = parseHa(f.querySelector('[name=haAuto]').value, 'Hectares autônomo');
    const haM = parseHa(f.querySelector('[name=haMan]').value, 'Hectares manual');
    return { t, atual, fim, haA, haM, obs: f.querySelector('[name=obs]').value.trim() };
  }
  function confirmarEncerrar(p) {
    p.atual.fim_iso = iso(p.fim);
    p.t.fim_iso = iso(p.fim);
    p.t.status = 'fechado';
    p.t.ha_autonomo = p.haA;
    p.t.ha_manual = p.haM;
    p.t.observacao = p.obs;
    tocar(p.t);
    delete state.confirmacoes[p.t.id];
    salvar();
    agendarSync();
    view = { name: 'home' };
    ctx.toast('Turno encerrado.', 'success');
  }

  function acaoDiaSemOperacao(f, idExistente) {
    const usina = f.querySelector('[name=usina]').value;
    const data = f.querySelector('[name=data]').value;
    const motivo = f.querySelector('[name=motivo]').value;
    const nota = f.querySelector('[name=obs]').value.trim();
    if (!usina) throw new Error('Escolha a usina.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Informe a data.');
    if (data > localDate(nowMs())) throw new Error('A data não pode ser no futuro.');
    if (!motivo) throw new Error('Escolha o motivo.');
    const [y, m, d] = data.split('-').map(Number);
    const base = idExistente ? state.turnos[idExistente] : null;
    const t = Object.assign(base || { id: uuid(), criado_em: iso(nowMs()), _novo: true }, {
      usina_id: usina, trator_id: '', implemento_id: '', data: data,
      inicio_iso: iso(new Date(y, m - 1, d, 0, 0, 0).getTime()), fim_iso: '', status: 'sem_operacao',
      ha_autonomo: '', ha_manual: '', observacao: nota ? `${motivo} — ${nota}` : motivo, eventos: [],
    });
    t.fim_iso = t.inicio_iso;
    tocar(t);
    state.turnos[t.id] = t;
    salvar();
    agendarSync();
    view = { name: 'home' };
    ctx.toast('Dia sem operação registrado.', 'success');
  }

  function acaoSalvarEdicao(f) {
    const t = state.turnos[view.id];
    if (!t) throw new Error('Turno não encontrado.');
    const novo = JSON.parse(JSON.stringify(t));
    novo.observacao = f.querySelector('[name=obs]').value.trim();
    const usina = f.querySelector('[name=usina]').value;
    const trator = f.querySelector('[name=trator]').value;
    const implemento = f.querySelector('[name=implemento]').value;
    if (!usina || !trator || !implemento) throw new Error('Escolha usina, trator e implemento.');
    if (trator !== t.trator_id) {
      const outro = ocupadoPorOutro(trator);
      if (outro && t.status === 'aberto') throw new Error(`O ${nomeDe(trator)} já tem um turno aberto (${outro.tecnico_nome || 'outro técnico'}).`);
    }
    novo.usina_id = usina;
    novo.trator_id = trator;
    novo.implemento_id = implemento;

    const linhas = Array.from(f.querySelectorAll('[data-ev]'));
    if (linhas.length === 0) throw new Error('O turno precisa de pelo menos um evento.');
    const evs = linhas.map((r, i) => {
      const n = i + 1;
      const ini = lerDataHora(r.querySelector('[name=ini]'));
      if (ini === null) throw new Error(`Evento ${n}: informe a hora de início.`);
      const fimEl = r.querySelector('[name=fim]');
      const fim = fimEl.disabled || !fimEl.value ? null : lerDataHora(fimEl);
      if (!fimEl.disabled && fim === null) throw new Error(`Evento ${n}: informe a hora de fim.`);
      if (fim !== null && fim <= ini) throw new Error(`Evento ${n}: o fim precisa ser depois do início.`);
      const modo = r.querySelector('[name=tipo]').value;
      const tipo = modo === 'autonomo' ? 'autonomo' : 'parada';
      const causaSel = tipo === 'parada' ? r.querySelector('[name=causa]').value : '';
      const causa = causaSel && causaSel !== OUTRAS ? (listas.causas || []).find((c) => c.id === causaSel) : null;
      let desc = '';
      if (tipo === 'parada') {
        if (causa) desc = causa.nome;
        else {
          desc = r.querySelector('[name=desc]').value.trim();
          if (!desc) throw new Error(`Evento ${n}: escolha a causa ou, em “Outras”, descreva o motivo.`);
        }
      }
      return {
        id: r.dataset.ev || uuid(), inicio_iso: iso(ini), fim_iso: fim === null ? '' : iso(fim), tipo: tipo,
        disponibilidade: DISP_DO_MODO[modo], descricao_original: desc, causa_id: causa ? causa.id : '',
        observacao: tipo === 'parada' ? ((r.querySelector('[name=obs_ev]') || { value: '' }).value.trim()) : '',
        implemento_id: r.dataset.impl || implemento,
      };
    });
    evs.sort((a, b) => Date.parse(a.inicio_iso) - Date.parse(b.inicio_iso));
    for (let i = 1; i < evs.length; i++) {
      if (!evs[i - 1].fim_iso || Date.parse(evs[i].inicio_iso) < Date.parse(evs[i - 1].fim_iso)) {
        throw new Error('Há eventos com horários sobrepostos. Ajuste os horários.');
      }
    }
    const abertos = evs.filter((e) => !e.fim_iso);
    if (t.status === 'aberto') {
      if (abertos.length !== 1 || evs[evs.length - 1] !== abertos[0]) throw new Error('O turno em andamento precisa terminar com um evento em andamento (sem hora de fim).');
    } else if (abertos.length) {
      throw new Error('Todos os eventos de um turno encerrado precisam ter hora de fim.');
    }
    novo.eventos = evs;
    novo.inicio_iso = evs[0].inicio_iso;
    novo.data = localDate(Date.parse(evs[0].inicio_iso));
    if (t.status === 'fechado') {
      novo.fim_iso = evs[evs.length - 1].fim_iso;
      novo.ha_autonomo = parseHa(f.querySelector('[name=haAuto]').value, 'Hectares autônomo');
      novo.ha_manual = parseHa(f.querySelector('[name=haMan]').value, 'Hectares manual');
    }
    tocar(novo);
    state.turnos[novo.id] = novo;
    salvar();
    agendarSync();
    view = { name: 'home' };
    ctx.toast('Alterações salvas.', 'success');
  }

  /* ----------------------------- Sincronização ------------------------------ */

  function agendarSync() {
    atualizarStatus();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => sync({ silent: true }), 600);
  }

  function pendentes() {
    return todosTurnos().filter((t) => t._pend);
  }

  async function sync(opts = {}) {
    if (!ctx || syncing) return;
    const senha = ctx.getSenha();
    if (!senha) {
      if (opts.manual) ctx.requestPassword();
      return;
    }
    syncing = true;
    atualizarStatus('Sincronizando…');
    const email = ctx.session.email;
    try {
      // 1) envia o que está pendente
      const pend = pendentes();
      if (pend.length) {
        const r = await Api.call('syncTurnos', { email, senha, turnos: pend.map(paraEnvio) });
        (r.resultados || []).forEach((res) => {
          const t = state.turnos[res.id];
          if (!t) return;
          if (res.ok) {
            delete t._pend; delete t._erro; delete t._novo;
          } else {
            t._erro = res.error || 'Não foi possível enviar este turno.';
            t._erroCodigo = res.codigo || '';
          }
        });
        salvar();
      }
      // 2) busca de volta (celular e computador enxergam o mesmo) + listas
      const desde = localDate(nowMs() - DIAS_HISTORICO * 86400000);
      const [lista, cadastros] = await Promise.all([
        Api.call('listMeusTurnos', { email, senha, desde }),
        Api.call('listasCampo', { email, senha }),
      ]);
      aplicarListas(cadastros);
      const idsServidor = {};
      let mudouTurnoAberto = false;
      const abertoAntes = turnoAbertoDoUsuario();
      (lista.turnos || []).forEach((s) => {
        idsServidor[s.id] = true;
        const local = state.turnos[s.id];
        if (local && local._pend) return; // alteração local ainda não enviada vence
        state.turnos[s.id] = s;
      });
      Object.keys(state.turnos).forEach((id) => {
        const t = state.turnos[id];
        if (!idsServidor[id] && !t._pend) delete state.turnos[id];
      });
      state.abertosOutros = lista.abertosOutros || [];
      const abertoDepois = turnoAbertoDoUsuario();
      if (abertoAntes && (!abertoDepois || abertoDepois.id !== abertoAntes.id)) mudouTurnoAberto = true;
      state.ultimaSync = iso(nowMs());
      salvar();
      if (mudouTurnoAberto && view.name === 'turno') {
        view = { name: 'home' };
        ctx.toast('O turno em andamento foi alterado em outro aparelho.', 'success');
      }
      if (opts.manual) ctx.toast('Dados sincronizados.', 'success');
    } catch (err) {
      if (ERROS_DE_LOGIN.test(err.message || '')) {
        ctx.toast(err.message, 'error');
        syncing = false;
        ctx.onAuthError();
        return;
      }
      if (opts.manual) {
        ctx.toast(err.isNetworkError ? `${err.message} Seus registros continuam salvos neste aparelho.` : err.message, 'error');
      }
    } finally {
      syncing = false;
      atualizarStatus();
      if (view.name === 'home' || view.name === 'iniciar' && !root().querySelector('select[name=usina] option[value]:not([value=""])')) render();
    }
  }

  function atualizarStatus(texto) {
    const n = pendentes().length;
    const erros = todosTurnos().filter((t) => t._erro).length;
    let msg;
    if (texto) msg = texto;
    else if (erros) msg = `⚠ ${erros} turno(s) não enviado(s)`;
    else if (n) msg = `${n} pendente(s) de envio`;
    else if (state && state.ultimaSync) msg = `✓ Sincronizado às ${fmtHora(state.ultimaSync)}`;
    else msg = 'Ainda não sincronizado';
    if (ctx) ctx.setSyncStatus(msg);
    const linha = document.getElementById('trStatusLine');
    if (linha) {
      linha.textContent = msg;
      linha.className = 'tr-status' + (erros ? ' tr-status--erro' : n ? ' tr-status--pend' : '');
    }
  }

  /* --------------------------------- Aviso 1 h ------------------------------- */

  function calcularBanner() {
    const t = turnoAbertoDoUsuario();
    const atual = t && eventoAtual(t);
    if (!atual) return null;
    const agora = nowMs();
    const base = Math.max(Date.parse(atual.inicio_iso), state.confirmacoes[t.id] || 0);
    const partes = [];
    if (t.data < localDate(agora)) {
      partes.push(`Este turno está aberto desde ${fmtDiaLongo(t.data)} às ${fmtHora(t.inicio_iso)}. Se já terminou, encerre-o com a hora real.`);
    }
    let pergunta = null;
    if (agora - base >= ALERTA_MS) {
      pergunta = `Há ${fmtDuracao(agora - Date.parse(atual.inicio_iso))} em "${rotuloEvento(atual)}". O trator continua assim?`;
    }
    if (!partes.length && !pergunta) return null;
    return { aviso: partes, pergunta: pergunta, turnoId: t.id };
  }

  function atualizarBanner() {
    const el = document.getElementById('trBanner');
    if (!el) return;
    const b = view.name === 'turno' || view.name === 'home' ? calcularBanner() : null;
    const chave = b ? JSON.stringify([b.aviso, !!b.pergunta, b.turnoId, view.name]) : '';
    if (chave === bannerKey && !(b && b.pergunta)) return;
    if (b && b.pergunta && chave === bannerKey) {
      const strong = el.querySelector('[data-hora-txt]');
      if (strong) strong.textContent = b.pergunta;
      return;
    }
    bannerKey = chave;
    if (!b) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="alert alert--warning tr-banner" role="alert">
      ${b.aviso.map((a) => `<span>${esc(a)}</span>`).join('')}
      ${b.pergunta ? `<strong data-hora-txt>${esc(b.pergunta)}</strong>
      <div class="alert__actions">
        <button type="button" class="btn btn--small btn--start" data-act="confirmar-evento">Sim, continua</button>
        <button type="button" class="btn btn--small btn--ghost" data-act="abrir-troca">Mudou — trocar evento</button>
      </div>` : ''}
    </div>`;
  }

  /* ---------------------------------- Telas ---------------------------------- */

  function optionsDe(lista, selecionado, placeholder) {
    return `<option value="">${esc(placeholder)}</option>` + lista.slice().sort(porNome).map((x) =>
      `<option value="${esc(x.id)}"${x.id === selecionado ? ' selected' : ''}${x._off ? ' disabled' : ''}>${esc(x.nome)}${x._rot ? ' ' + esc(x._rot) : ''}</option>`).join('');
  }
  function tratoresDaUsina(usinaId, manter) {
    return listas.tratores.filter((x) => x.usina_id === usinaId).map((x) => {
      const o = ocupadoPorOutro(x.id);
      const base = x.teste ? Object.assign({}, x, { _rot: '(teste — não entra nos dados reais)' }) : x;
      return o && x.id !== manter ? Object.assign({}, base, { _off: true, _rot: `(em uso — ${o.tecnico_nome || 'outro técnico'})` }) : base;
    });
  }
  function listasProntas() {
    return listas.usinas.length > 0 && listas.implementos.length > 0;
  }

  /** Lista de causas do botão escolhido (Operação manual ou Parada) + "Outras". */
  function htmlCausas(modo, selecionada, texto, obs) {
    const lista = causasDoModo(modo);
    const opt = (valor, rotulo, marcado) =>
      `<label class="tr-causa"><input type="radio" name="causa" value="${esc(valor)}" data-onchange="causa"${marcado ? ' checked' : ''}><span>${esc(rotulo)}</span></label>`;
    return `<fieldset class="tr-fieldset">
        <legend>${modo === 'manual' ? 'Por que o trator está em operação manual?' : 'Qual a causa da parada?'}</legend>
        <div class="tr-causas">
          ${lista.map((c) => opt(c.id, c.nome, selecionada === c.id)).join('')}
          ${opt(OUTRAS, 'Outras', selecionada === OUTRAS)}
        </div>
      </fieldset>
      <div class="field${selecionada === OUTRAS ? '' : ' hidden'}" data-outras>
        <label>Descreva o motivo</label>
        <textarea name="desc" rows="2" maxlength="500" placeholder="Ex.: aguardando peça do implemento">${esc(texto || '')}</textarea>
      </div>
      <div class="field">
        <label>Observações <span class="muted">(opcional)</span></label>
        <textarea name="obs_ev" rows="2" maxlength="500" placeholder="Mais detalhes sobre o que aconteceu">${esc(obs || '')}</textarea>
      </div>`;
  }

  function htmlEscolhaEvento(prefixo, selecionarTipo) {
    const radio = (valor, rotulo, classe) =>
      `<label class="tr-choice ${classe}"><input type="radio" name="tipo" value="${valor}" data-onchange="tipo"${selecionarTipo === valor ? ' checked' : ''}><span>${rotulo}</span></label>`;
    return `
      <fieldset class="tr-fieldset">
        <legend>Como está o trator?</legend>
        <div class="tr-choices tr-choices--3">
          ${radio('autonomo', 'Operação autônoma', 'tr-choice--auto')}
          ${radio('manual', 'Operação manual', 'tr-choice--manual')}
          ${radio('parada', 'Parada', 'tr-choice--parada')}
        </div>
      </fieldset>
      <div class="tr-parada${selecionarTipo === 'manual' || selecionarTipo === 'parada' ? '' : ' hidden'}" data-parada>${selecionarTipo === 'manual' || selecionarTipo === 'parada' ? htmlCausas(selecionarTipo) : ''}</div>`;
  }
  const agoraHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  function viewHome() {
    const aberto = turnoAbertoDoUsuario();
    const recentes = todosTurnos().filter((t) => t.status !== 'aberto').sort((a, b) => (b.data + b.inicio_iso).localeCompare(a.data + a.inicio_iso));
    const erros = todosTurnos().filter((t) => t._erro);
    let h = `<section class="card tr-hero">
      <h2>Olá, ${esc((ctx.session.nome || '').split(' ')[0] || 'técnico')}</h2>`;
    if (aberto) {
      const at = eventoAtual(aberto);
      h += `<div class="tr-aberto">
          <span class="tr-chip tr-chip--aberto">Turno em andamento</span>
          <strong>${esc(nomeDe(aberto.usina_id))} · ${esc(nomeDe(aberto.trator_id))}</strong>
          <span class="muted">${esc(nomeDe(implementoAtual(aberto)))} · desde ${fmtHora(aberto.inicio_iso)}${at ? ' · ' + esc(rotuloEvento(at)) : ''}</span>
        </div>
        <button type="button" class="btn btn--start tr-big" data-act="ir-turno">Continuar turno</button>`;
    } else {
      h += `<div class="tr-big-grid">
          <button type="button" class="btn btn--start tr-big" data-act="ir-iniciar">Iniciar turno</button>
          <button type="button" class="btn btn--ghost tr-big" data-act="ir-semop">Registrar dia sem operação</button>
        </div>`;
      if (!listasProntas()) {
        h += `<p class="field-hint">Usinas, tratores e implementos ainda não foram carregados neste aparelho. Conecte-se à internet e toque em Sincronizar.</p>`;
      }
    }
    h += `<p id="trStatusLine" class="tr-status"></p></section>`;

    if (erros.length) {
      h += `<section class="card tr-erros"><h2>Atenção: não enviados</h2>` + erros.map((t) => `
        <div class="alert alert--danger">
          <strong>${fmtDia(t.data)} · ${esc(nomeDe(t.usina_id))}${t.trator_id ? ' · ' + esc(nomeDe(t.trator_id)) : ''}</strong>
          <span>${esc(t._erro)}</span>
          <div class="alert__actions">
            ${t.status === 'aberto' ? '' : `<button type="button" class="btn btn--small btn--ghost" data-act="editar" data-id="${esc(t.id)}">Corrigir</button>`}
            ${t._novo && t.status !== 'aberto' ? `<button type="button" class="btn btn--small btn--ghost" data-act="descartar" data-id="${esc(t.id)}">Descartar</button>` : ''}
            ${t.status === 'aberto' ? `<button type="button" class="btn btn--small btn--ghost" data-act="ir-turno">Abrir turno</button>` : ''}
          </div>
        </div>`).join('') + '</section>';
    }

    h += `<section class="card"><h2>Meus turnos (últimos ${DIAS_HISTORICO} dias)</h2>`;
    if (!recentes.length) {
      h += `<p class="empty-state">Nenhum turno registrado ainda.</p>`;
    } else {
      h += '<ul class="tr-lista">' + recentes.map(itemTurno).join('') + '</ul>';
    }
    return h + '</section>';
  }

  function itemTurno(t) {
    const selo = t._erro ? '<span class="tr-chip tr-chip--erro">não enviado</span>' : t._pend ? '<span class="tr-chip tr-chip--pend">aguardando envio</span>' : '<span class="tr-chip tr-chip--ok">enviado</span>';
    if (t.status === 'sem_operacao') {
      return `<li class="tr-item"><div><strong>${fmtDiaLongo(t.data)}</strong><br><span class="muted">${esc(nomeDe(t.usina_id))} · dia sem operação — ${esc(t.observacao)}</span></div>
        <div class="tr-item__dir">${selo}<button type="button" class="link-button" data-act="editar" data-id="${esc(t.id)}">Editar</button></div></li>`;
    }
    return `<li class="tr-item"><div><strong>${fmtDiaLongo(t.data)}</strong><br>
        <span class="muted">${esc(nomeDe(t.usina_id))} · ${esc(nomeDe(t.trator_id))}${tratorDeTeste(t.trator_id) ? ' <span class="tr-chip tr-chip--pend">teste</span>' : ''} · ${esc(nomeDe(t.implemento_id))}</span><br>
        <span class="muted">${fmtDuracao(totalTurnoMs(t))} · autônomo ${fmtNum(t.ha_autonomo)} ha · manual ${fmtNum(t.ha_manual)} ha</span></div>
        <div class="tr-item__dir">${selo}<button type="button" class="link-button" data-act="editar" data-id="${esc(t.id)}">Editar</button></div></li>`;
  }

  function viewIniciar() {
    const d = view.draft || {};
    return `<section class="card">
      <h2>Iniciar turno</h2>
      <form data-form="iniciar" class="stacked-form" novalidate>
        <div class="field"><label>Usina</label>
          <select name="usina" data-onchange="usina">${optionsDe(listas.usinas, d.usina, 'Selecione a usina')}</select></div>
        <div class="field"><label>Trator</label>
          <select name="trator">${optionsDe(d.usina ? tratoresDaUsina(d.usina) : [], d.trator, d.usina ? 'Selecione o trator' : 'Escolha a usina primeiro')}</select></div>
        <div class="field"><label>Implemento</label>
          <select name="implemento">${optionsDe(listas.implementos, d.implemento, 'Selecione o implemento')}</select></div>
        <div class="field"><label>Hora de início</label>
          <input type="time" name="hora" class="tr-input" value="${esc(d.hora || agoraHHMM())}" required>
          <p class="field-hint">Já começou antes? Ajuste para a hora real.</p></div>
        ${htmlEscolhaEvento('ini', d.tipo)}
        <p class="tr-erro" id="trErro" role="alert"></p>
        <div class="inline-form__actions">
          <button type="submit" class="btn btn--start">Iniciar turno</button>
          <button type="button" class="btn btn--ghost" data-act="voltar">Cancelar</button>
        </div>
      </form></section>`;
  }

  function viewSemOp() {
    const base = view.id ? state.turnos[view.id] : null;
    const motivoAtual = base ? String(base.observacao).split(' — ')[0] : '';
    const nota = base && String(base.observacao).includes(' — ') ? String(base.observacao).split(' — ').slice(1).join(' — ') : '';
    return `<section class="card">
      <h2>${base ? 'Editar dia sem operação' : 'Registrar dia sem operação'}</h2>
      <p class="muted">Feriado, folga, chuva ou dia sem acompanhamento. Entra com 0 hora de operação.</p>
      <form data-form="semop" class="stacked-form" novalidate>
        <div class="field"><label>Usina</label>
          <select name="usina">${optionsDe(listas.usinas, base ? base.usina_id : '', 'Selecione a usina')}</select></div>
        <div class="field"><label>Data</label>
          <input type="date" name="data" class="tr-input" value="${esc(base ? base.data : localDate(nowMs()))}" max="${localDate(nowMs())}"></div>
        <div class="field"><label>Motivo</label>
          <select name="motivo"><option value="">Selecione o motivo</option>${listas.motivos.map((m) => `<option${m === motivoAtual ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <div class="field"><label>Observação (opcional)</label><textarea name="obs" rows="2" maxlength="300">${esc(nota)}</textarea></div>
        <p class="tr-erro" id="trErro" role="alert"></p>
        <div class="inline-form__actions">
          <button type="submit" class="btn btn--start">Salvar</button>
          <button type="button" class="btn btn--ghost" data-act="voltar">Cancelar</button>
        </div>
      </form></section>`;
  }

  function viewTurno() {
    const t = turnoAbertoDoUsuario();
    if (!t) { view = { name: 'home' }; return viewHome(); }
    const at = eventoAtual(t);
    const evs = ordenados(t);
    const painel = view.painel || null;
    let h = `<section class="card tr-turno">
      ${tratorDeTeste(t.trator_id) ? '<p class="tr-teste-aviso" role="status"><strong>Trator de teste.</strong> Este turno é uma simulação e não entra nos dados reais do dashboard.</p>' : ''}
      <div class="tr-turno__topo">
        <div><strong>${esc(nomeDe(t.usina_id))} · ${esc(nomeDe(t.trator_id))}</strong><br>
        <span class="muted">${esc(nomeDe(implementoAtual(t)))} · turno iniciado às ${fmtHora(t.inicio_iso)}</span></div>
        <div class="tr-turno__total"><span class="muted">Total do turno</span><br><strong id="trTotal">${fmtRelogio(totalTurnoMs(t))}</strong></div>
      </div>
      ${t._erro ? `<div class="alert alert--danger"><strong>Este turno ainda não foi enviado ao servidor</strong><span>${esc(t._erro)}</span></div>` : ''}
      <div class="tr-evento tr-evento--${at && modoDe(at) !== 'autonomo' ? modoDe(at) : 'auto'}">
        <span class="tr-evento__rotulo">${at ? esc(rotuloEvento(at)) : ''}</span>
        ${at && at.descricao_original ? `<span class="tr-evento__desc">${esc(at.descricao_original)}</span>` : ''}
        ${at && at.observacao ? `<span class="tr-evento__obs">Obs.: ${esc(at.observacao)}</span>` : ''}
        <span class="tr-clock" id="trClock">${at ? fmtRelogio(nowMs() - Date.parse(at.inicio_iso)) : '00:00:00'}</span>
        <span class="tr-evento__desde">desde ${at ? fmtHora(at.inicio_iso) : ''}</span>
      </div>`;

    if (!painel) {
      h += `<div class="tr-acoes">
          <button type="button" class="btn btn--start tr-big" data-act="abrir-troca">Trocar de evento</button>
          <div class="tr-acoes__linha">
            <button type="button" class="btn btn--ghost" data-act="abrir-impl">Trocar implemento</button>
            <button type="button" class="btn btn--stop" data-act="abrir-encerrar">Encerrar turno</button>
          </div>
        </div>`;
    } else if (painel === 'troca') {
      h += `<form data-form="troca" class="tr-painel" novalidate><h3>Trocar de evento</h3>
          ${htmlEscolhaEvento('tr', null)}
          <div class="field"><label>Hora da troca</label><input type="time" name="hora" class="tr-input" value="${agoraHHMM()}">
            <p class="field-hint">Trocou há alguns minutos? Ajuste para a hora real.</p></div>
          <p class="tr-erro" id="trErro" role="alert"></p>
          <div class="inline-form__actions"><button type="submit" class="btn btn--start">Registrar</button><button type="button" class="btn btn--ghost" data-act="fechar-painel">Voltar</button></div></form>`;
    } else if (painel === 'impl') {
      h += `<form data-form="impl" class="tr-painel" novalidate><h3>Trocar implemento</h3>
          <p class="muted">Em uso: ${esc(nomeDe(implementoAtual(t)))}. A troca entra como uma parada; quando voltar a operar, registre "Operação autônoma".</p>
          <div class="field"><label>Novo implemento</label><select name="implemento">${optionsDe(listas.implementos.filter((x) => x.id !== implementoAtual(t)), '', 'Selecione o implemento')}</select></div>
          <div class="field"><label>Hora da troca</label><input type="time" name="hora" class="tr-input" value="${agoraHHMM()}"></div>
          <p class="tr-erro" id="trErro" role="alert"></p>
          <div class="inline-form__actions"><button type="submit" class="btn btn--start">Registrar troca</button><button type="button" class="btn btn--ghost" data-act="fechar-painel">Voltar</button></div></form>`;
    } else if (painel === 'encerrar') {
      const meta = listas.metas.find((m) => m.usina_id === t.usina_id && m.implemento_id === t.implemento_id);
      h += `<form data-form="encerrar" class="tr-painel" novalidate><h3>Encerrar turno</h3>
          <div class="field"><label>Hora de término</label><input type="time" name="hora" class="tr-input" value="${agoraHHMM()}"></div>
          <div class="field-grid">
            <div class="field"><label>Hectares — autônomo</label><input type="text" inputmode="decimal" name="haAuto" class="tr-input" placeholder="0"></div>
            <div class="field"><label>Hectares — manual</label><input type="text" inputmode="decimal" name="haMan" class="tr-input" placeholder="0"></div>
          </div>
          <p class="field-hint">Valores dos monitores do trator. Digite 0 se não houve.${meta ? ` Meta do turno (só autônomo): ${fmtNum(meta.ha_turno)} ha em ${fmtNum(meta.horas_turno)} h.` : ''}</p>
          <div class="field"><label>Observação (opcional)</label><textarea name="obs" rows="2" maxlength="500"></textarea></div>
          <p class="tr-erro" id="trErro" role="alert"></p>
          <div class="inline-form__actions"><button type="submit" class="btn btn--stop">Encerrar turno</button><button type="button" class="btn btn--ghost" data-act="fechar-painel">Voltar</button></div></form>`;
    }

    h += `<h3 class="tr-sub">Eventos do turno</h3><ol class="tr-timeline">` + evs.slice().reverse().map((e) => `
        <li class="tr-tl tr-tl--${modoDe(e)}"><span class="tr-tl__hora">${fmtHora(e.inicio_iso)}${e.fim_iso ? '–' + fmtHora(e.fim_iso) : ' →'}</span>
        <span class="tr-tl__txt"><strong>${esc(rotuloEvento(e))}</strong>${e.descricao_original ? '<br>' + esc(e.descricao_original) : ''}${e.observacao ? '<br><span class="muted">Obs.: ' + esc(e.observacao) + '</span>' : ''}</span>
        <span class="tr-tl__dur">${e.fim_iso ? fmtDuracao(msEvento(e)) : 'em andamento'}</span></li>`).join('') + `</ol>
      <div class="tr-rodape"><button type="button" class="link-button" data-act="editar" data-id="${esc(t.id)}">Corrigir horários e textos do turno</button>
      <span id="trStatusLine" class="tr-status"></span></div></section>`;
    return h;
  }

  /** Causa (lista do botão) + descrição de "Outras", para o formulário de correção. */
  function htmlCausaEdicao(e) {
    const modo = modoDe(e) === 'autonomo' ? 'parada' : modoDe(e);
    const lista = causasDoModo(modo).slice();
    const atual = e.causa_id ? (listas.causas || []).find((c) => c.id === e.causa_id) : null;
    if (atual && !lista.find((c) => c.id === atual.id)) lista.push(atual); // causa fora da lista do botão: mantém a escolhida
    const outras = !e.causa_id;
    return `<div class="field"><label>Causa</label><select name="causa" data-onchange="causa-edit">
        ${lista.map((c) => `<option value="${esc(c.id)}"${e.causa_id === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        <option value="${OUTRAS}"${outras ? ' selected' : ''}>Outras</option></select></div>
      <div class="field${outras ? '' : ' hidden'}" data-outras><label>Descreva o motivo</label><textarea name="desc" rows="2" maxlength="500">${esc(outras ? (e.descricao_original || '') : '')}</textarea></div>
      <div class="field"><label>Observações <span class="muted">(opcional)</span></label><textarea name="obs_ev" rows="2" maxlength="500">${esc(e.observacao || '')}</textarea></div>`;
  }

  function viewEditar() {
    const t = state.turnos[view.id];
    if (!t) { view = { name: 'home' }; return viewHome(); }
    if (t.status === 'sem_operacao') return viewSemOp();
    const draft = view.draft || JSON.parse(JSON.stringify(t));
    const fechado = t.status === 'fechado';
    const evs = (draft.eventos || []).slice().sort((a, b) => Date.parse(a.inicio_iso) - Date.parse(b.inicio_iso));
    const trat = listas.tratores.filter((x) => x.usina_id === draft.usina_id);
    if (!trat.find((x) => x.id === draft.trator_id)) trat.push({ id: draft.trator_id, nome: nomeDe(draft.trator_id), usina_id: draft.usina_id });
    const impls = listas.implementos.slice();
    if (!impls.find((x) => x.id === draft.implemento_id)) impls.push({ id: draft.implemento_id, nome: nomeDe(draft.implemento_id) });
    const usinas = listas.usinas.slice();
    if (!usinas.find((x) => x.id === draft.usina_id)) usinas.push({ id: draft.usina_id, nome: nomeDe(draft.usina_id) });
    return `<section class="card">
      <h2>Corrigir turno de ${fmtDiaLongo(t.data)}</h2>
      <p class="muted">Toda alteração fica registrada (quem e quando). Não há prazo para corrigir.</p>
      <form data-form="editar" class="stacked-form" novalidate>
        <div class="field"><label>Usina</label><select name="usina" data-onchange="usina-edit">${optionsDe(usinas, draft.usina_id, 'Selecione')}</select></div>
        <div class="field"><label>Trator</label><select name="trator">${optionsDe(trat, draft.trator_id, 'Selecione')}</select></div>
        <div class="field"><label>Implemento</label><select name="implemento">${optionsDe(impls, draft.implemento_id, 'Selecione')}</select></div>
        <h3 class="tr-sub">Eventos</h3>
        ${evs.map((e, i) => {
          const aberto = !e.fim_iso;
          return `<div class="tr-edit-ev" data-ev="${esc(e.id)}" data-impl="${esc(e.implemento_id || '')}">
            <div class="tr-edit-ev__linha">
              <div class="field"><label>Início</label><input type="datetime-local" name="ini" class="tr-input" value="${toLocalInput(e.inicio_iso)}" data-orig="${esc(e.inicio_iso)}"></div>
              <div class="field"><label>Fim</label><input type="datetime-local" name="fim" class="tr-input" value="${aberto ? '' : toLocalInput(e.fim_iso)}"${aberto ? ' disabled' : ` data-orig="${esc(e.fim_iso)}"`}></div>
            </div>
            <div class="field"><label>Como estava o trator</label><select name="tipo" data-onchange="tipo-edit">${['autonomo', 'manual', 'parada'].map((m) => `<option value="${m}"${modoDe(e) === m ? ' selected' : ''}>${{ autonomo: 'Operação autônoma', manual: 'Operação manual', parada: 'Parada' }[m]}</option>`).join('')}</select></div>
            <div class="tr-edit-ev__parada${e.tipo === 'parada' ? '' : ' hidden'}">
              ${htmlCausaEdicao(e)}
            </div>
          </div>`;
        }).join('')}
        <button type="button" class="btn btn--ghost btn--small" data-act="add-evento">+ Adicionar evento esquecido</button>
        ${fechado ? `<div class="field-grid">
            <div class="field"><label>Hectares — autônomo</label><input type="text" inputmode="decimal" name="haAuto" class="tr-input" value="${esc(String(draft.ha_autonomo).replace('.', ','))}"></div>
            <div class="field"><label>Hectares — manual</label><input type="text" inputmode="decimal" name="haMan" class="tr-input" value="${esc(String(draft.ha_manual).replace('.', ','))}"></div>
          </div>` : ''}
        <div class="field"><label>Observação</label><textarea name="obs" rows="2" maxlength="500">${esc(draft.observacao || '')}</textarea></div>
        <p class="tr-erro" id="trErro" role="alert"></p>
        <div class="inline-form__actions"><button type="submit" class="btn btn--start">Salvar alterações</button><button type="button" class="btn btn--ghost" data-act="voltar">Cancelar</button></div>
      </form></section>`;
  }

  /* ---------------------------------- Render --------------------------------- */

  function render() {
    const el = root();
    if (!el || !ctx) return;
    let corpo;
    switch (view.name) {
      case 'iniciar': corpo = viewIniciar(); break;
      case 'semop': corpo = viewSemOp(); break;
      case 'turno': corpo = viewTurno(); break;
      case 'editar': corpo = viewEditar(); break;
      default: view = { name: 'home' }; corpo = viewHome();
    }
    el.innerHTML = `<div id="trBanner" class="tr-banner-area" aria-live="polite"></div>${corpo}`;
    bannerKey = '';
    atualizarStatus();
    atualizarBanner();
    window.scrollTo({ top: 0 });
  }

  function mostrarErro(msg) {
    const el = document.getElementById('trErro');
    if (el) { el.textContent = msg; el.scrollIntoView({ block: 'nearest' }); }
    else ctx.toast(msg, 'error');
  }

  function tick() {
    if (!ctx) return;
    const t = turnoAbertoDoUsuario();
    const at = t && eventoAtual(t);
    const clock = document.getElementById('trClock');
    if (clock && at) clock.textContent = fmtRelogio(nowMs() - Date.parse(at.inicio_iso));
    const total = document.getElementById('trTotal');
    if (total && t) total.textContent = fmtRelogio(totalTurnoMs(t));
    atualizarBanner();
  }

  /* --------------------------------- Eventos DOM ----------------------------- */

  function coletarRascunhoIniciar(f) {
    const tipo = f.querySelector('[name=tipo]:checked');
    return {
      usina: f.querySelector('[name=usina]').value, trator: f.querySelector('[name=trator]').value,
      implemento: f.querySelector('[name=implemento]').value, hora: f.querySelector('[name=hora]').value,
      tipo: tipo ? tipo.value : null,
    };
  }

  function aoClicar(ev) {
    const alvo = ev.target.closest('[data-act]');
    if (!alvo || !root().contains(alvo)) return;
    const act = alvo.dataset.act;
    switch (act) {
      case 'ir-iniciar': view = { name: 'iniciar', draft: {} }; render(); break;
      case 'ir-semop': view = { name: 'semop' }; render(); break;
      case 'ir-turno': view = { name: 'turno' }; render(); break;
      case 'voltar': view = { name: 'home' }; render(); break;
      case 'abrir-troca': view = { name: 'turno', painel: 'troca' }; render(); break;
      case 'abrir-impl': view = { name: 'turno', painel: 'impl' }; render(); break;
      case 'abrir-encerrar': view = { name: 'turno', painel: 'encerrar' }; render(); break;
      case 'fechar-painel': view = { name: 'turno' }; render(); break;
      case 'confirmar-evento': {
        const t = turnoAbertoDoUsuario();
        if (t) { state.confirmacoes[t.id] = nowMs(); salvar(); }
        bannerKey = null; // força redesenhar (mesmo que fique sem aviso)
        atualizarBanner();
        break;
      }
      case 'editar': view = { name: 'editar', id: alvo.dataset.id }; render(); break;
      case 'descartar': {
        const t = state.turnos[alvo.dataset.id];
        if (t && t._novo) {
          confirmar('Descartar este registro? Ele nunca chegou ao servidor e será apagado deste aparelho.', 'Descartar').then((ok) => {
            if (ok) { delete state.turnos[t.id]; salvar(); atualizarStatus(); render(); }
          });
        }
        break;
      }
      case 'add-evento': {
        const f = alvo.closest('form');
        try { view.draft = rascunhoEdicao(f, true); } catch (e) { mostrarErro(e.message); return; }
        render();
        break;
      }
    }
  }

  /** Lê tipo/causa/texto de uma linha do formulário de edição, sem validar (rascunho). */
  function lerLinhaRascunho(r) {
    const modo = r.querySelector('[name=tipo]').value;
    if (modo === 'autonomo') return { tipo: 'autonomo', disponibilidade: 'Autônomo', descricao_original: '', causa_id: '', observacao: '' };
    const causaSel = r.querySelector('[name=causa]') ? r.querySelector('[name=causa]').value : OUTRAS;
    const causa = causaSel && causaSel !== OUTRAS ? (listas.causas || []).find((c) => c.id === causaSel) : null;
    const descEl = r.querySelector('[name=desc]');
    const obsEl = r.querySelector('[name=obs_ev]');
    return { tipo: 'parada', disponibilidade: DISP_DO_MODO[modo], causa_id: causa ? causa.id : '', descricao_original: causa ? causa.nome : (descEl ? descEl.value : ''), observacao: obsEl ? obsEl.value : '' };
  }

  /** Lê o formulário de edição sem validar tudo (para "Adicionar evento"). */
  function rascunhoEdicao(f, adicionar) {
    const t = state.turnos[view.id];
    const d = JSON.parse(JSON.stringify(t));
    d.usina_id = f.querySelector('[name=usina]').value || d.usina_id;
    d.trator_id = f.querySelector('[name=trator]').value || d.trator_id;
    d.implemento_id = f.querySelector('[name=implemento]').value || d.implemento_id;
    d.observacao = f.querySelector('[name=obs]').value;
    const ha = f.querySelector('[name=haAuto]');
    if (ha) { d.ha_autonomo = ha.value; d.ha_manual = f.querySelector('[name=haMan]').value; }
    d.eventos = Array.from(f.querySelectorAll('[data-ev]')).map((r) => {
      const ini = lerDataHora(r.querySelector('[name=ini]'));
      const fimEl = r.querySelector('[name=fim]');
      const fim = fimEl.disabled || !fimEl.value ? null : lerDataHora(fimEl);
      return {
        id: r.dataset.ev, implemento_id: r.dataset.impl, inicio_iso: ini === null ? t.inicio_iso : iso(ini), fim_iso: fim === null ? '' : iso(fim),
        ...lerLinhaRascunho(r),
      };
    });
    if (adicionar) {
      const ultimo = d.eventos.slice().sort((a, b) => Date.parse(a.inicio_iso) - Date.parse(b.inicio_iso)).filter((e) => e.fim_iso).pop();
      const ini = ultimo ? Date.parse(ultimo.fim_iso) : Date.parse(d.inicio_iso);
      d.eventos.push({ id: uuid(), implemento_id: d.implemento_id, inicio_iso: iso(ini), fim_iso: iso(ini + 3600000), tipo: 'parada', disponibilidade: 'Não disponível', descricao_original: '', causa_id: '', observacao: '' });
    }
    return d;
  }

  function aoMudar(ev) {
    const alvo = ev.target.closest('[data-onchange]');
    if (!alvo) return;
    const f = alvo.closest('form');
    switch (alvo.dataset.onchange) {
      case 'usina': {
        if (view.name !== 'iniciar') return;
        view.draft = coletarRascunhoIniciar(f);
        view.draft.trator = '';
        const sel = f.querySelector('[name=trator]');
        sel.innerHTML = optionsDe(view.draft.usina ? tratoresDaUsina(view.draft.usina) : [], '', view.draft.usina ? 'Selecione o trator' : 'Escolha a usina primeiro');
        break;
      }
      case 'tipo': {
        const modo = f.querySelector('[name=tipo]:checked');
        const caixa = f.querySelector('[data-parada]');
        const comCausa = modo && (modo.value === 'manual' || modo.value === 'parada');
        caixa.classList.toggle('hidden', !comCausa);
        const obsAntes = caixa.querySelector('[name=obs_ev]');
        caixa.innerHTML = comCausa ? htmlCausas(modo.value, undefined, '', obsAntes ? obsAntes.value : '') : '';
        break;
      }
      case 'causa': {
        const escolhida = f.querySelector('[name=causa]:checked');
        const caixa = f.querySelector('[data-outras]');
        if (caixa) {
          const outras = escolhida && escolhida.value === OUTRAS;
          caixa.classList.toggle('hidden', !outras);
          if (outras) caixa.querySelector('textarea').focus();
        }
        break;
      }
      case 'causa-edit': {
        const caixa = alvo.closest('[data-ev]').querySelector('[data-outras]');
        if (caixa) caixa.classList.toggle('hidden', alvo.value !== OUTRAS);
        break;
      }
      case 'usina-edit': {
        const usina = alvo.value;
        const sel = f.querySelector('[name=trator]');
        sel.innerHTML = optionsDe(listas.tratores.filter((x) => x.usina_id === usina), '', 'Selecione');
        break;
      }
      case 'tipo-edit': {
        const linha = alvo.closest('[data-ev]');
        const box = linha.querySelector('.tr-edit-ev__parada');
        box.classList.toggle('hidden', alvo.value === 'autonomo');
        if (alvo.value !== 'autonomo') {
          const obsAntes = box.querySelector('[name=obs_ev]');
          box.innerHTML = htmlCausaEdicao({ tipo: 'parada', disponibilidade: DISP_DO_MODO[alvo.value], causa_id: '', descricao_original: '', observacao: obsAntes ? obsAntes.value : '' });
          const sel = box.querySelector('[name=causa]');
          const primeira = sel.options[0];
          if (primeira && primeira.value !== OUTRAS) { sel.value = primeira.value; box.querySelector('[data-outras]').classList.add('hidden'); }
        }
        break;
      }
    }
  }

  function aoEnviar(ev) {
    const f = ev.target.closest('form[data-form]');
    if (!f || !root().contains(f)) return;
    ev.preventDefault();
    const tipo = f.dataset.form;
    try {
      if (tipo === 'iniciar') { acaoIniciarTurno(f); render(); }
      else if (tipo === 'troca') { acaoTrocarEvento(f); render(); }
      else if (tipo === 'impl') { acaoTrocarImplemento(f); render(); }
      else if (tipo === 'semop') { acaoDiaSemOperacao(f, view.id || null); render(); }
      else if (tipo === 'editar') { acaoSalvarEdicao(f); render(); }
      else if (tipo === 'encerrar') {
        const p = acaoEncerrar(f);
        const resumo = `Turno de ${fmtDuracao(totalTurnoMs(p.t) - msEvento(p.atual) + (p.fim - Date.parse(p.atual.inicio_iso)))} — autônomo ${fmtNum(p.haA)} ha, manual ${fmtNum(p.haM)} ha. Depois de encerrado, você ainda pode corrigir em "Meus turnos".`;
        confirmar(resumo, 'Encerrar turno', 'Encerrar este turno?').then((ok) => {
          if (ok) { confirmarEncerrar(p); render(); }
        });
      }
    } catch (err) {
      mostrarErro(err.message);
    }
  }

  function confirmar(texto, rotuloOk, titulo) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'tr-modal';
      wrap.innerHTML = `<div class="tr-modal__caixa" role="dialog" aria-modal="true"><h3>${esc(titulo || 'Confirmar')}</h3><p>${esc(texto)}</p>
        <div class="inline-form__actions"><button type="button" class="btn btn--stop" data-r="ok">${esc(rotuloOk || 'Confirmar')}</button><button type="button" class="btn btn--ghost" data-r="no">Voltar</button></div></div>`;
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]');
        if (!b && e.target !== wrap) return;
        wrap.remove();
        resolve(!!b && b.dataset.r === 'ok');
      });
      document.body.appendChild(wrap);
      const ok = wrap.querySelector('[data-r=ok]');
      if (ok) ok.focus();
    });
  }

  function aoVoltarVisivel() {
    if (document.visibilityState !== 'visible' || !ctx) return;
    tick();
    atualizarBanner();
    sync({ silent: true });
  }

  let ligado = false;
  function ligar() {
    if (ligado) return;
    ligado = true;
    const el = root();
    el.addEventListener('click', aoClicar);
    el.addEventListener('change', aoMudar);
    el.addEventListener('submit', aoEnviar);
    document.addEventListener('visibilitychange', aoVoltarVisivel);
    window.addEventListener('focus', aoVoltarVisivel);
    window.addEventListener('online', () => sync({ silent: true }));
    window.addEventListener('beforeunload', (e) => {
      // O cronômetro NÃO depende da página aberta; este aviso só evita fechar no meio de um formulário.
      if (ctx && view.name !== 'home' && view.name !== 'turno' && root().querySelector('form')) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* ------------------------------- API pública ------------------------------- */

  window.TratorApp = {
    enter(c) {
      ctx = c;
      ligar();
      carregarEstado();
      view = turnoAbertoDoUsuario() ? { name: 'turno' } : { name: 'home' };
      render();
      clearInterval(tickId);
      tickId = setInterval(tick, 1000);
      sync({ silent: true });
    },
    leave() {
      clearInterval(tickId);
      tickId = null;
      ctx = null;
      state = null;
      view = { name: 'home' };
      if (root()) root().innerHTML = '';
    },
    sync(opts) { return sync(opts || {}); },
    pendingCount() { return state ? pendentes().length : 0; },
    // expostos para testes automáticos
    _debug() { return { state, listas, view }; },
  };
})();
