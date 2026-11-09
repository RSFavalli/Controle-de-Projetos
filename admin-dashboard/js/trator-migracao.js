/**
 * trator-migracao.js
 * ------------------------------------------------------------------
 * Tela "Migração" do Dashboard da equipe Trator Autônomo (Fase 5):
 * leva o histórico das 3 planilhas para turnos e eventos.
 *
 * Fluxo em 3 passos, sempre com conferência antes de gravar:
 *   1. escolher o arquivo do histórico (historico-trator-migracao.json);
 *   2. simular: o backend calcula tudo e devolve o relatório de conferência,
 *      SEM gravar nada; a tela compara com os totais do relatório atual;
 *   3. gravar (só depois de simular): em lotes, sem duplicar. Pode repetir.
 * ------------------------------------------------------------------
 */
const TratorMigracao = (() => {
  const LOTE_DIAS = 40;
  const TOL_HORAS = 0.01;
  let estado = { arquivo: null, nomeArquivo: '', simulacao: null, gravando: false, resultado: null, erro: '' };

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n, d) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 0 : d, maximumFractionDigits: d == null ? 0 : d });
  const fmtH = (n) => `${nf(n, 2)} h`;
  const fmtData = (s) => String(s || '').split('-').reverse().join('/');
  const ROTULOS_AJUSTE = {
    datas_em_texto: 'Datas digitadas como texto (convertidas)',
    causas_com_espaco_extra: 'Causas com espaço extra ou variação de escrita (normalizadas)',
    linhas_00_00_a_00_00: 'Linhas 00:00–00:00 com 0 h (dias sem operação)',
    linhas_com_hectares: 'Linhas com hectares (guardados como informativo)',
  };
  const NOMES_USINA = { cerradinho: 'Cerradinho', raizen: 'Raízen', tereos: 'Tereos' };

  function resumoArquivo(a) {
    const datas = a.linhas.map((l) => l.data).sort();
    const usinas = {};
    a.linhas.forEach((l) => { usinas[l.usina] = (usinas[l.usina] || 0) + 1; });
    return { de: datas[0], ate: datas[datas.length - 1], usinas };
  }

  function validarArquivo(a) {
    if (!a || !Array.isArray(a.linhas) || a.linhas.length === 0 || a.versao !== 1) {
      throw new Error('Este arquivo não parece ser o histórico do Trator Autônomo (esperado: historico-trator-migracao.json).');
    }
    const faltam = ['usina', 'linha', 'data', 'ini', 'fim', 'horas', 'implemento', 'operacao', 'causa'].filter((c) => !(c in a.linhas[0]));
    if (faltam.length) throw new Error('Arquivo sem as colunas: ' + faltam.join(', ') + '.');
  }

  function conferencia(sim, ref) {
    const igual = (a, b) => Math.abs(a - b) <= TOL_HORAS;
    const linhas = [];
    const add = (rot, simulado, esperado, ok, nota) => linhas.push({ rot, simulado, esperado, ok, nota });
    add('Tempo monitorado', fmtH(sim.horas), ref ? fmtH(ref.total_h) : '—', ref ? igual(sim.horas, ref.total_h) : null);
    ['Cliente', 'ASI/Agricef', 'Não gerenciável'].forEach((g) => add(g, fmtH(sim.grupos[g] || 0), ref ? fmtH(ref.grupos[g]) : '—', ref ? igual(sim.grupos[g] || 0, ref.grupos[g]) : null));
    const aut = (sim.grupos['Autônomo'] || 0) + (sim.grupos['A classificar'] || 0);
    add('Autônomo', fmtH(sim.grupos['Autônomo'] || 0), ref ? fmtH(ref.grupos['Autônomo']) : '—', ref ? igual(aut, ref.grupos['Autônomo']) : null,
      sim.grupos['A classificar'] ? `${fmtH(sim.grupos['A classificar'])} de parada marcada como autônoma entra em "A classificar"` : '');
    return linhas;
  }

  function podeGravar(sim, ref) {
    if (!sim || sim.erros.length) return false;
    return conferencia(sim, ref).every((l) => l.ok !== false);
  }

  /* ------------------------------ tela ------------------------------ */

  function render(el, cb) {
    const e = estado;
    const sim = e.simulacao;
    const ref = e.arquivo && e.arquivo.relatorio_atual;
    const ra = e.arquivo ? resumoArquivo(e.arquivo) : null;

    const passo1 = `<section class="trd-card"><h3>1. Arquivo do histórico</h3>
      <p class="muted trd-sub-card">Arquivo <code>historico-trator-migracao.json</code>, preparado a partir das 3 planilhas da pasta Dados (Cerradinho, Raízen e Tereos). As planilhas originais não são alteradas.</p>
      <input type="file" id="trmArquivo" accept=".json,application/json" ${e.gravando ? 'disabled' : ''} />
      ${e.erro ? `<p class="tr-erro" role="alert">${esc(e.erro)}</p>` : ''}
      ${ra ? `<ul class="trm-lista"><li><strong>${esc(e.nomeArquivo)}</strong> · ${nf(e.arquivo.linhas.length)} linhas · de ${fmtData(ra.de)} a ${fmtData(ra.ate)}</li>
        <li>${Object.keys(ra.usinas).map((u) => `${esc(u)}: ${nf(ra.usinas[u])} linhas`).join(' · ')}</li>
        ${ref ? `<li>Relatório atual (referência): ${fmtH(ref.total_h)} monitoradas</li>` : ''}</ul>` : ''}
    </section>`;

    let passo2 = `<section class="trd-card"><h3>2. Simular (não grava nada)</h3>
      <p class="muted trd-sub-card">Calcula os turnos e eventos que seriam criados e compara com o relatório atual. Nada é escrito na planilha.</p>
      <button type="button" class="btn btn--start btn--small" id="trmSimular" ${!e.arquivo || e.gravando ? 'disabled' : ''}>Simular migração</button>`;
    if (sim) {
      const conf = conferencia(sim, ref);
      const tudoOk = podeGravar(sim, ref);
      passo2 += `<div class="trm-status ${tudoOk ? 'trm-status--ok' : 'trm-status--erro'}" role="status">${
        sim.erros.length ? `Há ${sim.erros.length} ${sim.erros.length === 1 ? 'linha com erro' : 'linhas com erro'}: corrija o arquivo antes de gravar.`
          : tudoOk ? 'Tudo confere com o relatório atual. Pode gravar.' : 'Os totais NÃO conferem com o relatório atual. Não grave antes de entender a diferença.'}</div>
        ${sim.erros.length ? `<ul class="trm-lista trm-lista--erro">${sim.erros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <div class="table-wrapper"><table class="data-table"><thead><tr><th>Conferência</th><th class="num">Simulado</th><th class="num">Relatório atual</th><th></th></tr></thead><tbody>
          ${conf.map((c) => `<tr><td>${esc(c.rot)}${c.nota ? `<br><span class="muted">${esc(c.nota)}</span>` : ''}</td><td class="num">${esc(c.simulado)}</td><td class="num">${esc(c.esperado)}</td><td>${c.ok === true ? '<span class="trm-ok">confere</span>' : c.ok === false ? '<span class="trm-dif">diferente</span>' : ''}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="trm-numeros">
          <div><strong>${nf(sim.turnosComEventos + sim.diasSemOperacao)}</strong><span>turnos (${nf(sim.turnosComEventos)} com eventos + ${nf(sim.diasSemOperacao)} dias sem operação)</span></div>
          <div><strong>${nf(sim.eventos)}</strong><span>eventos</span></div>
          <div><strong>${nf(sim.aClassificar.n)}</strong><span>${sim.aClassificar.n === 1 ? 'evento' : 'eventos'} a classificar (${fmtH(sim.aClassificar.h)})</span></div>
          <div><strong>${nf(sim.haHistorico.ha, 2)} ha</strong><span>informativos em ${nf(sim.haHistorico.linhas)} linhas (fora de Meta × realizado)</span></div>
        </div>
        ${sim.jaExistem.turnos || sim.jaExistem.eventos ? `<p class="trm-aviso">Já gravados e que serão ignorados: ${nf(sim.jaExistem.turnos)} turnos e ${nf(sim.jaExistem.eventos)} eventos. Novos a gravar: ${nf(sim.aGravar.turnos)} turnos e ${nf(sim.aGravar.eventos)} eventos.</p>` : ''}
        <details class="trm-det"><summary>Ajustes aplicados (${nf((sim.ajustes || []).length + Object.keys(e.arquivo.ajustes_origem || {}).length)})</summary><ul class="trm-lista">
          ${Object.keys(e.arquivo.ajustes_origem || {}).map((k) => `<li>${esc(ROTULOS_AJUSTE[k] || k)}: ${nf(e.arquivo.ajustes_origem[k])}</li>`).join('')}
          ${(sim.ajustes || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul></details>
        <details class="trm-det"><summary>Lacunas de horário mantidas (${nf(sim.totalLacunas)}) e sobreposições (${nf(sim.totalSobreposicoes)})</summary>
          <p class="muted">Não são corrigidas: o histórico entra como está, igual ao relatório atual. A lista serve para você conferir.</p>
          <div class="table-wrapper"><table class="data-table"><thead><tr><th>Tipo</th><th>Usina</th><th>Data</th><th>Entre</th><th class="num">Minutos</th></tr></thead><tbody>
          ${sim.lacunas.map((x) => `<tr><td>Lacuna</td><td>${esc(NOMES_USINA[x.usina] || x.usina)}</td><td>${fmtData(x.data)}</td><td>${esc(x.de)} e ${esc(x.ate)}</td><td class="num">${nf(x.minutos)}</td></tr>`).join('')}
          ${sim.sobreposicoes.map((x) => `<tr><td>Sobreposição</td><td>${esc(NOMES_USINA[x.usina] || x.usina)}</td><td>${fmtData(x.data)}</td><td>${esc(x.de)} e ${esc(x.ate)}</td><td class="num">${nf(x.minutos)}</td></tr>`).join('')}
          </tbody></table></div></details>`;
    }
    passo2 += '</section>';

    const ok = podeGravar(sim, ref);
    const r = e.resultado;
    const passo3 = `<section class="trd-card"><h3>3. Gravar o histórico</h3>
      <p class="muted trd-sub-card">Só habilita depois de uma simulação que confere. Grava em lotes; se parar no meio, é só clicar de novo: o que já entrou não é duplicado.</p>
      <button type="button" class="btn btn--start btn--small" id="trmGravar" ${ok && !e.gravando ? '' : 'disabled'}>${e.gravando ? 'Gravando…' : 'Gravar histórico'}</button>
      <p class="muted trm-progresso" id="trmProgresso" aria-live="polite">${esc(e.progresso || '')}</p>
      ${r ? `<div class="trm-status trm-status--ok" role="status">Histórico gravado: ${nf(r.turnos)} turnos e ${nf(r.eventos)} eventos novos${r.jaExistiam ? ` (${nf(r.jaExistiam)} eventos já existiam e foram ignorados)` : ''}. Os gráficos já usam esses dados.
        <button type="button" class="btn btn--ghost btn--small" id="trmVer">Ver o Resumo</button></div>` : ''}
    </section>`;

    el.innerHTML = passo1 + passo2 + passo3;
    ligar(el, cb);
  }

  function ligar(el, cb) {
    const on = (id, ev, fn) => { const x = el.querySelector(id); if (x) x.addEventListener(ev, fn); };
    on('#trmArquivo', 'change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      estado = { arquivo: null, nomeArquivo: '', simulacao: null, gravando: false, resultado: null, erro: '' };
      if (!f) return render(el, cb);
      const leitor = new FileReader();
      leitor.onload = () => {
        try {
          const a = JSON.parse(leitor.result);
          validarArquivo(a);
          estado.arquivo = a;
          estado.nomeArquivo = f.name;
        } catch (err) {
          estado.erro = err instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : err.message;
        }
        render(el, cb);
      };
      leitor.onerror = () => { estado.erro = 'Não deu para ler o arquivo.'; render(el, cb); };
      leitor.readAsText(f);
    });
    on('#trmSimular', 'click', async () => {
      estado.erro = '';
      estado.resultado = null;
      cb.beginLoading();
      try {
        estado.simulacao = await cb.api('migrarHistorico', { modo: 'simular', linhas: estado.arquivo.linhas });
      } catch (err) {
        estado.simulacao = null;
        if (cb.isAuthError(err)) { cb.endLoading(); return cb.onAuthError(); }
        estado.erro = /Ação desconhecida/.test(err.message) ? 'O backend ainda não tem a migração (Code.gs antigo). Atualize o Code.gs e publique uma nova versão.' : err.message;
      }
      cb.endLoading();
      render(el, cb);
    });
    on('#trmGravar', 'click', () => gravar(el, cb));
    on('#trmVer', 'click', () => cb.irPara('resumo'));
  }

  async function gravar(el, cb) {
    const sim = estado.simulacao;
    if (!window.confirm(`Gravar ${nf(sim.aGravar.turnos)} turnos e ${nf(sim.aGravar.eventos)} eventos do histórico na planilha? Pode repetir depois sem duplicar.`)) return;
    const porDia = {};
    estado.arquivo.linhas.forEach((l) => { (porDia[`${l.usina}|${l.data}`] = porDia[`${l.usina}|${l.data}`] || []).push(l); });
    const dias = Object.keys(porDia);
    const total = { turnos: 0, eventos: 0, jaExistiam: 0 };
    estado.gravando = true;
    estado.erro = '';
    estado.resultado = null;
    try {
      for (let i = 0; i < dias.length; i += LOTE_DIAS) {
        estado.progresso = `Gravando… ${nf(Math.min(i + LOTE_DIAS, dias.length))} de ${nf(dias.length)} dias`;
        render(el, cb);
        const lote = [].concat.apply([], dias.slice(i, i + LOTE_DIAS).map((d) => porDia[d]));
        const r = await cb.api('migrarHistorico', { modo: 'gravar', linhas: lote });
        total.turnos += r.gravado.turnos;
        total.eventos += r.gravado.eventos;
        total.jaExistiam += r.jaExistem.eventos;
      }
      estado.resultado = total;
      estado.progresso = '';
      estado.gravando = false;
      render(el, cb);
      cb.onGravado();
    } catch (err) {
      estado.gravando = false;
      estado.progresso = '';
      if (cb.isAuthError(err)) return cb.onAuthError();
      estado.erro = `A gravação parou: ${err.message}. O que já entrou foi mantido; clique em Gravar de novo para continuar.`;
      render(el, cb);
    }
  }

  return { render };
})();

window.TratorMigracao = TratorMigracao;
