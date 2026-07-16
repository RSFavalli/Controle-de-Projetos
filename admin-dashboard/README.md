# Dashboard Admin — Timesheet

Painel web para gerenciar **Clientes**, **Projetos** e **Colaboradores (com senha)**. Fala com o backend em `../backend/Code.gs` (Google Sheets + Google Apps Script).

## Antes de usar

1. Configure o backend seguindo `../backend/SETUP.md` (cria a planilha, publica a API, define o admin inicial).
2. Abra `index.html` num navegador (pode ser direto com duplo clique, não depende de Service Worker/offline como o app de campo).
3. Na primeira tela, cole a URL do Web App publicado (termina em `/exec`).
4. Faça login com um e-mail marcado como `admin` na planilha de Colaboradores.

## Testar localmente sem configurar o Google ainda

Se você só quer ver o dashboard funcionando antes de mexer no Google Sheets:

```bash
node ../backend/mock-server.js
```

Isso sobe uma API falsa em `http://localhost:8790`, com um usuário admin de teste (`alexandre.cunha@empresa.com` / `mudar123`). Na tela de configuração do dashboard, use essa URL. Os dados desse modo ficam só em memória — reiniciar o processo apaga tudo. **Não é o backend real.**

## O que dá para fazer hoje

- **Clientes**: cadastrar, editar nome, ativar/inativar.
- **Projetos**: cadastrar vinculado a um cliente, editar, ativar/inativar.
- **Colaboradores**: cadastrar, editar nome/e-mail/perfil, ativar/inativar, e definir/resetar senha (nunca fica visível depois de salva — só o hash é armazenado).
- Apenas colaboradores com perfil **admin** conseguem entrar no dashboard.

## O que ainda não está aqui

- O app de campo (`../index.html`) ainda usa sua própria lista local de clientes/projetos (semeada em `js/data.js` + o "+ Novo projeto" provisório) — ele **ainda não busca esses dados do backend novo**. Conectar os dois é o próximo passo natural: fazer o app de campo ler Clientes/Projetos desta mesma planilha (com cache local para continuar funcionando offline) e, futuramente, também autenticar os colaboradores por aqui.
- Tela de relatórios / exportação de apontamentos para análise ainda não existe.
