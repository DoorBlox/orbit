// Disposable LOCAL Supabase API / RLS regression. Never contact a hosted project.
// Run only in the GitHub Actions job after supabase start; see local-supabase-rls.yml.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const api=process.env.API_URL;
assert.match(api??'',/^http:\/\/127\.0\.0\.1:\d+$/,'Refuse non-loopback Supabase');
assert.ok(process.env.ANON_KEY && process.env.SERVICE_ROLE_KEY,'Local API keys required');
assert.ok(!process.env.ORBIT_SUPABASE_URL && !process.env.SUPABASE_ACCESS_TOKEN,
  'Refuse hosted Supabase context');

const admin=createClient(api,process.env.SERVICE_ROLE_KEY,{
  auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
});
const client=createClient(api,process.env.ANON_KEY,{
  auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
});
const seedPassword='local-only-'+randomUUID()+'Zx9!';
const suffix=randomUUID().slice(0,8);
const makeUser=async label=>{
  const email=`orbit-${label}-${suffix}@example.invalid`;
  const {data,error}=await admin.auth.admin.createUser({
    email,password:seedPassword,email_confirm:true,
  });
  if(error || !data?.user?.id) throw Error('Local synthetic Auth creation failed: '+(error?.code??'missing_user'));
  assert.match(data.user.id,/^[0-9a-f-]{36}$/i);
  return {email,id:data.user.id};
};
const owner=await makeUser('owner'),stranger=await makeUser('nonowner');
assert.notEqual(owner.id,stranger.id);
const signIn=await client.auth.signInWithPassword({email:stranger.email,password:seedPassword});
if(signIn.error || signIn.data?.user?.id!==stranger.id)
  throw Error('Nonowner did not obtain its own local bearer session');

const tables=[
  {table:'profiles',pk:'user_id',column:'user_id',insert:id=>({user_id:id,display_name:'Synthetic test profile'}),patch:{display_name:'Unauthorized test mutation'}},
  {table:'branches',pk:'id',column:'owner_id',insert:id=>({owner_id:id,id:`ci-${suffix}-${id.slice(0,6)}-branch`,label:'Synthetic branch',parent_id:null}),patch:{label:'Unauthorized test mutation'}},
  {table:'tasks',pk:'id',column:'owner_id',insert:(id,index)=>({owner_id:id,id:`ci-${suffix}-${id.slice(0,6)}-task`,project_id:tables[1].ids[index],title:'Synthetic task',status:'ready'}),patch:{title:'Unauthorized test mutation'}},
  {table:'journal_entries',pk:'id',column:'owner_id',insert:id=>({owner_id:id,id:`ci-${suffix}-${id.slice(0,6)}-journal`,entry_date:'2026-11-07',title:'Synthetic journal',body_html:'<p>Dummy text</p>'}),patch:{title:'Unauthorized test mutation'}},
  {table:'milestones',pk:'id',column:'owner_id',insert:id=>({owner_id:id,id:`ci-${suffix}-${id.slice(0,6)}-milestone`,marker_date:'2026-11-07',title:'Synthetic milestone'}),patch:{title:'Unauthorized test mutation'}},
  {table:'widget_layouts',pk:'widget_key',column:'owner_id',insert:id=>({owner_id:id,widget_key:'journal',x:0,y:0,width:400,height:600}),patch:{x:200}},
  {table:'preferences',pk:'owner_id',column:'owner_id',insert:id=>({owner_id:id,color_mode:'deadline',timezone:'Asia/Jakarta'}),patch:{color_mode:'urgency'}},
];
const principals=[owner.id,stranger.id];
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
const sqlValue=x=>x===null?'null':quote(x);
for(const t of tables)t.ids=[];
const inserts=[];
for(const [index,id] of principals.entries()){
  for(const t of tables){
    const row=t.insert(id,index);
    t.ids[index]=row[t.pk];
    inserts.push(`insert into public.${t.table} (${Object.keys(row).join(',')}) values (${Object.values(row).map(sqlValue).join(',')});`);
  }
}
// The only database connection is Docker's LOCAL Supabase PostgreSQL container.
// The test fails closed if it cannot identify exactly one local container.
const candidates=execFileSync('docker',['ps','--format','{{.Names}}'],{encoding:'utf8'})
  .trim().split('\n').filter(name=>name==='supabase_db_orbit-local');
