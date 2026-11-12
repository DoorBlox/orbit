/** BP-15: offline MCP 2026-07-28 Streamable HTTP POST admission.
 * NO HTTP listener, OAuth endpoint, network access or user-data store.
 * A future host MUST supply uncombined raw header pairs and the existing
 * cryptographically verified, owner-scoped MCP read boundary as dispatcher.
 */
import {MCP_READ_TOOLS} from './read-boundary.mjs';

const VERSION='2026-07-28';
const MAX_BYTES=65536;
const HEADER_MISMATCH=-32020;
const INVALID_REQUEST=-32600;
const METHOD_NOT_FOUND=-32601;
const UNSUPPORTED_VERSION=-32022;
const denied=(status=400,rpcCode=INVALID_REQUEST,data)=>
  {throw new McpHttpAdmissionError(status,rpcCode,data);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const nameToken=/^[a-zA-Z0-9!#$%&'*+.^_|~-]{1,80}$/;
const printable=/^[\x20-\x7e]*$/;
const utf8=new TextDecoder('utf-8',{fatal:true});

export class McpHttpAdmissionError extends Error {
  constructor(httpStatus,rpcCode,data){
    super('MCP_HTTP_DENIED');
    this.name='McpHttpAdmissionError';
    this.httpStatus=httpStatus;
    this.rpcCode=rpcCode;
    if(data!==undefined)this.data=Object.freeze(data);
    Object.freeze(this);
  }
}

function strictOrigins(values){
  if(!Array.isArray(values)||values.length===0||values.length>16)denied();
  const origins=new Set();
  for(const value of values){
    let parsed;
    try{parsed=new URL(value);}catch{denied();}
    if(typeof value!=='string'||!parsed||parsed.protocol!=='https:'||
      parsed.origin!==value||parsed.username||parsed.password||
      parsed.search||parsed.hash||parsed.pathname!=='/'||
      origins.has(value))denied();
    origins.add(value);
  }
  return origins;
}
function headersFromRaw(pairs){
  // No Headers/Map API: those may have already coalesced duplicate security
  // fields with commas. The future HTTP adapter must retain RAW field pairs.
  if(!Array.isArray(pairs)||pairs.length<1||pairs.length>64)denied(400,HEADER_MISMATCH);
  const map=new Map();
  for(const pair of pairs){
    if(!Array.isArray(pair)||pair.length!==2||
      typeof pair[0]!=='string'||!nameToken.test(pair[0])||
      typeof pair[1]!=='string'||pair[1].length>8192||
      !printable.test(pair[1]))denied(400,HEADER_MISMATCH);
    const key=pair[0].toLowerCase();
    if(map.has(key))denied(400,HEADER_MISMATCH);
    map.set(key,pair[1]);
  }
  return map;
}
function decodeMirroredName(value){
  if(typeof value!=='string'||!value||value.length>1024)denied(400,HEADER_MISMATCH);
  const match=/^=\?base64\?([A-Za-z0-9+/]+={0,2})\?=$/.exec(value);
  if(match){
    const raw=match[1];
    let bytes,decoded;
    try{
      bytes=Buffer.from(raw,'base64');
      if(bytes.byteLength>512||bytes.toString('base64')!==raw)denied(400,HEADER_MISMATCH);
      decoded=utf8.decode(bytes);
    }catch{denied(400,HEADER_MISMATCH);}
    return decoded;
  }
  if(value.startsWith('=?base64?')||value.endsWith('?=')||
    !/^[\x21-\x7e]+(?: [\x21-\x7e]+)*$/.test(value))denied(400,HEADER_MISMATCH);
  return value;
}
function acceptsBoth(value){
  if(typeof value!=='string')return false;
  const accepted=new Set();
  for(const item of value.split(',')){
    const parts=item.trim().toLowerCase().split(';').map(x=>x.trim());
    if(parts.length>2||parts.length<1)continue;
    if(!['application/json','text/event-stream'].includes(parts[0]))continue;
    if(parts.length===2){
      const match=/^q=(0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/.exec(parts[1]);
      if(!match||Number(match[1])<=0)continue;
    }
    accepted.add(parts[0]);
  }
  return accepted.size===2;
}
function checkNoDuplicateJsonMembers(text){
  // Narrow bounded JSON lexical scan: JSON.parse below remains responsible
  // for syntax/number correctness. This scan rejects duplicate decoded keys
  // at ANY depth, including two spellings using Unicode escapes.
  let i=0;
  const ws=()=>{while(i<text.length&&/[\u0020\u0009\u000a\u000d]/.test(text[i]))i++;};
  function string(){
    if(text[i]!=='"')denied();
    const start=i++;
    let closed=false;
    while(i<text.length){
      const ch=text[i++];
      if(ch==='"'){closed=true;break;}
      if(ch==='\\')i++;
    }
    if(!closed)denied();
    try{return JSON.parse(text.slice(start,i));}catch{denied();}
  }
  function value(depth){
    if(depth>32)denied();
    ws();
    if(text[i]==='{'){
      i++;ws();const keys=new Set();
      if(text[i]==='}'){i++;return;}
      while(i<text.length){
        ws();const key=string();
        if(keys.has(key))denied();
        keys.add(key);ws();
        if(text[i++]!==':')denied();
        value(depth+1);ws();
        if(text[i]==='}'){i++;return;}
        if(text[i++]!==',')denied();
      }
      denied();
    }
    if(text[i]==='['){
      i++;ws();
      if(text[i]===']'){i++;return;}
      while(i<text.length){
        value(depth+1);ws();
        if(text[i]===']'){i++;return;}
        if(text[i++]!==',')denied();
      }
      denied();
    }
    if(text[i]==='"'){string();return;}
    const start=i;
    while(i<text.length&&!/[\s,\]}]/.test(text[i]))i++;
    if(start===i)denied();
  }
  value(0);ws();
  if(i!==text.length)denied();
}
function readBody(bytes,maxBytes){
  if(!(bytes instanceof Uint8Array))denied();
  if(bytes.byteLength>maxBytes)denied(413);
  if(bytes.byteLength<2)denied();
  let text,body;
  try{text=utf8.decode(bytes);}catch{denied();}
  checkNoDuplicateJsonMembers(text);
  try{body=JSON.parse(text);}catch{denied();}
  if(!plain(body))denied();
  return body;
}
function validateJsonRpc(body){
  if(Object.keys(body).some(k=>!['jsonrpc','id','method','params'].includes(k))||
    Object.keys(body).length!==4||body.jsonrpc!=='2.0'||
    (typeof body.id!=='string'&&typeof body.id!=='number')||
    (typeof body.id==='number'&&(!Number.isSafeInteger(body.id)||body.id<0))||
    (typeof body.id==='string'&&(body.id.length<1||body.id.length>128||
      /[\u0000-\u001f\u007f]/.test(body.id)))||
    typeof body.method!=='string'||!plain(body.params))denied();
}
function validateHeadersAndBody(headers,body){
  const version=headers.get('mcp-protocol-version');
  const bodyVersion=plain(body.params._meta)?
    body.params._meta['io.modelcontextprotocol/protocolVersion']:undefined;
  const method=headers.get('mcp-method');
  if(typeof version!=='string'||!version||typeof bodyVersion!=='string'||
    version!==bodyVersion||typeof method!=='string'||method!==body.method)
    denied(400,HEADER_MISMATCH);
  if(version!==VERSION)denied(400,UNSUPPORTED_VERSION,
    {supported:[VERSION],requested:version});
  if(body.method!=='tools/call')denied(404,METHOD_NOT_FOUND);
  const name=body.params.name;
  if(typeof name!=='string'||typeof headers.get('mcp-name')!=='string'||
    decodeMirroredName(headers.get('mcp-name'))!==name)
    denied(400,HEADER_MISMATCH);
  if(!has(MCP_READ_TOOLS,name))denied(404,METHOD_NOT_FOUND);
  if(!plain(body.params.arguments))denied();
  // W4 read tools expose NO x-mcp-header parameter annotations. A custom
  // Mcp-Param-* field would mislead an upstream policy gateway.
  for(const h of headers.keys())if(h.startsWith('mcp-param-'))denied(400,HEADER_MISMATCH);
  return Object.freeze({name,arguments:Object.freeze(body.params.arguments)});
}

/** An offline admission-and-dispatch policy. Caller MUST inject the existing
 * createPrivateMcpReadBoundary(...).invoke, which cryptographically verifies
 * JWTs and checks current owner consent/JTI revocation for EVERY invocation.
 * The module does not create a Fetch handler, listener or HTTP response.
 */
export function createMcpStreamableReadAdmission({
  allowedOrigins,invokeReadBoundary,endpointPath='/mcp',maxBodyBytes=MAX_BYTES,
}={}){
  const origins=strictOrigins(allowedOrigins);
  if(typeof invokeReadBoundary!=='function'||typeof endpointPath!=='string'||
    !/^\/[a-zA-Z0-9/_-]+$/.test(endpointPath)||
    !Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<512||
    maxBodyBytes>MAX_BYTES)denied();
  return Object.freeze({
    async invoke(request){
      if(!plain(request))denied();
      if(request.method!=='POST')denied(405);
      if(request.path!==endpointPath)denied(404);
      const headers=headersFromRaw(request.headers);
      const origin=headers.get('origin');
      if(origin!==undefined&&!origins.has(origin))denied(403);
      if(!acceptsBoth(headers.get('accept')))denied(406);
      if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(headers.get('content-type')||''))
        denied(415);
      if(headers.has('transfer-encoding')||headers.has('content-encoding'))
        denied(400,HEADER_MISMATCH);
      const length=headers.get('content-length');
      if(length!==undefined&&(!/^(0|[1-9][0-9]*)$/.test(length)||
        !Number.isSafeInteger(Number(length))||
        !(request.body instanceof Uint8Array)||
        Number(length)!==request.body.byteLength))denied(400,HEADER_MISMATCH);
      const body=readBody(request.body,maxBodyBytes);
      validateJsonRpc(body);
      const tool=validateHeadersAndBody(headers,body);
      const authorization=headers.get('authorization');
      if(typeof authorization!=='string'||
        !/^Bearer [A-Za-z0-9._~-]{20,4096}$/.test(authorization))
        denied(401);
      try{
        return await invokeReadBoundary(Object.freeze({
          authorization,name:tool.name,arguments:tool.arguments,
        }));
      }catch{
        // Backend exception (including auth/RLS errors) is never reflected.
        denied(403);
      }
    },
  });
}
