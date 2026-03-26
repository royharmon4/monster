/** Runtime effects engine: audio cues, hit/death animations, and toast UX. */
const Audio = (() => {
  let ctx = null;

  function getCtx(){
    if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if(ctx.state !== 'running') ctx.resume();
    return ctx;
  }

  function master(gain=0.18){
    const g = getCtx().createGain();
    g.gain.setValueAtTime(gain, getCtx().currentTime);
    g.connect(getCtx().destination);
    return g;
  }

  function osc(type, freq, start, dur, gainVal, out){
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + start);
    g.gain.setValueAtTime(gainVal, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(out);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.01);
  }

  function noise(start, dur, gainVal, out){
    const c = getCtx();
    const bufSize = c.sampleRate * dur;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, c.currentTime + start);
    filter.Q.setValueAtTime(0.8, c.currentTime + start);
    src.connect(filter); filter.connect(g); g.connect(out);
    src.start(c.currentTime + start);
    src.stop(c.currentTime + start + dur);
  }

  return {
    unlock(){ getCtx(); },
    hit(){
      const out = master(0.16);
      osc('sine', 90, 0, 0.12, 1, out);
      osc('square', 55, 0, 0.08, 0.4, out);
      noise(0, 0.09, 0.3, out);
      osc('square', 420, 0, 0.03, 0.15, out);
    },

    crit(){
      const out = master(0.22);
      osc('sine', 60, 0, 0.18, 1, out);
      osc('sawtooth', 44, 0, 0.14, 0.5, out);
      noise(0, 0.14, 0.5, out);
      osc('sine', 520, 0.02, 0.4, 0.18, out);
      osc('sine', 528, 0.02, 0.4, 0.18, out);
      const c = getCtx();
      const sweep = c.createOscillator();
      const sg = c.createGain();
      sweep.type = 'square';
      sweep.frequency.setValueAtTime(280, c.currentTime);
      sweep.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.22);
      sg.gain.setValueAtTime(0.28, c.currentTime);
      sg.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.24);
      sweep.connect(sg); sg.connect(out);
      sweep.start(c.currentTime); sweep.stop(c.currentTime + 0.25);
    },

    death(){
      const out = master(0.2);
      const c = getCtx();
      const fall = c.createOscillator();
      const fg = c.createGain();
      fall.type = 'sawtooth';
      fall.frequency.setValueAtTime(220, c.currentTime);
      fall.frequency.exponentialRampToValueAtTime(28, c.currentTime + 1.1);
      fg.gain.setValueAtTime(0.5, c.currentTime);
      fg.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.2);
      fall.connect(fg); fg.connect(out);
      fall.start(c.currentTime); fall.stop(c.currentTime + 1.3);
      noise(0, 0.18, 0.6, out);
      osc('sine', 55, 0.1, 1.4, 0.3, out);
      osc('sine', 58, 0.1, 1.4, 0.2, out);
    },

    finalBlow(){
      const out = master(0.2);
      osc('sine', 220, 0, 0.6, 0.5, out);
      osc('sine', 330, 0.04, 0.6, 0.4, out);
      osc('sine', 440, 0.08, 0.6, 0.35, out);
      osc('sine', 880, 0.05, 0.5, 0.12, out);
      noise(0, 0.06, 0.25, out);
    },

    poke(){
      const out = master(0.14);
      osc('triangle', 240, 0, 0.08, 0.22, out);
      osc('sine', 175, 0.03, 0.18, 0.32, out);
      noise(0.02, 0.05, 0.08, out);
    }
  };
})();

