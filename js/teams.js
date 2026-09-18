/**
 * teams.js
 * ------------------------------------------------------------------
 * Config fixa dos times atendidos por este projeto unificado — usado
 * pelo app de campo (raiz) e pelo Dashboard Admin (admin-dashboard/,
 * que carrega este mesmo arquivo via "../js/teams.js"). Não é uma
 * cópia: os dois apontam para o mesmo arquivo, então só existe um
 * lugar pra atualizar.
 *
 * Cada time tem sua própria planilha/backend (Apps Script Web App)
 * — os dados de um time nunca se misturam com os de outro. Trocar de
 * time aqui só troca qual URL/atividades/cargos o app usa; não migra
 * nem copia nada entre as bases.
 *
 * Atividades e cargos são fixos no código de propósito (mesma regra
 * de negócio de antes: não editáveis pelo admin, nem aqui nem lá).
 * Pra mudar a lista de um time, edite aqui.
 * ------------------------------------------------------------------
 */

const TEAMS = [
  {
    id: 'pesquisa-agricola',
    nome: 'Pesquisa Agrícola',
    apiUrl: 'https://script.google.com/macros/s/AKfycbzv3xrIL6LSSG4lcL3KqcPdORLBBH8ai2k974-cle4S1AtvW-fQbbqMGP_0JRY5c3e8/exec',
    activities: [
      'Desenvolver metodologia',
      'Preparar material',
      'Coletar dados',
      'Tratar dados',
      'Analisar dados',
      'Apresentar resultados',
    ],
    cargos: [
      'Estagiário',
      'Auxiliar de Analista',
      'Analista Júnior',
      'Analista Pleno',
      'Analista Sênior',
      'Especialista',
      'Coordenador',
      'Gerente',
      'Técnico Agrícola',
    ],
  },
  {
    id: 'drone',
    nome: 'Operações com Drone',
    apiUrl: 'https://script.google.com/macros/s/AKfycbyD0VksB5ATqKCbihH-xNdSjNUolDWUEjWjPZ0sOzcjAxL0bdRflP4lcCQlYLujDYJ3zw/exec',
    activities: [
      'Gestão e Planejamento Operacional',
      'Operação de Campo',
      'Mapeamento e Levantamento com Drone',
      'Manutenção e Disponibilidade dos Equipamentos',
      'Suporte Técnico e Sistemas',
      'Gestão de Ocorrências e Melhorias',
      'Testes, Protocolos e Desenvolvimento',
      'Gestão Administrativa e Documentação',
      'Capacitação e Treinamento',
    ],
    cargos: [
      'Piloto',
      'Auxiliar de Voo',
      'Analista Júnior',
      'Analista Pleno',
      'Analista Sênior',
      'Especialista',
      'Coordenador',
      'Gerente',
    ],
  },
];

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getTeamById(id) {
  return TEAMS.find((t) => t.id === id) || null;
}

/** Monta a lista ACTIVITIES (id/name/order) de um time, no mesmo
 * formato que o resto do app já espera de window.APP_DATA. */
function buildActivities(team) {
  return team.activities.map((name, index) => ({
    id: slugify(name),
    name,
    order: index + 1,
  }));
}

window.TEAMS_DATA = {
  TEAMS,
  slugify,
  getTeamById,
  buildActivities,
};
