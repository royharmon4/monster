/* === Monster generation: RNG helpers + procedural monster builders === */
/* ── RNG ── */
export const THEMES = {
  morning:   { label:'Morning',   flavor:'Weak to getting ready without drama.',           hue:[35,65],   prefixes:['Snooze','Toothbrush','Pajama','Latebell','Alarm','Breakfast','Backpack','Sock'],  types:['Goblin','Troll','Hydra','Wraith','Ogre','Slime'] },
  chores:    { label:'Chores',    flavor:'Weak to ownership, cleanup, and follow-through.', hue:[170,215], prefixes:['Clutter','Dust','Trash','Sock','Laundry','Crumb','Mess','Mop'],                types:['Golem','Beast','Dragon','Troll','Slime','Ogre'] },
  kindness:  { label:'Kindness',  flavor:'Weak to sibling kindness and respectful words.',  hue:[300,340], prefixes:['Whine','Snarl','Bicker','Grumble','Sulk','Snap','Nudge','Huff'],               types:['Wraith','Goblin','Hydra','Ogre','Gremlin','Beast'] },
  listening: { label:'Listening', flavor:'Weak to first-time listening and fast obedience.',hue:[215,255], prefixes:['Stall','Delay','Nope','Mumble','Echo','Detour','Shrug','Waitasec'],            types:['Goblin','Slime','Ogre','Imp','Wraith','Troll'] }
};

