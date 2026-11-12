// Source-only BP-03/BP-04 local test. NEVER run against a hosted Supabase project.
// Existing local-postgres-rls workflow invokes this after its disposable stack starts.
// All users, credentials, rows, and the conditional function are LOCAL synthetic fixtures.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createClient} from '@supabase/supabase-js';

const api=process.env.API_URL;
assert.match(api??'',/^http:\/\/127\.0\.0\.1:\d+$/,'Only loopback Supabase is permitted');
assert.ok(process.env.ANON_KEY&&process.env.SERVICE_ROLE_KEY,'Disposable LOCAL API keys required');
assert.ok(!process.env.ORBIT_SUPABASE_URL&&!process.env.SUPABASE_ACCESS_TOKEN,
  'Refuse any hosted Supabase context');
const containers=execFileSync('docker',['ps','--format','{{.Names}}'],{encoding:'utf8'})
 .trim().split('\n').filter(name=>name==='supabase_db_orbit-local');
assert.equal(containers.length,1,'Exactly one disposable orbit-local Postgres container required');
const CONTAINER=containers[0];
const psqlArgs=['exec','-i',CONTAINER,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1',
 '-U','postgres','-d','postgres'];
const sql=(statement,timeout=30000)=>execFileSync('docker',psqlArgs,{
 input:statement,encoding:'utf8',timeout,maxBuffer:16*1024*1024
}).trim();
const fixture=readFileSync(new URL('../../supabase/tests/fixtures/bp03_conditional_owner_rpc.sql.inc',import.meta.url),'utf8');
assert.match(fixture,/DO NOT COPY INTO supabase\/migrations/);
const uid=()=>randomUUID().replaceAll('-','').slice(0,12);
const suffix=uid();
const makeClient=key=>createClient(api,key,{
 auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
});
const admin=makeClient(process.env.SERVICE_ROLE_KEY);
const anonKey=process.env.ANON_KEY;
const password='local-conditional-'+randomUUID()+'W9!';
const createUser=async label=>{
 const email='bp03-'+label+'-'+suffix+'@example.invalid';
 const r=await admin.auth.admin.createUser({email,password,email_confirm:true});
 assert.ifError(r.error);
 assert.ok(r.data?.user?.id);
 return {email,id:r.data.user.id};
};
const login=async u=>{
 const client=makeClient(anonKey);
 const r=await client.auth.signInWithPassword({email:u.email,password});
 assert.ifError(r.error);
 assert.equal(r.data.user.id,u.id);
 assert.ok(r.data.session?.access_token);
 return {client,token:r.data.session.access_token};
};
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
const sessionSql=(u,stmt)=>sql('begin; set local role authenticated;'+
 'set local request.jwt.claim.sub='+quote(u.id)+'; '+stmt+' commit;');
