/** Allow only public browser credentials, including legacy anon JWT compatibility. */
export function isPublishableKey(value) {
  if(typeof value!=='string')return false;
  if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(value))return true;
  try{
    const parts=value.split('.');if(parts.length!==3)return false;
    const payload=JSON.parse(atob(parts[1].replaceAll('-','+').replaceAll('_','/')));
    return payload.role==='anon';
  }catch{return false;}
}
export function resolveCloudConfig({ url, publishableKey } = {}) {
  if (!url || !publishableKey) throw new Error('Cloud disabled: both URL and publishable key are required.');
  const parsed=new URL(String(url));
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1','localhost'].includes(parsed.hostname))) {
    throw new Error('Cloud URL must be HTTPS outside local development.');
  }
  if (!isPublishableKey(String(publishableKey).trim())) throw new Error('Only a publishable browser key is allowed.');
  return { url:parsed.origin, publishableKey:String(publishableKey).trim(),
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true} };
}
