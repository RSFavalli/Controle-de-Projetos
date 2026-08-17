/**
 * timer.js
 * ------------------------------------------------------------------
 * Lógica do cronômetro. O tempo decorrido é sempre calculado a partir
 * de timestamps reais (Date.now()) e não de um contador incrementado
 * a cada segundo — assim, se o usuário atualizar a página, fechar o
 * navegador ou ficar sem internet, o cronômetro continua correto ao
 * reabrir o app (o estado "ativo" fica salvo no localStorage).
 * ------------------------------------------------------------------
 */

const Timer = (() => {
  let tickIntervalId = null;
  let onTickCallback = null;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatHms(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function formatHm(totalMinutes) {
    // Arredonda o total primeiro (não os minutos isolados), senão um resto
    // como 59.6 vira "60" em vez de virar a próxima hora — ex.: 00:60.
    const rounded = Math.round(totalMinutes);
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    return `${pad(h)}:${pad(m)}`;
  }

  function nowTimeStr(date = new Date()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function todayDateStr(date = new Date()) {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}-${m}-${d}`;
  }

  /** Inicia um novo apontamento e persiste como "em andamento". */
  function start({ employeeId, employeeName, clientId, clientName, projectId, projectName, activityId, activityName, observations }) {
    if (getActiveEntry()) {
      throw new Error('Já existe um cronômetro em andamento. Encerre-o antes de iniciar outro.');
    }

    const startDate = new Date();
    const entry = {
      id: DB.generateId(),
      employeeId,
      employeeName,
      clientId,
      clientName,
      projectId,
      projectName,
      activityId,
      activityName,
      date: todayDateStr(startDate),
      startTime: nowTimeStr(startDate),
      startTimestamp: startDate.getTime(),
      endTime: null,
      endTimestamp: null,
      durationMinutes: null,
      observations: observations || '',
      status: 'em_andamento',
      createdAt: startDate.toISOString(),
      updatedAt: startDate.toISOString(),
    };

    DB.saveEntry(entry);
    DB.setActiveTimer({ entryId: entry.id, employeeId });
    return entry;
  }

  /** Encerra o apontamento em andamento do colaborador informado. */
  function stop(observationsOverride) {
    const active = DB.getActiveTimer();
    if (!active) return null;

    const entries = DB.getEntries();
    const entry = entries.find((e) => e.id === active.entryId);
    if (!entry) {
      DB.clearActiveTimer();
      return null;
    }

    const endDate = new Date();
    entry.endTime = nowTimeStr(endDate);
    entry.endTimestamp = endDate.getTime();
    entry.durationMinutes = Math.max(
      0,
      Math.round((entry.endTimestamp - entry.startTimestamp) / 60000)
    );
    entry.status = 'concluido';
    entry.updatedAt = endDate.toISOString();
    if (typeof observationsOverride === 'string') {
      entry.observations = observationsOverride;
    }

    DB.saveEntry(entry);
    DB.clearActiveTimer();
    return entry;
  }

  /** Encerra manualmente uma entrada específica (ex.: fechar apontamento aberto de outro dia). */
  function closeEntryManually(entryId, endTimeStr) {
    const entries = DB.getEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return null;

    // Se não foi informado horário, assume o fim do próprio dia do apontamento (23:59).
    const [h, m] = (endTimeStr || '23:59').split(':').map(Number);
    entry.endTime = `${pad(h)}:${pad(m)}`;
    entry.status = 'concluido';
    if (entry.startTimestamp) {
      const start = new Date(entry.startTimestamp);
      const end = new Date(start);
      end.setHours(h, m, 0, 0);
      entry.endTimestamp = end.getTime();
      entry.durationMinutes = Math.max(0, Math.round((end - start) / 60000));
    }
    entry.updatedAt = new Date().toISOString();
    DB.saveEntry(entry);
    if (DB.getActiveTimer() && DB.getActiveTimer().entryId === entryId) {
      DB.clearActiveTimer();
    }
    return entry;
  }

  function getActiveEntry() {
    const active = DB.getActiveTimer();
    if (!active) return null;
    const entries = DB.getEntries();
    const entry = entries.find((e) => e.id === active.entryId);
    if (!entry || entry.status !== 'em_andamento') {
      DB.clearActiveTimer();
      return null;
    }
    return entry;
  }

  function getElapsedSeconds(entry) {
    if (!entry || !entry.startTimestamp) return 0;
    return Math.max(0, Math.floor((Date.now() - entry.startTimestamp) / 1000));
  }

  /** Inicia o loop de atualização visual do relógio (chama o callback a cada segundo). */
  function startTicking(callback) {
    stopTicking();
    onTickCallback = callback;
    tickIntervalId = setInterval(() => {
      if (onTickCallback) onTickCallback();
    }, 1000);
  }

  function stopTicking() {
    if (tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
    onTickCallback = null;
  }

  return {
    start,
    stop,
    closeEntryManually,
    getActiveEntry,
    getElapsedSeconds,
    startTicking,
    stopTicking,
    formatHms,
    formatHm,
    nowTimeStr,
    todayDateStr,
  };
})();

window.Timer = Timer;
