import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const developmentApi='https://ixfgavgtwuzdgucjriec.supabase.co';
export const confirmedOwner='20daa320-348a-4991-a844-f27569dbc2b3';

// Offline preparation ONLY. No fetch, SDK, SQL connection or credential input.
// Natural-key fixtures require administrator-confirmed absence before seeding.
export function makeHostedWritePlan({nonownerId,runId=`m3-${randomUUID()}`,apiOrigin=developmentApi}={}){
  if(typeof nonownerId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(nonownerId)||
    nonownerId.toLowerCase()===confirmedOwner)throw Error('An independently verified temporary nonowner UUID is required; owner is forbidden.');
  if(!/^m3-[a-z0-9-]{8,60}$/.test(runId))throw Error('Use a unique m3- disposable run identifier.');
  if(apiOrigin!==developmentApi)throw Error('This reviewed plan is development-only; a Production plan needs separate target review.');
  const uid=nonownerId.toLowerCase(),branch=`${runId}-branch`;
  const rows=[
    ['profiles','user_id',{user_id:uid,display_name:`Synthetic ${runId}`},{display_name:`Probe ${runId}`}],
    ['branches','id',{owner_id:uid,id:branch,parent_id:null,label:'Synthetic M3 branch'},{label:'Synthetic M3 probe'}],
    ['tasks','id',{owner_id:uid,id:`${runId}-task`,project_id:branch,title:'Synthetic M3 task',status:'ready'},{title:'Synthetic M3 probe'}],
    ['journal_entries','id',{owner_id:uid,id:`${runId}-journal`,entry_date:'2026-11-06',title:'Synthetic M3 journal',body_html:'<p>Synthetic fixture only.</p>'},{title:'Synthetic M3 probe'}],
    ['milestones','id',{owner_id:uid,id:`${runId}-marker`,marker_date:'2026-11-06',title:'Synthetic M3 marker'},{title:'Synthetic M3 probe'}],
    ['widget_layouts','widget_key',{owner_id:uid,widget_key:'journal',x:100,y:100,width:446,height:800},{x:124}],
    ['preferences','owner_id',{owner_id:uid,color_mode:'deadline',timezone:'Asia/Jakarta'},{color_mode:'urgency'}],
  ];
  const fixtures=rows.map(([table,pk,body,patch])=>{
    const ownerColumn=table==='profiles'?'user_id':'owner_id';
    const query=new URLSearchParams({[ownerColumn]:`eq.${uid}`});
    if(pk!==ownerColumn)query.set(pk,`eq.${body[pk]}`);
    query.set('select',pk);
    const filtered=`${apiOrigin}/rest/v1/${table}?${query}`;
    return {table,primaryKey:pk,fixture:body,precondition:'Administrator confirms no pre-existing rows for this nonowner in this table.',
      insertProbe:{method:'POST',url:`${apiOrigin}/rest/v1/${table}`,body,
        expected:'HTTP 403 / 42501; constraint failures are not authorization PASS.'},
      updateProbe:{method:'PATCH',url:filtered,body:patch,
        expected:'42501 or zero returned rows AND administrator verifies the seeded row unchanged.'},
      deleteProbe:{method:'DELETE',url:filtered,
        expected:'42501 or zero returned rows AND administrator verifies the seeded row still exists unchanged.'}};
  });
  return {status:'PREPARED_NOT_EXECUTED',target:apiOrigin,runId,nonownerId:uid,
    mutationAuthorizationRequired:true,usesOwnerRows:false,headers:{Prefer:'return=representation,count=exact'},
    sequence:['Read-only administrator and live Auth identity preflight; confirm absent nonowner data.',
      'Only after narrow authorization: run INSERT probes while rows are absent. Stop on any unexpected result.',
      'Only after all INSERT denials: approved administrator seeds exactly these seven synthetic rows, branches before tasks.',
      'Run UPDATE/DELETE probes with the existing nonowner session; compare synthetic rows against administrator baseline.',
      'Approved administrator removes only recorded fixture keys after verification, tasks before branches; preserve Auth user.'],
    forbidden:['Owner profile/preferences/layout or owner-scoped rows','save_owner_snapshot/publish/unpublish mutation RPCs',
      'Schema/Auth/RLS/GRANT changes','Automatic cleanup or user deletion','Production requests','Tokens or private payloads in evidence'],fixtures};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{console.log(JSON.stringify(makeHostedWritePlan({nonownerId:process.argv[2]}),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
