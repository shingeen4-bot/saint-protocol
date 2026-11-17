import { attributes, initialLevels, type Action, type Attribute, type Unlock } from './types';
export const dateKey = (date:Date = new Date()) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
export const dateOffset = (offset:number) => {const d=new Date();d.setDate(d.getDate()+offset);return dateKey(d);};
export const threshold = (level:number) => 100 + 25*(level-1);
export const uid = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export type ScoredAction = Action & {earned:number};
// Deterministic replay keeps deletion/import/edit operations honest. Milestones bypass routine XP cap.
export function scoreActions(actions:Action[]):ScoredAction[] {
  const perDay = new Map<string,number>();
  const repeats = new Map<string,number>();
  return [...actions].sort((a,b)=>a.createdAt-b.createdAt || a.id.localeCompare(b.id)).map(a=>{
    if(a.kind==='milestone') return {...a,earned:Math.max(0,Math.round(a.baseXp))};
    const dayKey = `${a.date}|${a.attribute}`;
    const repeatKey = `${dayKey}|${a.templateId || a.title.trim().toLowerCase()}`;
    const n = repeats.get(repeatKey) || 0; repeats.set(repeatKey,n+1);
    const multiplier = n===0?1:n===1?0.5:n===2?0.25:0;
    const amount = Math.max(0,Math.round(a.baseXp * multiplier));
    const already = perDay.get(dayKey) || 0;
    const earned = Math.min(amount,Math.max(0,30-already));
    perDay.set(dayKey,already+earned);
    return {...a,earned};
  });
}
export function progressFor(attribute:Attribute, actions:ScoredAction[], unlocks:Unlock[]){
  let level=initialLevels[attribute];
  let bank=actions.filter(a=>a.attribute===attribute).reduce((s,a)=>s+a.earned,0);
  const total=bank;
  let locked=false;
  while(bank>=threshold(level) && level<999){
    if((level+1)%5===0 && !unlocks.some(u=>u.attribute===attribute && u.level===level+1)){locked=true;break;}
    bank-=threshold(level);level++;
  }
  return {level,bank,total,locked,needed:threshold(level),percent:Math.min(100,bank/threshold(level)*100),nextLevel:level+1};
}
export function overallLevel(actions:ScoredAction[],unlocks:Unlock[]){return Math.floor(attributes.reduce((s,a)=>s+progressFor(a,actions,unlocks).level,0)/attributes.length);}
export function activeDays(actions:ScoredAction[]) {return new Set(actions.map(a=>a.date));}
export function currentStreak(actions:ScoredAction[]){const dates=activeDays(actions);let streak=0;let offset=dates.has(dateKey())?0:-1;while(dates.has(dateOffset(offset))){streak++;offset--;}return streak;}
export function last7(actions:ScoredAction[]) {return Array.from({length:7},(_,i)=>{const date=dateOffset(i-6);return {date,day:new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short'}),xp:actions.filter(a=>a.date===date).reduce((s,a)=>s+a.earned,0)};});}
export function achievements(actions:ScoredAction[],goalsCompleted:number,streak:number){const n=actions.length;const xp=actions.reduce((s,a)=>s+a.earned,0);return [
  {id:'first',icon:'sparkles',title:'First step',detail:'Log your first action',earned:n>=1},
  {id:'ten',icon:'zap',title:'Ten in',detail:'Log 10 actions',earned:n>=10},
  {id:'streak',icon:'flame',title:'Seven straight',detail:'Maintain a 7-day streak',earned:streak>=7},
  {id:'centurion',icon:'trophy',title:'Centurion',detail:'Earn 100 total XP',earned:xp>=100},
  {id:'goals',icon:'target',title:'Closer',detail:'Complete your first goal',earned:goalsCompleted>=1},
];}

export type RadarPeriod = 'lifetime' | '7d' | '30d';
export type RadarMetric = {attribute:Attribute; value:number; level:number; progress:number; earnedXp:number};
/** Lifetime tracks level + fractional next-level progress; recent windows track actual earned XP. */
export function radarMetrics(actions:ScoredAction[], unlocks:Unlock[], period:RadarPeriod, asOf:string=dateKey()):RadarMetric[]{
  const days = period==='7d'?7:period==='30d'?30:0;
  const from = new Date(`${asOf}T12:00:00`);
  from.setDate(from.getDate()-(days-1));
  const first = days?dateKey(from):'';
  return attributes.map(attribute=>{
    const p=progressFor(attribute,actions,unlocks);
    const earnedXp=days?actions.filter(a=>a.attribute===attribute && a.date>=first && a.date<=asOf).reduce((total,a)=>total+a.earned,0):p.total;
    const value=period==='lifetime' ? Number((p.level+Math.min(p.percent/100,p.locked?0.99:1)).toFixed(3)): earnedXp;
    return {attribute,value,level:p.level,progress:Math.round(p.percent),earnedXp};
  });
}
/** Each period has an independent, labelled XP scale; there is no arbitrary 0-100 skill score. */
export function radarScaleMax(metrics:RadarMetric[], period:RadarPeriod){
  const top=Math.max(0,...metrics.map(m=>m.value));
  if(period==='lifetime')return Math.max(5,Math.ceil(top)+1);
  const base=period==='7d'?30:75;
  const step=period==='7d'?10:25;
  return Math.max(base,Math.ceil(top/step)*step);
}
