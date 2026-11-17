import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode,type FormEvent,type RefObject} from 'react';
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpen, Brain, BriefcaseBusiness,
  CalendarDays, Check, CheckCheck, CheckCircle2, ChevronRight, CircleHelp, Clock3, Download,
  Dumbbell, Flame, Home, LockKeyhole, MessageCircle, Minus, NotebookPen, Plus,
  Save, Settings2, Shield, Sparkles, Target, Trash2, TrendingUp, Trophy, Upload,
  Users, Wallet, X, Zap
} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,PolarAngleAxis,PolarGrid,PolarRadiusAxis,Radar,RadarChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {db,exportBackup,importSnapshot,initialise,snapshot} from './db';
import {achievements, currentStreak, dateKey, dateOffset, last7, overallLevel, progressFor, radarMetrics, radarScaleMax, scoreActions,uid,type RadarPeriod} from './engine';
import {allAttributes,attributes,starterSettings,type Action,type Attribute,type Goal,type Habit,type Journal,type Settings,type Snapshot,type Transaction} from './types';

type Screen='home'|'today'|'progress'|'goals'|'journal';
type Modal='activity'|'goal'|'journal'|'finance'|'settings'|'milestone'|null;
type ProgressSub='attributes'|'fitness'|'finance'|'achievements';
const ICONS={home:Home,today:CheckCheck,progress:BarChart3,goals:Target,journal:BookOpen};
const ATTR_ICONS:Record<Attribute,typeof Activity>={sales:BriefcaseBusiness,communication:MessageCircle,presence:Users,discipline:CheckCircle2,resilience:Shield,physical:Dumbbell,knowledge:Brain,business:Wallet};
const LABELS:Record<Attribute,string>={sales:'Sales',communication:'Communication',presence:'Presence',discipline:'Discipline',resilience:'Resilience',physical:'Physical',knowledge:'Knowledge',business:'Business'};
const EMPTY:Snapshot={actions:[],habits:[],goals:[],journal:[],transactions:[],settings:starterSettings,unlocks:[]};
const formatNumber=(n:number)=>new Intl.NumberFormat('en-GB').format(n);
const weekday=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short'});
const shortDate=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const greet=()=>{const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Overview';};
const money=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n);

function Ring({value,size=106,label}:{value:number;size?:number;label?:string}){
  const radius=(size-13)/2;const circumference=2*Math.PI*radius;const safe=Math.min(100,Math.max(0,value));
  return <div className="ring" style={{width:size,height:size}}>
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#2A3037" strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#A78BFA" strokeLinecap="round" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference*(1-safe/100)} transform={`rotate(-90 ${size/2} ${size/2})`} className="ring-progress"/>
    </svg>
    <div className="ring-label"><strong>{Math.round(safe)}%</strong>{label&&<span>{label}</span>}</div>
  </div>;
}
function Pill({children,tone='muted'}:{children:ReactNode;tone?:'muted'|'green'|'violet'|'amber'}){return <span className={`pill pill-${tone}`}>{children}</span>;}
function SectionTitle({title,action,onClick}:{title:string;action?:string;onClick?:()=>void}){return <div className="section-title"><h3>{title}</h3>{action&&<button className="text-button" onClick={onClick}>{action}<ChevronRight size={15}/></button>}</div>;}
function EmptyState({icon:Icon,title,body}:{icon:typeof Activity;title:string;body:string}){return <div className="empty-state"><Icon size={28}/><strong>{title}</strong><span>{body}</span></div>;}

