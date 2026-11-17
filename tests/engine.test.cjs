const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const work = fs.mkdtempSync(path.join(os.tmpdir(),'king-os-tests-'));
for (const file of ['types','engine']) {
  const text = fs.readFileSync(path.resolve(__dirname,'../src',file+'.ts'),'utf8');
  const out = ts.transpileModule(text,{fileName:file+'.ts',compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll("from './types'","from './types.mjs'");
  fs.writeFileSync(path.join(work,file+'.mjs'),out);
}
const engine = import(pathToFileURL(path.join(work,'engine.mjs')).href);
const action=(id,date,title,attribute='sales',baseXp=10,kind='routine')=>({id,date,title,attribute,baseXp,kind,createdAt:Number(id)});
test('threshold formula',async()=>{const {threshold}=await engine;assert.equal(threshold(1),100);assert.equal(threshold(2),125);assert.equal(threshold(5),200);});
test('repeat diminishing returns and daily cap',async()=>{
  const {scoreActions}=await engine;
  const data=[action('1','2026-11-17','Sales calls','sales',20),action('2','2026-11-17','Sales calls','sales',20),action('3','2026-11-17','Sales calls','sales',20),action('4','2026-11-17','Sales calls','sales',20)];
  assert.deepEqual(scoreActions(data).map(a=>a.earned),[20,10,0,0]);
});
test('milestones bypass routine cap',async()=>{
  const {scoreActions}=await engine;
  const data=[action('1','2026-11-17','Calls','sales',30),action('2','2026-11-17','Big result','sales',50,'milestone')];
  assert.deepEqual(scoreActions(data).map(a=>a.earned),[30,50]);
});
test('resilience baseline level 4 is gated before 5',async()=>{
  const {progressFor,scoreActions}=await engine;
  const scored=scoreActions([action('1','2026-11-17','Challenge','resilience',200,'milestone')]);
  const locked=progressFor('resilience',scored,[]);
  assert.equal(locked.level,4);assert.equal(locked.locked,true);
  const unlocked=progressFor('resilience',scored,[{id:'u',attribute:'resilience',level:5,date:'2026-11-17',note:'Documented milestone'}]);
  assert.equal(unlocked.level,5);assert.equal(unlocked.locked,false);
});
test('XP replay is independent of input ordering',async()=>{
  const {scoreActions}=await engine;
  const items=[action('2','2026-11-17','Read','knowledge',10),action('1','2026-11-17','Read','knowledge',10)];
  assert.deepEqual(scoreActions(items).map(a=>a.earned),[10,5]);
});
test('radar lifetime mode uses actual attribute level and next-level progress', async()=>{
  const {radarMetrics, scoreActions}=await engine;
  const scored=scoreActions([action('1','2026-11-17','Practice','sales',50,'milestone')]);
  const metrics=radarMetrics(scored,[],'lifetime','2026-11-17');
  const sales=metrics.find(metric=>metric.attribute==='sales');
  assert.equal(sales.level,1);
  assert.equal(sales.value,1.5);
  assert.equal(metrics.length,8);
  assert.equal(metrics.some(metric=>metric.attribute==='business'),true);
});
test('radar seven-day window includes both endpoints and excludes older or future actions', async()=>{
  const {radarMetrics,scoreActions}=await engine;
  const scored=scoreActions([
    action('1','2026-11-10','Old reading','knowledge',50,'milestone'),
    action('2','2026-11-11','Reading','knowledge',10),
    action('3','2026-11-17','Reading now','knowledge',20),
    action('4','2026-11-18','Future reading','knowledge',50,'milestone')
  ]);
  const metrics=radarMetrics(scored,[],'7d','2026-11-17');
  assert.equal(metrics.find(m=>m.attribute==='knowledge').value,30);
  assert.equal(metrics.find(m=>m.attribute==='sales').value,0);
});
test('radar 30-day view counts correctly and is distinct from lifetime levels',async()=>{
  const {radarMetrics,radarScaleMax,scoreActions}=await engine;
  const scored=scoreActions([
    action('1','2026-10-19','Boundary','physical',10),
    action('2','2026-10-18','Too old','physical',50,'milestone'),
    action('3','2026-11-17','Workout','physical',20)
  ]);
  const metrics=radarMetrics(scored,[],'30d','2026-11-17');
  assert.equal(metrics.find(m=>m.attribute==='physical').value,30);
  assert.equal(radarScaleMax(metrics,'30d'),75);
  const lifetime=radarMetrics(scored,[],'lifetime','2026-11-17');
  assert.equal(lifetime.find(m=>m.attribute==='physical').level,3);
  assert.ok(lifetime.find(m=>m.attribute==='physical').value<30);
});

test('Business is an active eighth attribute and participates in overall level',async()=>{
 const {scoreActions,radarMetrics,overallLevel,progressFor}=await engine;
 const before=overallLevel([],[]);
 const actions=scoreActions([action('8','2026-11-17','First business session','business',100,'milestone')]);
 assert.equal(progressFor('business',actions,[]).level,2);
 assert.equal(radarMetrics(actions,[],'lifetime','2026-11-17').length,8);
 assert.equal(before,2);
});
test('linked goals count actual logged habit sessions after creation, without double counting manual progress',async()=>{
 const {scoreActions,goalProgress}=await engine;
 const actions=scoreActions([
  {...action('1','2026-11-09','Old practice','business',5),templateId:'h-business'},
  {...action('2','2026-11-17','Practice','business',5),templateId:'h-business'},
  {...action('3','2026-11-18','Practice','business',5),templateId:'h-business'},
  {...action('4','2026-11-18','Other','business',5),templateId:'h-other'}]);
 const goal={target:4,current:1,completed:false,linkedHabitId:'h-business',startedAt:'2026-11-17'};
 assert.deepEqual(goalProgress(goal,actions),{current:3,auto:2,completed:false});
 assert.deepEqual(goalProgress({...goal,current:2},actions),{current:4,auto:2,completed:true});
 assert.equal(goalProgress({...goal,linkedHabitId:undefined},actions).current,1);
});

test('weekday sales thresholds count calls once within 50 total contacts',async()=>{
 const {salesSummary,salesMetricsId,SALES_OUTREACH_TARGET,SALES_CALLS_TARGET}=await engine;
 const date='2026-11-17';
 const sample=(calls,emails,messages)=>[{...action('1',date,'Sales totals','sales',0),id:salesMetricsId(date),metrics:{calls,emails,messages}}];
 assert.equal(SALES_OUTREACH_TARGET,50);
 assert.equal(SALES_CALLS_TARGET,30);
 assert.deepEqual(((x)=>[x.total,x.outreachComplete,x.callsComplete])(salesSummary(sample(29,20,0),date)),[49,false,false]);
 assert.deepEqual(((x)=>[x.total,x.outreachComplete,x.callsComplete])(salesSummary(sample(30,20,0),date)),[50,true,true]);
 assert.deepEqual(((x)=>[x.total,x.outreachComplete,x.callsComplete])(salesSummary(sample(10,35,5),date)),[50,true,false]);
 assert.equal(salesSummary(sample(30,20,0),'2026-11-18').total,0);
});
test('sales awards are distinct template IDs and together yield 20 XP',async()=>{
 const {scoreActions,salesAwardId}=await engine;
 const date='2026-11-17';
 const rewards=[
  {...action('1',date,'Outreach','sales',5),id:salesAwardId('outreach',date),templateId:'h-sales'},
  {...action('2',date,'Calls','sales',15),id:salesAwardId('calls',date),templateId:'h-sales-calls'}
 ];
 assert.equal(scoreActions(rewards).reduce((sum,a)=>sum+a.earned,0),20);
});
