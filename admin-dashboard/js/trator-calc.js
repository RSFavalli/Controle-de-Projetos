/**
 * trator-calc.js
 * ------------------------------------------------------------------
 * Cálculos do Dashboard da equipe Trator Autônomo (funções puras, sem tela).
 * Reproduzem as regras do relatório "Autonomous Tractor Operations" atual,
 * agora sobre a causa padrão:
 *
 *  - Tempo monitorado = soma das horas de todos os eventos (Σ coluna "horas").
 *  - Grupo de um evento: Autônomo (operação autônoma), ou o responsável da causa
 *    padrão (Cliente, ASI/Agricef, Não gerenciável); sem causa = "A classificar"
 *    (entra nos totais de horas, fica fora dos % por responsável).
 *  - Parada = todo evento que não é operação autônoma.
 *  - Disponibilidade = por usina e semana (segunda a domingo):
 *    (168 h − horas "Não disponível") ÷ 168 h; a média das semanas com eventos.
 *  - Tendência semanal = parcela autônoma por semana (semanas com ≥ 5 h);
 *    carta I-MR: média ± 2,66 × amplitude móvel média (limitado a 0–100%);
 *    limite da amplitude móvel = 3,267 × amplitude móvel média.
 *  - Hora do dia: cada evento é distribuído pelas horas de relógio que cobre.
 * ------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  const GRUPOS = ['Autônomo', 'Cliente', 'ASI/Agricef', 'Não gerenciável'];
  const A_CLASSIFICAR = 'A classificar';
  const HORAS_SEMANA = 168;

  const pad = (n) => String(n).padStart(2, '0');
  const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));

  function norm(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  /** "2026-11-06" -> segunda-feira da semana ("2026-11-02"). */
  function inicioSemana(dataStr) {
    const [y, m, d] = String(dataStr).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dow = (dt.getUTCDay() + 6) % 7; // 0 = segunda
    dt.setUTCDate(dt.getUTCDate() - dow);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }

  function grupoDoEvento(e) {
    if (e.operacao === 'Em operação') return 'Autônomo';
    return e.responsavel || A_CLASSIFICAR;
  }

  /** Junta turno e evento e deixa cada evento pronto para os cálculos. */
  function preparar(dados) {
    const turnoPorId = {};
    (dados.turnos || []).forEach((t) => { turnoPorId[t.id] = t; });
    const eventos = [];
    (dados.eventos || []).forEach((e) => {
      if (!e.fim_iso) return; // evento em andamento fica fora das horas
      const t = turnoPorId[e.turno_id] || {};
      const h = e.horas !== '' && e.horas != null ? num(e.horas) : Math.max(0, (Date.parse(e.fim_iso) - Date.parse(e.inicio_iso)) / 3600000);
      eventos.push({
        id: e.id, turno_id: e.turno_id, usina_id: e.usina_id, trator_id: e.trator_id, implemento_id: e.implemento_id,
        tecnico: e.tecnico_nome || t.tecnico_nome || '', data: t.data || String(e.inicio_iso).slice(0, 10),
        t0: Date.parse(e.inicio_iso), t1: Date.parse(e.fim_iso), h: h,
        operacao: e.operacao || (e.tipo === 'autonomo' ? 'Em operação' : 'Parado'), disponibilidade: e.disponibilidade || '',
        descricao: e.descricao_original || '', causa_id: e.causa_id || '', causa_nome: e.causa_nome || '',
        responsavel: e.responsavel || '', origem: e.origem_classificacao || '', confianca: e.confianca,
        grupo: grupoDoEvento({ operacao: e.operacao || (e.tipo === 'autonomo' ? 'Em operação' : 'Parado'), responsavel: e.responsavel }),
      });
    });
    return { eventos: eventos, turnos: dados.turnos || [] };
  }

  /**
   * Filtros: { usinas: Set|[], de, ate ('YYYY-MM-DD'), implemento, trator,
   *   causa, responsaveis: Set|[], revisao: 'todos'|'classificados'|'a-classificar',
   *   modo: 'reais' (padrão) | 'teste', testeIds: ids dos tratores de teste }
   * Modo 'reais' tira os tratores de teste da conta; modo 'teste' mostra só eles (simulações).
   * usina, período, implemento e trator valem para tudo; causa e responsável só para as paradas
   * (a operação autônoma continua visível como referência).
   */
  function filtrar(base, f) {
    f = f || {};
    const usinas = f.usinas && f.usinas.size !== undefined ? Array.from(f.usinas) : (f.usinas || []);
    const resps = f.responsaveis && f.responsaveis.size !== undefined ? Array.from(f.responsaveis) : (f.responsaveis || []);
    const testeIds = f.testeIds || [];
    const soTeste = f.modo === 'teste';
    const baseOk = (x) =>
      (!testeIds.length || (testeIds.indexOf(x.trator_id) !== -1) === soTeste) &&
      (!usinas.length || usinas.indexOf(x.usina_id) !== -1) &&
      (!f.de || x.data >= f.de) && (!f.ate || x.data <= f.ate) &&
      (!f.implemento || x.implemento_id === f.implemento) &&
      (!f.trator || x.trator_id === f.trator);
    const eventos = base.eventos.filter((e) => {
      if (!baseOk(e)) return false;
      const parada = e.grupo !== 'Autônomo';
      if (f.revisao === 'classificados' && e.grupo === A_CLASSIFICAR) return false;
      if (f.revisao === 'a-classificar' && e.grupo !== A_CLASSIFICAR) return false;
      if (parada) {
        if (f.causa && e.causa_id !== f.causa) return false;
        // Com responsável escolhido, "A classificar" (sem responsável) sai da conta.
        if (resps.length && resps.indexOf(e.grupo) === -1) return false;
      }
      return true;
    });
    const turnos = base.turnos.filter(baseOk);
    return { eventos: eventos, turnos: turnos };
  }

  const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);

  function somaPor(eventos, chave) {
    const m = {};
    eventos.forEach((e) => { const k = chave(e); m[k] = (m[k] || 0) + e.h; });
    return m;
  }

  /** Disponibilidade por usina e semana; devolve { medias, porSemana }. */
  function disponibilidade(eventos) {
    const sem = {}; // usina -> semana -> {nd, total}
    eventos.forEach((e) => {
      const s = inicioSemana(e.data);
      sem[e.usina_id] = sem[e.usina_id] || {};
      const c = (sem[e.usina_id][s] = sem[e.usina_id][s] || { nd: 0, total: 0 });
      c.total += e.h;
      if (e.disponibilidade === 'Não disponível') c.nd += e.h;
    });
    const serie = {};
    let todas = [];
    Object.keys(sem).forEach((u) => {
      serie[u] = Object.keys(sem[u]).sort().map((s) => {
        const v = Math.max(0, (HORAS_SEMANA - sem[u][s].nd) / HORAS_SEMANA);
        todas.push(v);
        return { semana: s, v: v, horas: sem[u][s].total };
      });
    });
    return { serie: serie, media: todas.length ? todas.reduce((a, b) => a + b, 0) / todas.length : null, semanas: todas.length };
  }

  /** Série semanal da parcela autônoma + carta I-MR. */
  function tendencia(eventos, minHoras) {
    minHoras = minHoras == null ? 5 : minHoras;
    const sem = {};
    eventos.forEach((e) => {
      const s = inicioSemana(e.data);
      const c = (sem[s] = sem[s] || { h: 0, aut: 0 });
      c.h += e.h;
      if (e.grupo === 'Autônomo') c.aut += e.h;
    });
    const pontos = Object.keys(sem).sort().filter((s) => sem[s].h >= minHoras).map((s) => ({ semana: s, v: (100 * sem[s].aut) / sem[s].h, horas: sem[s].h }));
    if (!pontos.length) return { pontos: [], media: null };
    const media = pontos.reduce((a, p) => a + p.v, 0) / pontos.length;
    const mr = [];
    for (let i = 1; i < pontos.length; i++) mr.push({ semana: pontos[i].semana, v: Math.abs(pontos[i].v - pontos[i - 1].v) });
    const mrMedia = mr.length ? mr.reduce((a, b) => a + b.v, 0) / mr.length : 0;
    return {
      pontos: pontos, media: media, mr: mr, mrMedia: mrMedia,
      lsc: Math.min(100, media + 2.66 * mrMedia), lic: Math.max(0, media - 2.66 * mrMedia), lscMr: 3.267 * mrMedia,
      foraDosLimites: pontos.filter((p) => p.v > Math.min(100, media + 2.66 * mrMedia) || p.v < Math.max(0, media - 2.66 * mrMedia)).length,
    };
  }

  /** Mapa de calor: horas autônomas por dia da semana (0 = segunda) × hora do dia. */
  function horaDoDia(eventos) {
    const m = Array.from({ length: 7 }, () => new Array(24).fill(0));
    eventos.forEach((e) => {
      if (e.grupo !== 'Autônomo') return;
      let t = e.t0;
      let guarda = 0;
      while (t < e.t1 && guarda++ < 400) {
        const d = new Date(t);
        const fimHora = new Date(t);
        fimHora.setMinutes(0, 0, 0);
        fimHora.setHours(fimHora.getHours() + 1);
        const prox = Math.min(e.t1, fimHora.getTime());
        m[(d.getDay() + 6) % 7][d.getHours()] += (prox - t) / 3600000;
        t = prox;
      }
    });
    return m;
  }

  /** Principais cálculos do filtro atual. */
  function resumo(base, f) {
    const { eventos, turnos } = filtrar(base, f);
    const total = soma(eventos, (e) => e.h);
    const porGrupo = somaPor(eventos, (e) => e.grupo);
    GRUPOS.concat([A_CLASSIFICAR]).forEach((g) => { porGrupo[g] = porGrupo[g] || 0; });
    const aut = porGrupo['Autônomo'];
    const paradas = eventos.filter((e) => e.grupo !== 'Autônomo');
    const horasParadas = total - aut;
    const classificadas = paradas.filter((e) => e.grupo !== A_CLASSIFICAR);
    const horasClassificadas = soma(classificadas, (e) => e.h);

    // Pareto por causa padrão (só classificadas) + A classificar à parte
    const porCausa = {};
    classificadas.forEach((e) => {
      const c = (porCausa[e.causa_id || e.causa_nome] = porCausa[e.causa_id || e.causa_nome] || { id: e.causa_id, nome: e.causa_nome || e.causa_id, grupo: e.grupo, h: 0, n: 0 });
      c.h += e.h;
      c.n += 1;
    });
    const pareto = Object.keys(porCausa).map((k) => porCausa[k]).sort((a, b) => b.h - a.h);
    let acum = 0;
    pareto.forEach((c) => { acum += c.h; c.acum = horasClassificadas ? acum / horasClassificadas : 0; c.pct = horasClassificadas ? c.h / horasClassificadas : 0; });
    const aClass = paradas.filter((e) => e.grupo === A_CLASSIFICAR);

    // por usina
    const porUsina = {};
    eventos.forEach((e) => {
      const u = (porUsina[e.usina_id] = porUsina[e.usina_id] || { id: e.usina_id, total: 0, grupos: {} });
      u.total += e.h;
      u.grupos[e.grupo] = (u.grupos[e.grupo] || 0) + e.h;
    });

    // por implemento
    const porImpl = {};
    eventos.forEach((e) => {
      const i = (porImpl[e.implemento_id] = porImpl[e.implemento_id] || { id: e.implemento_id, total: 0, aut: 0 });
      i.total += e.h;
      if (e.grupo === 'Autônomo') i.aut += e.h;
    });

    // status do trator por usina
    const statusUsina = {};
    eventos.forEach((e) => {
      const u = (statusUsina[e.usina_id] = statusUsina[e.usina_id] || { total: 0, 'Autônomo': 0, Manual: 0, 'Não disponível': 0 });
      u.total += e.h;
      const k = e.disponibilidade === 'Manual' || e.disponibilidade === 'Não disponível' ? e.disponibilidade : 'Autônomo';
      u[k] += e.h;
    });

    // causa × usina
    const causaUsina = {};
    classificadas.forEach((e) => {
      const k = e.causa_id || e.causa_nome;
      causaUsina[k] = causaUsina[k] || {};
      causaUsina[k][e.usina_id] = (causaUsina[k][e.usina_id] || 0) + e.h;
    });

    const dias = {};
    turnos.forEach((t) => { dias[t.usina_id + '|' + t.data] = 1; });
    eventos.forEach((e) => { dias[e.usina_id + '|' + e.data] = 1; });

    return {
      eventos: eventos, turnos: turnos, total: total, porGrupo: porGrupo, aut: aut,
      pctAut: total ? aut / total : null, horasParadas: horasParadas, nParadas: paradas.length,
      pctParadas: total ? horasParadas / total : null, nEventos: eventos.length, diasCampo: Object.keys(dias).length,
      disp: disponibilidade(eventos), pareto: pareto, topOfensor: pareto[0] || null,
      aClassificar: { n: aClass.length, h: soma(aClass, (e) => e.h) },
      horasClassificadas: horasClassificadas, porUsina: porUsina, porImpl: porImpl, statusUsina: statusUsina,
      causaUsina: causaUsina, tendencia: tendencia(eventos), hora: horaDoDia(eventos),
    };
  }

  /** Frequência × duração por causa (bolhas); medianas entre as causas exibidas. */
  function frequenciaDuracao(pareto) {
    const pts = pareto.map((c) => ({ id: c.id, nome: c.nome, grupo: c.grupo, n: c.n, media: c.n ? c.h / c.n : 0, h: c.h }));
    const mediana = (xs) => {
      const s = xs.slice().sort((a, b) => a - b);
      if (!s.length) return 0;
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    return { pontos: pts, medN: mediana(pts.map((p) => p.n)), medH: mediana(pts.map((p) => p.media)) };
  }

  /** Descrições mais frequentes (texto original) de uma causa. */
  function descricoesFrequentes(eventos, causaId, limite) {
    const cont = {};
    eventos.filter((e) => e.causa_id === causaId && e.descricao).forEach((e) => {
      const k = norm(e.descricao);
      const c = (cont[k] = cont[k] || { texto: e.descricao.trim(), n: 0 });
      c.n += 1;
    });
    return Object.keys(cont).map((k) => cont[k]).sort((a, b) => b.n - a.n).slice(0, limite || 4);
  }

  const api = {
    GRUPOS, A_CLASSIFICAR, HORAS_SEMANA, norm, inicioSemana, grupoDoEvento, preparar, filtrar, resumo,
    disponibilidade, tendencia, horaDoDia, frequenciaDuracao, descricoesFrequentes,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TratorCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
