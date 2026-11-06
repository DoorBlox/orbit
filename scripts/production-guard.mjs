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
  if(target.developmentSupabaseUrls.includes(config.supabaseUrl))
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
  exact('connect-src',["'self'",target.supabaseUrl]);
  for(const key of ['default-src','script-src','form-action'])exact(key,["'self'"]);
  for(const key of ['object-src','base-uri','frame-ancestors'])exact(key,["'none'"]);
}