function App(){
  const [data,setData]=useState<Snapshot>(EMPTY);
  const [ready,setReady]=useState(false);
  const [screen,setScreen]=useState<Screen>('home');
  const [sub,setSub]=useState<ProgressSub>('attributes');
  const [radarPeriod,setRadarPeriod]=useState<RadarPeriod>('lifetime');
  const [modal,setModal]=useState<Modal>(null);
  const [toast,setToast]=useState('');
  const [selectedHabit,setSelectedHabit]=useState<Habit|null>(null);
  const [milestoneAttribute,setMilestoneAttribute]=useState<Attribute>('sales');
  const fileRef=useRef<HTMLInputElement>(null);
  const reload=useCallback(async()=>{setData(await snapshot());},[]);
  useEffect(()=>{initialise().then(reload).then(()=>setReady(true)).catch(e=>{console.error(e);setToast('Unable to open local database');});},[reload]);
  useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(''),3800);return()=>clearTimeout(t);},[toast]);
  const scored=useMemo(()=>scoreActions(data.actions),[data.actions]);
  const today=dateKey();
  const todayActions=scored.filter(a=>a.date===today);
  const todayXp=todayActions.reduce((s,a)=>s+a.earned,0);
  const allXp=scored.reduce((s,a)=>s+a.earned,0);
  const streak=currentStreak(scored);
  const allHabits=data.habits.filter(h=>h.enabled&&(h.frequency==='daily'||![0,6].includes(new Date().getDay())));
  const habitDone=(habitId:string,date=today)=>data.actions.some(a=>a.date===date&&a.templateId===habitId);
  const doneCount=allHabits.filter(h=>habitDone(h.id)).length;
  const dailyPercent=allHabits.length?Math.round(doneCount/allHabits.length*100):100;
  const level=overallLevel(scored,data.unlocks);
  const unlocksToDo=attributes.filter(a=>progressFor(a,scored,data.unlocks).locked);
  const achieved=achievements(scored,data.goals.filter(g=>g.completed).length,streak);
  const toastMessage=(s:string)=>setToast(s);
  const mutation=async(job:()=>Promise<unknown>,message:string)=>{try{await job();await reload();setModal(null);setSelectedHabit(null);setToast(message);}catch(e){console.error(e);toastMessage('Could not save changes');}};
  const saveAction=async(action:Omit<Action,'id'|'createdAt'>)=>{
    await mutation(()=>db.actions.put({...action,id:uid(),createdAt:Date.now()}),'Activity saved');
  };
  const toggleHabit=async(habit:Habit)=>{
    const existing=data.actions.find(a=>a.date===today&&a.templateId===habit.id);
    if(existing)await mutation(()=>db.actions.delete(existing.id),'Habit unchecked');
    else await saveAction({date:today,title:habit.title,attribute:habit.attribute,baseXp:habit.xp,kind:'routine',templateId:habit.id});
  };
  const showLog=(habit?:Habit)=>{setSelectedHabit(habit||null);setModal('activity');};
  const isReminderDue=useMemo(()=>{
    const time=data.settings.reminderHour;
    if(!time||time==='off')return false;
    const now=new Date();const [hh,mm]=time.split(':').map(Number);
    return now.getHours()*60+now.getMinutes()>=hh*60+mm&&doneCount<allHabits.length;
  },[data.settings.reminderHour,doneCount,allHabits.length]);
  const nextDayLabel=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const weeklyXp=scored.filter(a=>a.date>=dateOffset(-6)).reduce((s,a)=>s+a.earned,0);
  const radarData=useMemo(()=>radarMetrics(scored,data.unlocks,radarPeriod,today).map(metric=>({
    ...metric,
    label:LABELS[metric.attribute],
    short:metric.attribute==='communication'?'Comms':LABELS[metric.attribute]
  })),[scored,data.unlocks,radarPeriod,today]);
  const radarMax=useMemo(()=>radarScaleMax(radarData,radarPeriod),[radarData,radarPeriod]);
  const radarRecent=radarPeriod!=='lifetime';
  const radarTotal=radarData.reduce((sum,metric)=>sum+(radarRecent?metric.earnedXp:0),0);
  const radarWindowLabel=radarPeriod==='7d'?'last 7 days':'last 30 days';


  if(!ready)return <div className="boot"><div className="boot-symbol" aria-hidden="true"><span/><span/><span/></div><span>SAINT PROTOCOL · LOADING</span></div>;
  return <div className="app-shell">
    <div className="app-body">
      <header className="topbar">
        <div className="brandmark" onClick={()=>setScreen('home')} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')setScreen('home');}}><span className="brand-copy"><small>PRIVATE PERFORMANCE SYSTEM</small>{data.settings.brand}</span></div>
        <button className="icon-button" onClick={()=>setModal('settings')} aria-label="Open settings"><Settings2 size={20}/></button>
      </header>
      <main className="main-content" key={screen}>
        {screen==='home'&&<>
          <div className="welcome"><span className="eyebrow">{nextDayLabel.toUpperCase()}</span><h1>Overview<span className="accent-dot">.</span></h1><p>Your daily execution, in one place.</p></div>
          {isReminderDue&&<button className="reminder" onClick={()=>setScreen('today')}><Bell size={18}/><span>You have {allHabits.length-doneCount} daily standards left to complete.</span><ChevronRight size={16}/></button>}
          {data.settings.lastBackup===undefined&&scored.length>=6&&<button className="backup-reminder" onClick={()=>setModal('settings')}><Upload size={16}/> Export your first backup to protect your progress <ChevronRight size={14}/></button>}
          <div className="hero-card">
            <div className="hero-copy"><span className="eyebrow hero-label">PERSONAL PROGRESSION</span><div className="level-row"><span>LVL</span><strong>{String(level).padStart(2,'0')}</strong></div><p>{formatNumber(allXp)} lifetime XP earned</p><div className="hero-bottom"><Pill tone="violet"><Zap size={13} fill="currentColor"/>{todayXp} XP today</Pill><Pill tone="muted"><Flame size={13}/>{streak} day streak</Pill></div></div>
            <div className="hero-decoration" aria-hidden="true"><div className="hero-orbit orb1"/><div className="hero-orbit orb2"/><div className="hero-orbit orb3"/><div className="hero-center"/></div>
          </div>
          <div className="dashboard-grid">
            <div className="metric-card"><span className="metric-label"><Activity size={15}/> TODAY'S EXECUTION</span><div className="metric-flex"><strong>{dailyPercent}<small>%</small></strong><Ring value={dailyPercent} size={72}/></div><span className="metric-foot">{doneCount} of {allHabits.length} standards complete</span></div>
            <div className="metric-card"><span className="metric-label"><TrendingUp size={15}/> THIS WEEK</span><strong className="big-metric">{formatNumber(weeklyXp)}<small> XP</small></strong><span className="metric-foot">{scored.filter(a=>a.date>=dateOffset(-6)).length} actions logged</span><div className="micro-bars">{last7(scored).map((d,i)=><span key={d.date} style={{height:`${Math.max(12,d.xp/Math.max(50,...last7(scored).map(x=>x.xp))*100)}%`}} className={i===6?'active':''}/>)}</div></div>
          </div>
          <SectionTitle title="Attribute balance" action="Details" onClick={()=>{setScreen('progress');setSub('attributes');}}/>
          <section className="overview-radar-card" aria-label="Attribute radar chart">
            <div className="overview-radar-copy">
              <span className="metric-label"><Sparkles size={15}/> ATTRIBUTE RADAR</span>
              <strong>{radarRecent?'Where your effort went.':'Your current development.'}</strong>
              <p>{radarRecent?`XP earned in the ${radarWindowLabel}. This measures recent activity, not your skill level.`:'Current levels plus progress towards your next level. These are tracker levels, not an objective skill assessment.'}</p>
            </div>
            <div className="radar-period-switch" role="group" aria-label="Radar chart period">
              {([['lifetime','Lifetime'],['7d','7 days'],['30d','30 days']] as const).map(([key,label])=><button type="button" key={key} className={radarPeriod===key?'selected':''} aria-pressed={radarPeriod===key} onClick={()=>setRadarPeriod(key)}>{label}</button>)}
            </div>
            <div className="radar-chart-area">
              <div className="overview-radar-chart" role="img" aria-label={radarRecent?`Attribute XP over the ${radarWindowLabel}: ${radarData.map(d=>`${d.label} ${d.earnedXp} XP`).join(', ')}`:`Lifetime attribute levels: ${radarData.map(d=>`${d.label} level ${d.level}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="65%" margin={{top:14,right:14,bottom:14,left:14}}>
                    <PolarGrid stroke="#382C4A" strokeOpacity={0.75}/>
                    <PolarAngleAxis dataKey="short" tick={{fill:'#BBAECF',fontSize:10,fontWeight:600}} tickLine={false}/>
                    <PolarRadiusAxis angle={90} domain={[0,radarMax]} tick={false} axisLine={false}/>
                    <Radar isAnimationActive={true} animationDuration={420} name="Attributes" dataKey="value" stroke="#B99CFF" fill="#9773E8" fillOpacity={0.28} strokeWidth={2.2} dot={{fill:'#B99CFF',r:2.4,stroke:'#20172B',strokeWidth:1}} />
                    <Tooltip formatter={value=>[radarRecent?`${Number(value)} XP`:`${Number(value).toFixed(2)} level equivalent`,radarRecent?'Earned XP':'Level + progress']} contentStyle={{borderRadius:12,border:'1px solid #48365D',background:'#15101F',color:'#EFE8FF',boxShadow:'0 10px 34px #0008'}} itemStyle={{color:'#CDB9FF'}}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {radarRecent&&radarTotal===0&&<div className="radar-empty" aria-live="polite">No XP logged for this period</div>}
            </div>
            <div className="radar-summary"><span>{radarRecent?'PERIOD TOTAL':'DISPLAY MODE'}</span><strong>{radarRecent?`${formatNumber(radarTotal)} XP`:'Level + progress'}</strong></div>
            <div className="overview-radar-legend">{radarData.map(item=><div className="radar-legend-item" key={item.attribute}><span className="legend-dot"/><div><strong>{item.label}</strong><small>{radarRecent?`${formatNumber(item.earnedXp)} XP earned`:`LV ${item.level} · ${item.progress}% to next`}</small></div></div>)}</div>
            <p className="radar-disclaimer">{radarRecent?'All attributes use the same XP scale within this period. The 7-day and 30-day charts have different scales.':'Lifetime and recent XP views use different units, so compare their patterns rather than their areas.'}</p>
          </section>
          <SectionTitle title="Daily standards" action="View all" onClick={()=>setScreen('today')}/>
          <div className="list-card">{allHabits.slice(0,4).map(h=><HabitRow key={h.id} habit={h} done={habitDone(h.id)} onToggle={()=>toggleHabit(h)}/>)}</div>
          <SectionTitle title="Attributes" action="Details" onClick={()=>{setScreen('progress');setSub('attributes');}}/>
          <div className="skills-card">{attributes.slice(0,4).map(a=>{const p=progressFor(a,scored,data.unlocks);const Icon=ATTR_ICONS[a];return <div className="skill-row" key={a}><div className="skill-icon"><Icon size={17}/></div><div className="skill-body"><div className="skill-header"><strong>{LABELS[a]}</strong><span>LV {p.level}</span></div><div className="track"><span style={{width:`${p.percent}%`}}/></div></div></div>;})}</div>
          <div className="quick-actions"><button className="primary-button" onClick={()=>showLog()}><Plus size={19}/> Log activity</button><button className="secondary-button" onClick={()=>{setScreen('journal');setModal('journal');}}><NotebookPen size={17}/> Journal</button></div>
        </>}
        {screen==='today'&&<>
          <PageHeader kicker="DAILY EXECUTION" title="Today" subtitle={nextDayLabel}/>
          <div className="today-summary"><Ring value={dailyPercent} size={100} label="complete"/><div><span className="eyebrow">DAILY STANDARD</span><strong>{doneCount}<span> / {allHabits.length}</span></strong><p>{doneCount===allHabits.length?'Standards complete. Well executed.':'Focus on the next action.'}</p></div></div>
          <SectionTitle title="Non-negotiables" action="Configure" onClick={()=>setModal('settings')}/>
          <div className="list-card">{allHabits.map(h=><HabitRow key={h.id} habit={h} done={habitDone(h.id)} onToggle={()=>toggleHabit(h)}/>)}</div>
          <SectionTitle title="Quick log"/>
          <div className="quick-log-grid">
            {[{title:'Gym session',attribute:'physical' as Attribute,icon:Dumbbell},{title:'Skill practice',attribute:'knowledge' as Attribute,icon:Brain},{title:'Sales calls',attribute:'sales' as Attribute,icon:BriefcaseBusiness},{title:'Resilience work',attribute:'resilience' as Attribute,icon:Shield}].map(x=><button className="quick-tile" key={x.title} onClick={()=>showLog({id:`quick-${x.title}`,title:x.title,attribute:x.attribute,xp:10,detail:'Quick entry',enabled:true,frequency:'daily'})}><x.icon size={21}/><span>{x.title}</span><Plus size={15}/></button>)}
          </div>
          <SectionTitle title="Activity timeline" action="Add" onClick={()=>showLog()}/>
          {todayActions.length?<div className="list-card">{[...todayActions].sort((a,b)=>b.createdAt-a.createdAt).map(a=><div className="timeline-item" key={a.id}><div className="timeline-dot"><Check size={15}/></div><div><strong>{a.title}</strong><small>{LABELS[a.attribute]} · {new Date(a.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</small></div><span className="xp-accent">+{a.earned} XP</span><button className="icon-button faint" aria-label={`Delete ${a.title}`} onClick={()=>mutation(()=>db.actions.delete(a.id),'Activity deleted')}><Trash2 size={15}/></button></div>)}</div>:<EmptyState icon={Clock3} title="No actions logged yet" body="Complete a standard or log an activity to begin."/>}
          <button className="primary-button full-button bottom-cta" onClick={()=>showLog()}><Plus size={19}/> Log another activity</button>
        </>}
        {screen==='progress'&&<>
          <PageHeader kicker="PERFORMANCE ANALYTICS" title="Progress" subtitle="Your performance, measured over time."/>
          <div className="segment-control">{(['attributes','fitness','finance','achievements'] as ProgressSub[]).map(key=><button key={key} className={sub===key?'selected':''} onClick={()=>setSub(key)}>{key==='attributes'?'Attributes':key==='fitness'?'Fitness':key==='finance'?'Finance':'Awards'}</button>)}</div>
          {sub==='attributes'&&<>
            <div className="two-mini-stats"><div><span>TOTAL XP</span><strong>{formatNumber(allXp)}</strong></div><div><span>ACTIVE STREAK</span><strong>{streak}<small> days</small></strong></div></div>
            <SectionTitle title="XP over the last 7 days"/><div className="chart-card"><div className="chart-top"><strong>{weeklyXp} XP</strong><Pill tone="violet">Last 7 days</Pill></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={last7(scored)} margin={{top:10,right:2,left:-32,bottom:0}}><CartesianGrid stroke="#242A31" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fill:'#89939D',fontSize:11}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#89939D',fontSize:11}}/><Tooltip cursor={{fill:'#242b30'}} contentStyle={{background:'#1B2129',border:'1px solid #303841',borderRadius:12,color:'#EDF0F1'}}/><Bar dataKey="xp" fill="#AA8BFF" radius={[6,6,0,0]} maxBarSize={34}/></BarChart></ResponsiveContainer></div></div>
            <SectionTitle title="Attribute levels"/><div className="skills-card expanded">{attributes.map(a=>{const p=progressFor(a,scored,data.unlocks);const Icon=ATTR_ICONS[a];return <div className="skill-row" key={a}><div className="skill-icon"><Icon size={18}/></div><div className="skill-body"><div className="skill-header"><strong>{LABELS[a]}</strong><span>LV {p.level} · {p.bank}/{p.needed}</span></div><div className="track"><span style={{width:`${p.percent}%`}}/></div>{p.locked&&<button className="unlock-button" onClick={()=>{setMilestoneAttribute(a);setModal('milestone');}}><LockKeyhole size={12}/> Milestone required to reach LV {p.nextLevel}</button>}</div></div>;})}<div className="inactive-row"><LockKeyhole size={14}/> Business · Inactive</div></div>
          </>}
          {sub==='fitness'&&<FitnessPanel actions={scored} onLog={()=>showLog({id:'quick-gym',title:'Gym session',attribute:'physical',xp:10,detail:'Workout details',enabled:true,frequency:'daily'})}/>}
          {sub==='finance'&&<FinancePanel transactions={data.transactions} openAdd={()=>setModal('finance')}/>}
          {sub==='achievements'&&<><div className="awards-summary"><Trophy size={26}/><strong>{achieved.filter(a=>a.earned).length} / {achieved.length} achievements unlocked</strong><span>Milestones earned through consistent action.</span></div><div className="award-grid">{achieved.map(a=><div className={`award-tile ${a.earned?'earned':'locked'}`} key={a.id}><div className="award-symbol">{a.id==='first'?<Sparkles/>:a.id==='ten'?<Zap/>:a.id==='streak'?<Flame/>:a.id==='centurion'?<Trophy/>:<Target/>}</div><strong>{a.title}</strong><span>{a.detail}</span><Pill tone={a.earned?'green':'muted'}>{a.earned?'Unlocked':'Locked'}</Pill></div>)}</div></>}
        </>}
        {screen==='goals'&&<>
          <PageHeader kicker="YOUR LONG GAME" title="Objectives" subtitle="Turn ambitions into measurable targets."/>
          <div className="goal-summary"><div><span className="eyebrow">ACTIVE GOALS</span><strong>{data.goals.filter(g=>!g.completed).length}</strong></div><div><span className="eyebrow">COMPLETED</span><strong>{data.goals.filter(g=>g.completed).length}</strong></div><button onClick={()=>setModal('goal')} className="round-add" aria-label="Create goal"><Plus size={22}/></button></div>
          <SectionTitle title="Active quests" action="New goal" onClick={()=>setModal('goal')}/>
          {data.goals.length?<div className="goal-list">{data.goals.map(g=>{const pct=Math.min(100,Math.round(g.current/g.target*100));return <div className="goal-card" key={g.id}><div className="goal-card-top"><div><Pill tone={g.completed?'green':'violet'}>{g.completed?'COMPLETE':LABELS[g.attribute].toUpperCase()}</Pill><h3>{g.title}</h3></div><button className="icon-button faint" aria-label={`Delete goal ${g.title}`} onClick={()=>mutation(()=>db.goals.delete(g.id),'Goal removed')}><Trash2 size={16}/></button></div><div className="goal-numbers"><strong>{formatNumber(g.current)} <small>/ {formatNumber(g.target)} {g.unit}</small></strong><span>{pct}%</span></div><div className="track bigger"><span style={{width:`${pct}%`}}/></div><div className="goal-foot"><small>{g.due?'Due '+shortDate(g.due):'No deadline'}</small><div className="increment-actions"><button aria-label="Subtract one" disabled={g.current<=0} onClick={()=>mutation(()=>db.goals.update(g.id,{current:Math.max(0,g.current-1),completed:false}),'Goal updated')}><Minus size={15}/></button><button aria-label="Add one" disabled={g.completed} onClick={()=>mutation(()=>db.goals.update(g.id,{current:Math.min(g.target,g.current+1),completed:g.current+1>=g.target}),'Goal updated')}><Plus size={15}/></button></div></div></div>;})}</div>:<EmptyState icon={Target} title="Set your first target" body="Create a goal with a number to work towards."/>}
          <div className="info-card"><Target size={19}/><div><strong>Quest rules</strong><p>Quest progress is separate from XP. Complete a real target and log a milestone activity to claim the XP you decide it deserves.</p></div></div>
          <button className="primary-button full-button bottom-cta" onClick={()=>setModal('goal')}><Plus size={19}/> Create goal</button>
        </>}
        {screen==='journal'&&<>
          <PageHeader kicker="PRIVATE RECORD" title="Journal" subtitle="A private record of decisions and lessons."/>
          <div className="journal-hero"><span className="eyebrow">DAILY REFLECTION</span><h2>What did you learn today?</h2><p>Document the wins, the lessons, and the adjustments.</p><button className="primary-button" onClick={()=>setModal('journal')}><NotebookPen size={17}/> Write an entry</button></div>
          <SectionTitle title="Weekly review"/>
          <div className="review-card"><div className="review-head"><CalendarDays size={20}/><div><strong>Last 7 days</strong><span>Auto-generated performance summary</span></div></div><div className="review-numbers"><div><strong>{weeklyXp}</strong><span>XP earned</span></div><div><strong>{scored.filter(a=>a.date>=dateOffset(-6)).length}</strong><span>Actions</span></div><div><strong>{new Set(scored.filter(a=>a.date>=dateOffset(-6)).map(a=>a.date)).size}</strong><span>Active days</span></div></div><button className="secondary-button" onClick={()=>setModal('journal')}>Add reflection <ArrowRight size={16}/></button></div>
          <SectionTitle title="Past entries"/>
          {data.journal.length?<div className="journal-list">{[...data.journal].sort((a,b)=>b.date.localeCompare(a.date)).map(j=><div className="entry-card" key={j.id}><div className="entry-date"><span>{shortDate(j.date)}</span><Pill tone={j.kind==='review'?'violet':'muted'}>{j.kind==='review'?'Weekly review':'Reflection'}</Pill><span className="entry-mood">{'●'.repeat(j.mood)}{'○'.repeat(5-j.mood)}</span></div><p>{j.text}</p><button className="entry-delete" onClick={()=>mutation(()=>db.journal.delete(j.id),'Entry deleted')} aria-label="Delete journal entry"><Trash2 size={15}/></button></div>)}</div>:<EmptyState icon={NotebookPen} title="Your journal begins here" body="A few lines a day becomes a valuable record over time."/>}
        </>}
      </main>
      <nav className="tabbar" aria-label="Main navigation">{(['home','today','progress','goals','journal'] as Screen[]).map(name=>{const Icon=ICONS[name];return <button key={name} className={`tab ${screen===name?'active':''}`} onClick={()=>setScreen(name)} aria-current={screen===name?'page':undefined}><Icon size={21} strokeWidth={screen===name?2.4:1.85}/><span>{name[0].toUpperCase()+name.slice(1)}</span></button>;})}</nav>
    </div>
    {modal==='activity'&&<ActivityModal initial={selectedHabit} close={()=>{setModal(null);setSelectedHabit(null);}} save={saveAction}/>}
    {modal==='goal'&&<GoalModal close={()=>setModal(null)} save={(goal)=>mutation(()=>db.goals.put(goal),'Goal created')}/>}
    {modal==='journal'&&<JournalModal close={()=>setModal(null)} save={(entry)=>mutation(()=>db.journal.put(entry),'Journal entry saved')}/>}
    {modal==='finance'&&<FinanceModal close={()=>setModal(null)} save={(entry)=>mutation(()=>db.transactions.put(entry),'Transaction added')}/>}
    {modal==='milestone'&&<MilestoneModal attribute={milestoneAttribute} next={progressFor(milestoneAttribute,scored,data.unlocks).nextLevel} close={()=>setModal(null)} save={async(note)=>{
      const next=progressFor(milestoneAttribute,scored,data.unlocks).nextLevel;
      await mutation(()=>db.transaction('rw',[db.unlocks,db.actions],async()=>{
        await db.unlocks.put({id:uid(),attribute:milestoneAttribute,level:next,date:today,note});
        await db.actions.put({id:uid(),date:today,createdAt:Date.now(),title:`Level ${next} milestone — ${LABELS[milestoneAttribute]}`,attribute:milestoneAttribute,baseXp:50,kind:'milestone',note});
      }),`Level ${next} milestone unlocked`);
    }}/>}
    {modal==='settings'&&<SettingsModal data={data} fileRef={fileRef} close={()=>setModal(null)} save={async(settings)=>mutation(()=>db.settings.put({id:'main',value:settings}),'Settings saved')} toggle={async(h)=>{try{await db.habits.put(h);await reload();toastMessage('Habits updated');}catch{toastMessage('Could not update habit');}}} exportData={async()=>{try{await exportBackup();await reload();toastMessage('Backup downloaded');}catch{toastMessage('Backup failed');}}} importData={async(file)=>{try{const content=await file.text();await importSnapshot(JSON.parse(content));await reload();setModal(null);toastMessage('Backup restored');}catch(e){toastMessage(e instanceof Error?e.message:'Import failed');}}}/>}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}
    {unlocksToDo.length>0&&screen==='home'&&<button className="milestone-banner" onClick={()=>{setMilestoneAttribute(unlocksToDo[0]);setModal('milestone');}}><LockKeyhole size={17}/> {LABELS[unlocksToDo[0]]} milestone ready<ChevronRight size={16}/></button>}
  </div>;
}
function PageHeader({kicker,title,subtitle}:{kicker:string;title:string;subtitle:string}){return <div className="page-header"><span className="eyebrow">{kicker}</span><h1>{title}<span className="accent-dot">.</span></h1><p>{subtitle}</p></div>;}
function HabitRow({habit,done,onToggle}:{habit:Habit;done:boolean;onToggle:()=>void}){const Icon=ATTR_ICONS[habit.attribute];return <button className={`habit-row ${done?'is-done':''}`} onClick={onToggle} aria-pressed={done}><span className="habit-check">{done&&<Check size={17} strokeWidth={3}/>}</span><span className="habit-copy"><strong>{habit.title}</strong><small>{habit.detail}</small></span><span className="habit-xp">+{habit.xp} XP</span><Icon size={16} className="habit-attr"/></button>;}
function FitnessPanel({actions,onLog}:{actions:ReturnType<typeof scoreActions>;onLog:()=>void}){
  const training=actions.filter(a=>a.attribute==='physical');const volume=training.reduce((s,a)=>s+(a.metrics?.sets||0)*(a.metrics?.reps||0)*(a.metrics?.weight||0),0);
  const weighted=training.filter(a=>a.metrics?.weight);const pr=weighted.length?Math.max(...weighted.map(a=>a.metrics!.weight!)):0;
  return <><div className="two-mini-stats"><div><span>PHYSICAL ACTIVITIES</span><strong>{training.length}</strong></div><div><span>MAX LOGGED WEIGHT</span><strong>{pr}<small> kg</small></strong></div></div><div className="metric-card fitness-volume"><span className="metric-label"><Dumbbell size={16}/> LOGGED TRAINING VOLUME</span><strong className="big-metric">{formatNumber(volume)}<small> kg</small></strong><p>Calculated from sets × reps × weight in workout entries. Only includes recorded measurements.</p></div><SectionTitle title="Physical activity history"/>{training.length?<div className="list-card">{[...training].reverse().slice(0,14).map(a=><div className="history-row" key={a.id}><div className="skill-icon"><Dumbbell size={17}/></div><div><strong>{a.title}</strong><small>{shortDate(a.date)}{a.metrics?.sets?` · ${a.metrics.sets}×${a.metrics.reps||0} at ${a.metrics.weight||0} kg`:''}</small></div><Pill tone="violet">+{a.earned} XP</Pill></div>)}</div>:<EmptyState icon={Dumbbell} title="Your training log is empty" body="Log a workout to see your strength and consistency history."/>}<button className="primary-button full-button bottom-cta" onClick={onLog}><Plus size={19}/> Log workout</button></>;
}
function FinancePanel({transactions,openAdd}:{transactions:Transaction[];openAdd:()=>void}){
  const income=transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);const expenses=transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  return <><div className="finance-total"><span className="eyebrow">NET TRACKED CASH FLOW</span><strong>{money(income-expenses)}</strong><p>Manual entries only · Not a bank balance</p></div><div className="two-mini-stats"><div><span><ArrowDownLeft size={14}/> INCOME</span><strong className="positive">{money(income)}</strong></div><div><span><ArrowUpRight size={14}/> EXPENSES</span><strong>{money(expenses)}</strong></div></div><SectionTitle title="Transactions" action="Add" onClick={openAdd}/>{transactions.length?<div className="list-card">{[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).map(t=><div className="history-row" key={t.id}><div className="skill-icon">{t.type==='income'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</div><div><strong>{t.description}</strong><small>{shortDate(t.date)}</small></div><strong className={t.type==='income'?'positive':''}>{t.type==='income'?'+':'−'}{money(t.amount)}</strong></div>)}</div>:<EmptyState icon={Wallet} title="No transactions yet" body="Add income or expenses to see your manually tracked cash flow."/>}<button className="primary-button full-button bottom-cta" onClick={openAdd}><Plus size={19}/> Add transaction</button></>;
}
function Overlay({title,subtitle,close,children}:{title:string;subtitle?:string;close:()=>void;children:ReactNode}){useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[close]);return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><div className="modal-handle"/><div className="modal-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={close} aria-label="Close"><X size={21}/></button></div>{children}</section></div>;}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>;}
function ActivityModal({initial,close,save}:{initial:Habit|null;close:()=>void;save:(a:Omit<Action,'id'|'createdAt'>)=>Promise<void>}){
  const [title,setTitle]=useState(initial?.title||'');const [attribute,setAttribute]=useState<Attribute>(initial?.attribute||'physical');const [xp,setXp]=useState(initial?.xp||10);const [kind,setKind]=useState<'routine'|'milestone'>('routine');const [date,setDate]=useState(dateKey());const [note,setNote]=useState('');const [sets,setSets]=useState('');const [reps,setReps]=useState('');const [weight,setWeight]=useState('');const [duration,setDuration]=useState('');const [busy,setBusy]=useState(false);
  const submit=async(e:FormEvent)=>{e.preventDefault();if(!title.trim()||busy)return;setBusy(true);try{await save({title:title.trim(),date,attribute,baseXp:kind==='milestone'?50:xp,kind,templateId:initial?.id,note,metrics:{sets:sets?Number(sets):undefined,reps:reps?Number(reps):undefined,weight:weight?Number(weight):undefined,duration:duration?Number(duration):undefined}});}finally{setBusy(false);}};
  return <Overlay title="Log an activity" subtitle="One action. One primary attribute." close={close}><form className="modal-form" onSubmit={submit}>
    <Field label="WHAT DID YOU DO?"><input autoFocus placeholder="e.g. Bench press, Spanish practice" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={90}/></Field>
    <div className="two-fields"><Field label="ATTRIBUTE"><select value={attribute} onChange={e=>setAttribute(e.target.value as Attribute)}>{allAttributes.filter(a=>a!=='business').map(a=><option key={a} value={a}>{LABELS[a]}</option>)}</select></Field><Field label="DATE"><input type="date" max={dateKey()} value={date} onChange={e=>setDate(e.target.value)} required/></Field></div>
    <Field label="ACTION TYPE"><div className="choice-row"><button type="button" className={kind==='routine'?'selected':''} onClick={()=>setKind('routine')}>Routine</button><button type="button" className={kind==='milestone'?'selected':''} onClick={()=>setKind('milestone')}>Major milestone</button></div></Field>
    {kind==='routine'?<Field label="BASE XP"><div className="xp-options">{[5,10,15,20].map(n=><button type="button" className={xp===n?'selected':''} onClick={()=>setXp(n)} key={n}>+{n}</button>)}</div><small className="helper">Repeated actions have diminishing returns; routine XP is capped at 30 per attribute/day.</small></Field>:<div className="info-note"><Trophy size={16}/> Major milestones award 50 XP. Use these for meaningful achievements, not everyday tasks.</div>}
    <div className="two-fields"><Field label="SETS (OPTIONAL)"><input inputMode="numeric" type="number" min="0" max="100" value={sets} onChange={e=>setSets(e.target.value)} placeholder="3"/></Field><Field label="REPS (OPTIONAL)"><input inputMode="numeric" type="number" min="0" max="1000" value={reps} onChange={e=>setReps(e.target.value)} placeholder="8"/></Field></div>
    <div className="two-fields"><Field label="WEIGHT (KG)"><input inputMode="decimal" type="number" min="0" step="0.5" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="80"/></Field><Field label="MINUTES"><input inputMode="numeric" type="number" min="0" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="30"/></Field></div>
    <Field label={kind==='milestone'?'MILESTONE EVIDENCE':'NOTE (OPTIONAL)'}><textarea rows={2} placeholder="Useful context or measurable result" value={note} onChange={e=>setNote(e.target.value)} minLength={kind==='milestone'?12:undefined} required={kind==='milestone'} maxLength={500}/></Field>
    <button className="primary-button full-button" disabled={busy||!title.trim()||(kind==='milestone'&&note.trim().length<12)} type="submit"><Save size={18}/> Save activity</button>
  </form></Overlay>;
}
function GoalModal({close,save}:{close:()=>void;save:(g:Goal)=>Promise<void>}){
  const [title,setTitle]=useState('');const [target,setTarget]=useState('10');const [unit,setUnit]=useState('sessions');const [due,setDue]=useState('');const [attr,setAttr]=useState<Attribute>('discipline');
  return <Overlay title="Create a goal" subtitle="Make the objective measurable." close={close}><form className="modal-form" onSubmit={async e=>{e.preventDefault();if(Number(target)<=0)return;await save({id:uid(),title:title.trim(),target:Number(target),current:0,unit:unit.trim(),due:due||undefined,attribute:attr,completed:false});}}><Field label="GOAL NAME"><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Complete 20 training sessions" required maxLength={90}/></Field><div className="two-fields"><Field label="TARGET NUMBER"><input type="number" min="1" value={target} onChange={e=>setTarget(e.target.value)} required/></Field><Field label="UNIT"><input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="sessions" maxLength={30}/></Field></div><div className="two-fields"><Field label="PRIMARY ATTRIBUTE"><select value={attr} onChange={e=>setAttr(e.target.value as Attribute)}>{attributes.map(a=><option key={a} value={a}>{LABELS[a]}</option>)}</select></Field><Field label="DUE DATE (OPTIONAL)"><input type="date" value={due} onChange={e=>setDue(e.target.value)}/></Field></div><button className="primary-button full-button" type="submit"><Target size={18}/> Create goal</button></form></Overlay>;
}
function JournalModal({close,save}:{close:()=>void;save:(j:Journal)=>Promise<void>}){const [text,setText]=useState('');const [mood,setMood]=useState<1|2|3|4|5>(3);const [kind,setKind]=useState<'daily'|'review'>('daily');const [date,setDate]=useState(dateKey());return <Overlay title="Journal entry" subtitle="A few deliberate lines are enough." close={close}><form className="modal-form" onSubmit={async e=>{e.preventDefault();await save({id:uid(),text:text.trim(),date,mood,kind});}}><Field label="ENTRY TYPE"><div className="choice-row"><button type="button" className={kind==='daily'?'selected':''} onClick={()=>setKind('daily')}>Daily reflection</button><button type="button" className={kind==='review'?'selected':''} onClick={()=>setKind('review')}>Weekly review</button></div></Field><Field label="DATE"><input type="date" value={date} max={dateKey()} onChange={e=>setDate(e.target.value)}/></Field><Field label="HOW WAS TODAY?"><div className="mood-picker">{([1,2,3,4,5] as const).map(n=><button type="button" className={mood===n?'selected':''} onClick={()=>setMood(n)} key={n}>{n}</button>)}</div></Field><Field label={kind==='review'?'WHAT WORKED? WHAT NEEDS TO CHANGE?':'REFLECTION'}><textarea autoFocus value={text} onChange={e=>setText(e.target.value)} rows={7} placeholder={kind==='review'?'Wins, missed targets, lessons, and next week’s priorities...':'What happened? What did you learn? What matters tomorrow?'} required minLength={3}/></Field><button className="primary-button full-button" type="submit"><Save size={18}/> Save entry</button></form></Overlay>;}
function FinanceModal({close,save}:{close:()=>void;save:(t:Transaction)=>Promise<void>}){const [type,setType]=useState<'income'|'expense'>('expense');const [amount,setAmount]=useState('');const [description,setDescription]=useState('');const [date,setDate]=useState(dateKey());return <Overlay title="Add transaction" subtitle="Manual finances, no bank connection." close={close}><form className="modal-form" onSubmit={async e=>{e.preventDefault();if(Number(amount)<=0)return;await save({id:uid(),date,description:description.trim(),amount:Math.round(Number(amount)*100)/100,type});}}><Field label="TYPE"><div className="choice-row"><button type="button" className={type==='income'?'selected':''} onClick={()=>setType('income')}>Income</button><button type="button" className={type==='expense'?'selected':''} onClick={()=>setType('expense')}>Expense</button></div></Field><Field label="AMOUNT (£)"><input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="25.00"/></Field><Field label="DESCRIPTION"><input value={description} onChange={e=>setDescription(e.target.value)} required maxLength={90} placeholder="What was this for?"/></Field><Field label="DATE"><input type="date" value={date} max={dateKey()} onChange={e=>setDate(e.target.value)} required/></Field><button className="primary-button full-button" type="submit"><Save size={18}/> Save transaction</button></form></Overlay>;}
function MilestoneModal({attribute,next,close,save}:{attribute:Attribute;next:number;close:()=>void;save:(note:string)=>Promise<void>}){const [note,setNote]=useState('');return <Overlay title={`Unlock level ${next}`} subtitle={`${LABELS[attribute]} · Milestone checkpoint`} close={close}><form className="modal-form" onSubmit={async e=>{e.preventDefault();if(note.trim().length>=12)await save(note.trim());}}><div className="milestone-illustration"><LockKeyhole size={31}/><strong>Prove the progress.</strong><p>Every fifth level requires a meaningful real-world milestone. Record what you've achieved to unlock the next level.</p></div><Field label="WHAT MILESTONE DID YOU ACHIEVE?"><textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} minLength={12} required placeholder="Describe a specific result or achievement..."/></Field><button className="primary-button full-button" type="submit" disabled={note.trim().length<12}><Trophy size={18}/> Confirm milestone (+50 XP)</button></form></Overlay>;}
function SettingsModal({data,fileRef,close,save,toggle,exportData,importData}:{data:Snapshot;fileRef:RefObject<HTMLInputElement|null>;close:()=>void;save:(s:Settings)=>Promise<void>;toggle:(h:Habit)=>Promise<void>;exportData:()=>Promise<void>;importData:(f:File)=>Promise<void>}){
  const [brand,setBrand]=useState(data.settings.brand);const [reminder,setReminder]=useState(data.settings.reminderHour);const [localHabits,setLocalHabits]=useState(data.habits);
  return <Overlay title="Your settings" subtitle="Personalise your operating system." close={close}><div className="modal-form"><Field label="APP NAME"><input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="SAINT PROTOCOL" maxLength={22}/></Field><Field label="DAILY IN-APP REMINDER"><select value={reminder} onChange={e=>setReminder(e.target.value)}><option value="off">Off</option>{['07:00','09:00','12:00','17:00','18:00','19:00','20:30','21:00','22:00'].map(t=><option key={t} value={t}>{t}</option>)}</select><small className="helper">Only appears when the app is open after this time. No background notifications.</small></Field><button className="primary-button full-button" onClick={()=>save({...data.settings,brand:brand.trim()||'SAINT PROTOCOL',reminderHour:reminder})}><Save size={17}/> Save preferences</button><div className="setting-divider"/><span className="field-label">ACTIVE DAILY STANDARDS</span><div className="settings-habits">{localHabits.map(h=><button key={h.id} onClick={async()=>{const updated={...h,enabled:!h.enabled};setLocalHabits(prev=>prev.map(x=>x.id===h.id?updated:x));await toggle(updated);}}><span className={`small-check ${h.enabled?'checked':''}`}>{h.enabled&&<Check size={13}/>}</span><span>{h.title}</span><Pill>{h.frequency}</Pill></button>)}</div><div className="setting-divider"/><span className="field-label">DATA OWNERSHIP</span><p className="settings-explain">Your records are stored on this device in IndexedDB. Clearing Safari website data or removing the web app can delete them. Save JSON backups to Files regularly.</p><button className="secondary-button full-button" onClick={exportData}><Download size={17}/> Export JSON backup</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async e=>{const file=e.target.files?.[0];if(file){if(confirm('Replace all current app data with this backup? This cannot be undone.'))await importData(file);e.target.value='';}}}/><button className="secondary-button full-button" onClick={()=>fileRef.current?.click()}><Upload size={17}/> Restore from JSON backup</button>{data.settings.lastBackup&&<small className="helper">Last export: {new Date(data.settings.lastBackup).toLocaleString('en-GB')}</small>}<div className="info-note"><CircleHelp size={16}/> PWA notifications while closed and automatic cloud sync are not included in this local-only version.</div></div></Overlay>;
}
export default App;