export function createEffects(deps){
  const {
    dom,
    state,
    renderUI,
    normalizeKids,
    kidDefaults,
    createMonsterSeeded,
    buildMonsterArt,
    createFlinchEyes,
    renderDeadMonsterSVG,
    triggerBurnMarkAppear
  } = deps;

  function showToast(msg, tone=''){
    dom.toast.textContent=msg; dom.toast.className='toast'; if(tone) dom.toast.classList.add(tone);
    dom.toast.classList.remove('hidden');
    clearTimeout(state.toastTimer);
    state.toastTimer=setTimeout(()=>dom.toast.classList.add('hidden'),2200);
  }

  function pulseClass(el,cls,dur){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); if(dur) setTimeout(()=>el.classList.remove(cls),dur); }

  function preserveScrollPosition(renderFn){
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    renderFn();
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
  }

  function spawnDamageNumber(damage,wasCrit){
    const rect=dom.monsterArt.getBoundingClientRect();
    const x=rect.left+rect.width*(0.38+Math.random()*0.24);
    const y=rect.top+rect.height*(0.30+Math.random()*0.18);
    const el=document.createElement('div');
    el.className=`dmg-float ${wasCrit?'crit':'normal'}`;
    el.textContent=wasCrit?`${damage}!!`:`-${damage}`;
    el.style.left=`${x}px`; el.style.top=`${y}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend',()=>el.remove(),{once:true});
  }

  function spawnCritBurst(){
    const rect=dom.monsterArt.getBoundingClientRect();
    const el=document.createElement('div');
    el.className='crit-burst';
    el.style.left=`${rect.left+rect.width/2}px`;
    el.style.top=`${rect.top+rect.height*0.42}px`;
    el.innerHTML='<span class="crit-word">CRITICAL!</span><span class="crit-sub">Hit</span>';
    document.body.appendChild(el);
    el.addEventListener('animationend',()=>el.remove(),{once:true});
  }

  function spawnScreenFlash(wasCrit){
    const el=document.createElement('div');
    el.className=`screen-flash ${wasCrit?'crit':'normal'}`;
    document.body.appendChild(el);
    el.addEventListener('animationend',()=>el.remove(),{once:true});
  }

  function shakeMonster(wasCrit){
    const svg = dom.monsterArt.querySelector('svg'); if(!svg) return;
    svg.classList.remove('do-shake','do-shake-crit','do-squash','do-knockback');
    void svg.offsetWidth;
    const cls = wasCrit ? 'do-knockback' : 'do-squash';
    svg.classList.add(cls);
    svg.addEventListener('animationend', () => svg.classList.remove(cls), {once:true});
  }

  function pokeMonster(){
    const m=state.game?.monster;
    if(!m || (m.hp||0)<=0 || m.finalBlowBy) return;
    const svg = dom.monsterArt.querySelector('svg');
    if(!svg) return;
    Audio.poke();
    svg.classList.remove('do-poke');
    void svg.offsetWidth;
    svg.classList.add('do-poke');
    svg.addEventListener('animationend', () => svg.classList.remove('do-poke'), {once:true});
  }

  function tiltPage(wasCrit){
    const el = document.getElementById('app');
    el.classList.remove('page-tilt','page-shake');
    void el.offsetWidth;
    el.classList.add(wasCrit ? 'page-shake' : 'page-tilt');
    el.addEventListener('animationend', () => el.classList.remove('page-tilt','page-shake'), {once:true});
  }

  function spawnImpactLines(){
    const rect = dom.monsterArt.getBoundingClientRect();
    const cx = rect.left + rect.width  * 0.5;
    const cy = rect.top  + rect.height * 0.42;
    const el = document.createElement('div');
    el.className = 'impact-lines';
    el.style.left = `${cx}px`;
    el.style.top  = `${cy}px`;
    const lines = Array.from({length:10}, (_,i) => {
      const angle = (i / 10) * Math.PI * 2;
      const inner = 52, outer = 88 + Math.random() * 28;
      return `<line x1="${Math.cos(angle)*inner}" y1="${Math.sin(angle)*inner}" x2="${Math.cos(angle)*outer}" y2="${Math.sin(angle)*outer}" stroke="#ffd166" stroke-width="${2.5 + Math.random()*2}" stroke-linecap="round" opacity="${0.7 + Math.random()*0.3}"/>`;
    }).join('');
    el.innerHTML = `<svg width="220" height="220" viewBox="-110 -110 220 220">${lines}</svg>`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), {once:true});
  }

  function flashMonsterArt(wasCrit){
    const cls=wasCrit?'do-flash-art-crit':'do-flash-art';
    dom.monsterArt.classList.remove('do-flash-art','do-flash-art-crit'); void dom.monsterArt.offsetWidth;
    dom.monsterArt.classList.add(cls);
    setTimeout(()=>dom.monsterArt.classList.remove(cls),480);
  }

  function flinchMonster(){
    const m = state.game?.monster; if(!m) return;
    const art = m.art || buildMonsterArt(m.seed ?? 0, m.themeKey);
    const svg = dom.monsterArt.querySelector('svg'); if(!svg) return;

    const eyeGroup = svg.querySelector('g[data-eyes]');
    if(!eyeGroup) return;
    const original = eyeGroup.innerHTML;
    eyeGroup.innerHTML = createFlinchEyes(art.palette);
    setTimeout(() => { eyeGroup.innerHTML = original; }, 220);
  }

  function rippleHitBtn(){
    const btn=document.getElementById('hitBtn'); if(!btn) return;
    btn.classList.remove('do-ripple');
    void btn.offsetWidth;
    btn.classList.add('do-ripple');
    btn.addEventListener('animationend', function handler(){
      btn.classList.remove('do-ripple');
      btn.removeEventListener('animationend', handler);
    }, {once:true});
  }

  function launchGrenadeProjectile(){
    const hitBtn=document.getElementById('hitBtn');
    const targetSvg=dom.monsterArt.querySelector('svg');
    if(!hitBtn || !targetSvg){
      return Promise.resolve();
    }

    const btnRect=hitBtn.getBoundingClientRect();
    const monsterRect=dom.monsterArt.getBoundingClientRect();
    const startX=btnRect.left + btnRect.width / 2;
    const startY=btnRect.top + btnRect.height / 2;
    const endX=monsterRect.left + monsterRect.width * 0.52;
    const endY=monsterRect.top + monsterRect.height * 0.52;
    const grenade=document.createElement('div');
    grenade.className='grenade-projectile';
    grenade.style.left='0px';
    grenade.style.top='0px';
    grenade.style.setProperty('--start-x', `${startX}px`);
    grenade.style.setProperty('--start-y', `${startY}px`);
    grenade.style.setProperty('--delta-x', `${endX - startX}px`);
    grenade.style.setProperty('--delta-y', `${endY - startY}px`);
    document.body.appendChild(grenade);

    return new Promise(resolve => {
      grenade.addEventListener('animationend', ()=>{
        grenade.remove();
        spawnGrenadeExplosion(endX, endY);
        resolve();
      }, {once:true});
    });
  }

  function spawnGrenadeExplosion(x,y){
    const blast=document.createElement('div');
    blast.className='grenade-explosion';
    blast.style.left=`${x}px`;
    blast.style.top=`${y}px`;
    document.body.appendChild(blast);
    blast.addEventListener('animationend',()=>blast.remove(),{once:true});

    for(let i=0;i<18;i++){
      const ember=document.createElement('div');
      ember.className='ember-particle';
      const angle=(i/18)*Math.PI*2 + (Math.random()-0.5)*0.35;
      const distance=24 + Math.random()*68;
      ember.style.left=`${x}px`;
      ember.style.top=`${y}px`;
      ember.style.setProperty('--tx', `${Math.cos(angle)*distance}px`);
      ember.style.setProperty('--ty', `${Math.sin(angle)*distance - 12}px`);
      ember.style.setProperty('--dur', `${650 + Math.random()*300}ms`);
      document.body.appendChild(ember);
      ember.addEventListener('animationend',()=>ember.remove(),{once:true});
    }

    triggerBurnMarkAppear();
  }

  function playHitEffects(damage, wasCrit, moveKey){
    const runImpactEffects = () => {
      wasCrit ? Audio.crit() : Audio.hit();
      spawnScreenFlash(wasCrit);
      shakeMonster(wasCrit);
      flashMonsterArt(wasCrit);
      tiltPage(wasCrit);
      flinchMonster();
      const hpFill = document.getElementById('monsterHpFill');
      if(hpFill) pulseClass(hpFill, 'do-flash', 280);
      setTimeout(() => spawnDamageNumber(damage, wasCrit), 55);
      if(wasCrit){
        setTimeout(() => spawnCritBurst(),    110);
        setTimeout(() => spawnImpactLines(),  140);
      }
    };

    if(moveKey === 'grenade'){
      rippleHitBtn();
      launchGrenadeProjectile().then(runImpactEffects);
      return;
    }

    rippleHitBtn();
    runImpactEffects();
  }
  function spawnShockwave(){
    const rect=dom.monsterArt.getBoundingClientRect();
    const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
    const size=Math.max(rect.width,rect.height)*0.6;
    for(let i=0;i<3;i++){
      const el=document.createElement('div');
      el.className='shockwave';
      el.style.cssText=`left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;animation-delay:${i*120}ms;`;
      document.body.appendChild(el);
      el.addEventListener('animationend',()=>el.remove(),{once:true});
    }
  }

  function spawnDeathParticles(color){
    const rect=dom.monsterArt.getBoundingClientRect();
    const cx=rect.left+rect.width/2, cy=rect.top+rect.height*0.45;
    const colors=[color,'#fff','#ffd166','#ff6f7f','#8ef2cf','#7c8cff'];
    for(let i=0;i<32;i++){
      const angle=(i/32)*Math.PI*2+(Math.random()-0.5)*0.4;
      const speed=80+Math.random()*180;
      const tx=Math.cos(angle)*speed, ty=Math.sin(angle)*speed-60;
      const sz=6+Math.random()*14, dur=500+Math.random()*400;
      const c=colors[Math.floor(Math.random()*colors.length)];
      const el=document.createElement('div');
      el.className='burst-particle';
      el.style.cssText=`left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;background:${c};--tx:${tx}px;--ty:${ty}px;--dur:${dur}ms;animation-delay:${Math.random()*120}ms;box-shadow:0 0 ${sz}px ${c};`;
      document.body.appendChild(el);
      el.addEventListener('animationend',()=>el.remove(),{once:true});
    }
  }

  function spawnDeathStamp(){
    const rect=dom.monsterArt.getBoundingClientRect();
    const el=document.createElement('div');
    el.className='death-stamp';
    el.textContent='DEFEATED';
    el.style.left=`${rect.left+rect.width/2}px`;
    el.style.top=`${rect.top+rect.height/2}px`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1800);
  }

  function spawnVignette(dur){
    const el=document.createElement('div');
    el.className='death-vignette';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),dur);
  }

  function showVictoryModal(kid){
    const existing=document.getElementById('victoryBanner');
    if(existing) existing.remove();
    const banner=document.createElement('div');
    banner.id='victoryBanner';
    banner.className='victory-banner';
    const m=state.game?.monster;
    banner.innerHTML=`
      <div class="victory-inner">
        <div class="victory-trophy">🏆</div>
        <p class="eyebrow victory-eyebrow-spacing">Monster defeated!</p>
        <h2>${m?.name??'The boss'} has fallen!</h2>
        <p class="v-line"><span class="v-hero">${kid.name}</span> delivers the killing blow for <span class="v-dmg">${kid.monsterDamage} total damage</span>.</p>
        <div class="victory-actions">
          <button id="vNewBtn" type="button">⚔️ Next monster</button>
        </div>
      </div>`;
    document.getElementById('app').appendChild(banner);
    document.getElementById('vNewBtn').addEventListener('click',()=>{
      banner.remove();
      state.game={
        ...state.game,
        monster:createMonsterSeeded(),
        kids:normalizeKids(state.game?.kids??kidDefaults).map(k=>({...k,monsterDamage:0})),
        battleLog:[]
      };
      state.selectedKidId=null; state.selectedMoveKey=null;
      dom.monsterArt.classList.remove('is-dead','hurt','badly-hurt','tier-2','tier-3','tier-4','tier-5');
      renderUI();
    });
  }

  function spawnTapToContinue(kid){
    const el=document.createElement('div');
    el.className='tap-continue';
    el.innerHTML='<span>Tap to continue</span>';
    document.body.appendChild(el);
    el.addEventListener('click',()=>{ el.remove(); showVictoryModal(kid); },{once:true});
  }

  function jelloPage(){
    const el=document.getElementById('app');
    el.classList.remove('page-jello');
    void el.offsetWidth;
    el.classList.add('page-jello');
    el.addEventListener('animationend',()=>el.classList.remove('page-jello'),{once:true});
  }

  function spawnConfetti(){
    const colors=['#ffd166','#ff6f7f','#8ef2cf','#7c8cff','#fff','#ff8a5b','#a78bfa'];
    const shapes=[
      { w:'10px', h:'14px', br:'2px' },
      { w:'12px', h:'8px',  br:'1px' },
      { w:'8px',  h:'8px',  br:'50%' },
      { w:'14px', h:'6px',  br:'3px' }
    ];
    const count=72;

    for(let i=0;i<count;i++){
      const fromLeft=i<count/2;
      const shape=shapes[Math.floor(Math.random()*shapes.length)];
      const color=colors[Math.floor(Math.random()*colors.length)];
      const startX=fromLeft
        ? -(20+Math.random()*40)
        : window.innerWidth+20+Math.random()*40;
      const startY=window.innerHeight*(0.1+Math.random()*0.4);
      const spreadX=(fromLeft?1:-1)*(120+Math.random()*320);
      const spreadY=-(80+Math.random()*260);
      const dur=900+Math.random()*600;
      const r0=Math.random()*360;

      const el=document.createElement('div');
      el.className='confetti-piece';
      el.style.left=`${startX}px`;
      el.style.top=`${startY}px`;
      el.style.setProperty('--w',shape.w);
      el.style.setProperty('--h',shape.h);
      el.style.setProperty('--br',shape.br);
      el.style.setProperty('--color',color);
      el.style.setProperty('--dur',`${dur}ms`);
      el.style.setProperty('--r0',`${r0}deg`);
      el.style.setProperty('--tx25',`${spreadX*0.3}px`);
      el.style.setProperty('--ty25',`${spreadY*0.4}px`);
      el.style.setProperty('--r25',`${r0+90}deg`);
      el.style.setProperty('--tx60',`${spreadX*0.7}px`);
      el.style.setProperty('--ty60',`${spreadY*0.85}px`);
      el.style.setProperty('--r60',`${r0+200}deg`);
      el.style.setProperty('--tx',`${spreadX}px`);
      el.style.setProperty('--ty',`${spreadY+180}px`);
      el.style.setProperty('--rf',`${r0+360+Math.random()*180}deg`);
      el.style.animationDelay=`${Math.random()*180}ms`;
      document.body.appendChild(el);
      el.addEventListener('animationend',()=>el.remove(),{once:true});
    }
  }

  function playDeathSequence(kid){
    const color=state.game?.monster?.art?.palette?.body??'#7c8cff';
    const svg=dom.monsterArt.querySelector('svg');

    if(svg){
      svg.classList.remove('do-squash','do-knockback','do-pre-death');
      void svg.offsetWidth;
      svg.classList.add('do-pre-death');
    }

    setTimeout(()=>{
      dom.monsterArt.classList.remove('is-breathing');

      dom.monsterArt.classList.add('is-dead');
      dom.monsterArt.innerHTML=renderDeadMonsterSVG(state.game.monster);

      const flash=document.createElement('div');
      flash.style.cssText='position:fixed;inset:0;background:white;z-index:250;pointer-events:none;animation:sFlash 300ms ease forwards;';
      document.body.appendChild(flash);
      flash.addEventListener('animationend',()=>flash.remove(),{once:true});
      Audio.death();

      const seq=[
        [80,  ()=>spawnShockwave()],
        [160, ()=>spawnDeathParticles(color)],
        [260, ()=>{ spawnVignette(1500); jelloPage(); }],
        [420, ()=>spawnDeathStamp()],
        [600, ()=>spawnConfetti()],
        [900, ()=>spawnTapToContinue(kid)],
      ];
      seq.forEach(([t,fn])=>setTimeout(fn,t));

    },300);
  }

  return {
    showToast,
    preserveScrollPosition,
    pokeMonster,
    playHitEffects,
    playDeathSequence,
    unlockAudio: Audio.unlock,
    playFinalBlow: Audio.finalBlow
  };
}
