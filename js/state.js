/** Shared game state and state-shaping helpers. */
export const KID_DEFAULTS = [
  { id:'jj',    name:'JJ',    age:10 },
  { id:'roy5',  name:'Roy5',  age:8  },
  { id:'drey',  name:'Drey',  age:4  },
  { id:'sarge', name:'Sarge', age:4  }
];

export const MOVE_DEFS = {
  attack:  { label:'Attack',  baseDamage:1, critChance:0.1,  critBonus:1, flavor:'Solid everyday win.' },
  combo:   { label:'Combo',   baseDamage:3, critChance:0.15, critBonus:2, flavor:'Big move for a bigger moment.' },
  grenade: { label:'Grenade', baseDamage:5, critChance:0.2,  critBonus:3, flavor:'An explosive throw that scorches the boss.', effect:'grenade' }
};

export const state = { game:null, selectedKidId:null, selectedMoveKey:null, toastTimer:null };

export function createInitialGame(createMonsterSeeded){
  return {
    title:'Boss Battle',
    monster:createMonsterSeeded(),
    kids:KID_DEFAULTS.map(k=>({...k,damage:0,monsterDamage:0,kills:0})),
    battleLog:[]
  };
}

export function normalizeKids(kids=KID_DEFAULTS){
  return KID_DEFAULTS.map(def=>{
    const saved = kids.find(k=>k.id===def.id) ?? {};
    return { ...def, ...saved, damage:Number(saved?.damage||0), monsterDamage:Number(saved?.monsterDamage||0), kills:Number(saved?.kills||0) };
  });
}

export function getKidById(stateObj, id){ return stateObj.game?.kids?.find(k=>k.id===id)??null; }

export function syncSelectionState(stateObj, getKidByIdFn, moveDefs=MOVE_DEFS) {
  const hasSelectedKid = stateObj.selectedKidId && getKidByIdFn(stateObj.selectedKidId);
  if (!hasSelectedKid) {
    stateObj.selectedKidId = null;
    stateObj.selectedMoveKey = null;
  }

  if (stateObj.selectedMoveKey && !moveDefs[stateObj.selectedMoveKey]) {
    stateObj.selectedMoveKey = null;
  }
}
