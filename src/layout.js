import { branchIndex } from './data.js';
const radians=(degrees)=>degrees*Math.PI/180;
const polar=(angle,r)=>({x:Math.cos(radians(angle))*r,y:Math.sin(radians(angle))*r});
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const DEFAULT_COLOR='#6597E6';

/** Build an unconstrained-depth radial tree with a common terminal horizon.
 * Every branch can have children AND its own direct tasks: direct tasks get
 * their own virtual terminal, never force a branch to become a 'project'.
 */
export function createLayout(branches,tasks=[],displayName='My space'){
  const rootName=String(displayName||'My space').trim().slice(0,100)||'My space';
  const byId=branchIndex(branches);
  const children=new Map([['root',[]]]);
  for(const b of branches){if(!children.has(b.id))children.set(b.id,[]);if(!children.has(b.parentId))children.set(b.parentId,[]);children.get(b.parentId).push(b.id);}
  const counts=new Map();for(const t of tasks)counts.set(t.projectId,(counts.get(t.projectId)||0)+1);
  const leafDescriptors=[];const ancestry=new Map([['root',[]]]);
  const depth=new Map([['root',0]]);let maxDepth=1;
  const visit=(id,parentIds=[],d=1)=>{
    ancestry.set(id,parentIds);depth.set(id,d);maxDepth=Math.max(maxDepth,d);
    const ch=children.get(id)||[];const count=counts.get(id)||0;
    if(count || !ch.length){leafDescriptors.push({branchId:id,count,weight:1+Math.min(count,8)*.19});}
    for(const child of ch)visit(child,[id,...parentIds],d+1);
  };
  for(const child of children.get('root')||[])visit(child,[],1);
  if(!leafDescriptors.length){return {
    nodes:[{id:'root',type:'root',label:rootName,x:0,y:0,color:DEFAULT_COLOR,parentId:null,depth:0}],
    edges:[],stacks:[],ancestry,children,depth,RADIUS:850,
  };}
  const endpointCount=leafDescriptors.length;
  const firstCount=(children.get('root')||[]).length;
  const INNER=Math.max(210,Math.ceil(firstCount*38));
  const HORIZON=Math.max(860,endpointCount*48,INNER+(maxDepth-1)*142+250);
  const INNER_MAX=HORIZON-255;
  const totalWeight=leafDescriptors.reduce((a,b)=>a+b.weight,0);
  let cursor=0;
  const stackPositions=[];
  for(const endpoint of leafDescriptors){
    const mid=cursor+endpoint.weight/2;cursor+=endpoint.weight;
    const angle=-90+360*mid/totalWeight;
    stackPositions.push({...endpoint,angle,...polar(angle,HORIZON)});
  }
  const posByBranch=new Map();
  for(const endpoint of stackPositions){if(!posByBranch.has(endpoint.branchId))posByBranch.set(endpoint.branchId,[]);posByBranch.get(endpoint.branchId).push(endpoint);}
  const descendants=new Map();
  const collect=(id)=>{
    const all=[...(posByBranch.get(id)||[])];
    for(const c of children.get(id)||[])all.push(...collect(c));
    descendants.set(id,all);return all;
  };
  for(const child of children.get('root')||[])collect(child);
  const inheritedColor=(id)=>{
    let b=byId.get(id);let attempts=0;
    while(b&&attempts++<branches.length+1){if(b.color)return b.color;b=byId.get(b.parentId);}
    return DEFAULT_COLOR;
  };
  const nodes=[{id:'root',type:'root',label:rootName,x:0,y:0,color:DEFAULT_COLOR,parentId:null,depth:0}];
  const edges=[];
  for(const b of branches){
    const endpoints=descendants.get(b.id)||[];
    let sx=0,sy=0;
    for(const p of endpoints){sx+=Math.cos(radians(p.angle))*p.weight;sy+=Math.sin(radians(p.angle))*p.weight;}
    const angle= Math.atan2(sy,sx)*180/Math.PI;
    const d=depth.get(b.id)||1;
    // Terminal branches live on a shared penultimate band regardless of path depth.
    const terminal=(children.get(b.id)||[]).length===0;
    const maxInnerDepth=Math.max(1,maxDepth-1);
    let radius=INNER+(d-1)*(INNER_MAX-INNER)/maxInnerDepth;
    if(terminal)radius=INNER_MAX;
    radius=clamp(radius,INNER,INNER_MAX);
    const node={...b,type:'branch',depth:d,color:inheritedColor(b.id),count:endpoints.length,angle,
      ...polar(angle,radius),terminal};
    nodes.push(node);edges.push([b.parentId,b.id]);
  }
  const stacks=stackPositions.map((p,i)=>{
    const estimatedHeight=Math.max(42,p.count*46+10);
    // List rows always flow downward. For a northern branch we place the list
    // completely ABOVE its connection point, so later rows cannot collide
    // with their parent node by growing toward the center.
    const upper=Math.sin(radians(p.angle))<-.1;
    return {id:`stack-${p.branchId}`,branchId:p.branchId,parentId:p.branchId,
      color:inheritedColor(p.branchId),x:p.x,y:p.y-(upper?estimatedHeight:0),
      attachX:p.x,attachY:p.y,upper,estimatedHeight,
      angle:p.angle,count:p.count,index:i};
  });
  return {nodes,edges,stacks,ancestry,children,depth,RADIUS:HORIZON,INNER};
}
export function getDescendants(layout,id){return layout.nodes.filter(n=>n.id!==id&&(layout.ancestry.get(n.id)||[]).includes(id)).map(n=>n.id);}
export function getDisplayBounds(layout){
  let halfWidth=210,halfHeight=210;
  for(const n of layout.nodes){halfWidth=Math.max(halfWidth,Math.abs(n.x)+116);halfHeight=Math.max(halfHeight,Math.abs(n.y)+94);}
  for(const s of layout.stacks){
    halfWidth=Math.max(halfWidth,Math.abs(s.x)+155);
    halfHeight=Math.max(halfHeight,Math.abs(s.y)+34,Math.abs(s.y+s.estimatedHeight)+34);
  }
  return {halfWidth:halfWidth+70,halfHeight:halfHeight+70};
}
export const allProjectIds=[]; // legacy import compatibility: branches are now dynamic.
