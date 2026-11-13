/** Canonical OAuth issuer/resource identifiers: HTTPS is mandatory by default.
 * Only an explicitly enabled synthetic fixture may use 127.0.0.1 HTTP.
 * This never changes signed JWT issuer/audience equality or JWKS verification.
 */
export function canonicalMcpIdentifier(value,{allowLoopbackHttp=false}={}){
  if(typeof value!=='string'||value.length>1024)return false;
  let url;
  try{url=new URL(value);}catch{return false;}
  const local=allowLoopbackHttp===true&&url.protocol==='http:'&&
    url.hostname==='127.0.0.1'&&/^[0-9]{2,5}$/.test(url.port)&&
    Number(url.port)>=1024&&Number(url.port)<=65535;
  return (url.protocol==='https:'||local)&&
    !url.username&&!url.password&&!url.search&&!url.hash&&
    url.origin!=='null'&&url.href===value;
}