const median=x=>{const y=[...x].sort((a,b)=>a-b);return y[Math.floor(y.length/2)];};
const round=x=>Math.round(x*1000)/1000;
const calls={auth:0,rpc:0};
const rawRpc=async (token,name,args={})=>{
 calls.rpc++;
 const started=performance.now();
 const response=await fetch(api+'/rest/v1/rpc/'+name,{
  method:'POST',
  headers:{apikey:anonKey,Authorization:token?'Bearer '+token:'Bearer '+anonKey,
   'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify(args),
  signal:AbortSignal.timeout(20000),
 });
 const body=Buffer.from(await response.arrayBuffer());
 let data;
 try{data=JSON.parse(body.toString('utf8'))}catch{throw Error('Local RPC returned invalid JSON: '+name);}
 return {status:response.status,data,bytes:body.length,ms:round(performance.now()-started),
  contentEncoding:response.headers.get('content-encoding')??'identity'};
};
const requireOk=(r,op)=>{
 assert.equal(r.status,200,op+' HTTP status; code='+(r.data?.code??'unknown'));
 assert.ok(r.data&&typeof r.data==='object',op+' returned object');
 return r.data;
};
const load=async(session,name,args={})=>requireOk(await rawRpc(session.token,name,args),name);
const repeatRpc=async(session,name,args,n=3)=>{
 const runs=[];
 for(let i=0;i<n;i++){
  const response=await rawRpc(session.token,name,args);
  requireOk(response,name);
  runs.push(response);
 }
 assert.ok(runs.every(x=>x.bytes===runs[0].bytes),'Repeated local response must be stable');
 return {bytes:runs[0].bytes,medianMs:round(median(runs.map(x=>x.ms))),
  contentEncoding:runs[0].contentEncoding};
};
const waitForPgSleep=async(name)=>{
 const start=performance.now();
 while(performance.now()-start<7000){
  const active=sql('select count(*) from pg_stat_activity where application_name='+quote(name)+
   " and wait_event='PgSleep';");
  if(active==='1')return;
  await new Promise(done=>setTimeout(done,70));
 }
 throw Error('Concurrent writer never entered observed pg_sleep');
};
const launchWriter=(u,stmt,tag)=>{
 const child=spawn('docker',psqlArgs,{stdio:['pipe','pipe','pipe']});
 let output='';
 child.stdout.on('data',b=>{output+=b.toString().slice(0,1000)});
 child.stderr.on('data',b=>{output+=b.toString().slice(0,1000)});
 const done=new Promise((resolve,reject)=>{
  child.once('error',reject);
  child.once('close',code=>code===0?resolve():reject(Error('Local concurrency writer failed, exit '+code+
   ', output redacted: '+(output.includes('ERROR')?'Postgres error':'unknown'))));
 });
 child.stdin.end('set application_name='+quote(tag)+'; begin; set local role authenticated;'+
  'set local request.jwt.claim.sub='+quote(u.id)+'; '+stmt+
  'select pg_sleep(2.0); commit;');
 return done;
};
const findPlanNodes=(node,out=[])=>{
 if(!node||typeof node!=='object')return out;
 if(node['Node Type'])out.push(node);
 for(const value of Object.values(node))if(typeof value==='object')findPlanNodes(value,out);
 return out;
};
// Explain the EXACT SELECT from the proposal. EXPLAIN of a PL/pgSQL function
// call hides nested statement plans, so inspect the extracted in-function SQL.
const statement=fixture.match(/  select case when current\.revision=p_known_revision[\s\S]*?\n  from \(select coalesce\(\(select revision from private\.workspace_revisions where owner_id=owner_uuid\),0\) as revision\) as current;/)?.[0];
assert.ok(statement,'Cannot extract exact conditional SELECT for EXPLAIN');
const explain=(u,revision)=>{
 assert.ok(Number.isSafeInteger(revision)&&revision>=0);
 const query=statement.replace('into result','')
  .replace(/\bowner_uuid\b/g,'auth.uid()')
  .replace(/\bp_known_revision\b/g,String(revision));
 const output=sql('begin; set local role authenticated; set local request.jwt.claim.sub='+
   quote(u.id)+'; explain (analyze,buffers,format json) '+query+' rollback;',45000);
 const plan=JSON.parse(output);
 assert.ok(Array.isArray(plan)&&plan[0]?.Plan,'EXPLAIN JSON expected');
 const nodes=findPlanNodes(plan[0].Plan);
 return {aggregateNodes:nodes.filter(n=>n['Node Type']==='Aggregate').length,
  aggregateLoops:nodes.filter(n=>n['Node Type']==='Aggregate')
   .reduce((sum,n)=>sum+Number(n['Actual Loops']??0),0),
  taskLoops:nodes.filter(n=>n['Relation Name']==='tasks')
   .reduce((sum,n)=>sum+Number(n['Actual Loops']??0),0),
  executionMs:round(plan[0]['Execution Time'])};
};

const seed=(u,branchName)=>{
 sessionSql(u,'insert into public.branches(owner_id,id,label) values(auth.uid(),'+quote(branchName)+
  ",'Local synthetic branch');"+
  "insert into public.preferences(owner_id,extensions) values(auth.uid(),"+
  quote(JSON.stringify({testMarker:u===userA?'A_SYNTH_ONLY':'B_SYNTH_ONLY'}))+"::jsonb);");
};
const seedTasks=(u,branchName,from,to)=>{
 assert.ok(from>=1&&to>=from&&to<=3000);
 sessionSql(u,
 'insert into public.tasks(owner_id,id,project_id,title,description,urgency,effort_minutes,status) '+
 "select auth.uid(), 'bench-'||lpad(i::text,5,'0'),"+quote(branchName)+
 ", 'Synthetic task '||i,repeat('x',220),2,30,'ready' "+
 'from generate_series('+from+','+to+') as g(i);');
};

let applied=false,userA,userB,a,b,bSecond;
try{
 // Check that migration replay did NOT automatically install the prototype.
 const pre=sql("select to_regprocedure('public.load_owner_snapshot_if_changed(bigint)') is null;");
 assert.equal(pre,'t','Proposal unexpectedly active before disposable fixture installation');
 sql(fixture);
 applied=true;
 sql("notify pgrst, 'reload schema';");
 userA=await createUser('a');userB=await createUser('b');
 calls.auth+=2;
 a=await login(userA);b=await login(userB);bSecond=await login(userB);
 calls.auth+=3;
 // Local PostgREST needs a schema-cache notification after fixture-only CREATE.
 let ready=false;
 for(let attempt=0;attempt<12;attempt++){
  const check=await rawRpc(a.token,'load_owner_snapshot_if_changed',{p_known_revision:0});
  if(check.status===200){ready=true;break}
  assert.ok(check.status===404&&check.data?.code==='PGRST202',
   'Unexpected local function error during schema reload');
  await new Promise(done=>setTimeout(done,150));
 }
 assert.ok(ready,'Local PostgREST did not register the proposed function');
 const anonymous=await rawRpc(null,'load_owner_snapshot_if_changed',{p_known_revision:0});
 assert.ok([401,403,404].includes(anonymous.status),'Anon RPC must be denied');
 assert.ok(anonymous.data?.code==='42501'||anonymous.data?.code==='PGRST202'||
  anonymous.data?.code==='PGRST301','Anon must fail authorization or schema-visibility only');

 const emptyA=await load(a,'load_owner_snapshot_if_changed',{p_known_revision:0});
 const emptyB=await load(b,'load_owner_snapshot_if_changed',{p_known_revision:0});
 assert.deepEqual(emptyA,{revision:0,unchanged:true});
 assert.deepEqual(emptyB,{revision:0,unchanged:true});
 for(const bad of [null,-1]){
  const denied=await rawRpc(a.token,'load_owner_snapshot_if_changed',{p_known_revision:bad});
  assert.equal(denied.data?.code,'22023','Null/negative known revision must fail closed');
 }
 seed(userA,'bench-a');seed(userB,'bench-b');
 seedTasks(userB,'bench-b',1,1);
 const aFirst=await load(a,'load_owner_snapshot',{});
 const bFirst=await load(b,'load_owner_snapshot',{});
 assert.equal(bFirst.snapshot.tasks[0].title,'Synthetic task 1');
 assert.notDeepEqual(aFirst.snapshot.extensions,bFirst.snapshot.extensions);
 assert.equal(aFirst.snapshot.extensions.testMarker,'A_SYNTH_ONLY');
 assert.equal(bFirst.snapshot.extensions.testMarker,'B_SYNTH_ONLY');
 const bFromA=await load(b,'load_owner_snapshot_if_changed',{p_known_revision:aFirst.revision});
 assert.ok(JSON.stringify(bFromA).includes('B_SYNTH_ONLY')||
  bFromA.unchanged===true,'B must see only B revision and metadata');
 assert.ok(!JSON.stringify(bFromA).includes('A_SYNTH_ONLY'),'B must not see A private extension');
 assert.ok(!JSON.stringify(bFromA).includes('bench-a'),'B must not see A private tasks');

 // Two independent local bearer sessions race with the SAME CAS baseline.
 const draft1=structuredClone(bFirst.snapshot),draft2=structuredClone(bFirst.snapshot);
 draft1.profile={displayName:'Synthetic B device one'};
 draft2.profile={displayName:'Synthetic B device two'};
 const attempts=await Promise.all([
  rawRpc(b.token,'save_owner_snapshot',{p_snapshot:draft1,p_expected_revision:bFirst.revision}),
  rawRpc(bSecond.token,'save_owner_snapshot',{p_snapshot:draft2,p_expected_revision:bFirst.revision}),
 ]);
 const successes=attempts.filter(x=>x.status===200),conflicts=attempts.filter(x=>x.data?.code==='PT409');
 assert.equal(successes.length,1,'Exactly one competing CAS write must succeed');
 assert.equal(conflicts.length,1,'Exactly one competing CAS write must conflict');
 assert.ok((await load(b,'load_owner_snapshot',{})).revision>bFirst.revision);
 const measures=[];
 let prior=0;
 for(const count of [30,300,3000]){
  seedTasks(userA,'bench-a',prior+1,count);prior=count;
  const canonical=await load(a,'load_owner_snapshot',{});
  assert.equal(canonical.snapshot.tasks.length,count);
  assert.equal(canonical.snapshot.extensions.testMarker,'A_SYNTH_ONLY');
  const changed=await load(a,'load_owner_snapshot_if_changed',{p_known_revision:0});
  assert.deepEqual(changed,canonical,'Full changed projection must equal canonical snapshot');
  const equal=await load(a,'load_owner_snapshot_if_changed',{p_known_revision:canonical.revision});
  assert.deepEqual(equal,{revision:canonical.revision,unchanged:true});
  const unexpectedFuture=await load(a,'load_owner_snapshot_if_changed',{
    p_known_revision:canonical.revision+9999});
  assert.deepEqual(unexpectedFuture,canonical,'Future known revision cannot yield unchanged');

  const full=await repeatRpc(a,'load_owner_snapshot',{},3);
  const minimal=await repeatRpc(a,'load_owner_snapshot_if_changed',{
    p_known_revision:canonical.revision},3);
  const fullChanged=await repeatRpc(a,'load_owner_snapshot_if_changed',{p_known_revision:0},3);
  const planUnchanged=explain(userA,canonical.revision);
  const planChanged=explain(userA,0);
  assert.ok(planChanged.aggregateLoops>0,'Changed plan must execute full aggregation');
  assert.equal(planUnchanged.aggregateLoops,0,'Unchanged path must SKIP all collection aggregates');
  assert.equal(planUnchanged.taskLoops,0,'Unchanged plan must not scan tasks');
  assert.ok(minimal.bytes<full.bytes*0.05,'Unchanged output must shrink at least 95%');
  measures.push({tasks:count,oldBytes:full.bytes,unchangedBytes:minimal.bytes,
   changedBytes:fullChanged.bytes,bytesReductionPercent:
   round(100*(1-minimal.bytes/full.bytes)),fullMedianMs:full.medianMs,
   unchangedMedianMs:minimal.medianMs,changedMedianMs:fullChanged.medianMs,
   explain:{unchanged:planUnchanged,changed:planChanged}});
 }
 // A writer holds an uncommitted revision lock. Both the unchanged and changed
 // readers must see the pre-commit pair, then post-commit revision + contents.
 const before=await load(a,'load_owner_snapshot',{});
 const originalTitle=before.snapshot.tasks.find(x=>x.id==='bench-00001')?.title;
 assert.equal(originalTitle,'Synthetic task 1');
 const writer=launchWriter(userA,
  "update public.tasks set title='Synthetic transaction committed' where id='bench-00001';",
  'orbit_w1_conditional_writer');
 await waitForPgSleep('orbit_w1_conditional_writer');
 const duringUnchanged=await load(a,'load_owner_snapshot_if_changed',{
  p_known_revision:before.revision});
 assert.deepEqual(duringUnchanged,{revision:before.revision,unchanged:true},
  'Uncommitted write must not expose a future revision');
 const duringFull=await load(a,'load_owner_snapshot_if_changed',{p_known_revision:0});
 assert.equal(duringFull.revision,before.revision,'Pre-commit full revision must remain consistent');
 assert.equal(duringFull.snapshot.tasks.find(x=>x.id==='bench-00001')?.title,originalTitle,
  'Pre-commit full snapshot must not include uncommitted title');
 await writer;
 const after=await load(a,'load_owner_snapshot_if_changed',{p_known_revision:before.revision});
 assert.ok(after.revision>before.revision,'Committed writer must advance revision');
 assert.equal(after.snapshot.tasks.find(x=>x.id==='bench-00001')?.title,
  'Synthetic transaction committed','Committed snapshot must contain new task title');
 const staleSave=await rawRpc(a.token,'save_owner_snapshot',{
  p_snapshot:before.snapshot,p_expected_revision:before.revision});
 assert.equal(staleSave.data?.code,'PT409','Stale client draft must preserve conflict semantics');
 const fresh=await load(a,'load_owner_snapshot',{});
 assert.equal(fresh.revision,after.revision);
 assert.equal(fresh.snapshot.tasks.find(x=>x.id==='bench-00001')?.title,
  'Synthetic transaction committed','Failed CAS must not overwrite committed data');

 console.log('ORBIT_LOCAL_CONDITIONAL_RPC '+JSON.stringify({
  scope:'disposable-local-bearer-and-postgres',
  tasks:measures,
  httpRpcCalls:calls.rpc,localAuthOperations:calls.auth,
  concurrentWriter:'precommit_consistent_postcommit_visible',
  twoDeviceCas:'one_success_one_PT409',
  tenantIsolation:'A_B_anonymous_denied',
  hostedRequests:0,privateOwnerRows:0,realCredentialsLogged:false,
 }));
}finally{
 await Promise.allSettled([a?.client?.auth.signOut(),b?.client?.auth.signOut(),
  bSecond?.client?.auth.signOut()]);
 // This function lives only in the disposable stack; clean it up explicitly.
 if(applied)sql('drop function if exists public.load_owner_snapshot_if_changed(bigint);');
}
