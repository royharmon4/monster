/* === Leaderboard: period filtering + stat aggregation === */
/* ── PERSISTENT STATS ── */
let activePeriod = 'day';

// In-memory stats store: { day: { '2026-3-22': { JJ: {kills,damage}, ... } }, week: {...}, alltime: {...} }
let persistedStats = { day: {}, week: {}, alltime: {} };

export function getActivePeriod() {
  return activePeriod;
}

export function setActivePeriod(period) {
  if (['day', 'week', 'alltime'].includes(period)) activePeriod = period;
}

export function resetPersistedStats() {
  persistedStats = { day: {}, week: {}, alltime: {} };
}

export function sanitizeStatsBucket(stats) {
  if (!stats || typeof stats !== 'object') return {};
  return Object.fromEntries(
    Object.entries(stats).map(([name, values]) => [name, {
      kills: Number(values?.kills || 0),
      damage: Number(values?.damage || 0)
    }])
  );
}

export function sanitizePersistedStats(stats) {
  const safe = { day: {}, week: {}, alltime: {} };
  if (!stats || typeof stats !== 'object') return safe;

  ['day', 'week'].forEach(period => {
    const buckets = stats[period];
    if (!buckets || typeof buckets !== 'object') return;
    safe[period] = Object.fromEntries(
      Object.entries(buckets).map(([key, value]) => [key, sanitizeStatsBucket(value)])
    );
  });

  safe.alltime = sanitizeStatsBucket(stats.alltime);
  return safe;
}

const SOUTH_CAROLINA_TIME_ZONE = 'America/New_York';

function getSouthCarolinaDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SOUTH_CAROLINA_TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(now);

  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[values.weekday] ?? 0;

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekdayIndex
  };
}

export function periodKey(period) {
  const nowParts = getSouthCarolinaDateParts();
  if (period === 'day') return `${nowParts.year}-${nowParts.month - 1}-${nowParts.day}`;
  if (period === 'week') {
    const daysSinceMonday = (nowParts.weekdayIndex + 6) % 7;
    const weekStartUtcMs = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day) - (daysSinceMonday * 86400000);
    const weekStart = new Date(weekStartUtcMs);
    return `${weekStart.getUTCFullYear()}-${weekStart.getUTCMonth()}-${weekStart.getUTCDate()}`;
  }
  return 'alltime';
}

export function loadPeriodStats(period) {
  if (period === 'alltime') return persistedStats.alltime || {};
  const key = periodKey(period);
  return (persistedStats[period] || {})[key] || {};
}

export function savePeriodStats(period, stats, stateObj) {
  if (period === 'alltime') { persistedStats.alltime = stats; autoSave(stateObj); return; }
  const key = periodKey(period);
  if (!persistedStats[period]) persistedStats[period] = {};
  persistedStats[period][key] = stats;
  autoSave(stateObj);
}

/* === Storage/save-load: local autosave + JSON import/export === */
/* ── AUTO SAVE / LOAD ── */
const AUTO_SAVE_KEY = 'bossbattle-autosave';

export function sanitizeGame(game, { createInitialGame, createMonsterSeeded, buildMonsterArt, normalizeKids, kidDefaults }) {
  if (!game || typeof game !== 'object') return createInitialGame(createMonsterSeeded);
  const kids = normalizeKids(Array.isArray(game.kids) ? game.kids : kidDefaults);
  const monster = game.monster && typeof game.monster === 'object'
    ? { ...createMonsterSeeded(0), ...game.monster, hp: Number(game.monster.hp ?? game.monster.maxHp ?? 0), maxHp: Number(game.monster.maxHp ?? game.monster.hp ?? 0) }
    : createMonsterSeeded();
  monster.art = monster.art || buildMonsterArt(monster.seed ?? 0, monster.themeKey);
  monster.hp = Math.max(0, Math.min(monster.maxHp || 0, monster.hp || 0));
  return {
    title: typeof game.title === 'string' && game.title.trim() ? game.title : 'Boss Battle',
    monster,
    kids,
    battleLog: Array.isArray(game.battleLog) ? game.battleLog.slice(0, 24) : []
  };
}