export function mulberry32(a){ return ()=>{ let t=(a+=0x6D2B79F5); t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return((t^(t>>>14))>>>0)/4294967296; }; }
export function pick(list,rng){ return list[Math.floor(rng()*list.length)]; }
export function randRange(rng,min,max){ return min + (max-min)*rng(); }
export function hsl(h,s,l){ return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`; }
export function fmt(num){ return Number(num).toFixed(1).replace(/\.0$/, ''); }

export function buildPalette(theme, rng){
  const [hueMin, hueMax]=theme.hue;
  const hue=randRange(rng,hueMin,hueMax);
  return {
    body:hsl(hue, randRange(rng,55,78), randRange(rng,48,60)),
    accent:hsl((hue + randRange(rng,-18,18) + 360) % 360, randRange(rng,72,90), randRange(rng,78,90)),
    dark:hsl((hue + randRange(rng,-10,10) + 360) % 360, randRange(rng,26,42), randRange(rng,16,24)),
    extra:hsl((hue + randRange(rng,18,42)) % 360, randRange(rng,60,86), randRange(rng,52,68)),
    shadow:hsl((hue + randRange(rng,-8,8) + 360) % 360, randRange(rng,30,44), randRange(rng,10,16))
  };
}

export function createBodyPath(rng){
  const topY=fmt(randRange(rng,74,92));
  const rightShoulderX=fmt(randRange(rng,218,244));
  const leftShoulderX=fmt(320-Number(rightShoulderX));
  const bellyY=fmt(randRange(rng,184,212));
  const bottomY=fmt(randRange(rng,270,286));
  const waist=fmt(randRange(rng,48,74));
  const shoulderCurve=randRange(rng,28,50);
  return `<path d="M160 ${topY} C ${fmt(160+shoulderCurve)} ${topY}, ${rightShoulderX} ${fmt(Number(topY)+18)}, ${rightShoulderX} ${fmt(Number(topY)+62)} C ${fmt(randRange(rng,248,270))} ${bellyY}, ${fmt(160+Number(waist))} ${bottomY}, 160 ${bottomY} C ${fmt(160-Number(waist))} ${bottomY}, ${fmt(randRange(rng,50,72))} ${bellyY}, ${leftShoulderX} ${fmt(Number(topY)+62)} C ${leftShoulderX} ${fmt(Number(topY)+18)}, ${fmt(160-shoulderCurve)} ${topY}, 160 ${topY} Z"/>`;
}

export function createEyes(rng,p){
  const y=fmt(randRange(rng,144,166));
  const spacing=randRange(rng,30,40);
  const left=fmt(160-spacing), right=fmt(160+spacing);
  const eyeStyle=Math.floor(rng()*4);
  if(eyeStyle===0) return `<g fill="${p.dark}"><ellipse cx="${left}" cy="${y}" rx="${fmt(randRange(rng,10,15))}" ry="${fmt(randRange(rng,8,12))}"/><ellipse cx="${right}" cy="${y}" rx="${fmt(randRange(rng,10,15))}" ry="${fmt(randRange(rng,8,12))}"/></g><g fill="${p.accent}"><circle cx="${fmt(Number(left)+randRange(rng,2,4))}" cy="${fmt(Number(y)-randRange(rng,1,3))}" r="${fmt(randRange(rng,2.5,4))}"/><circle cx="${fmt(Number(right)+randRange(rng,2,4))}" cy="${fmt(Number(y)-randRange(rng,1,3))}" r="${fmt(randRange(rng,2.5,4))}"/></g>`;
  if(eyeStyle===1) return `<g stroke="${p.dark}" stroke-width="${fmt(randRange(rng,6,10))}" stroke-linecap="round"><path d="M${fmt(Number(left)-12)} ${y} h${fmt(randRange(rng,22,34))}"/><path d="M${fmt(Number(right)-12)} ${y} h${fmt(randRange(rng,22,34))}"/></g>`;
  if(eyeStyle===2) return `<g fill="${p.dark}"><path d="M${fmt(Number(left)-14)} ${fmt(Number(y)+1)} q14 -${fmt(randRange(rng,12,18))} 28 0 q-14 ${fmt(randRange(rng,8,14))} -28 0Z"/><path d="M${fmt(Number(right)-14)} ${fmt(Number(y)+1)} q14 -${fmt(randRange(rng,12,18))} 28 0 q-14 ${fmt(randRange(rng,8,14))} -28 0Z"/></g><g fill="${p.accent}"><circle cx="${left}" cy="${fmt(Number(y)-2)}" r="${fmt(randRange(rng,2.5,4))}"/><circle cx="${right}" cy="${fmt(Number(y)-2)}" r="${fmt(randRange(rng,2.5,4))}"/></g>`;
  return `<g fill="${p.dark}" stroke="${p.accent}" stroke-width="2"><circle cx="${left}" cy="${y}" r="${fmt(randRange(rng,8,11))}"/><circle cx="${right}" cy="${y}" r="${fmt(randRange(rng,8,11))}"/></g><g fill="${p.accent}"><circle cx="${left}" cy="${y}" r="${fmt(randRange(rng,2,3.5))}"/><circle cx="${right}" cy="${y}" r="${fmt(randRange(rng,2,3.5))}"/></g>`;
}

export function createFlinchEyes(p){
  // Eyes squeeze shut — thick horizontal lines with a downward crunch
  const stroke = `stroke="${p.dark}" stroke-width="9" stroke-linecap="round"`;
  return `<g ${stroke} fill="none">
    <path d="M118 154 q10 -10 22 0"/>
    <path d="M180 154 q10 -10 22 0"/>
  </g>`;
}

export function createRageEyes(rng, p){
  // Small, narrowed — heavy brow line angled inward
  const y = fmt(randRange(rng, 152, 162));
  const spacing = randRange(rng, 28, 36);
  const left = fmt(160 - spacing), right = fmt(160 + spacing);
  return `
    <g fill="${p.dark}">
      <ellipse cx="${left}"  cy="${y}" rx="${fmt(randRange(rng,7,10))}" ry="${fmt(randRange(rng,5,7))}"/>
      <ellipse cx="${right}" cy="${y}" rx="${fmt(randRange(rng,7,10))}" ry="${fmt(randRange(rng,5,7))}"/>
    </g>
    <g fill="${p.accent}">
      <circle cx="${fmt(Number(left)+2)}"  cy="${fmt(Number(y)-1)}" r="${fmt(randRange(rng,2,3))}"/>
      <circle cx="${fmt(Number(right)+2)}" cy="${fmt(Number(y)-1)}" r="${fmt(randRange(rng,2,3))}"/>
    </g>
    <g stroke="${p.dark}" stroke-width="8" stroke-linecap="round" fill="none">
      <path d="M${fmt(Number(left)-14)} ${fmt(Number(y)-10)} l28 6"/>
      <path d="M${fmt(Number(right)+14)} ${fmt(Number(y)-10)} l-28 6"/>
    </g>`;
}

export function createMouth(rng,p){
  const y=randRange(rng,202,222);
  const width=randRange(rng,46,72);
  const style=Math.floor(rng()*4);
  if(style===0) return `<path d="M${fmt(160-width/2)} ${fmt(y)} q${fmt(width/2)} ${fmt(randRange(rng,16,28))} ${fmt(width)} 0" stroke="${p.dark}" stroke-width="${fmt(randRange(rng,7,10))}" stroke-linecap="round" fill="none"/>`;
  if(style===1) return `<ellipse cx="160" cy="${fmt(y)}" rx="${fmt(width/2)}" ry="${fmt(randRange(rng,10,18))}" fill="${p.dark}"/><path d="M${fmt(160-width/3)} ${fmt(y)} q${fmt(width/3)} ${fmt(randRange(rng,8,14))} ${fmt(2*width/3)} 0" stroke="${p.accent}" stroke-width="3" fill="none" opacity="0.55"/>`;
  if(style===2) return `<g stroke="${p.dark}" stroke-width="${fmt(randRange(rng,8,12))}" stroke-linecap="round"><path d="M${fmt(160-width/2)} ${fmt(y)} h${fmt(width)}"/><path d="M${fmt(160-width/4)} ${fmt(y+10)} h${fmt(width/2)}" opacity="0.55"/></g>`;
  return `<path d="M${fmt(160-width/2)} ${fmt(y)} c${fmt(width*0.18)} ${fmt(randRange(rng,14,20))} ${fmt(width*0.32)} ${fmt(randRange(rng,18,24))} ${fmt(width/2)} ${fmt(randRange(rng,18,24))} c${fmt(width*0.18)} 0 ${fmt(width*0.32)} -${fmt(randRange(rng,8,16))} ${fmt(width/2)} -${fmt(randRange(rng,18,24))}" stroke="${p.dark}" stroke-width="${fmt(randRange(rng,7,10))}" fill="none" stroke-linecap="round"/>`;
}

export function createSnarlMouth(rng, p){
  // Wide jagged mouth — wider than normal, corners pulled down
  const y   = randRange(rng, 208, 220);
  const w   = randRange(rng, 58, 78);
  const jag = fmt(randRange(rng, 8, 14));
  return `
    <path d="M${fmt(160-w/2)} ${fmt(y)}
      q${fmt(w*0.15)} ${fmt(randRange(rng,10,16))} ${fmt(w*0.3)} ${jag}
      l${fmt(w*0.1)} -${fmt(randRange(rng,4,8))}
      l${fmt(w*0.1)} ${fmt(randRange(rng,6,10))}
      l${fmt(w*0.1)} -${fmt(randRange(rng,3,7))}
      q${fmt(w*0.15)} ${fmt(randRange(rng,4,8))} ${fmt(w*0.2)} ${jag}
      q-${fmt(w*0.2)} -${fmt(randRange(rng,4,8))} -${fmt(w*0.5)} 0
      Z"
      fill="${p.dark}" stroke="${p.dark}" stroke-width="2" stroke-linejoin="round"/>
    <g stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.5">
      <path d="M${fmt(160-w*0.28)} ${fmt(y+6)} l${fmt(w*0.06)} ${fmt(randRange(rng,8,12))}"/>
      <path d="M${fmt(160)}         ${fmt(y+4)} l${fmt(w*0.04)} ${fmt(randRange(rng,10,14))}"/>
      <path d="M${fmt(160+w*0.22)} ${fmt(y+6)} l${fmt(w*0.06)} ${fmt(randRange(rng,8,12))}"/>
    </g>`;
}

export function createHorns(rng,p){
  const style=Math.floor(rng()*4);
  if(style===0) return '';
  if(style===1) return `<g fill="${p.shadow}"><path d="M118 102 c-18 -${fmt(randRange(rng,24,38))} -8 -${fmt(randRange(rng,48,64))} 12 -${fmt(randRange(rng,58,74))} c-3 20 5 35 14 48Z"/><path d="M202 102 c18 -${fmt(randRange(rng,24,38))} 8 -${fmt(randRange(rng,48,64))} -12 -${fmt(randRange(rng,58,74))} c3 20 -5 35 -14 48Z"/></g>`;
  if(style===2) return `<g stroke="${p.shadow}" stroke-width="${fmt(randRange(rng,9,13))}" stroke-linecap="round" fill="none"><path d="M118 103 c-${fmt(randRange(rng,10,20))} -${fmt(randRange(rng,22,30))} -${fmt(randRange(rng,14,26))} -${fmt(randRange(rng,42,58))} ${fmt(randRange(rng,0,10))} -${fmt(randRange(rng,62,78))}"/><path d="M202 103 c${fmt(randRange(rng,10,20))} -${fmt(randRange(rng,22,30))} ${fmt(randRange(rng,14,26))} -${fmt(randRange(rng,42,58))} -${fmt(randRange(rng,0,10))} -${fmt(randRange(rng,62,78))}"/></g>`;
  return `<g fill="${p.shadow}"><circle cx="118" cy="92" r="${fmt(randRange(rng,12,18))}"/><circle cx="202" cy="92" r="${fmt(randRange(rng,12,18))}"/></g>`;
}

export function createArms(rng,p){
  const style=Math.floor(rng()*4);
  if(style===0) return '';
  const stroke=fmt(randRange(rng,9,13));
  if(style===1) return `<g stroke="${p.dark}" stroke-width="${stroke}" stroke-linecap="round" fill="none"><path d="M${fmt(randRange(rng,84,96))} ${fmt(randRange(rng,180,198))} c-${fmt(randRange(rng,20,34))} ${fmt(randRange(rng,8,18))} -${fmt(randRange(rng,30,44))} ${fmt(randRange(rng,28,40))} -${fmt(randRange(rng,36,52))} ${fmt(randRange(rng,46,58))}"/><path d="M${fmt(randRange(rng,224,236))} ${fmt(randRange(rng,180,198))} c${fmt(randRange(rng,20,34))} ${fmt(randRange(rng,8,18))} ${fmt(randRange(rng,30,44))} ${fmt(randRange(rng,28,40))} ${fmt(randRange(rng,36,52))} ${fmt(randRange(rng,46,58))}"/></g>`;
  if(style===2) return `<g stroke="${p.dark}" stroke-width="${stroke}" stroke-linecap="round" fill="none"><path d="M${fmt(randRange(rng,84,96))} ${fmt(randRange(rng,194,208))} q-${fmt(randRange(rng,28,42))} ${fmt(randRange(rng,2,12))} -${fmt(randRange(rng,50,64))} ${fmt(randRange(rng,26,40))}"/><path d="M${fmt(randRange(rng,224,236))} ${fmt(randRange(rng,194,208))} q${fmt(randRange(rng,28,42))} ${fmt(randRange(rng,2,12))} ${fmt(randRange(rng,50,64))} ${fmt(randRange(rng,26,40))}"/></g>`;
  return `<g fill="${p.shadow}"><circle cx="${fmt(randRange(rng,66,80))}" cy="${fmt(randRange(rng,198,214))}" r="${fmt(randRange(rng,11,16))}"/><circle cx="${fmt(randRange(rng,240,254))}" cy="${fmt(randRange(rng,198,214))}" r="${fmt(randRange(rng,11,16))}"/></g>`;
}

export function createExtra(rng,p){
  const style=Math.floor(rng()*4);
  if(style===0){
    return `<g fill="none" stroke="${p.extra}" stroke-width="${fmt(randRange(rng,6,10))}" opacity="0.35"><ellipse cx="160" cy="176" rx="${fmt(randRange(rng,90,106))}" ry="${fmt(randRange(rng,104,118))}"/><ellipse cx="160" cy="176" rx="${fmt(randRange(rng,106,124))}" ry="${fmt(randRange(rng,120,136))}"/></g>`;
  }
  if(style===1){
    const spikes=[];
    const count=5+Math.floor(rng()*4);
    for(let i=0;i<count;i++){
      const x=90+i*(140/(count-1));
      const h=randRange(rng,18,38);
      spikes.push(`<path d="M${fmt(x)} 90 l${fmt(randRange(rng,-8,-2))} -${fmt(h)} l${fmt(randRange(rng,10,16))} ${fmt(h-4)}Z"/>`);
    }
    return `<g fill="${p.extra}" opacity="0.85">${spikes.join('')}</g>`;
  }
  if(style===2){
    const drips=[];
    const count=3+Math.floor(rng()*3);
    for(let i=0;i<count;i++){
      const x=110+i*(100/Math.max(1,count-1));
      const len=randRange(rng,18,42);
      drips.push(`<path d="M${fmt(x)} 244 q${fmt(randRange(rng,4,12))} ${fmt(len/2)} 0 ${fmt(len)} q-${fmt(randRange(rng,4,12))} -${fmt(len*0.18)} 0 -${fmt(len)}Z"/>`);
    }
    return `<g fill="${p.extra}" opacity="0.65">${drips.join('')}</g>`;
  }
  const scales=[];
  for(let row=0;row<3;row++){
    for(let col=0;col<4;col++){
      const x=112+col*26+(row%2?12:0);
      const y=182+row*22;
      scales.push(`<path d="M${x} ${y} q10 -${fmt(randRange(rng,8,14))} 20 0 q-10 ${fmt(randRange(rng,8,12))} -20 0Z"/>`);
    }
  }
  return `<g fill="${p.extra}" opacity="0.55">${scales.join('')}</g>`;
}

export function buildCrackLayer(rng, count, bounds){
  const paths=[];
  for(let i=0;i<count;i++){
    let px=randRange(rng,bounds.minX,bounds.maxX);
    let py=randRange(rng,bounds.minY,bounds.maxY);
    let d=`M${fmt(px)} ${fmt(py)}`;
    const segments=3+Math.floor(rng()*3);
    for(let j=0;j<segments;j++){
      const dx=randRange(rng,-16,16);
      const dy=randRange(rng,8,18)*(j%2===0?1:-1);
      px += dx; py += dy;
      d += ` l${fmt(dx)} ${fmt(dy)}`;
    }
    paths.push(`<path d="${d}"/>`);
  }
  return paths.join('');
}

export function buildSparkLayer(rng, count){
  const dots=[];
  for(let i=0;i<count;i++) dots.push(`<circle cx="${fmt(randRange(rng,112,208))}" cy="${fmt(randRange(rng,112,228))}" r="${fmt(randRange(rng,2.5,4.5))}"/>`);
  return dots.join('');
}

export function buildMonsterArt(seed, themeKey){
  const theme=THEMES[themeKey] || THEMES.morning;
  const rng=mulberry32(seed ^ 0x9e3779b9);
  const palette=buildPalette(theme,rng);
  return {
    palette,
    layers:{
      body:createBodyPath(rng),
      eyes:createEyes(rng,palette),
      mouth:createMouth(rng,palette),
      horns:createHorns(rng,palette),
      arms:createArms(rng,palette),
      extra:createExtra(rng,palette)
    },
    damage:{
      light:buildCrackLayer(rng,2,{minX:116,maxX:204,minY:118,maxY:210}),
      heavy:buildCrackLayer(rng,3,{minX:108,maxX:212,minY:128,maxY:238}),
      sparks:buildSparkLayer(rng,3+Math.floor(rng()*3))
    }
  };
}

export function createMonsterSeeded(seed=Math.floor(Date.now()%1000000)){
  const rng=mulberry32(seed), themeKey=pick(Object.keys(THEMES),rng), theme=THEMES[themeKey];
  const maxHp=30+Math.floor(rng()*16);
  return { seed, themeKey, name:`${pick(theme.prefixes,rng)} ${pick(theme.types,rng)}`,
    flavor:theme.flavor, maxHp, hp:maxHp, finalBlowBy:null, finalBlowAt:null,
    art:buildMonsterArt(seed, themeKey) };
}

/* === SVG rendering: monster art + overlays === */
/* ── SVG ── */
export function renderMonsterSVG(m, pct=100){
  const art = m.art || buildMonsterArt(m.seed ?? 0, m.themeKey);
  const crackColor = 'rgba(0,0,0,0.55)';
  const rng = mulberry32((m.seed ?? 0) ^ 0xdeadbeef);
  // Expressive state — pick layers based on HP tier
  const rng2 = mulberry32((m.seed ?? 0) ^ 0xfacecafe);
  const eyes  = pct <= 20
    ? createRageEyes(rng2, art.palette)
    : art.layers.eyes;
  const mouth = pct <= 40
    ? createSnarlMouth(rng2, art.palette)
    : art.layers.mouth;

  // Noise dots for surface texture
  const noiseDots = Array.from({length: 28}, () => {
    const x = 108 + rng() * 104, y = 120 + rng() * 130;
    const r = 1.2 + rng() * 2.4;
    const op = 0.06 + rng() * 0.11;
    return `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="rgba(0,0,0,${fmt(op)})"/>`;
  }).join('');

  // Shading gradient id unique per monster
  const gradId = `bodyShade_${m.seed ?? 0}`;

  const cracks1 = pct <= 80 ? `<g stroke="${crackColor}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55">${art.damage.light}</g>` : '';
  const cracks2 = pct <= 60 ? `<g stroke="${crackColor}" stroke-width="3"   stroke-linecap="round" fill="none" opacity="0.72">${art.damage.heavy}</g>` : '';
  const stars   = pct <= 40 ? `<g fill="${crackColor}" opacity="0.45">${art.damage.sparks}</g>` : '';
  const cracks3 = pct <= 40 ? `<g stroke="${crackColor}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.88">${art.damage.light}${art.damage.heavy}</g>` : '';
  const scorch  = pct <= 20 ? `<ellipse cx="160" cy="200" rx="72" ry="52" fill="rgba(0,0,0,0.22)" filter="url(#scBlur)"/>
    <filter id="scBlur"><feGaussianBlur stdDeviation="6"/></filter>` : '';

  return `<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${m.name}">
    <defs>
      <radialGradient id="${gradId}" cx="42%" cy="38%" r="54%">
        <stop offset="0%"   stop-color="rgba(255,255,255,0.22)"/>
        <stop offset="55%"  stop-color="rgba(255,255,255,0.04)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.28)"/>
      </radialGradient>
    </defs>
    <ellipse cx="160" cy="288" rx="84" ry="18" fill="rgba(0,0,0,0.22)"/>
    ${scorch}
    ${art.layers.extra}${art.layers.horns}${art.layers.arms}
    <g fill="${art.palette.body}">${art.layers.body}</g>
    <g fill="url(#${gradId})">${art.layers.body}</g>
    <g>${noiseDots}</g>
    <g data-eyes="1">${eyes}</g>${mouth}
    ${cracks1}${cracks2}${cracks3}${stars}
  </svg>`;
}

export function renderDeadMonsterSVG(m){
  const art=m.art || buildMonsterArt(m.seed ?? 0, m.themeKey);
  const p=art.palette;
  const xEyes=`<g stroke="${p.dark}" stroke-width="9" stroke-linecap="round" class="x-eyes">
    <line x1="118" y1="146" x2="138" y2="166"/><line x1="138" y1="146" x2="118" y2="166"/>
    <line x1="182" y1="146" x2="202" y2="166"/><line x1="202" y1="146" x2="182" y2="166"/>
  </g>`;
  return `<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${m.name} (defeated)">
    <ellipse cx="160" cy="288" rx="84" ry="18" fill="rgba(0,0,0,0.22)"/>
    ${art.layers.extra}${art.layers.horns}${art.layers.arms}<g fill="${p.body}">${art.layers.body}</g>${xEyes}${art.layers.mouth}
  </svg>`;
}
