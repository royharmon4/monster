/** Main app entrypoint: wires modules, bootstraps state, and binds UI events. */

import {
  KID_DEFAULTS,
  MOVE_DEFS,
  createInitialGame,
  getKidById as getKidByIdFromState,
  normalizeKids,
  state,
  syncSelectionState
} from './state.js';
import { getMonsterLeaders, createBattleController } from './battle.js';
import {
  autoLoad,
  autoSave,
  exportSave,
  getActivePeriod,
  getLeaderboardStats,
  importSave,
  recordStatsForKids,
  resetPersistedStats,
  setActivePeriod
} from './storage.js';
import { THEMES, createMonsterSeeded, buildMonsterArt, createFlinchEyes, renderMonsterSVG, renderDeadMonsterSVG } from './monster.js';
import { createEffects } from './effects.js';
import { createUIRenderer } from './ui.js';

const dom = {
  appTitle: document.getElementById('appTitle'),
  monsterArt: document.getElementById('monsterArt'),
  monsterName: document.getElementById('monsterName'),
  monsterThemePill: document.getElementById('monsterThemePill'),
  monsterHpFill: document.getElementById('monsterHpFill'),
  monsterHpText: document.getElementById('monsterHpText'),
  finalBlowPanel: document.getElementById('finalBlowPanel'),
  kidButtons: document.getElementById('kidButtons'),
  movePanel: document.getElementById('movePanel'),
  leaderboard: document.getElementById('leaderboard'),
  healMonsterBtn: document.getElementById('healMonsterBtn'),
  resetBattleBtn: document.getElementById('resetBattleBtn'),
  bottomResetBattleBtn: document.getElementById('bottomResetBattleBtn'),
  resetScoresBtn: document.getElementById('resetScoresBtn'),
  toast: document.getElementById('toast')
};

function getKidById(id){ return getKidByIdFromState(state, id); }

let battle;

const ui = createUIRenderer({
  dom,
  state,
  themes: THEMES,
  moveDefs: MOVE_DEFS,
  kidDefaults: KID_DEFAULTS,
  normalizeKids,
  getKidById,
  getMonsterLeaders,
  renderMonsterSVG,
  autoSave,
  getLeaderboardStats,
  onSelectKid: (kidId) => { state.selectedKidId = kidId; state.selectedMoveKey = null; ui.renderUI(); },
  onSelectMove: (moveKey) => { state.selectedMoveKey = moveKey; ui.renderUI(); },
  onBackFromMove: () => { state.selectedMoveKey = null; ui.renderUI(); },
  onHit: () => battle.handleHit(),
  onFinalBlow: (kidId) => battle.deliverFinalBlow(kidId)
});

const effects = createEffects({
  dom,
  state,
  renderUI: () => ui.renderUI(),
  normalizeKids,
  kidDefaults: KID_DEFAULTS,
  createMonsterSeeded,
  buildMonsterArt,
  createFlinchEyes,
  renderDeadMonsterSVG,
  triggerBurnMarkAppear: ui.triggerBurnMarkAppear
});

const {
  showToast,
  preserveScrollPosition,
  playHitEffects,
  pokeMonster,
  unlockAudio,
  playFinalBlow,
  playDeathSequence
} = effects;

battle = createBattleController({
  state,
  moveDefs: MOVE_DEFS,
  kidDefaults: KID_DEFAULTS,
  normalizeKids,
  createMonsterSeeded,
  getKidById,
  showToast,
  renderUI: ui.renderUI,
  preserveScrollPosition,
  playHitEffects,
  recordStatsForKids,
  resetPersistedStats,
  onFinalBlowResolved: (kid) => {
    playFinalBlow();
    playDeathSequence(kid);
  },
  onResetBattle: () => {
    dom.monsterArt.classList.remove('is-dead','hurt','badly-hurt','tier-2','tier-3','tier-4','tier-5');
  }
});

const storageDeps = {
  state,
  createInitialGame,
  createMonsterSeeded,
  buildMonsterArt,
  normalizeKids,
  kidDefaults: KID_DEFAULTS,
  syncSelectionState,
  getKidById,
  moveDefs: MOVE_DEFS,
  renderUI: ui.renderUI,
  showToast,
  onActivePeriodChange: (period) => {
    document.querySelectorAll('.lb-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.period === period));
  }
};

dom.healMonsterBtn.addEventListener('click',()=>battle.healMonster(5));
document.getElementById('saveBtn').addEventListener('click', () => exportSave(state, showToast));
document.getElementById('loadInput').addEventListener('change', e => {
  if (e.target.files[0]) {
    importSave(e.target.files[0], storageDeps);
    e.target.value = '';
  }
});
document.querySelectorAll('.lb-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    setActivePeriod(btn.dataset.period);
    document.querySelectorAll('.lb-tab').forEach(b => b.classList.toggle('active', b===btn));
    ui.renderLeaderboard();
  });
});
dom.resetBattleBtn.addEventListener('click', battle.resetBattle);
dom.bottomResetBattleBtn.addEventListener('click', battle.resetBattle);
dom.resetScoresBtn.addEventListener('click', battle.resetScores);
dom.monsterArt.addEventListener('pointerdown', pokeMonster);
document.addEventListener('pointerdown', () => unlockAudio(), { once: true });

state.game = createInitialGame(createMonsterSeeded);
autoLoad(state, storageDeps);
document.querySelectorAll('.lb-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.period === getActivePeriod()));
ui.renderUI();
