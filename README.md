# Timesheet — Apontamento de Horas (offline-first)

Este repositório tem três partes:

- **`/` (esta pasta)** — o app de campo: PWA offline-first com login e o cronômetro de apontamento.
- **`admin-dashboard/`** — painel web para o administrador cadastrar Clientes, Projetos e Colaboradores (com senha).
- **`backend/`** — a API compartilhada pelos dois apps acima: um Google Apps Script publicado como Web App sobre uma planilha do Google Sheets. Veja `backend/SETUP.md` para configurar.

**Configure o backend primeiro** (`backend/SETUP.md`) — sem ele, nem o app de campo nem o Dashboard Admin conseguem logar ou carregar Clientes/Projetos.

## Como rodar localmente

Como o app usa Service Worker, ele precisa ser servido via HTTP (não funciona abrindo o `index.html` direto com `file://`). Qualquer servidor estático simples resolve, por exemplo:

```bash
cd timesheet-app
python3 -m http.server 8080
# depois abra http://localhost:8080/index.html
```

Ou, com Node instalado:

```bash
npx serve .
```

Na primeira abertura, o app pede a URL da API (a mesma configurada no Dashboard Admin — veja `backend/SETUP.md`) e depois o login (e-mail/senha cadastrados pelo admin). Depois do primeiro login com internet, o Service Worker guarda o app shell em cache, os dados de Clientes/Projetos ficam salvos localmente, e o app volta a funcionar mesmo sem conexão (inclusive em modo avião) — incluindo um novo login **offline**, se essa mesma pessoa já tiver logado nesse aparelho ao menos uma vez online.

## Estrutura de pastas

```
timesheet-app/
├── index.html          Telas: configurar API, login, cronômetro + apontamentos do dia
├── manifest.json        Metadados do PWA (nome, ícone, cor do tema)
├── sw.js                 Service Worker (cache do app shell para uso offline)
├── css/
│   └── styles.css        Estilos responsivos (mobile-first)
├── js/
│   ├── data.js            Atividades fixas (únicos dados que continuam só no front-end)
│   ├── db.js               Persistência local: apontamentos, timer ativo, sessão, cache de clientes/projetos, cache de autenticação offline
│   ├── api.js               Wrapper para chamar o backend (login, listar clientes/projetos)
│   ├── timer.js             Lógica do cronômetro (iniciar/encerrar, cálculo de duração)
│   └── app.js                Wiring das telas: config, login, cronômetro, alertas, sincronização
├── icons/                 Ícones do PWA (192px e 512px)
├── tests/                  Scripts de verificação automatizada (Playwright)
├── admin-dashboard/        Painel do administrador (Clientes, Projetos, Colaboradores/senhas)
└── backend/                 Código do Apps Script (Code.gs), guia de setup (SETUP.md) e um servidor mock para testes locais
```

## Modelo de dados

**Local (só neste dispositivo, sempre em localStorage):**

- `ts_entries` — apontamentos: colaborador, cliente, projeto, data, atividade, hora de início, hora de encerramento e observações, mais campos de controle (`id`, `status`, timestamps).
- `ts_active_timer` — referência ao apontamento em andamento (no máximo 1 por vez neste dispositivo); permite que o cronômetro sobreviva a um refresh de página ou fechamento do navegador.
- `ts_session` — quem está logado neste dispositivo (persiste entre sessões, para não pedir login toda vez em campo).
- `ts_auth_cache` — por e-mail, um verificador local (hash) que permite logar de novo **sem internet** neste mesmo dispositivo, depois de ao menos um login online bem-sucedido. Não guarda a senha em si.
- `ts_clientes_cache` / `ts_projetos_cache` — última cópia sincronizada de Clientes/Projetos vinda do backend; é o que o cronômetro usa quando está offline.

**Compartilhado (na planilha do Google Sheets, via `backend/`):**

- Clientes, Projetos e Colaboradores (com senha em hash) — geridos pelo Dashboard Admin, lidos pelo app de campo.
- Apontamentos (`ts_entries`) — cada apontamento concluído sobe para a aba **Apontamentos** da planilha (por upsert, usando o `id` gerado no próprio dispositivo). Continuam também salvos localmente; a cópia local é a fonte da verdade em campo, a planilha é o destino para relatórios/consolidação.

## Regras já implementadas

- **Login por e-mail/senha** contra o backend, com sessão persistente no dispositivo. Cada colaborador só vê seus próprios apontamentos (o filtro usa o `id` retornado no login, não mais uma lista escolhida livremente).
- **Login offline**: se a internet cair (ou o app abrir sem conexão), o mesmo e-mail/senha usado da última vez online continua funcionando naquele aparelho.
- **Clientes e Projetos vêm do backend** (mesma base do Dashboard Admin) e ficam em cache local para uso offline; sincroniza automaticamente após login e ao reconectar, ou manualmente pelo botão "Sincronizar". Cadastro de clientes/projetos agora é feito **só** pelo Dashboard Admin.
- **Cronômetro**: seleciona Cliente → Projeto (filtrado pelo cliente) → Atividade (as 6 fixas, na ordem pedida) → Iniciar. O relógio é calculado a partir de timestamp real, então continua certo mesmo se a página for recarregada.
- **Apenas 1 cronômetro ativo por vez** neste dispositivo (evita apontamentos sobrepostos).
- **Lista "Apontamentos de hoje"**: mostra os registros do colaborador logado no dia atual, com total de horas somado automaticamente.
- **Alerta de atividade aberta de dias anteriores** e **alerta de fim de expediente** (a partir das 18h) — mesma lógica de antes.
- **Indicador online/offline** na barra do topo.
- **Edição de apontamentos**: qualquer apontamento concluído do dia pode ser corrigido (Cliente, Projeto, Atividade, Início, Fim, Observações) pelo botão "Editar" na lista "Apontamentos de hoje".
- **Sincronização de apontamentos**: apontamentos concluídos sobem sozinhos para a planilha (login, reconexão, logo após encerrar/editar/excluir um apontamento, e também pelo botão "Sincronizar"). Um indicador ao lado do total mostra quantos ainda estão pendentes de envio. Exclusão de um apontamento já sincronizado também remove a linha correspondente na planilha.

## O que falta (próximas etapas)

1. **Relatórios**: os apontamentos já chegam na aba Apontamentos da planilha; falta construir as visões/relatórios de consolidação em cima desses dados (ex.: no próprio Dashboard).
2. **Segurança de produção**: o modelo de autenticação atual (e-mail/senha reenviados a cada chamada, sem token de sessão; senha local cacheada como hash para uso offline) é adequado para uma equipe pequena e uso interno, mas não é o padrão de mercado — ver observações em `backend/SETUP.md`.

## Testes automatizados incluídos

`tests/test_field_app.js` usa Playwright para validar o fluxo completo: configurar API → login online → clientes/projetos carregados do backend → cronômetro (iniciar/encerrar) → logout → login **offline** com credencial em cache → cronômetro offline → reconexão → persistência após reload. Para rodar:

```bash
npm install -g playwright
node backend/mock-server.js &     # backend falso local, veja backend/mock-server.js
python3 -m http.server 8791 &     # serve este app de campo
node tests/test_field_app.js
```
