/**
 * data.js
 * ------------------------------------------------------------------
 * Lista fixa das 6 macroatividades do app de campo — cópia de
 * js/data.js (raiz do projeto), só para o Dashboard rotular o gráfico
 * de horas por atividade. As atividades não são editáveis (nem pelo
 * admin); se a lista mudar um dia, atualize as duas cópias.
 * ------------------------------------------------------------------
 */

// Lista fixa de macroatividades da equipe de pesquisa agrícola.
const ACTIVITY_NAMES = [
  'Desenvolver Metodologia',
  'Preparar Material',
  'Coletar Dados',
  'Tratar Dados',
  'Analisar Dados',
  'Apresentar Resultados',
];

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const ACTIVITIES = ACTIVITY_NAMES.map((name, index) => ({
  id: slugify(name),
  name,
  order: index + 1,
}));

window.APP_DATA = {
  ACTIVITIES,
  slugify,
};
