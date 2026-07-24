/**
 * data.js
 * ------------------------------------------------------------------
 * Lista fixa das 6 atividades do app de campo — cópia de js/data.js
 * (raiz do projeto), só para o Dashboard rotular o gráfico de horas
 * por atividade. As atividades não são editáveis (nem pelo admin); se
 * a lista mudar um dia, atualize as duas cópias.
 * ------------------------------------------------------------------
 */

// Ordem cronológica fixa do processo de trabalho.
const ACTIVITY_NAMES = [
  'Desenvolver metodologia',
  'Preparar material',
  'Coletar dados',
  'Tratar dados',
  'Analisar dados',
  'Apresentar resultados',
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
