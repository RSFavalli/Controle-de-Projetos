/**
 * data.js
 * ------------------------------------------------------------------
 * Dados fixos do app de campo.
 *
 * Clientes, Projetos e Colaboradores NÃO ficam mais aqui — agora vêm
 * do backend (Google Sheets via Apps Script), lidos por js/api.js e
 * cacheados localmente por js/db.js para funcionar offline. Veja
 * admin-dashboard/ para cadastrá-los.
 *
 * ACTIVITIES continua fixo aqui porque, por regra de negócio, as
 * atividades não são editáveis (nem pelo admin).
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
