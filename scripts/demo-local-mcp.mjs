/** Run: node scripts/demo-local-mcp.mjs
 * Disposable loopback synthetic owner only; never prints bearer credentials.
 */
import {startLocalMcpFixture} from '../server/mcp/local-fixture.mjs';

const VERSION='2026-07-28';
const fixture=await startLocalMcpFixture();
let id=0;
async function call(method,params={}){
  const body={jsonrpc:'2.0',id:++id,method,params:{...params,_meta:{
    'io.modelcontextprotocol/protocolVersion':VERSION,
    'io.modelcontextprotocol/clientInfo':{name:'orbit-disposable-demo',version:'1.0.0'},
    'io.modelcontextprotocol/clientCapabilities':{},
  }}};
  const res=await fetch(fixture.url,{method:'POST',headers:{
    'accept':'application/json, text/event-stream',
    'content-type':'application/json',
    'mcp-protocol-version':VERSION,
    'mcp-method':method,
    ...(method==='tools/call'?{'mcp-name':params.name}:{}),
    authorization:'Bearer '+fixture.tokens.ownerA,
  },body:JSON.stringify(body)});
  const data=await res.json();
  if(res.status!==200||data.error)throw Error('Synthetic MCP demo request failed');
  return data.result;
}
try{
  const discovered=await call('server/discover');
  const listed=await call('tools/list');
  const tasks=await call('tools/call',{name:'search_tasks',arguments:{query:'alpha'}});
  const parsed=JSON.parse(tasks.content[0].text);
  console.log('MCP 2026-07-28 local fixture: PASS');
  console.log('Transport: localhost POST; bearer: synthetic, not displayed');
  console.log('Supported protocols: '+discovered.supportedVersions.join(', '));
  console.log('Tools: '+listed.tools.map(t=>t.name).join(', '));
  console.log('Synthetic owner A matching tasks: '+parsed.tasks.length);
  console.log('No hosted OAuth, user account or Production access was used.');
}finally{
  await fixture.close();
}
