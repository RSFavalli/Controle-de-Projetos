const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8792/index.html');
  await page.waitForTimeout(200);

  // 1) Configuração da API
  await page.fill('#apiUrlInput', 'http://localhost:8790');
  await page.click('#configForm button[type="submit"]');
  await page.waitForTimeout(600);
  console.log('Tela após configurar API:', await page.locator('#loginScreen').isVisible());

  // 2) Login como admin
  await page.fill('#loginEmail', 'alexandre.cunha@empresa.com');
  await page.fill('#loginPassword', 'mudar123');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForTimeout(500);
  const dashboardVisible = await page.locator('#dashboardScreen').isVisible();
  console.log('Dashboard visível após login:', dashboardVisible);

  await page.screenshot({ path: 'dashboard-clientes.png', fullPage: true });

  // 3) Criar novo cliente
  await page.click('#newClienteButton');
  await page.fill('#clienteNome', 'Cliente Teste E2E');
  await page.click('#clienteForm button[type="submit"]');
  await page.waitForTimeout(400);
  const clienteRows = await page.$$eval('#clientesTableBody tr', (rows) => rows.map((r) => r.textContent));
  console.log('Clientes apos criar:', clienteRows.find((t) => t.includes('Cliente Teste E2E')) ? 'ENCONTRADO' : 'NAO ENCONTRADO');

  // 4) Criar projeto vinculado a esse cliente
  await page.click('[data-tab="projetos"]');
  await page.click('#newProjetoButton');
  await page.selectOption('#projetoCliente', { label: 'Cliente Teste E2E' });
  await page.fill('#projetoNome', 'Projeto Teste E2E');
  await page.click('#projetoForm button[type="submit"]');
  await page.waitForTimeout(400);
  const projetoRows = await page.$$eval('#projetosTableBody tr', (rows) => rows.map((r) => r.textContent));
  console.log('Projetos apos criar:', projetoRows.find((t) => t.includes('Projeto Teste E2E')) ? 'ENCONTRADO' : 'NAO ENCONTRADO');

  await page.screenshot({ path: 'dashboard-projetos.png', fullPage: true });

  // 5) Criar novo colaborador com senha
  await page.click('[data-tab="colaboradores"]');
  await page.click('#newColaboradorButton');
  await page.fill('#colaboradorNome', 'Fulano de Teste');
  await page.fill('#colaboradorEmail', 'fulano.teste@empresa.com');
  await page.fill('#colaboradorSenha', 'senhaSegura123');
  await page.selectOption('#colaboradorPapel', 'colaborador');
  await page.click('#colaboradorForm button[type="submit"]');
  await page.waitForTimeout(400);
  const colabRows = await page.$$eval('#colaboradoresTableBody tr', (rows) => rows.map((r) => r.textContent));
  console.log('Colaboradores apos criar:', colabRows.find((t) => t.includes('Fulano de Teste')) ? 'ENCONTRADO' : 'NAO ENCONTRADO');

  await page.screenshot({ path: 'dashboard-colaboradores.png', fullPage: true });

  // 6) Testar login do novo colaborador (não-admin) deve ser barrado no dashboard
  await page.click('#logoutButton');
  await page.waitForTimeout(300);
  await page.fill('#loginEmail', 'fulano.teste@empresa.com');
  await page.fill('#loginPassword', 'senhaSegura123');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForTimeout(400);
  const stillOnLogin = await page.locator('#loginScreen').isVisible();
  console.log('Colaborador nao-admin barrado (deve continuar na tela de login):', stillOnLogin);

  // 7) Testar senha errada
  await page.fill('#loginEmail', 'alexandre.cunha@empresa.com');
  await page.fill('#loginPassword', 'senhaErrada');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForTimeout(400);
  const toastText = await page.locator('.toast').last().textContent().catch(() => null);
  console.log('Mensagem para senha errada:', toastText);

  // 8) Reload e verificar persistência de sessão (sessionStorage) e reconexão
  await page.fill('#loginPassword', 'mudar123');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(500);
  console.log('Dashboard visivel apos reload (sessao mantida):', await page.locator('#dashboardScreen').isVisible());

  console.log('Erros de console/pagina:', errors);

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
