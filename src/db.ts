import Dexie, { type Table } from 'dexie';
import {salesAwardId,salesMetricsId,SALES_OUTREACH_TARGET,SALES_CALLS_TARGET,type SalesCounts} from './engine';
import { defaultHabits, starterSettings, type Action, type Goal, type Habit, type Journal, type Settings, type Snapshot, type Transaction, type Unlock } from './types';
class SaintDB extends Dexie {
  actions!:Table<Action,string>; habits!:Table<Habit,string>; goals!:Table<Goal,string>; journal!:Table<Journal,string>;
  transactions!:Table<Transaction,string>; settings!:Table<{id:string; value:Settings},string>; unlocks!:Table<Unlock,string>;
  constructor(){super('king-os-v1'); // Legacy storage identifier retained to preserve existing local records
    this.version(1).stores({actions:'id,date,attribute,createdAt',habits:'id',goals:'id',journal:'id,date,kind',transactions:'id,date',settings:'id',unlocks:'id,attribute'});}
}
export const db=new SaintDB();
export async function initialise(){
  const main = await db.settings.get('main');
  if(!main) await db.settings.put({id:'main',value:starterSettings});
  else if(main.value.brand === 'KING OS') await db.settings.put({id:'main',value:{...main.value,brand:'SAINT PROTOCOL'}});
  if(await db.habits.count()===0 && !(await db.settings.get('seeded'))) {
    await db.habits.bulkPut(defaultHabits);
    await db.settings.put({id:'seeded',value:starterSettings});
  }
  // One-time upgrade of the legacy Sales practice standard. Keep all historical logs.
  if(!(await db.settings.get('sales-tracking-v1'))){
    await db.transaction('rw',[db.habits,db.settings],async()=>{
      await db.habits.put(defaultHabits.find(h=>h.id==='h-sales')!);
      await db.habits.put(defaultHabits.find(h=>h.id==='h-sales-calls')!);
      await db.settings.put({id:'sales-tracking-v1',value:starterSettings});
    });
  }
}
export async function snapshot():Promise<Snapshot>{
  const [actions,habits,goals,journal,transactions,settings,unlocks]=await Promise.all([
    db.actions.toArray(),db.habits.toArray(),db.goals.toArray(),db.journal.toArray(),db.transactions.toArray(),db.settings.get('main'),db.unlocks.toArray()
  ]);
  return {actions,habits,goals,journal,transactions,settings:settings?.value||starterSettings,unlocks};
}
export async function importSnapshot(data:unknown){
  if(!data || typeof data!=='object')throw Error('Invalid backup format');
  const envelope=data as {version?:number;data?:Partial<Snapshot>};
  if(envelope.version!==1 || !envelope.data)throw Error('Unsupported backup version');
  const d=envelope.data;
  for(const key of ['actions','habits','goals','journal','transactions','unlocks'] as const){if(!Array.isArray(d[key]))throw Error(`Missing ${key} records`);}
  if(!d.settings || typeof d.settings.brand!=='string')throw Error('Missing settings');
  // Minimal structural checks before replacing the local database.
  if(d.actions!.some(a=>typeof a.id!=='string'||typeof a.date!=='string'||typeof a.attribute!=='string'||typeof a.baseXp!=='number'))throw Error('Invalid activity records');
  await db.transaction('rw',[db.actions,db.habits,db.goals,db.journal,db.transactions,db.settings,db.unlocks],async()=>{
    await Promise.all([db.actions.clear(),db.habits.clear(),db.goals.clear(),db.journal.clear(),db.transactions.clear(),db.settings.clear(),db.unlocks.clear()]);
    await Promise.all([db.actions.bulkPut(d.actions!),db.habits.bulkPut(d.habits!),db.goals.bulkPut(d.goals!),db.journal.bulkPut(d.journal!),db.transactions.bulkPut(d.transactions!),db.unlocks.bulkPut(d.unlocks!),db.settings.put({id:'main',value:d.settings!}),db.settings.put({id:'seeded',value:d.settings!})]);
  });
}
export async function exportBackup(){const data=await snapshot();const payload=JSON.stringify({version:1,exportedAt:new Date().toISOString(),data},null,2);const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`saint-protocol-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);await db.settings.put({id:'main',value:{...data.settings,lastBackup:new Date().toISOString()}});}

/** Atomic replacement of cumulative channel totals and their two threshold awards. */
export async function saveSalesCounts(date:string, counts:SalesCounts){
  const values=[counts.calls,counts.emails,counts.messages];
  if(values.some(value=>!Number.isSafeInteger(value)||value<0||value>10000))throw Error('Enter whole numbers between 0 and 10,000');
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date))throw Error('Invalid date');
  const day=new Date(date+'T12:00:00').getDay();
  if(day===0||day===6)throw Error('Sales standards apply on weekdays');
  const total=counts.calls+counts.emails+counts.messages;
  const now=Date.now(),mid=salesMetricsId(date);
  await db.transaction('rw',db.actions,async()=>{
    const prev=await db.actions.get(mid);
    if(total===0)await db.actions.delete(mid);
    else await db.actions.put({id:mid,date,title:'Sales activity totals',attribute:'sales',baseXp:0,kind:'routine',createdAt:prev?.createdAt||now,metrics:{calls:counts.calls,emails:counts.emails,messages:counts.messages}});
    for(const award of [{key:'outreach' as const,passed:total>=SALES_OUTREACH_TARGET,xp:5,title:'Daily outreach · 50 touches',templateId:'h-sales'},{key:'calls' as const,passed:counts.calls>=SALES_CALLS_TARGET,xp:15,title:'Daily calls · 30 calls',templateId:'h-sales-calls'}]){
      const id=salesAwardId(award.key,date);
      if(!award.passed){await db.actions.delete(id);continue;}
      const previous=await db.actions.get(id);
      await db.actions.put({id,date,title:award.title,attribute:'sales',baseXp:award.xp,kind:'routine',templateId:award.templateId,createdAt:previous?.createdAt||now+(award.key==='calls'?2:1)});
    }
  });
}