export function autoSave(stateObj) {
  try {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({
      version: 2,
      stats: persistedStats,
      game: stateObj.game,
      selectedKidId: stateObj.selectedKidId,
      selectedMoveKey: stateObj.selectedMoveKey,
      activePeriod,
      savedAt: new Date().toISOString()
    }));
  } catch {}
}

export function autoLoad(stateObj, deps) {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    persistedStats = sanitizePersistedStats(data?.stats);
    if (data?.game) {
      stateObj.game = sanitizeGame(data.game, deps);
    }
    if (typeof data?.selectedKidId === 'string') { stateObj.selectedKidId = data.selectedKidId; }
    if (typeof data?.selectedMoveKey === 'string') { stateObj.selectedMoveKey = data.selectedMoveKey; }
    if (['day','week','alltime'].includes(data?.activePeriod)) { activePeriod = data.activePeriod; }
    deps.syncSelectionState(stateObj, deps.getKidById, deps.moveDefs);
  } catch {}
}

/* ── SAVE / LOAD JSON ── */
export function exportSave(stateObj, showToast) {
  const saveData = {
    version: 2,
    stats: persistedStats,
    game: stateObj.game,
    selectedKidId: stateObj.selectedKidId,
    selectedMoveKey: stateObj.selectedMoveKey,
    activePeriod,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const d = new Date();
  a.download = `bossbattle-save-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Progress saved!', 'success');
}

export function importSave(file, deps) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data?.game || !data?.stats) throw new Error('Invalid save file');
      persistedStats = sanitizePersistedStats(data?.stats);
      if (data.game) deps.state.game = sanitizeGame(data.game, deps);
      if (typeof data.selectedKidId === 'string') deps.state.selectedKidId = data.selectedKidId;
      if (typeof data.selectedMoveKey === 'string') deps.state.selectedMoveKey = data.selectedMoveKey;
      if (['day','week','alltime'].includes(data.activePeriod)) activePeriod = data.activePeriod;
      deps.syncSelectionState(deps.state, deps.getKidById, deps.moveDefs);
      deps.onActivePeriodChange(activePeriod);
      deps.renderUI();
      deps.showToast('Progress loaded!', 'success');
    } catch {
      deps.showToast('Could not read that save file.', 'warning');
    }
  };
  reader.readAsText(file);
}

export function getLeaderboardStats(game, normalizeKids) {
  const stats = sanitizeStatsBucket(loadPeriodStats(getActivePeriod()));
  const currentKids = normalizeKids(game?.kids ?? []);
  const shouldOverlayCurrentMonster = Boolean(game?.monster) && !game.monster.finalBlowBy;

  if (shouldOverlayCurrentMonster) {
    currentKids.forEach(kid => {
      if (!stats[kid.name]) stats[kid.name] = { kills: 0, damage: 0 };
      stats[kid.name].damage += Number(kid.monsterDamage || 0);
    });
  }

  return stats;
}

export function recordStatsForKids(killerName, allKids, stateObj) {
  ['day','week','alltime'].forEach(period => {
    const stats = loadPeriodStats(period);
    // Record kill for the finisher
    if (!stats[killerName]) stats[killerName] = { kills:0, damage:0 };
    stats[killerName].kills = (stats[killerName].kills||0) + 1;
    // Record damage for everyone who hit
    allKids.forEach(kid => {
      if ((kid.monsterDamage||0) > 0) {
        if (!stats[kid.name]) stats[kid.name] = { kills:0, damage:0 };
        stats[kid.name].damage = (stats[kid.name].damage||0) + kid.monsterDamage;
      }
    });
    savePeriodStats(period, stats, stateObj);
  });
}
