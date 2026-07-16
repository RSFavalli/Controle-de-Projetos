const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({ viewport: { width: 420, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('http://localhost:8791/index.html');
  await page.waitForTimeout(200);

  /* ---------- 1) Configurar URL da API ---------- */
  await page.fill('#apiUrlInput', 'http://localhost:8790');
  await page.click('#configForm button[type="submit"]');
  await page.waitForTimeout(600);
  console.log('1) Tela de login visivel apos configurar API:', await page.locator('#loginScreen').isVisible());

  /* ---------- 2) Login ONLINE ---------- */
  await page.fill('#loginEmail', 'alexandre.cunha@empresa.com');
  await page.fill('#loginPassword', 'mudar123');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForTimeout(700);
  console.log('2) App visivel apos login online:', await page.locator('#appScreen').isVisible());
  console.log('   Nome da sessao:', await page.textContent('#sessionUserName'));
  console.log('   Status de sync:', await page.textContent('#syncStatus'));

  /* ---------- 3) Clientes/projetos vieram do backend ---------- */
  const clientOptions = await page.$$eval('#clientSelect option', (opts) => opts.map((o) => o.textContent));
  console.log('3) Opcoes de cliente carregadas:', clientOptions);

  await page.selectOption('#clientSelect', { label: 'John Deere' });
  await page.waitForTimeout(150);
  const projectOptions = await page.$$eval('#projectSelect option', (opts) => opts.map((o) => o.textContent));
  console.log('   Projetos para John Deere (deve ter "Levantamento de campo 2026"):', projectOptions);

  /* ---------- 4) Iniciar e encerrar cronometro (online) ---------- */
  await page.selectOption('#projectSelect', { label: 'Levantamento de campo 2026' });
  await page.selectOption('#activitySelect', { label: '1. Desenvolver metodologia' });
  await page.fill('#observations', 'Teste e2e online');
  await page.click('#startButton');
  await page.waitForTimeout(1500);
  console.log('4) Relogio rodando:', await page.textContent('#timerClock'));
  console.log('   Start desabilitado / Stop habilitado:', await page.isDisabled('#startButton'), '/', !(await page.isDisabled('#stopButton')));

  await page.click('#stopButton');
  await page.waitForTimeout(300);
  const rowsAfterStop = await page.$$eval('#entriesTableBody tr', (rows) => rows.length);
  console.log('   Linhas na tabela apos encerrar:', rowsAfterStop);

  await page.screenshot({ path: 'screenshot-field-logged-in.png', fullPage: true });

  /* ---------- 5) Logout e login OFFLINE (credencial em cache local) ---------- */
  await page.click('#logoutButton');
  await page.waitForTimeout(300);
  console.log('5) Login screen apos logout:', await page.locator('#loginScreen').isVisible());

  await context.setOffline(true);
  await page.fill('#loginEmail', 'alexandre.cunha@empresa.com');
  await page.fill('#loginPassword', 'mudar123');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForTimeout(700);
  console.log('   App visivel apos login OFFLINE (deve usar cache local):', await page.locator('#appScreen').isVisible());
  const offlineToast = await page.locator('.toast').last().textContent().catch(() => null);
  console.log('   Toast de login offline:', offlineToast);

  /* ---------- 6) Timer offline usando cliente/projeto em cache ---------- */
  const clientOptionsOffline = await page.$$eval('#clientSelect option', (opts) => opts.map((o) => o.textContent));
  console.log('6) Clientes disponiveis offline (deve vir do cache, sem rede):', clientOptionsOffline);

  await page.selectOption('#clientSelect', { label: 'CASE' });
  await page.waitForTimeout(150);
  const projectOptionsCase = await page.$$eval('#projectSelect option', (opts) => opts.map((o) => o.textContent));
  console.log('   Projetos para CASE offline:', projectOptionsCase);

  await page.selectOption('#projectSelect', { label: 'Diagnostico safra 25/26' });
  await page.selectOption('#activitySelect', { label: '3. Coletar dados' });
  await page.click('#startButton');
  await page.waitForTimeout(1200);
  console.log('   Relogio rodando offline:', await page.textContent('#timerClock'));
  await page.click('#stopButton');
  await page.waitForTimeout(300);
  const rowsOffline = await page.$$eval('#entriesTableBody tr', (rows) => rows.length);
  console.log('   Linhas na tabela apos apontamento offline (deve ser 2, o de antes + este):', rowsOffline);

  await page.screenshot({ path: 'screenshot-field-offline.png', fullPage: true });

  /* ---------- 7) Volta a ficar online: sincronizacao automatica ---------- */
  await context.setOffline(false);
  await page.waitForTimeout(1000);
  console.log('7) Status de sync apos reconectar:', await page.textContent('#syncStatus'));

  /* ---------- 8) Reload da pagina mantém sessão (localStorage) ---------- */
  await page.reload();
  await page.waitForTimeout(500);
  console.log('8) App visivel apos reload (sessao persistida):', await page.locator('#appScreen').isVisible());
  const rowsAfterReload = await page.$$eval('#entriesTableBody tr', (rows) => rows.length);
  console.log('   Linhas na tabela apos reload:', rowsAfterReload);

  console.log('Erros de console/pagina:', errors);

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
