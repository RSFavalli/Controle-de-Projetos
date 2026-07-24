# Configurar o backend (Google Sheets + Apps Script)

Passo a passo para colocar a API no ar. Leva uns 10 minutos, tudo feito na sua conta Google — eu não tenho acesso a essa conta, então esses passos precisam ser feitos por você.

> **Já configurou antes e está atualizando o `Code.gs`?** A versão atual libera a leitura de Clientes/Projetos (`listClientes`/`listProjetos`) para qualquer colaborador autenticado, não só admin — é o que o app de campo usa para carregar essas listas. Também adiciona a aba **Apontamentos** (usada pela sincronização dos registros de horas do app de campo), um **limite de tentativas de login** (bloqueia por 15 min um e-mail depois de 5 senhas erradas seguidas), os **alertas de apontamento por e-mail** (lembrete diário automático + reforço manual pelo Dashboard — veja o passo 9) e um campo **Cargo** na aba Colaboradores (opcional, usado para agrupar horas por função no Dashboard). Cole o `Code.gs` novo por cima do antigo (passo 2), **rode `seedDatabase` de novo** (passo 4 — é seguro rodar mais de uma vez, só cria o que ainda não existe) para criar a aba Apontamentos, **rode `configurarAlertaDiario` uma vez** (passo 9) para ligar o lembrete automático, e **implante uma nova versão** (passo 6 tem o caminho: Implantar → Gerenciar implantações → ícone de lápis → Nova versão → Implantar). A coluna Cargo é criada sozinha na primeira chamada que usar a aba Colaboradores, não precisa de passo manual. A URL do Web App continua a mesma.

## 1. Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco.
2. Renomeie para algo como **"Timesheet - Base de Dados"**.
3. Guarde essa planilha em uma pasta do Drive só sua/da equipe de admin (não precisa compartilhar com os colaboradores de campo — eles nunca vão acessar a planilha diretamente, só o Dashboard e futuramente o app fazem isso pela API).

## 2. Colar o script

1. Na planilha, vá em **Extensões → Apps Script**.
2. Apague o conteúdo padrão de `Code.gs` e cole o conteúdo do arquivo `Code.gs` (está junto deste guia).
3. Clique no ícone de disquete (Salvar projeto). Dê um nome ao projeto, ex.: "Timesheet API".

## 3. Definir o "tempero" (salt) das senhas

1. Ainda no editor do Apps Script, clique no ícone de engrenagem **Configurações do projeto** (à esquerda).
2. Em **Propriedades do script**, clique em **Adicionar propriedade do script**.
3. Nome: `PASSWORD_SALT` — Valor: qualquer texto aleatório só seu, ex.: `xK9#mP2vL8qR-troque-isto`.
4. Salve.

Isso é usado para gerar o hash das senhas — sem isso, o script usa um valor padrão (menos seguro). Troque por um valor único antes de cadastrar colaboradores de verdade.

## 4. Popular a planilha com os dados iniciais

1. Volte para a aba **Editor** (ícone `<>`) no Apps Script.
2. No menu suspenso de funções (topo, ao lado de "Depurar"), selecione `seedDatabase`.
3. Clique em **Executar**.
4. Na primeira vez, o Google vai pedir autorização — clique em **Revisar permissões**, escolha sua conta, clique em **Avançado → Acessar Timesheet API (não seguro)** e depois **Permitir**. (O aviso de "não seguro" aparece porque é um script seu, ainda não verificado pelo Google — é normal e esperado para uso interno.)
5. Confira na planilha: devem ter sido criadas as abas **Colaboradores** (com os 6 nomes da equipe e senha inicial `mudar123`), **Clientes** (com os 8 clientes) e **Projetos** (vazia, você cadastra pelo Dashboard).

## 5. Definir quem é administrador

1. Abra a aba **Colaboradores** na planilha.
2. Na coluna `papel`, troque o valor de **pelo menos uma pessoa** de `colaborador` para `admin`. Essa é a pessoa que vai conseguir logar no Dashboard.
3. (Opcional) Troque a senha inicial dessa pessoa depois, pelo próprio Dashboard, assim que conseguir logar.

> Por que esse passo é manual? Porque o Dashboard só permite gerenciar colaboradores para quem já é admin — é preciso existir pelo menos um admin "de fábrica" para começar. Depois disso, tudo o mais (criar outros admins, resetar senha, etc.) é feito pelo Dashboard.

## 6. Publicar como Web App

1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha **App da Web**.
3. Configure:
   - **Executar como**: Eu (seu e-mail)
   - **Quem pode acessar**: Qualquer pessoa
