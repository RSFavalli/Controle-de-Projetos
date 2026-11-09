/**
 * trator-i18n.js
 * ------------------------------------------------------------------
 * Idioma (Português do Brasil / English) das análises do Dashboard Trator
 * Autônomo e dos relatórios exportados (PDF e HTML).
 *
 * Regras (decisões 24 e 25 do projeto):
 *  - O texto-fonte é o português; `t('texto em português', ...args)` devolve o
 *    texto no idioma ativo. Em português o resultado é igual ao texto-fonte
 *    (com {0}, {1}… trocados pelos argumentos), então a tela não muda.
 *  - Nomes de usinas ficam como estão. Causas e implementos usam o "nome em
 *    inglês" cadastrado em Listas; sem ele, usa-se o glossário didático.
 *  - Descrições escritas pelos técnicos NÃO são traduzidas: aparecem como
 *    digitadas, com uma "leitura em inglês" de apoio (frase conhecida ou
 *    termos-chave) para o leitor entender.
 *  - Termos técnicos sem correspondente em inglês ganham uma expressão
 *    explicativa (GLOSSARIO) que entra no fim do relatório em inglês.
 * ------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  let lang = 'pt';
  const setLang = (l) => { lang = l === 'en' ? 'en' : 'pt'; };
  const getLang = () => lang;
  const LOCALE = { pt: 'pt-BR', en: 'en-US' };

  /* ----------------------------- texto-fonte → inglês ----------------------------- */

  const EN = {
    // grupos, status e rótulos de dados
    'Autônomo': 'Autonomous',
    'Cliente': 'Client (mill)',
    'ASI/Agricef': 'ASI/Agricef',
    'Não gerenciável': 'Uncontrollable',
    'A classificar': 'Pending classification',
    'Manual': 'Manual',
    'Não disponível': 'Unavailable',
    // aviso
    'evento': 'event', 'eventos': 'events',
    '<strong>{0} {1} ({2})</strong> ainda sem causa definida: contam nas horas, mas ficam fora dos gráficos de ofensores e dos % por responsável.':
      '<strong>{0} {1} ({2})</strong> still without a defined cause: they count in the hours but are left out of the offender charts and of the % by responsible party.',
    // KPIs
    'Tempo monitorado': 'Monitored time',
    'Operação autônoma': 'Autonomous operation',
    'Horas paradas': 'Stopped hours',
    'Disponibilidade': 'Availability',
    'Maior ofensor': 'Top offender',
    'Meta × realizado': 'Target vs. actual',
    '{0} eventos · {1} {2} de campo': '{0} events · {1} {2} in the field',
    'dia': 'day', 'dias': 'days',
    '{0} do tempo monitorado': '{0} of monitored time',
    '{0} paradas · {1} do tempo': '{0} stops · {1} of the time',
    'média de {0} {1} por usina (regra 168 h)': 'average of {0} {1} per mill (168 h rule)',
    'semana': 'week', 'semanas': 'weeks',
    'sem semanas no filtro': 'no weeks in the filter',
    '{0} · {1} das paradas': '{0} · {1} of the stops',
    'sem paradas no filtro': 'no stops in the filter',
    // achados
    'Pareto': 'Pareto',
    'Os {0} maiores ofensores, {1}, somam {2} do tempo parado ({3}).': 'The top {0} offenders, {1}, add up to {2} of the stopped time ({3}).',
    'O maior ofensor, {0}, soma {1} do tempo parado ({2}).': 'The top offender, {0}, accounts for {1} of the stopped time ({2}).',
    '<strong>{0}</strong> ({1}) das paradas não são gerenciáveis.': '<strong>{0}</strong> ({1}) of the stopped time is uncontrollable (weather, meals, days off).',
    '<strong>{0}</strong> ({1}) das paradas são do lado do cliente.': '<strong>{0}</strong> ({1}) of the stopped time is on the client (mill) side.',
    '<strong>{0}</strong> ({1}) das paradas são da ASI/Agricef.': '<strong>{0}</strong> ({1}) of the stopped time is on the ASI/Agricef side.',
    ' Maior: <strong>{0}</strong> com {1} em {2} {3}{4}.': ' Largest: <strong>{0}</strong> with {1} in {2} {3}{4}.',
    'parada': 'stop', 'paradas': 'stops',
    ', depois {0} ({1})': ', then {0} ({1})',
    ' Vale conversar com a usina.': ' Worth discussing with the mill.',
    'Classificação': 'Classification',
    '<strong>{0} {1}</strong> ({2}) {3} causa.': '<strong>{0} {1}</strong> ({2}) {3} a cause.',
    'aguarda': 'is awaiting', 'aguardam': 'are awaiting',
    'Tendência': 'Trend',
    '<strong>{0} {1}</strong> dos limites de controle; a última semana teve {2} de operação autônoma.':
      '<strong>{0} {1}</strong> outside the control limits; the latest week had {2} autonomous operation.',
    'semana saiu': 'week fell', 'semanas saíram': 'weeks fell',
    'Variação normal do processo: nenhuma das {0} semanas saiu dos limites. Média de {1} de operação autônoma.':
      'Normal process variation: none of the {0} weeks fell outside the limits. Average of {1} autonomous operation.',
    'Sem dados no filtro atual.': 'No data for the current filter.',
    // cartões
    'Principais achados': 'Key findings',
    'Texto gerado dos dados do filtro atual; cada etiqueta indica quem pode agir.': 'Text generated from the data of the current filter; each tag shows who can act.',
    'Tempo monitorado por usina': 'Monitored time by mill',
    'Participação de cada grupo; passe o mouse para ver as horas.': 'Share of each group; hover to see the hours.',
    'Participação de cada grupo no tempo monitorado.': 'Share of each group in the monitored time.',
    'Horas monitoradas por semana': 'Monitored hours per week',
    'Semana de segunda a domingo, empilhada por grupo.': 'Week from Monday to Sunday, stacked by group.',
    'Status do trator por usina': 'Tractor status by mill',
    'Horas em que o trator estava autônomo, em modo manual ou não disponível.': 'Hours in which the tractor was autonomous, in manual mode or unavailable.',
    'Disponibilidade semanal': 'Weekly availability',
    'Uma linha por usina.': 'One line per mill.',
    'Ofensores (Pareto)': 'Offenders (Pareto)',
    'Horas paradas por causa padrão e % acumulado.': 'Stopped hours by standard cause and cumulative %.',
    'Quem pode agir': 'Who can act',
    'Paradas classificadas por responsável.': 'Classified stops by responsible party.',
    'Causas por usina': 'Causes by mill',
    'Onde cada ofensor pesa mais.': 'Where each offender weighs the most.',
    'Frequência × duração': 'Frequency × duration',
    'Causas frequentes e longas pedem ação primeiro.': 'Frequent and long causes call for action first.',
    'Tendência semanal da operação autônoma': 'Weekly trend of autonomous operation',
    'Carta de controle I-MR sobre a parcela autônoma por semana.': 'I-MR control chart on the autonomous share per week.',
    'Hora do dia × dia da semana': 'Hour of day × day of week',
    'Horas em operação autônoma em cada hora do dia.': 'Hours of autonomous operation in each hour of the day.',
    'Resultado por implemento': 'Result by implement',
    'Tempo monitorado e parcela autônoma de cada implemento.': 'Monitored time and autonomous share of each implement.',
    'Registros': 'Records',
    'Todos os eventos do filtro atual, mais recentes primeiro.': 'All events of the current filter, most recent first.',
    // gráficos
    'Semana de {0} · {1}: {2}': 'Week of {0} · {1}: {2}',
    'Disponibilidade semanal por usina': 'Weekly availability by mill',
    '{0} · semana de {1}: {2}': '{0} · week of {1}: {2}',
    'Disponibilidade da semana = (168 h − horas “Não disponível”) ÷ 168 h, por usina. A média considera só as semanas com eventos.':
      'Weekly availability = (168 h − “Unavailable” hours) ÷ 168 h, per mill. The average only considers weeks with events.',
    // pareto
    'Nenhuma parada no filtro atual.': 'No stops in the current filter.',
    'O que os técnicos escreveram (mais frequentes):': 'What the technicians wrote (most frequent; original Portuguese text with an English reading aid):',
    'sem descrição escrita nestes eventos.': 'no written description in these events.',
    'Ver todas as {0}': 'See all {0}',
    'Filtrar o dashboard por esta causa': 'Filter the dashboard by this cause',
    'Clique numa causa para ver o que os técnicos escreveram. “A classificar” fica fora do Pareto e dos % por responsável até ser revisado.':
      'Click a cause to see what the technicians wrote. “Pending classification” stays out of the Pareto and of the % by responsible party until reviewed.',
    'Para as maiores causas, abaixo de cada barra aparece o que os técnicos escreveram. “A classificar” fica fora do Pareto e dos % por responsável até ser revisado.':
      'For the largest causes, what the technicians wrote appears below each bar. “Pending classification” stays out of the Pareto and of the % by responsible party until reviewed.',
    'Nenhuma parada classificada no filtro atual.': 'No classified stops in the current filter.',
    '{0} das paradas classificadas': '{0} of the classified stops',
    'Causa': 'Cause', 'Total': 'Total',
    'Mostra as 10 maiores causas. Quanto mais escuro, mais horas naquela usina.': 'Shows the 10 largest causes. The darker the cell, the more hours at that mill.',
    'Poucas causas no filtro para comparar frequência e duração.': 'Too few causes in the filter to compare frequency and duration.',
    '{0}: {1} paradas, média {2} h, total {3}': '{0}: {1} stops, average {2} h, total {3}',
    'Frequência (nº de paradas)': 'Frequency (number of stops)',
    'Duração média (h)': 'Average duration (h)',
    'frequente e longo = prioridade': 'frequent and long = priority',
    'Frequência por duração das paradas': 'Frequency by duration of the stops',
    'Tamanho da bolha = horas totais. Linhas tracejadas = medianas entre as causas exibidas.': 'Bubble size = total hours. Dashed lines = medians across the causes shown.',
    // tendência
    'Precisa de pelo menos 3 semanas com 5 h ou mais monitoradas para a carta de controle.': 'Needs at least 3 weeks with 5 h or more of monitored time for the control chart.',
    'LSC {0}%': 'UCL {0}%', 'LIC {0}%': 'LCL {0}%', 'Média {0}%': 'Mean {0}%', 'LSC {0}': 'UCL {0}', 'Média {0}': 'Mean {0}',
    'Semana de {0}: {1} autônomo em {2}': 'Week of {0}: {1} autonomous in {2}',
    'Variação para a semana de {0}: {1} p.p.': 'Change into the week of {0}: {1} p.p.',
    '{0} {1} dos limites de controle (pontos em vermelho): vale investigar o que mudou nelas.': '{0} {1} outside the control limits (red points): worth investigating what changed in them.',
    'semana fora': 'week', 'semanas fora': 'weeks',
    'Variação normal do processo: nenhuma das {0} semanas saiu dos limites. Para melhorar de forma duradoura é preciso mudar o processo (as causas dos ofensores), não reagir a uma semana ruim.':
      'Normal process variation: none of the {0} weeks fell outside the limits. Lasting improvement requires changing the process (the causes of the offenders), not reacting to one bad week.',
    ' Só entram semanas com 5 h ou mais monitoradas. Limites = média ± 2,66 × amplitude móvel média (mínimo 0%, máximo 100%).':
      ' Only weeks with 5 h or more of monitored time are included. Limits = mean ± 2.66 × average moving range (minimum 0%, maximum 100%). UCL/LCL = upper/lower control limit; p.p. = percentage points.',
    'Parcela autônoma por semana (%)': 'Autonomous share per week (%)',
    'Variação entre semanas (amplitude móvel, pontos percentuais)': 'Change between weeks (moving range, percentage points)',
    'Carta de indivíduos': 'Individuals chart', 'Carta de amplitude móvel': 'Moving-range chart',
    // hora do dia
    'Nenhuma operação autônoma no filtro atual.': 'No autonomous operation in the current filter.',
    '{0} {1}–{2}: {3} autônomas': '{0} {1}–{2}: {3} autonomous',
    'Mais escuro = mais horas. Hora de pico: {0} às {1} ({2}). Cada evento é dividido pelas horas de relógio que cobre.':
      'Darker = more hours. Peak hour: {0} to {1} ({2}). Each event is split across the clock hours it covers.',
    // implementos
    'Implemento': 'Implement', 'Monit. (h)': 'Monit. (h)', 'Autônomo (h)': 'Autonomous (h)', 'Parcela autônoma': 'Autonomous share',
    // registros
    'Data': 'Date', 'Usina': 'Mill', 'Horário': 'Time', 'Horas': 'Hours', 'Status': 'Status', 'Causa padrão': 'Standard cause', 'Responsável': 'Responsible',
    'Descrição escrita pelo técnico': 'Description written by the technician', 'Leitura em inglês': 'English reading aid',
    'Nenhum evento no filtro atual.': 'No events in the current filter.',
    '{0} {1} no filtro': '{0} {1} in the filter',
    'Mostrando os {0} eventos mais recentes de {1} no filtro.': 'Showing the {0} most recent events out of {1} in the filter.',
    'Registros marcados como “A classificar” ainda não têm causa padrão.': 'Records marked “Pending classification” do not have a standard cause yet.',
  };

  const DIAS = { pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
  const MESES = { pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };

  function formatar(s, args) {
    return String(s).replace(/\{(\d+)\}/g, (m, i) => (args[Number(i)] == null ? '' : args[Number(i)]));
  }

  /** Texto no idioma ativo; sem tradução cadastrada, devolve o português. */
  function t(pt) {
    const args = Array.prototype.slice.call(arguments, 1);
    if (lang === 'en' && EN[pt] != null && EN[pt] !== '') {
      const v = EN[pt];
      return typeof v === 'function' ? v.apply(null, args) : formatar(v, args);
    }
    return formatar(pt, args);
  }
  const tem = (pt) => EN[pt] != null && EN[pt] !== '';
  const pl = (n, um, varios) => t(n === 1 ? um : varios);

  /** "a, b e c" / "a, b, and c". */
  function juntar(itens) {
    if (itens.length < 2) return itens[0] || '';
    const ini = itens.slice(0, -1).join(', ');
    return lang === 'en' ? `${ini}${itens.length > 2 ? ',' : ''} and ${itens[itens.length - 1]}` : `${ini} e ${itens[itens.length - 1]}`;
  }

  /* ------------------------------- números e datas ------------------------------- */

  const nf = (n, d) => Number(n).toLocaleString(LOCALE[lang], { minimumFractionDigits: d, maximumFractionDigits: d });

  /** "2026-11-06" → "06/11/2026" | "06 Nov 2026". */
  function data(s) {
    if (!s) return '—';
    const [y, m, d] = String(s).slice(0, 10).split('-');
    return lang === 'en' ? `${d} ${MESES.en[Number(m) - 1]} ${y}` : `${d}/${m}/${y}`;
  }
  /** "2026-11-02" → "02/11" | "02 Nov". */
  function semanaCurta(s) {
    const [, m, d] = String(s).slice(0, 10).split('-');
    return lang === 'en' ? `${d} ${MESES.en[Number(m) - 1]}` : `${d}/${m}`;
  }
  const dias = () => DIAS[lang];

  /* --------------------------- nomes vindos dos cadastros --------------------------- */

  const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  /**
   * Termos técnicos em português e a expressão explicativa em inglês. `chaves`
   * são trechos (sem acento, minúsculos) que fazem o termo entrar no glossário
   * do relatório quando aparecem nos nomes ou nas descrições; `sempre` = entra
   * sempre. `nome` é o rótulo curto usado quando o cadastro não tem nome em inglês.
   */
  const GLOSSARIO = [
    { pt: 'Usina', en: 'Mill (usina)', def: 'Sugarcane mill (sugar and ethanol plant). It is the client that owns the fields where the tractors work. Mill names (Cerradinho, Raízen, Tereos) are kept as in the original.', sempre: true },
    { pt: 'Cliente', en: 'Client (mill)', def: 'Responsible party for stops caused on the mill side: tractor maintenance, logistics, refueling convoy, manual work, field mapping and field projects.', sempre: true },
    { pt: 'ASI/Agricef', en: 'ASI/Agricef', def: 'Responsible party for stops caused by the autonomy kit and its support team (ASI/Agricef): server, path plans, parameters, GOA base station, connectivity and the Mobius software.', sempre: true },
    { pt: 'Não gerenciável', en: 'Uncontrollable', def: 'Stops that nobody can act on, such as rain and wet soil, meals, days off and shift changes.', sempre: true },
    { pt: 'Ofensor', en: 'Offender', def: 'A cause of stopped time. The Pareto chart ranks offenders by hours so that the biggest ones are tackled first.', sempre: true },
    { pt: 'Operação autônoma', en: 'Autonomous operation', def: 'The tractor works by itself following the path plan, with no driver steering.', sempre: true },
    { pt: 'Manual / Não disponível', en: 'Manual / Unavailable', def: 'Tractor status while stopped: “Manual” = the tractor works in manual mode (a driver operates it); “Unavailable” = the tractor cannot be used.', sempre: true },
    { pt: 'Comboio', en: 'Service convoy (comboio)', def: 'The field truck that refuels and services the tractors on site; a stop for “abastecimento” is a refueling stop.', chaves: ['comboio', 'abastec'] },
    { pt: 'Canteirizador', en: 'Bed former (canteirizador)', def: 'Implement that shapes the raised planting beds (“canteiros”) in the field.', chaves: ['canteiriz', 'canterizador', 'canteirizador'] },
    { pt: 'Eliminador de soqueira', en: 'Ratoon eliminator', def: 'Implement that destroys the old sugarcane stubble (“soqueira”) after harvest so the field can be replanted.', chaves: ['soqueira'] },
    { pt: 'Subsolador', en: 'Subsoiler', def: 'Deep-tillage implement that breaks compacted soil layers (trailed or 3-point hitch).', chaves: ['subsolador'] },
    { pt: 'Grade', en: 'Disc harrow (grade)', def: 'Soil-preparation implement with discs; the heavy, intermediate and plowing (“aradora”) versions differ in disc size and working depth.', chaves: ['grade'] },
    { pt: 'Erradicador', en: 'Eradicator', def: 'Implement used to remove the previous crop plants from the field.', chaves: ['erradicador'] },
    { pt: 'Talhão', en: 'Field plot (talhão)', def: 'A delimited plot of land that is worked as one unit.', chaves: ['talhao', 'talhoes'] },
    { pt: 'Base GOA', en: 'GOA base station', def: 'Portable GNSS reference base set up in the field to give the tractor accurate positioning (powered by a power bank). “GOA” is kept as in the original name.', chaves: ['base goa', 'power bank', 'montagem da base', 'goa'] },
    { pt: 'Mobius', en: 'Mobius', def: 'The ASI software that plans and runs the autonomous operation of the tractor.', chaves: ['mobius'] },
    { pt: 'Modo comando', en: 'Command mode (modo comando)', def: 'Operating mode in which the path plan is loaded and the tractor is commanded to run it.', chaves: ['modo comando'] },
    { pt: 'VCU', en: 'VCU (vehicle control unit)', def: 'The computer that connects the autonomy kit to the tractor controls.', chaves: ['vcu'] },
    { pt: 'Plano / Planejamento', en: 'Path plan (plano)', def: 'The route the tractor follows, created for each field before autonomous operation.', chaves: ['plano', 'planejamento'] },
    { pt: 'Starlink', en: 'Starlink', def: 'Satellite internet link used for connectivity in the field.', chaves: ['starlink'] },
    { pt: 'LiDAR', en: 'LiDAR', def: 'Laser sensor used to detect obstacles.', chaves: ['lidar'] },
    { pt: 'Disponibilidade', en: 'Availability', def: 'Per mill and week: (168 h − “Unavailable” hours) ÷ 168 h. The average only counts weeks with events.', sempre: true },
  ];

  /** Rótulo curto em inglês quando o cadastro não traz o nome em inglês. */
  const NOMES_CURTOS = {
    'Operação autônoma': 'Autonomous operation', 'Não gerenciável': 'Uncontrollable', 'Manutenção': 'Tractor maintenance', 'Logístico': 'Logistics',
    'Manual': 'Manual operation', 'Comboio': 'Service convoy (fuel/service truck)', 'Mapeamento Trator': 'Field mapping with tractor',
    'Projeto (mapa) - Usina': 'Mill field project (map)', 'Problema Servidor': 'Server issue', 'Reajuste dos parâmetros': 'Parameter readjustment',
    'Criação Plano': 'Path plan creation', 'Base GOA': 'GOA base station', 'Obstáculo': 'Obstacle', 'Manutenção Autônomo': 'Autonomy kit maintenance',
    'Atualização do Mobius': 'Mobius update',
  };

  /** Nome de causa/implemento no idioma ativo: cadastro → rótulo curto → português. */
  function nomeCadastro(item, nomePt) {
    const pt = nomePt != null ? nomePt : item && item.nome;
    if (lang !== 'en') return pt;
    if (item && item.nome_en && String(item.nome_en).trim()) return String(item.nome_en).trim();
    return NOMES_CURTOS[pt] || (tem(pt) ? t(pt) : pt);
  }

  /** Nome em inglês do grupo/status (o dado fica em português). */
  const grupo = (g) => t(g);

  /* ------------------------ descrições escritas pelos técnicos ------------------------ */

  const limpar = (s) => norm(s).replace(/[.,;:!?"“”'()]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Frases frequentes nas planilhas (chave sem acento, minúscula, sem pontuação).
  const FRASES = {
    'operacao autonoma': 'Autonomous operation',
    'operacao autonoma intervencao manual durante a operacao': 'Autonomous operation with manual intervention during the operation',
    'criacao do planejamento': 'Creating the path plan',
    'criacao do plano': 'Creating the path plan',
    'criacao do mapa com o trator': 'Creating the field map with the tractor',
    'mapeamento da area com o trator': 'Mapping the area with the tractor',
    'montagem da base': 'Setting up the GNSS base station',
    'chuva': 'Rain',
    'chuva solo umido': 'Rain, wet soil',
    'solo umido': 'Wet soil',
    'chuva aguardando condicoes': 'Rain, waiting for conditions to improve',
    'abastecimento': 'Refueling',
    'parado abastecimento': 'Stopped for refueling',
    'folga': 'Day off',
    'refeicao': 'Meal break',
    'almoco': 'Lunch break',
    'troca de turno': 'Shift change',
    'aguardando liberacao de area': 'Waiting for the area to be released',
    'mudanca de fazenda': 'Moving to another farm',
    'nao tem sequencia operacional com o canterizador': 'No operational sequence available with the bed former',
    'reajuste do planejamento': 'Readjusting the path plan',
    'reajuste do plano': 'Readjusting the path plan',
    'replanejamento': 'Re-planning',
    'reajuste dos parametros': 'Readjusting the parameters',
    'parametros do implemento': 'Implement parameters',
    'erro vcu interface do veiculo': 'Error in the VCU (vehicle control unit) vehicle interface',
    'vcu interface do veiculo': 'VCU (vehicle control unit) vehicle interface problem',
    'perda de sinal do vcu': 'Loss of VCU (vehicle control unit) signal',
    'plano nao carrega no modo comando': 'Path plan does not load in command mode',
    'nao carrega o plano no modo comando': 'Path plan does not load in command mode',
    'nao carrega o plano': 'Path plan does not load',
    'aguardando o plano carregar no modo comando': 'Waiting for the path plan to load in command mode',
    'demora para carregar o plano no modo comando': 'Path plan takes long to load in command mode',
    'nao carrega o plano no modo comando asi reinicio o servidor': 'Path plan does not load in command mode; ASI restarted the server',
    'power bank desligou': 'Power bank (base station battery) switched off',
    'troca de power bank': 'Replacing the power bank (base station battery)',
    'implemento troca da haste': 'Implement: replacing the shank (tine)',
    'nao esta abaixando levantando implemento no modo autonomo': 'Implement is not lowering/raising in autonomous mode',
    'operacao manual urgencia para entrega da area': 'Manual operation: urgency to deliver the area',
    'operacao manual urgencia na entrega da area': 'Manual operation: urgency to deliver the area',
    'asi realizando ajuste nos parametros do planejamento': 'ASI adjusting the path plan parameters',
    'projeto de linhas deslocado': 'Line project (map) is shifted',
    'projeto de linha': 'Line project (map)',
    'aguardando projeto mapa da usina': 'Waiting for the mill’s field project (map)',
    'aguardando projeto mapa': 'Waiting for the field project (map)',
    'violacao de seguranca do caminho': 'Path safety violation',
    'implemento': 'Implement',
    'trator desligou sozinho': 'Tractor shut down by itself',
    'manutencao implemento': 'Implement maintenance',
    'manutencao do implemento': 'Implement maintenance',
    'fora de caminho': 'Off the planned path',
    'aguardando trator': 'Waiting for the tractor',
    'aguardando trator para iniciar operacao': 'Waiting for the tractor to start the operation',
    'parado por conta da vegetacao que tem no talhao': 'Stopped because of vegetation in the field plot',
    'falha na comunicacao entre o lidar e o servidor': 'Communication failure between the LiDAR (obstacle sensor) and the server',
    'servidor nao esta conectando com o mobius': 'Server is not connecting to Mobius (autonomy software)',
    'aguardando troca correia alternador': 'Waiting for the alternator belt to be replaced',
    'avaliacao de qualidade': 'Quality assessment',
    'verificacao e selecao da area para trabalhar autonomo': 'Checking and choosing the area for autonomous work',
    'verificacao da area para trabalhar autonomo': 'Checking the area for autonomous work',
    'manutencao eletrica': 'Electrical maintenance',
    'talhao finalizado': 'Field plot finished',
    'problema na tela do trator': 'Problem with the tractor screen',
    'fazendo repasse nas curvas': 'Re-working the turns',
    'calibracao da direcao': 'Steering calibration',
    'estourou mangueira hidraulica do implemento': 'Implement hydraulic hose burst',
    'criacao do planejamento e problema na criacao': 'Creating the path plan, with a problem during creation',
  };

  // Termos-chave (sem acento) para quando a frase não é conhecida: [trecho, "português = inglês"].
  const TERMOS = [
    ['solo umido', 'solo úmido', 'wet soil'], ['chuva', 'chuva', 'rain'], ['folga', 'folga', 'day off'], ['almoco', 'almoço', 'lunch'],
    ['refeicao', 'refeição', 'meal'], ['troca de turno', 'troca de turno', 'shift change'], ['feriado', 'feriado', 'holiday'],
    ['modo comando', 'modo comando', 'command mode'], ['planejamento', 'planejamento', 'path plan'], ['plano', 'plano', 'path plan'],
    ['abastec', 'abastecimento', 'refueling'], ['comboio', 'comboio', 'service convoy'], ['mapeamento', 'mapeamento', 'mapping'],
    ['mapa', 'mapa', 'map'], ['projeto', 'projeto', 'project'], ['talhao', 'talhão', 'field plot'], ['fazenda', 'fazenda', 'farm'],
    ['aguardando', 'aguardando', 'waiting for'], ['liberacao', 'liberação', 'release'], ['area', 'área', 'area'], ['manutencao', 'manutenção', 'maintenance'],
    ['haste', 'haste', 'shank (tine)'], ['mangueira', 'mangueira', 'hose'], ['hidraulic', 'hidráulica', 'hydraulic'], ['correia', 'correia', 'belt'],
    ['alternador', 'alternador', 'alternator'], ['eletric', 'elétrica', 'electrical'], ['servidor', 'servidor', 'server'], ['sinal', 'sinal', 'signal'],
    ['lidar', 'LiDAR', 'obstacle sensor'], ['vcu', 'VCU', 'vehicle control unit'], ['mobius', 'Mobius', 'ASI autonomy software'],
    ['power bank', 'power bank', 'base station battery'], ['base', 'base', 'GNSS base station'], ['starlink', 'Starlink', 'satellite internet'],
    ['reajuste', 'reajuste', 'readjustment'], ['parametro', 'parâmetros', 'parameters'], ['calibracao', 'calibração', 'calibration'],
    ['direcao', 'direção', 'steering'], ['vegetacao', 'vegetação', 'vegetation'], ['obstaculo', 'obstáculo', 'obstacle'],
    ['implemento', 'implemento', 'implement'], ['canteiriz', 'canteirizador', 'bed former'], ['canterizador', 'canterizador', 'bed former'],
    ['soqueira', 'soqueira', 'ratoon (cane stubble)'], ['subsolador', 'subsolador', 'subsoiler'], ['grade', 'grade', 'disc harrow'],
    ['erro', 'erro', 'error'], ['falha', 'falha', 'failure'], ['desligou', 'desligou', 'switched off'], ['nao carrega', 'não carrega', 'does not load'],
    ['carregar', 'carregar', 'load'], ['demora', 'demora', 'delay'], ['manual', 'manual', 'manual'], ['urgencia', 'urgência', 'urgency'],
    ['qualidade', 'qualidade', 'quality'], ['repasse', 'repasse', 're-work pass'], ['curva', 'curvas', 'turns'], ['seguranca', 'segurança', 'safety'],
    ['caminho', 'caminho', 'path'], ['reinici', 'reiniciou', 'restarted'], ['troca', 'troca', 'replacement/change'], ['finalizado', 'finalizado', 'finished'],
  ];

  /**
   * Leitura de apoio em inglês para uma descrição escrita pelo técnico.
   * Devolve { tipo: 'frase' | 'termos' | null, texto }.
   */
  function leituraEmIngles(descricao) {
    const k = limpar(descricao);
    if (!k) return { tipo: null, texto: '' };
    if (FRASES[k]) return { tipo: 'frase', texto: FRASES[k] };
    const achados = [];
    let resto = ' ' + k + ' ';
    TERMOS.forEach((x) => {
      if (resto.indexOf(x[0]) !== -1 && !achados.some((a) => a[2] === x[2])) achados.push([x[0], x[1], x[2]]);
    });
    if (!achados.length) return { tipo: null, texto: '' };
    return { tipo: 'termos', texto: achados.slice(0, 5).map((a) => `${a[1]} = ${a[2]}`).join(' · ') };
  }

  /**
   * Entradas do glossário que devem aparecer no relatório em inglês, de acordo
   * com os nomes e descrições realmente usados nele.
   */
  function glossarioDoRelatorio(textos) {
    const corpo = norm((textos || []).join(' | '));
    return GLOSSARIO.filter((g) => g.sempre || (g.chaves || []).some((c) => corpo.indexOf(c) !== -1));
  }

  const api = {
    setLang, getLang, t, tem, pl, juntar, nf, data, semanaCurta, dias, norm, nomeCadastro, grupo, leituraEmIngles, glossarioDoRelatorio,
    GLOSSARIO, FRASES, TERMOS, NOMES_CURTOS, EN, LOCALE,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TratorI18n = api;
})(typeof window !== 'undefined' ? window : globalThis);