if(candidates.length!==1)throw Error('Exactly one disposable orbit-local database container required');
const sql=text=>execFileSync('docker',['exec','-i',candidates[0],'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],
  {input:text,encoding:'utf8',timeout:15000,maxBuffer:1024*1024}).trim();
sql(`begin; update private.orbit_configuration set owner_id=${quote(owner.id)}::uuid;
${inserts.join('\n')} commit;`);

const snapshot=()=>{
  const statement=t=>`select ${quote(t.table)} || ':' || count(*)::text || ':' ||
    md5(coalesce(string_agg(to_jsonb(r)::text,'|' order by r.${t.pk}::text),'')) from public.${t.table} r
    where r.${t.column} in (${principals.map(x=>quote(x)+'::uuid').join(',')});`;
  return sql(tables.map(statement).join('\n')).split('\n').sort();
};
const before=snapshot();
assert.equal(before.length,7);
assert.ok(before.every(line=>line.includes(':2:')),'Expected exactly two synthetic rows per table');

let read=0,ownVisible=0,foreignHidden=0,update=0,del=0;
const deny=({error,data,table,method})=>{
  if(error){
    if(error.code==='42501' || error.status===403)return;
    throw Error(`${method} ${table}: inconclusive transport/error code ${error.code??'unknown'}`);
  }
  if(!Array.isArray(data) || data.length!==0)
    throw Error(`${method} ${table}: UNEXPECTED MUTATION POSSIBLY ACCEPTED`);
};
try{
  for(const t of tables){
    const head=await client.from(t.table).select(t.pk,{head:true,count:'exact'});
    if(head.error || head.count!==1)throw Error('Nonowner must see exactly its own row in '+t.table);
    const own=await client.from(t.table).select(t.pk,{head:true,count:'exact'}).eq(t.column,stranger.id);
    if(own.error || own.count!==1)throw Error('Nonowner cannot see its own row in '+t.table);
    ownVisible++;
    const foreign=await client.from(t.table).select(t.pk,{head:true,count:'exact'}).eq(t.column,owner.id);
    if(foreign.error || foreign.count!==0)throw Error('Nonowner could see original-owner row in '+t.table);
    foreignHidden++;
    read++;
    const filter=query=>query.eq(t.column,owner.id).eq(t.pk,t.ids[0]);
    deny({...await filter(client.from(t.table).update(t.patch)).select(t.pk),table:t.table,method:'PATCH'});
    update++;
    deny({...await filter(client.from(t.table).delete()).select(t.pk),table:t.table,method:'DELETE'});
    del++;
    assert.deepEqual(snapshot(),before,'Synthetic fixture changed after '+t.table);
  }
  assert.deepEqual(snapshot(),before,'Synthetic fixture baseline drifted');
  console.log(JSON.stringify({
    name:'ORBIT_LOCAL_BEARER_HTTP_RLS',scope:'disposable_local_supabase',
    own_row_visibility:{passed:ownVisible,total:7},
    cross_tenant_read_denials:{passed:foreignHidden,total:7},
    update_denials:{passed:update,total:7},
    delete_denials:{passed:del,total:7},
    synthetic_fixtures_unchanged:true,
    hosted_requests:0,
    credentials_logged:false,
  }));
}finally{
  await client.auth.signOut().catch(()=>{});
  // Disposable stack is removed by the workflow regardless of test outcome.
}

// W1 local-only conditional RPC acceptance runs after the established bearer/RLS gate.
await import('./local_conditional_rpc.mjs');
