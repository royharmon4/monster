/* ── Render ── */
function createBurnMarkOverlay(){
  return `<div id="burnMarkOverlay" class="burn-mark-overlay" aria-hidden="true">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <radialGradient id="burnGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="rgba(12,8,7,0.9)"/>
          <stop offset="35%"  stop-color="rgba(50,24,18,0.72)"/>
          <stop offset="65%"  stop-color="rgba(255,120,64,0.28)"/>
          <stop offset="100%" stop-color="rgba(255,120,64,0)"/>
        </radialGradient>
        <filter id="burnBlur"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#burnGrad)" filter="url(#burnBlur)" opacity="0.82"/>
    </svg>
  </div>`;
}

export function createUIRenderer(deps) {
  const {
    dom,
    state,
    themes,
    moveDefs,
    kidDefaults,
    normalizeKids,
    getKidById,
    getMonsterLeaders,
    renderMonsterSVG,
    autoSave,
    getLeaderboardStats,
    onSelectKid,
    onSelectMove,
    onBackFromMove,
    onHit,
    onFinalBlow
  } = deps;

  function positionBurnMark() {
    const overlay = dom.monsterArt.querySelector('#burnMarkOverlay');
    if (!overlay) return;
    const m = state.game?.monster;

    if (!m?.burned || dom.monsterArt.classList.contains('is-dead')) {
      overlay.style.display = 'none';
      return;
    }

    overlay.style.display = 'block';
  }

  function triggerBurnMarkAppear() {
    const overlay = dom.monsterArt.querySelector('#burnMarkOverlay');
    if (!overlay) return;
    overlay.style.animation = 'none';
    void overlay.offsetWidth;
    overlay.style.animation = 'burnMarkReveal 650ms ease forwards';
  }

  function renderMonster(){
    const m=state.game?.monster; if(!m||dom.monsterArt.classList.contains('is-dead')) return;
    const pct=Math.max(0,Math.min(100,(m.hp/m.maxHp)*100));
    dom.monsterName.textContent=m.name;
    dom.monsterThemePill.textContent=themes[m.themeKey]?.label??m.themeKey;
    dom.monsterArt.innerHTML=`${createBurnMarkOverlay()}${renderMonsterSVG(m,pct)}`;
    dom.monsterHpText.textContent=`${m.hp} / ${m.maxHp}`;
    dom.monsterHpFill.style.width=`${pct}%`;
    dom.monsterHpFill.classList.toggle('low', pct<30);
    // Visual damage state on the art box
    dom.monsterArt.classList.toggle('tier-2', pct <= 80 && pct > 60);
    dom.monsterArt.classList.toggle('tier-3', pct <= 60 && pct > 40);
    dom.monsterArt.classList.toggle('tier-4', pct <= 40 && pct > 20);
    dom.monsterArt.classList.toggle('tier-5', pct <= 20 && pct > 0);
    dom.monsterArt.classList.add('is-breathing');
    // keep hurt/badly-hurt for backwards compat with existing animation classes
    dom.monsterArt.classList.toggle('hurt',       pct <= 80 && pct > 40);
    dom.monsterArt.classList.toggle('badly-hurt', pct <= 40 && pct > 0);
    dom.monsterArt.classList.toggle('is-pokeable', (m.hp||0) > 0 && !m.finalBlowBy);
  }

  function renderFinalBlowPanel(){
    const m=state.game?.monster; if(!m) return;
    if((m.hp||0)>0){ dom.finalBlowPanel.classList.add('hidden'); dom.finalBlowPanel.innerHTML=''; return; }

    const leaders=getMonsterLeaders(state.game, normalizeKids, getKidById);

    if(m.finalBlowBy){
      const winner=getKidById(m.finalBlowBy);
      dom.finalBlowPanel.classList.remove('hidden');
      dom.finalBlowPanel.innerHTML=`<h3>${winner?.name||'A hero'} delivered the final blow.</h3>`;
      return;
    }

    dom.finalBlowPanel.classList.remove('hidden');
    dom.finalBlowPanel.innerHTML=`
      <div class="final-blow-buttons">
        ${leaders.length?leaders.map(kid=>`<button class="final-blow-btn" data-final-kid-id="${kid.id}" type="button">${kid.name} delivers final blow</button>`).join('')
          :'<button class="final-blow-btn" disabled>No eligible kid yet</button>'}
    </div>`;

    dom.finalBlowPanel.querySelectorAll('[data-final-kid-id]').forEach(btn=>{
      if(!btn.dataset.finalKidId) return;
      btn.addEventListener('click',()=>onFinalBlow(btn.dataset.finalKidId));
    });
  }

  function renderKidButtons(){
    const kids=state.game?.kids??[];
    dom.kidButtons.innerHTML=kids.map(kid=>`
      <button class="kid-btn ${state.selectedKidId===kid.id?'selected':''}" data-kid-id="${kid.id}" type="button">
        <strong>${kid.name}</strong>
      </button>`).join('');
    dom.kidButtons.querySelectorAll('[data-kid-id]').forEach(btn=>{
      btn.addEventListener('click',()=>onSelectKid(btn.dataset.kidId));
    });
  }

  function renderMovePanel(){
    const kid=getKidById(state.selectedKidId);
    const m=state.game?.monster;
    if(!kid){ dom.movePanel.innerHTML=''; return; }

    if(m?.finalBlowBy){
      const winner=getKidById(m.finalBlowBy);
      dom.movePanel.innerHTML=`<div class="card"><h3>${winner?.name||'A hero'} landed the final blow.</h3></div>`;
      return;
    }

    if((m?.hp||0)<=0){
      const leaders=getMonsterLeaders(state.game, normalizeKids, getKidById);
      const txt=leaders.length===1?`${leaders[0].name} earned the final blow.`:leaders.length>1?`${leaders.map(l=>l.name).join(' and ')} are tied.`:'';
      dom.movePanel.innerHTML=txt?`<div class="card"><p class="muted">${txt}</p></div>`:'';
      return;
    }

    if(!state.selectedMoveKey){
      dom.movePanel.innerHTML=`
        <div class="move-grid">
          ${Object.entries(moveDefs).map(([key,move])=>`
            <button class="move-btn ${key==='grenade'?'grenade':''}" data-move-key="${key}" type="button">
              <span>${move.label}</span>
              <small>${move.baseDamage} base · ${Math.round(move.critChance*100)}% crit</small>
            </button>`).join('')}
        </div>`;
      dom.movePanel.querySelectorAll('[data-move-key]').forEach(btn=>{
        btn.addEventListener('click',()=>onSelectMove(btn.dataset.moveKey));
      });
      return;
    }

    dom.movePanel.innerHTML=`
      <div class="hit-panel">
        <button id="hitBtn" class="hit-btn" type="button">HIT</button>
        <div class="row gap-sm"><button id="backBtn" class="ghost" type="button">← Back</button></div>
      </div>`;
    document.getElementById('hitBtn').addEventListener('click', onHit);
    document.getElementById('backBtn').addEventListener('click', onBackFromMove);
  }

  /* === Leaderboard: period filtering + stat aggregation === */
  function renderLeaderboard() {
    const stats = getLeaderboardStats(state.game, normalizeKids);
    const kids = kidDefaults.map(k => {
      const saved = stats[k.name] || { kills:0, damage:0 };
      return {
        name: k.name,
        kills: saved.kills || 0,
        damage: saved.damage || 0,
      };
    }).sort((a, b) => b.damage - a.damage);
    const topKills = Math.max(0, ...kids.map(k => k.kills));
    dom.leaderboard.innerHTML = kids.map(kid => `
      <div class="leaderboard-card">
        <strong>${kid.name}</strong>
        <div class="score-row">
          <span class="score-chip" title="Total damage">📊 ${kid.damage}</span>
          <span class="score-chip ${kid.kills===topKills&&topKills>0?'score-chip-kills':''}" title="Kills">💀 ${kid.kills}</span>
        </div>
      </div>`).join('');
  }

  function renderUI(){
    dom.appTitle.textContent=state.game?.title??'Boss Battle';
    renderMonster(); renderFinalBlowPanel(); renderKidButtons(); renderMovePanel(); renderLeaderboard();
    autoSave(state);
    positionBurnMark();
  }

  return {
    renderMonster,
    renderFinalBlowPanel,
    renderKidButtons,
    renderMovePanel,
    renderLeaderboard,
    renderUI,
    positionBurnMark,
    triggerBurnMarkAppear
  };
}