4. Clique em **Implantar**.
5. Autorize novamente se for pedido.
6. Copie a **URL do app da Web** gerada (algo como `https://script.google.com/macros/s/AKfycb.../exec`).

> "Quem pode acessar: Qualquer pessoa" é necessário porque o Dashboard e o app de campo chamam essa URL sem passar pelo login do Google — a autenticação é feita pelo próprio script (e-mail + senha da planilha), não pelo Google. Ninguém consegue ver ou editar a planilha diretamente por causa disso; só o que o script decidir expor.

## 7. Testar rapidamente

Cole a URL copiada no navegador, adicionando `?action=ping` no final, por exemplo:

```
https://script.google.com/macros/s/AKfycb.../exec?action=ping
```

Se aparecer algo como `{"ok":true,"message":"Timesheet API online", ...}`, está funcionando.

## 8. Conectar o Dashboard e o app de campo

Os dois usam a mesma URL do Web App (passo 6):

1. **Dashboard Admin** (`admin-dashboard/index.html`): na tela inicial, cole a URL e salve; faça login com o e-mail e senha (`mudar123`) da pessoa marcada como `admin` no passo 5; troque essa senha assim que possível pela tela de Colaboradores.
2. **App de campo** (`index.html`, na raiz do projeto): mesma coisa — cole a URL na tela inicial, depois faça login com o e-mail/senha de qualquer colaborador (não precisa ser admin). Depois do primeiro login com internet, essa pessoa consegue logar de novo nesse mesmo aparelho mesmo sem conexão.
3. Cadastre ao menos um Cliente e um Projeto pelo Dashboard Admin antes de testar o cronômetro no app de campo — sem isso, os selects de Cliente/Projeto aparecem vazios.

## 9. Ativar os alertas de apontamento por e-mail

O sistema manda dois tipos de e-mail para os colaboradores, sempre pela conta que publicou o script (a mesma do passo 6):

- **Lembrete diário automático**: todo fim de dia útil (por volta das 19h, sem contar fins de semana e feriados nacionais/de Paulínia-SP), quem não apontou nada ou deixou uma atividade em aberto recebe um e-mail sozinho.
- **Reforço manual**: pela aba **Apontamentos** do Dashboard, você vê a frequência de pendências de cada colaborador e pode mandar um e-mail de cobrança na hora, com uma mensagem sua opcional.

Nos dois casos, se o colaborador **responder o e-mail**, a resposta cai em `rafael.favalli@agricef.com.br` (constante `ADMIN_EMAIL` no topo do `Code.gs` — troque ali se precisar apontar para outro e-mail).

Para ligar o lembrete automático (só precisa fazer isso **uma vez**):

1. No editor do Apps Script, no menu suspenso de funções (o mesmo do passo 4), selecione `configurarAlertaDiario`.
2. Clique em **Executar**.
3. Na primeira vez, o Google vai pedir autorização de novo — dessa vez para **enviar e-mail em seu nome**. Revise e permita, do mesmo jeito do passo 4.
4. Pronto — o gatilho fica ativo mesmo com o editor fechado. Para conferir, vá no ícone de relógio (**Gatilhos**) na barra lateral esquerda do editor: deve aparecer `enviarAlertasDiarios` rodando todo dia.

É seguro rodar `configurarAlertaDiario` de novo no futuro (ex.: se quiser mudar o horário no código) — ele substitui o gatilho antigo, não duplica.

## Sempre que você editar o Code.gs

Alterações no script só valem depois de uma **nova implantação** (ou de editar a implantação existente): Implantar → Gerenciar implantações → ícone de lápis → Nova versão → Implantar. A URL costuma continuar a mesma se você editar a implantação existente em vez de criar uma nova.

## Sobre segurança (leia antes de usar com dados reais)

Este backend é propositalmente simples, pensado para uma equipe pequena e uso interno:

- Senhas são guardadas como hash (SHA-256 + salt), nunca em texto puro. Login tem limite de tentativas (5 erradas seguidas bloqueiam aquele e-mail por 15 minutos), mas ainda não há rotação/expiração de senha.
- A autenticação é reenviada a cada chamada (e-mail + senha), sem tokens de sessão — funciona, mas não é o padrão de mercado para produtos voltados ao público externo.
- Qualquer pessoa com a URL do Web App pode tentar chamar a API (ela só responde com dados de verdade se e-mail/senha baterem) — não publique essa URL em lugar público.

Para uma equipe interna de 6 pessoas isso é razoável como ponto de partida. Se no futuro este sistema crescer ou passar a lidar com dados mais sensíveis, vale migrar para uma autenticação mais robusta (ex.: Firebase Auth, OAuth) — posso ajudar nessa migração quando fizer sentido.
