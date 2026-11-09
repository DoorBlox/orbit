import { readFileSync } from 'node:fs';

const readJson=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
export function assertProductionConfig(config,{
  target=readJson('../release/production-target.json'),
  deployment=readJson('../vercel.json'),
}={}){
  if(!config||config.publicRelease!==false)throw Error('Production requires configured private cloud mode.');
  if(target?.schemaVersion!==1||target.status!=='reviewed'||!target.supabaseUrl||!target.siteUrl)
    throw Error('A reviewed Production target is required; no deployment target is inferred.');
  const https=(value,originOnly=false)=>{
    let url;try{url=new URL(value);}catch{throw Error('Production target requires valid HTTPS URLs.');}
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
      ['localhost','127.0.0.1','[::1]'].includes(url.hostname)||
      (originOnly?url.origin!==value:url.href!==value))throw Error('Production target requires canonical HTTPS URLs.');
  };
  https(target.supabaseUrl,true);https(target.siteUrl);
  if(!Array.isArray(target.developmentSupabaseUrls)||!target.developmentSupabaseUrls.length)
    throw Error('Production target must retain explicit development exclusions.');
  for(const origin of target.developmentSupabaseUrls)https(origin,true);
  // Owner-reviewed M3 architecture decision. Never turn this into a general
  // allow-development switch: a new project/site requires a new source review.
  const shared=target.sharedDatabaseException;
  const approvedShared=shared?.decision==='m3-shared-private-2026-11-06'&&
    shared.scope==='single-owner-private'&&
    shared.supabaseUrl==='https://ixfgavgtwuzdgucjriec.supabase.co'&&
    shared.siteUrl==='https://orbit.starscene.com/'&&
    shared.supabaseUrl===target.supabaseUrl&&shared.siteUrl===target.siteUrl;
  if(shared&&!approvedShared)throw Error('Production shared database exception differs from the reviewed M3 decision.');
  if(target.developmentSupabaseUrls.includes(config.supabaseUrl)&&!approvedShared)
    throw Error('Production cannot silently use the development database.');
  if(config.supabaseUrl!==target.supabaseUrl||config.siteUrl!==target.siteUrl)
    throw Error('Production cloud configuration differs from the reviewed target.');

  const headers=deployment?.headers?.find(rule=>rule.source==='/(.*)')?.headers||[];
  const policies=headers.filter(h=>h.key.toLowerCase()==='content-security-policy');
  if(policies.length!==1)throw Error('Production requires one reviewed global CSP.');
  const directives=new Map();
  for(const part of policies[0].value.split(';')){
    const [key,...values]=part.trim().split(/\s+/);if(!key)continue;
    if(directives.has(key))throw Error('Production CSP has duplicate directives.');
    directives.set(key,values);
  }
  const exact=(key,expected)=>{
    const values=directives.get(key)||[];
    if(values.length!==expected.length||!expected.every(v=>values.includes(v)))
      throw Error(`Production CSP ${key} differs from the private release policy.`);
  };
  const reviewed=new Map([
    ['default-src',["'self'"]],
    ['script-src',["'self'"]],
    ['style-src',["'self'","'unsafe-inline'"]],
    ['img-src',["'self'",'data:','blob:',target.supabaseUrl]],
    ['connect-src',["'self'",target.supabaseUrl]],
    ['object-src',["'none'"]],
    ['base-uri',["'none'"]],
    ['frame-ancestors',["'none'"]],
    ['form-action',["'self'"]],
  ]);
  if(directives.size!==reviewed.size)
    throw Error('Production CSP contains missing or unreviewed directives.');
  for(const [key,values] of reviewed)exact(key,values);
}
