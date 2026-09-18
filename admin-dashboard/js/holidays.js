/**
 * holidays.js
 * ------------------------------------------------------------------
 * Feriados nacionais + municipais de Paulínia/SP, para o painel de
 * conformidade saber quais dias tinham apontamento obrigatório.
 * Espelha a mesma lógica de backend/Code.gs (feriadosNacionais/
 * feriadosPaulinia/isBusinessDay) — mantenha as duas em sincronia se
 * alguma vez precisar corrigir uma data.
 * ------------------------------------------------------------------
 */

const Holidays = (() => {
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

  function dateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Fixos + móveis. Carnaval e Corpus Christi são "ponto facultativo" a rigor,
  // mas tratados aqui como não-úteis por serem universalmente observados nas
  // empresas brasileiras.
  function feriadosNacionais(year) {
    const pascoa = easterDate(year);
    return [
      new Date(year, 0, 1),
      addDays(pascoa, -48),
      addDays(pascoa, -47),
      addDays(pascoa, -2),
      addDays(pascoa, 60),
      new Date(year, 3, 21),
      new Date(year, 4, 1),
      new Date(year, 8, 7),
      new Date(year, 9, 12),
      new Date(year, 10, 2),
      new Date(year, 10, 15),
      new Date(year, 10, 20),
      new Date(year, 11, 25),
    ];
  }

  // Aniversário de Paulínia (28/fev, fixo) + padroeiro Sagrado Coração de Jesus
  // (Páscoa + 68 dias). Conferido contra o calendário oficial 2026 da Prefeitura.
  function feriadosPaulinia(year) {
    const pascoa = easterDate(year);
    return [new Date(year, 1, 28), addDays(pascoa, 68)];
  }

  const EXTRA_DIAS_NAO_UTEIS = []; // 'YYYY-MM-DD', para exceções pontuais

  function isBusinessDay(dateOrStr) {
    const date = typeof dateOrStr === 'string' ? parseDateStr(dateOrStr) : dateOrStr;
    const ds = dateStr(date);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return false;
    if (EXTRA_DIAS_NAO_UTEIS.indexOf(ds) !== -1) return false;
    const year = date.getFullYear();
    const feriados = feriadosNacionais(year).concat(feriadosPaulinia(year)).map(dateStr);
    return feriados.indexOf(ds) === -1;
  }

  function parseDateStr(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /** Últimos N dias úteis ANTES de hoje (não inclui hoje — o dia ainda está em curso). */
  function lastBusinessDays(n, referenceDate) {
    const result = [];
    let cursor = addDays(referenceDate || new Date(), -1);
    while (result.length < n) {
      if (isBusinessDay(cursor)) result.push(dateStr(cursor));
      cursor = addDays(cursor, -1);
    }
    return result.reverse();
  }

  return {
    isBusinessDay,
    lastBusinessDays,
    dateStr,
    parseDateStr,
  };
})();

window.Holidays = Holidays;
