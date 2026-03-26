/** Battle domain logic: damage resolution, final blow rules, and reset flows. */
export function getMonsterLeaderIds(game, normalizeKids){
  const kids=normalizeKids(game?.kids||[]);
  const high=Math.max(0,...kids.map(k=>Number(k.monsterDamage||0)));
  if(high<=0) return [];
  const tied=kids.filter(k=>Number(k.monsterDamage||0)===high).map(k=>k.id);
  if(tied.length===1) return tied;
  // Break tie: walk log oldest-first, whoever accumulated to `high` first wins
  const log=[...(game?.battleLog||[])].reverse();
  const running={};
  for(const entry of log){
    if(!tied.includes(entry.kidId)) continue;
    running[entry.kidId]=(running[entry.kidId]||0)+entry.damage;
    if(running[entry.kidId]>=high) return [entry.kidId];
  }
  return [tied[0]]; // fallback
}

export function getMonsterLeaders(game, normalizeKids, getKidById){
  const ids=getMonsterLeaderIds(game, normalizeKids);
  return ids.map(id=>getKidById(id)||normalizeKids(game?.kids||[]).find(k=>k.id===id)).filter(Boolean);
}

export function createBattleController(deps){
  const {
    state,
    moveDefs,
    kidDefaults,
    normalizeKids,
    createMonsterSeeded,
    getKidById,
    showToast,
    renderUI,
    preserveScrollPosition,
    playHitEffects,
    recordStatsForKids,
    resetPersistedStats,
    onFinalBlowResolved,
    onResetBattle
  } = deps;

  function handleHit(){
    const kid=getKidById(state.selectedKidId);
    const move=moveDefs[state.selectedMoveKey];
    const m=state.game?.monster;
    if(!kid||!move) return;
    if(m?.finalBlowBy){ showToast('That fight is finished. Start the next monster.','warning'); return; }
    if((m?.hp||0)<=0){ showToast('Boss is down. Use the final blow button.','warning'); return; }

    const wasCrit=Math.random()<move.critChance;
    const rolledDamage=move.baseDamage+(wasCrit?move.critBonus:0);
    const damage=Math.min(rolledDamage, m.hp);
    const nextHp=Math.max(0,m.hp-damage);

    playHitEffects(damage,wasCrit,state.selectedMoveKey);

    state.game={
      ...state.game,
      monster:{...m,hp:nextHp,burned: state.selectedMoveKey==='grenade' ? true : Boolean(m.burned)},
      kids:state.game.kids.map(k=>k.id===kid.id?{...k,damage:k.damage+damage,monsterDamage:(k.monsterDamage||0)+damage}:{...k}),
      battleLog:[{kidId:kid.id,kidName:kid.name,moveKey:state.selectedMoveKey,moveLabel:move.label,damage,wasCrit,at:new Date().toISOString()},...(state.game.battleLog||[])].slice(0,24)
    };

    state.selectedKidId=null; state.selectedMoveKey=null;
    preserveScrollPosition(() => renderUI());
    if(nextHp<=0) showToast('Boss is down. Final blow is ready.','success');
  }

  function deliverFinalBlow(kidId){
    const kid=getKidById(kidId); if(!kid) return;
    const m=state.game?.monster;
    if((m?.hp||0)>0){ showToast('The boss is not down yet.','warning'); return; }
    if(m?.finalBlowBy){ showToast('Final blow already delivered.','warning'); return; }
    const leaderIds=getMonsterLeaderIds(state.game, normalizeKids);
    if(!leaderIds.includes(kidId)){ showToast('That kid did not lead on this monster.','warning'); return; }

    state.game={
      ...state.game,
      monster:{...m,finalBlowBy:kidId,finalBlowAt:new Date().toISOString()},
      kids:state.game.kids.map(k=>k.id===kidId?{...k,kills:(k.kills||0)+1}:{...k})
    };
    recordStatsForKids(kid.name, state.game.kids, state);
    renderUI();
    const w = getKidById(kidId);
    showToast(`${w?.name || 'A hero'} delivered the final blow!`, 'success');
    onFinalBlowResolved?.(kid);
  }

  function healMonster(amount=5){
    const m=state.game?.monster; if(!m) return;
    if(m.finalBlowBy){ showToast('That fight is finished. Spawn a new monster.','warning'); return; }
    state.game={...state.game,monster:{...m,hp:Math.min(m.maxHp,m.hp+amount)}};
    renderUI(); showToast(`Boss healed for ${amount}.`);
  }

  function resetBattle(){
    state.game = {
      ...state.game,
      monster: createMonsterSeeded(),
      kids: normalizeKids(state.game?.kids ?? kidDefaults).map(k => ({...k, monsterDamage: 0})),
      battleLog: []
    };
    state.selectedKidId = null;
    state.selectedMoveKey = null;
    onResetBattle?.();
    renderUI();
  }

  function resetScores(){
    resetPersistedStats();
    if (state.game) {
      state.game = {
        ...state.game,
        kids: kidDefaults.map(def => ({
          ...def,
          damage: 0,
          monsterDamage: 0,
          kills: 0
        })),
        battleLog: []
      };
    }
    state.selectedKidId = null;
    state.selectedMoveKey = null;
    renderUI();
    showToast('Scores reset.', 'success');
  }

  return { handleHit, deliverFinalBlow, healMonster, resetBattle, resetScores };
}
