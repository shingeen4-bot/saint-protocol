export type Attribute = 'sales' | 'communication' | 'presence' | 'discipline' | 'resilience' | 'physical' | 'knowledge' | 'business';
export type Category = 'routine' | 'milestone';
export type Action = {id: string; date: string; createdAt: number; title: string; attribute: Attribute; baseXp: number; kind: Category; templateId?: string; note?: string; metrics?: {sets?:number; reps?:number; weight?:number; duration?:number};};
export type Habit = {id: string; title: string; detail: string; attribute: Attribute; xp: number; enabled: boolean; frequency: 'daily' | 'weekdays';};
export type Goal = {id:string; title:string; target:number; current:number; unit:string; linkedHabitId?:string; startedAt?:string; due?:string; attribute:Attribute; completed:boolean;};
export type Journal = {id:string; date:string; text:string; mood:1|2|3|4|5; kind:'daily'|'review';};
export type Transaction = {id:string; date:string; description:string; amount:number; type:'income'|'expense';};
export type Settings = {brand:string; reminderHour:string; weekStartsMonday:boolean; lastBackup?:string;};
export type Unlock = {id:string; attribute: Attribute; level:number; date:string; note:string;};
export type Snapshot = {actions:Action[]; habits:Habit[]; goals:Goal[]; journal:Journal[]; transactions:Transaction[]; settings:Settings; unlocks:Unlock[];};
export const attributes: Attribute[] = ['sales','communication','presence','discipline','resilience','physical','knowledge','business'];
export const allAttributes: Attribute[] = [...attributes];
export const initialLevels: Record<Attribute,number> = {sales:1,communication:2,presence:3,discipline:2,resilience:4,physical:3,knowledge:3,business:1};
export const defaultHabits: Habit[] = [
  {id:'h-sales',title:'Sales practice',detail:'5 minutes minimum',attribute:'sales',xp:5,enabled:true,frequency:'weekdays'},
  {id:'h-read',title:'Read',detail:'5 minutes minimum',attribute:'knowledge',xp:5,enabled:true,frequency:'daily'},
  {id:'h-mobility',title:'Mobility work',detail:'Stretch and recover',attribute:'physical',xp:5,enabled:true,frequency:'daily'},
  {id:'h-move',title:'Physical activity',detail:'Train, walk or play',attribute:'physical',xp:10,enabled:true,frequency:'daily'},
  {id:'h-pray',title:'Prayers',detail:'Daily target',attribute:'discipline',xp:5,enabled:true,frequency:'daily'},
];
export const starterSettings:Settings={brand:'SAINT PROTOCOL',reminderHour:'20:30',weekStartsMonday:true};
