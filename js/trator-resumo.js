/**
 * trator-resumo.js — "Resumo do dia" do técnico (Trator Autônomo)
 * ------------------------------------------------------------------
 * Monta, a partir dos turnos já guardados no aparelho (funciona offline), um resumo do dia
 * com horas em operação autônoma, operação manual e parada (por causa), hectares lançados,
 * observações e eventos "A classificar", e o entrega como:
 *   - PDF (gerado aqui mesmo, sem biblioteca; fontes padrão Helvetica) — formato principal:
 *     abre igual em qualquer celular, WhatsApp, e-mail e Drive, e não pode ser editado;
 *   - HTML somente leitura (arquivo único, sem scripts) — alternativa.
 * O compartilhamento em si (WhatsApp, e-mail…) é feito pelo app com a folha de compartilhar do aparelho.
 * Módulo puro: sem acesso ao DOM, ao relógio nem à rede (a hora vem em `agora`), por isso é testado no Node.
 * ------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  const LARG_H = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
  const LARG_B = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];

  const pad = (n) => String(n).padStart(2, '0');
  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  function fmtDur(ms) {
    const min = Math.max(0, Math.round(ms / 60000));
    return `${Math.floor(min / 60)} h ${pad(min % 60)} min`;
  }
  const fmtHa = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const fmtPct = (x) => `${Math.round(x * 100)}%`;
  function fmtHora(isoStr) {
    const d = new Date(isoStr);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fmtData(dataStr) {
    const [y, m, d] = String(dataStr).split('-');
    return `${d}/${m}/${y}`;
  }
  function fmtDataLonga(dataStr) {
    const [y, m, d] = String(dataStr).split('-').map(Number);
    return `${DIAS[new Date(y, m - 1, d).getDay()]}, ${pad(d)}/${pad(m)}/${y}`;
  }
  function fmtAgora(ms) {
    const d = new Date(ms);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ------------------------------ modelo do resumo ------------------------------ */

  const modoDe = (e) => (e.tipo === 'autonomo' ? 'autonomo' : e.disponibilidade === 'Manual' ? 'manual' : 'parada');
  const ehTroca = (e) => /^Troca de implemento/.test(e.descricao_original || '');
  const ROTULO_MODO = { autonomo: 'Operação autônoma', manual: 'Operação manual', parada: 'Parada' };

  /**
   * dados: { data:'AAAA-MM-DD', tecnico, turnos:[...], agora:ms,
   *          nomeDe(id), causaNome(id), tratorDeTeste(id) }
   */
  function montar(dados) {
    const nomeDe = dados.nomeDe || ((x) => x);
    const causaNome = dados.causaNome || (() => '');
    const teste = dados.tratorDeTeste || (() => false);
    const agora = dados.agora;
    const doDia = (dados.turnos || []).filter((t) => t.data === dados.data);
    const reais = doDia.filter((t) => !(t.trator_id && teste(t.trator_id)));
    // Só há simulação no dia: mostra, mas avisa. Havendo turno real, a simulação fica de fora.
    const simulacao = !reais.length && doDia.some((t) => t.trator_id && teste(t.trator_id));
    const usados = simulacao ? doDia : reais;

    const m = {
      data: dados.data, tecnico: dados.tecnico || '', geradoEm: agora, simulacao: simulacao,
      turnosForaTeste: doDia.length - reais.length,
      turnos: [], semOperacao: [], ms: { autonomo: 0, manual: 0, parada: 0, total: 0 },
      causas: { manual: [], parada: [] }, aClassificar: [], observacoes: [],
      ha: { autonomo: 0, manual: 0, lancado: false, emAndamento: false },
    };
    const porCausa = { manual: {}, parada: {} };

    usados.slice().sort((a, b) => String(a.inicio_iso).localeCompare(String(b.inicio_iso))).forEach((t) => {
      if (t.status === 'sem_operacao') {
        m.semOperacao.push({ usina: nomeDe(t.usina_id), motivo: t.observacao || '' });
        return;
      }
      const eventos = (t.eventos || []).slice().sort((a, b) => Date.parse(a.inicio_iso) - Date.parse(b.inicio_iso));
      const aberto = t.status === 'aberto';
      const fimTurno = t.fim_iso || (eventos.length ? eventos[eventos.length - 1].fim_iso : '') || '';
      m.turnos.push({
        usina: nomeDe(t.usina_id), trator: nomeDe(t.trator_id), implemento: nomeDe(t.implemento_id),
        inicio: fmtHora(t.inicio_iso), fim: aberto || !fimTurno ? '' : fmtHora(fimTurno), emAndamento: aberto,
        haAutonomo: aberto || t.ha_autonomo === '' || t.ha_autonomo == null ? null : Number(t.ha_autonomo),
        haManual: aberto || t.ha_manual === '' || t.ha_manual == null ? null : Number(t.ha_manual),
      });
      if (aberto) m.ha.emAndamento = true;
      else if (t.ha_autonomo !== '' && t.ha_autonomo != null) {
        m.ha.autonomo += Number(t.ha_autonomo) || 0;
        m.ha.manual += Number(t.ha_manual) || 0;
        m.ha.lancado = true;
      }
      eventos.forEach((e) => {
        const modo = modoDe(e);
        const ini = Date.parse(e.inicio_iso);
        const fim = e.fim_iso ? Date.parse(e.fim_iso) : agora;
        const ms = Math.max(0, fim - ini);
        m.ms[modo] += ms;
        m.ms.total += ms;
        const hora = fmtHora(e.inicio_iso) + (e.fim_iso ? '–' + fmtHora(e.fim_iso) : ' (em andamento)');
        const nomeCausa = e.causa_nome || (e.causa_id ? causaNome(e.causa_id) : '');
        if (modo !== 'autonomo') {
          const chave = nomeCausa || 'A classificar';
          const c = (porCausa[modo][chave] = porCausa[modo][chave] || { causa: chave, ms: 0, n: 0, pendente: !nomeCausa });
          c.ms += ms;
          c.n += 1;
          if (!nomeCausa) {
            m.aClassificar.push({
              hora: hora, modo: ROTULO_MODO[modo], ms: ms,
              texto: e.descricao_original || '', troca: ehTroca(e),
            });
          }
        }
        if (modo !== 'autonomo' && e.observacao) {
          m.observacoes.push({ hora: hora, titulo: ROTULO_MODO[modo] + (nomeCausa ? ' · ' + nomeCausa : ' · A classificar'), texto: String(e.observacao).trim() });
        }
      });
    });
    ['manual', 'parada'].forEach((k) => {
      m.causas[k] = Object.keys(porCausa[k]).map((c) => porCausa[k][c]).sort((a, b) => b.ms - a.ms);
    });
    return m;
  }

  /** Nome de arquivo seguro (sem acentos nem espaços). */
  function nomeArquivo(m, ext) {
    const base = String(m.tecnico || 'tecnico').normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/)[0].replace(/[^A-Za-z0-9]/g, '') || 'tecnico';
    return `Resumo-do-dia-${m.data}-${base}.${ext}`;
  }

  /** Texto curto que acompanha o arquivo na folha de compartilhar. */
  function textoCurto(m) {
    const p = m.ms.total ? fmtPct(m.ms.autonomo / m.ms.total) : '0%';
    return `Resumo do dia ${fmtData(m.data)} — Trator Autônomo${m.tecnico ? ' (' + m.tecnico + ')' : ''}. ` +
      `Monitorado ${fmtDur(m.ms.total)}: autônomo ${fmtDur(m.ms.autonomo)} (${p}), manual ${fmtDur(m.ms.manual)}, parada ${fmtDur(m.ms.parada)}.`;
  }

  /* ------------------------------------ HTML ------------------------------------ */

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CSS = `
:root{--g:#1f6f54;--gd:#16503d;--gl:#e8f1ed;--bg:#f4f1ea;--tx:#1d2b26;--mu:#5b6b65;--am:#c79a1a;--rd:#b3441e;--bd:#d9ded9}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.pg{max-width:760px;margin:0 auto;background:#fff}
.hd{background:var(--g);color:#fff;padding:20px 24px}
.hd h1{margin:0;font-size:1.5rem}.hd p{margin:4px 0 0;opacity:.92}
.sec{padding:16px 24px;border-bottom:1px solid var(--bd)}
.sec h2{margin:0 0 10px;font-size:1.05rem;color:var(--gd)}
.meta{display:flex;flex-wrap:wrap;gap:6px 24px;color:var(--mu)}.meta b{color:var(--tx)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.k{border:1px solid var(--bd);border-radius:10px;padding:10px 12px;border-top:4px solid var(--g)}
.k small{display:block;color:var(--mu);text-transform:uppercase;font-size:.7rem;letter-spacing:.04em}
.k strong{display:block;font-size:1.25rem}.k span{color:var(--mu);font-size:.85rem}
.k.m{border-top-color:var(--am)}.k.p{border-top-color:var(--rd)}.k.h{border-top-color:#8a8f8c}
.bar{display:flex;height:16px;border-radius:8px;overflow:hidden;background:#e5e8e5;margin:12px 0 4px}
.bar i{display:block}.leg{color:var(--mu);font-size:.85rem}
table{width:100%;border-collapse:collapse;font-size:.92rem}
th{background:var(--gl);color:var(--gd);text-align:left;padding:7px 8px;font-size:.8rem}
td{padding:7px 8px;border-bottom:1px solid var(--bd);vertical-align:top}
.n{text-align:right;white-space:nowrap}.mu{color:var(--mu)}
.alert{background:#fbf4dd;border:1px solid #e6cf85;border-radius:8px;padding:8px 12px;margin:0 24px 12px}
.sim{background:#fbeae3;border:1px solid #e3b4a1;color:#7d2f13}
.obs{margin:0 0 8px;padding:8px 10px;border-left:4px solid var(--am);background:#fcfaf3;border-radius:0 8px 8px 0}
.obs b{display:block;font-size:.85rem;color:var(--mu);font-weight:600}
.ft{padding:14px 24px;color:var(--mu);font-size:.8rem}
@media(max-width:520px){.hd,.sec,.ft{padding-left:12px;padding-right:12px}.alert{margin-left:12px;margin-right:12px}table{font-size:.82rem}th,td{padding:6px 4px}.k strong{font-size:1.1rem}}
td,th{overflow-wrap:anywhere}
@media print{body{background:#fff}.pg{max-width:none}}
`;

  function tabelaCausas(lista, total) {
    if (!lista.length) return '<p class="mu">Nenhum evento neste dia.</p>';
    return `<table><thead><tr><th>Causa</th><th class="n">Ocorrências</th><th class="n">Tempo</th><th class="n">% do total</th></tr></thead><tbody>${lista.map((c) =>
      `<tr><td>${c.pendente ? '<em>A classificar</em>' : esc(c.causa)}</td><td class="n">${c.n}</td><td class="n">${fmtDur(c.ms)}</td><td class="n">${total ? fmtPct(c.ms / total) : '—'}</td></tr>`).join('')}</tbody></table>`;
  }

  function html(m) {
    const t = m.ms.total;
    const pc = (x) => (t ? (100 * x / t).toFixed(2) : 0);
    const haTxt = m.ha.lancado ? fmtHa(m.ha.autonomo) + ' ha' : '—';
    const haMan = m.ha.lancado ? fmtHa(m.ha.manual) + ' ha' : '—';
    let b = `<div class="pg"><div class="hd"><h1>Resumo do dia${m.simulacao ? ' (simulação)' : ''}</h1><p>Trator Autônomo · Agricef</p></div>`;
    b += `<div class="sec"><div class="meta"><span><b>Data:</b> ${esc(fmtDataLonga(m.data))}</span>${m.tecnico ? `<span><b>Técnico:</b> ${esc(m.tecnico)}</span>` : ''}</div></div>`;
    if (m.simulacao) b += '<div class="sec" style="padding-bottom:0"><div class="alert sim" style="margin:0">Este resumo é de um <b>trator de teste</b> (simulação) e não entra nos dados reais.</div></div>';
    if (m.semOperacao.length) {
      b += `<div class="sec"><h2>Dia sem operação</h2>${m.semOperacao.map((s) => `<p>${esc(s.usina)} — ${esc(s.motivo)}</p>`).join('')}</div>`;
    }
    if (m.turnos.length || !m.semOperacao.length) {
      b += `<div class="sec"><h2>Tempo monitorado</h2><div class="kpis">
        <div class="k"><small>Operação autônoma</small><strong>${fmtDur(m.ms.autonomo)}</strong><span>${t ? fmtPct(m.ms.autonomo / t) : '0%'} do tempo</span></div>
        <div class="k m"><small>Operação manual</small><strong>${fmtDur(m.ms.manual)}</strong><span>${t ? fmtPct(m.ms.manual / t) : '0%'} do tempo</span></div>
        <div class="k p"><small>Parada</small><strong>${fmtDur(m.ms.parada)}</strong><span>${t ? fmtPct(m.ms.parada / t) : '0%'} do tempo</span></div>
        <div class="k h"><small>Total monitorado</small><strong>${fmtDur(t)}</strong><span>${m.turnos.length} ${m.turnos.length === 1 ? 'turno' : 'turnos'}</span></div></div>
        <div class="bar" role="img" aria-label="Divisão do tempo"><i style="width:${pc(m.ms.autonomo)}%;background:var(--g)"></i><i style="width:${pc(m.ms.manual)}%;background:var(--am)"></i><i style="width:${pc(m.ms.parada)}%;background:var(--rd)"></i></div>
        <div class="leg">Verde: autônoma · Amarelo: manual · Vermelho: parada</div></div>`;
      b += `<div class="sec"><h2>Turnos e hectares lançados</h2><table><thead><tr><th>Horário</th><th>Usina · trator · implemento</th><th class="n">Autônomo</th><th class="n">Manual</th></tr></thead><tbody>${m.turnos.map((x) =>
        `<tr><td>${x.inicio}${x.emAndamento ? ' (em andamento)' : x.fim ? '–' + x.fim : ''}</td><td>${esc(x.usina)} · ${esc(x.trator)}<br><span class="mu">${esc(x.implemento)}</span></td><td class="n">${x.haAutonomo == null ? '—' : fmtHa(x.haAutonomo) + ' ha'}</td><td class="n">${x.haManual == null ? '—' : fmtHa(x.haManual) + ' ha'}</td></tr>`).join('')}
        <tr><td colspan="2"><b>Total lançado</b>${m.ha.emAndamento ? ' <span class="mu">(turno em andamento não entra)</span>' : ''}</td><td class="n"><b>${haTxt}</b></td><td class="n"><b>${haMan}</b></td></tr></tbody></table></div>`;
      b += `<div class="sec"><h2>Operação manual por causa</h2>${tabelaCausas(m.causas.manual, t)}</div>`;
      b += `<div class="sec"><h2>Parada por causa</h2>${tabelaCausas(m.causas.parada, t)}</div>`;
      b += `<div class="sec"><h2>Eventos a classificar</h2>${m.aClassificar.length
        ? `<p class="mu" style="margin-top:0">Ainda sem causa padrão: o administrador classifica depois.</p><table><thead><tr><th>Horário</th><th>Tipo</th><th>O que o técnico escreveu</th><th class="n">Tempo</th></tr></thead><tbody>${m.aClassificar.map((a) =>
          `<tr><td>${esc(a.hora)}</td><td>${esc(a.modo)}</td><td>${esc(a.texto) || '—'}</td><td class="n">${fmtDur(a.ms)}</td></tr>`).join('')}</tbody></table>`
        : '<p class="mu">Nenhum evento a classificar.</p>'}</div>`;
      b += `<div class="sec"><h2>Observações</h2>${m.observacoes.length
        ? m.observacoes.map((o) => `<p class="obs"><b>${esc(o.hora)} · ${esc(o.titulo)}</b>${esc(o.texto)}</p>`).join('')
        : '<p class="mu">Nenhuma observação registrada.</p>'}</div>`;
    }
    b += `<div class="ft">Gerado pelo app Trator Autônomo em ${esc(fmtAgora(m.geradoEm))}. Documento somente leitura.</div></div>`;
    return b;
  }

  function documentoHtml(m) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resumo do dia ${esc(fmtData(m.data))} — Trator Autônomo</title><style>${CSS}</style></head><body>${html(m)}</body></html>`;
  }

  /* ------------------------------------ PDF ------------------------------------- */

  const CP1252_EXTRA = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };

  /** Converte para os 224 códigos (32–255) da fonte padrão; o que não existe vira "?" (ou a letra sem acento). */
  function paraWin(s) {
    let out = '';
    for (const ch of String(s == null ? '' : s)) {
      const c = ch.codePointAt(0);
      if (c === 9 || c === 10 || c === 13) { out += ' '; continue; }
      if (c >= 32 && c <= 126) { out += ch; continue; }
      if (c >= 160 && c <= 255) { out += ch; continue; }
      if (c >= 128 && c <= 159) { out += ch; continue; } // já convertido (códigos do Windows-1252)
      if (CP1252_EXTRA[ch]) { out += String.fromCharCode(CP1252_EXTRA[ch]); continue; }
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      out += base.length === 1 && base.charCodeAt(0) < 127 && base.charCodeAt(0) >= 32 ? base : '?';
    }
    return out;
  }
  function largura(s, size, bold) {
    const tab = bold ? LARG_B : LARG_H;
    let w = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      w += (c >= 32 && c <= 255 ? tab[c - 32] : 556) || 556;
    }
    return w * size / 1000;
  }
  function quebrar(s, size, bold, maxW) {
    const linhas = [];
    String(s).split(/\n/).forEach((par) => {
      const pal = paraWin(par).split(/ +/);
      let atual = '';
      pal.forEach((p) => {
        // palavra maior que a coluna: parte em pedaços
        while (largura(p, size, bold) > maxW) {
          let k = p.length;
          while (k > 1 && largura(p.slice(0, k), size, bold) > maxW) k--;
          if (atual) { linhas.push(atual); atual = ''; }
          linhas.push(p.slice(0, k));
          p = p.slice(k);
        }
        const tent = atual ? atual + ' ' + p : p;
        if (largura(tent, size, bold) <= maxW) atual = tent;
        else { linhas.push(atual); atual = p; }
      });
      linhas.push(atual);
    });
    return linhas;
  }
  const escPdf = (s) => s.replace(/[\\()]/g, (c) => '\\' + c);
  const rgb = (h) => [(h >> 16) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((x) => x.toFixed(3)).join(' ');

  const A4 = { w: 595.28, h: 841.89 };
  const COR = { verde: 0x1f6f54, escuro: 0x16503d, claro: 0xe8f1ed, texto: 0x1d2b26, mudo: 0x5b6b65, amarelo: 0xc79a1a, verm: 0xb3441e, cinza: 0x8a8f8c, linha: 0xd9ded9, branco: 0xffffff, bege: 0xfcfaf3, trilho: 0xe5e8e5 };

  function pdf(m) {
    const M = 40;
    const W = A4.w - 2 * M;
    const paginas = [];
    let pg = null;
    let y = 0;

    function nova() {
      pg = [];
      paginas.push(pg);
      y = M;
    }
    const Y = (v) => (A4.h - v).toFixed(2);
    function rect(x, top, w, h, cor) { pg.push(`${rgb(cor)} rg ${x.toFixed(2)} ${(A4.h - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
    function linha(x1, top, x2, cor) { pg.push(`${rgb(cor)} RG 0.6 w ${x1.toFixed(2)} ${Y(top)} m ${x2.toFixed(2)} ${Y(top)} l S`); }
    function texto(x, base, s, size, bold, cor, alinhar) {
      const w = paraWin(s);
      let xx = x;
      if (alinhar === 'dir') xx = x - largura(w, size, bold);
      pg.push(`BT ${rgb(cor)} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${xx.toFixed(2)} ${Y(base)} Td (${escPdf(w)}) Tj ET`);
    }
    function garantir(altura) { if (y + altura > A4.h - M - 24) nova(); }

    function titulo(s) {
      garantir(78);
      y += 14;
      texto(M, y + 11, s, 12.5, true, COR.escuro);
      y += 18;
      linha(M, y, M + W, COR.linha);
      y += 8;
    }
    function paragrafo(s, size, cor, bold) {
      const ls = quebrar(s, size, !!bold, W);
      ls.forEach((l) => { garantir(size * 1.45); texto(M, y + size, l, size, !!bold, cor); y += size * 1.45; });
    }
    /** Tabela: cols = [{t, w, dir}], linhas = [[cel,...]] ; última coluna "texto" quebra linha. */
    function tabela(cols, linhas, opcoes) {
      const size = 9.5, lh = 12.5, padX = 5;
      const xs = []; let acc = M;
      cols.forEach((c) => { xs.push(acc); acc += c.w * W; });
      garantir(26);
      rect(M, y, W, 18, COR.claro);
      cols.forEach((c, i) => {
        const cx = c.dir ? xs[i] + c.w * W - padX : xs[i] + padX;
        texto(cx, y + 12.5, c.t, 8.5, true, COR.escuro, c.dir ? 'dir' : 'esq');
      });
      y += 18;
      linhas.forEach((cels) => {
        const quebras = cels.map((cel, i) => {
          const cb = cel && typeof cel === 'object' ? cel : { s: cel };
          return quebrar(cb.s == null ? '' : cb.s, size, !!cb.b, cols[i].w * W - 2 * padX);
        });
        const n = Math.max(...quebras.map((q) => q.length));
        const alt = n * lh + 8;
        garantir(alt);
        cels.forEach((cel, i) => {
          const cb = cel && typeof cel === 'object' ? cel : { s: cel };
          quebras[i].forEach((l, k) => {
            const cx = cols[i].dir ? xs[i] + cols[i].w * W - padX : xs[i] + padX;
            texto(cx, y + 4 + (k + 1) * lh - 3, l, size, !!cb.b, cb.cor || COR.texto, cols[i].dir ? 'dir' : 'esq');
          });
        });
        y += alt;
        linha(M, y, M + W, COR.linha);
      });
      y += 4;
    }
    function kpi(x, w, rotulo, valor, sub, cor) {
      rect(x, y, w, 52, COR.branco);
      rect(x, y, w, 3.5, cor);
      pg.push(`${rgb(COR.linha)} RG 0.6 w ${x.toFixed(2)} ${(A4.h - y - 52).toFixed(2)} ${w.toFixed(2)} 52 re S`);
      texto(x + 8, y + 17, rotulo.toUpperCase(), 7, true, COR.mudo);
      texto(x + 8, y + 33, valor, 12.5, true, COR.texto);
      texto(x + 8, y + 45, sub, 8, false, COR.mudo);
    }

    nova();
    // Cabeçalho
    rect(0, 0, A4.w, 74, COR.verde);
    texto(M, 38, 'Resumo do dia' + (m.simulacao ? ' (simulação)' : ''), 20, true, COR.branco);
    texto(M, 57, 'Trator Autônomo · Agricef', 10.5, false, COR.branco);
    y = 92;
    texto(M, y + 10, 'Data:', 10, true, COR.mudo);
    texto(M + largura('Data:', 10, true) + 5, y + 10, fmtDataLonga(m.data), 10, false, COR.texto);
    if (m.tecnico) {
      texto(M + 250, y + 10, 'Técnico:', 10, true, COR.mudo);
      texto(M + 250 + largura('Técnico:', 10, true) + 5, y + 10, m.tecnico, 10, false, COR.texto);
    }
    y += 22;
    if (m.simulacao) {
      rect(M, y, W, 22, 0xfbeae3);
      texto(M + 8, y + 15, 'Resumo de trator de teste (simulação): não entra nos dados reais.', 9.5, true, 0x7d2f13);
      y += 30;
    }

    if (m.semOperacao.length) {
      titulo('Dia sem operação');
      m.semOperacao.forEach((s) => paragrafo(`${s.usina} — ${s.motivo}`, 10, COR.texto));
    }
    if (m.turnos.length || !m.semOperacao.length) {
      const t = m.ms.total;
      const pct = (x) => (t ? fmtPct(x / t) : '0%');
      titulo('Tempo monitorado');
      const gap = 8, kw = (W - 3 * gap) / 4;
      garantir(60);
      kpi(M, kw, 'Operação autônoma', fmtDur(m.ms.autonomo), pct(m.ms.autonomo) + ' do tempo', COR.verde);
      kpi(M + (kw + gap), kw, 'Operação manual', fmtDur(m.ms.manual), pct(m.ms.manual) + ' do tempo', COR.amarelo);
      kpi(M + 2 * (kw + gap), kw, 'Parada', fmtDur(m.ms.parada), pct(m.ms.parada) + ' do tempo', COR.verm);
      kpi(M + 3 * (kw + gap), kw, 'Total monitorado', fmtDur(t), `${m.turnos.length} ${m.turnos.length === 1 ? 'turno' : 'turnos'}`, COR.cinza);
      y += 62;
      rect(M, y, W, 10, COR.trilho);
      if (t) {
        let x = M;
        [[m.ms.autonomo, COR.verde], [m.ms.manual, COR.amarelo], [m.ms.parada, COR.verm]].forEach(([v, c]) => {
          const w = W * v / t;
          if (w > 0) { rect(x, y, w, 10, c); x += w; }
        });
      }
      y += 22;
      texto(M, y, 'Verde: autônoma · Amarelo: manual · Vermelho: parada', 8, false, COR.mudo);
      y += 6;

      titulo('Turnos e hectares lançados');
      const linhasT = m.turnos.map((x) => [
        x.inicio + (x.emAndamento ? ' (em andamento)' : x.fim ? '–' + x.fim : ''),
        `${x.usina} · ${x.trator}\n${x.implemento}`,
        x.haAutonomo == null ? '—' : fmtHa(x.haAutonomo) + ' ha',
        x.haManual == null ? '—' : fmtHa(x.haManual) + ' ha',
      ]);
      linhasT.push([{ s: 'Total lançado' + (m.ha.emAndamento ? ' (turno em andamento não entra)' : ''), b: true }, '', { s: m.ha.lancado ? fmtHa(m.ha.autonomo) + ' ha' : '—', b: true }, { s: m.ha.lancado ? fmtHa(m.ha.manual) + ' ha' : '—', b: true }]);
      tabela([{ t: 'Horário', w: 0.27 }, { t: 'Usina · trator · implemento', w: 0.43 }, { t: 'Autônomo', w: 0.15, dir: true }, { t: 'Manual', w: 0.15, dir: true }], linhasT);

      [['manual', 'Operação manual por causa'], ['parada', 'Parada por causa']].forEach(([k, tit]) => {
        titulo(tit);
        if (!m.causas[k].length) { paragrafo('Nenhum evento neste dia.', 10, COR.mudo); return; }
        tabela([{ t: 'Causa', w: 0.46 }, { t: 'Ocorrências', w: 0.16, dir: true }, { t: 'Tempo', w: 0.22, dir: true }, { t: '% do total', w: 0.16, dir: true }],
          m.causas[k].map((c) => [c.pendente ? { s: 'A classificar', cor: COR.mudo } : c.causa, String(c.n), fmtDur(c.ms), t ? fmtPct(c.ms / t) : '—']));
      });

      titulo('Eventos a classificar');
      if (!m.aClassificar.length) paragrafo('Nenhum evento a classificar.', 10, COR.mudo);
      else {
        paragrafo('Ainda sem causa padrão: o administrador classifica depois.', 9, COR.mudo);
        y += 2;
        tabela([{ t: 'Horário', w: 0.2 }, { t: 'Tipo', w: 0.17 }, { t: 'O que o técnico escreveu', w: 0.43 }, { t: 'Tempo', w: 0.2, dir: true }],
          m.aClassificar.map((a) => [a.hora, a.modo, a.texto || '—', fmtDur(a.ms)]));
      }

      titulo('Observações');
      if (!m.observacoes.length) paragrafo('Nenhuma observação registrada.', 10, COR.mudo);
      else m.observacoes.forEach((o) => {
        const ls = quebrar(o.texto, 9.5, false, W - 18);
        const alt = 16 + ls.length * 12.5 + 8;
        garantir(alt);
        rect(M, y, 3, alt - 6, COR.amarelo);
        rect(M + 3, y, W - 3, alt - 6, COR.bege);
        texto(M + 12, y + 12, `${o.hora} · ${o.titulo}`, 8.5, true, COR.mudo);
        ls.forEach((l, i) => texto(M + 12, y + 12 + 13 + i * 12.5, l, 9.5, false, COR.texto));
        y += alt;
      });
    }

    // Rodapé em todas as páginas
    const total = paginas.length;
    paginas.forEach((p, i) => {
      pg = p;
      linha(M, A4.h - 34, M + W, COR.linha);
      texto(M, A4.h - 22, `Gerado pelo app Trator Autônomo em ${fmtAgora(m.geradoEm)} · documento somente leitura`, 8, false, COR.mudo);
      texto(M + W, A4.h - 22, `Página ${i + 1} de ${total}`, 8, false, COR.mudo, 'dir');
    });

    // Montagem do arquivo (objetos: 1 catálogo, 2 páginas, 3 e 4 fontes, 5 info, depois página+conteúdo)
    const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add(''); // preenchido abaixo
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    add(`<< /Title (${escPdf(paraWin('Resumo do dia ' + fmtData(m.data) + ' - Trator Autônomo'))}) /Creator (App Trator Autônomo) >>`);
    const filhos = [];
    paginas.forEach((p) => {
      const conteudo = p.join('\n');
      const cid = objs.length + 2;
      const pid = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`);
      add(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
      filhos.push(`${pid} 0 R`);
    });
    objs[1] = `<< /Type /Pages /Kids [${filhos.join(' ')}] /Count ${filhos.length} >>`;
    let out = '%PDF-1.4\n%âãÏÓ\n';
    const pos = [];
    objs.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }

  const api = { montar, html, documentoHtml, pdf, nomeArquivo, textoCurto, fmtDur, paraWin, largura, quebrar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TratorResumo = api;
})(typeof window !== 'undefined' ? window : globalThis);
