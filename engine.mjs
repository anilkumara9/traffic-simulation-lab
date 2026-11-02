// Deterministic, lane-based agent simulation. Distances: m. Time: s.
export const DEFAULTS={demand:2400,lanes:2,speed:50,cycle:50,green:50,flyover:false,seed:42};
export function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function network(config){
 const nodes=[],edges=[];const coords=[-1,0,1,2,3];
 for(let y of coords)for(let x of coords)if((x>=0&&x<=2&&y>=0&&y<=2)||(x===-1||x===3)&&y>=0&&y<=2||(y===-1||y===3)&&x>=0&&x<=2)nodes.push({id:`${x},${y}`,x,y,terminal:x===-1||x===3||y===-1||y===3});
 const add=(a,b,flyover=false)=>{const arterial=a.y===1&&b.y===1;edges.push({id:`${a.id}>${b.id}${flyover?'F':''}`,from:a.id,to:b.id,a,b,length:Math.hypot(a.x-b.x,a.y-b.y)*200,lanes:flyover?2:arterial?config.lanes:1,speed:(flyover?Math.max(config.speed,65):arterial?config.speed:Math.min(config.speed,35))/3.6,flyover,horizontal:a.y===b.y});};
 for(const a of nodes)for(const b of nodes)if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1&&!(a.terminal&&b.terminal))add(a,b);
 if(config.flyover){add(nodes.find(n=>n.id==='-1,1'),nodes.find(n=>n.id==='3,1'),true);add(nodes.find(n=>n.id==='3,1'),nodes.find(n=>n.id==='-1,1'),true);}
 return {nodes,edges};
}
export function route(graph,from,to){
 const costs=new Map([[from,0]]),prev=new Map(),done=new Set();
 while(true){let id=null,best=Infinity;for(const [k,v]of costs)if(!done.has(k)&&v<best){id=k;best=v;}if(id===null)return [];if(id===to)break;done.add(id);
 for(const e of graph.edges.filter(e=>e.from===id)){if(e.b.terminal&&e.to!==to)continue;const cost=best+e.length/e.speed;if(cost<(costs.get(e.to)??Infinity)){costs.set(e.to,cost);prev.set(e.to,e);}}}
 const result=[];let end=to;while(end!==from){const e=prev.get(end);if(!e)return [];result.unshift(e);end=e.from;}return result;
}
export class Simulation{
 constructor(options={}){this.config={...DEFAULTS,...options};this.graph=network(this.config);this.rng=random(this.config.seed);this.time=0;this.agents=[];this.pending=[];this.completed=0;this.generated=0;this.totalTrip=0;this.totalWait=0;this.excess=0;this.nextId=0;this.series=[];this.lastSample=0;this.terminals=this.graph.nodes.filter(n=>n.terminal);this.paths=new Map();for(const a of this.terminals)for(const b of this.terminals)if(a!==b)this.paths.set(`${a.id}|${b.id}`,route(this.graph,a.id,b.id));}
 green(edge){if(edge.b.terminal||edge.flyover)return true;const c=this.config;const phase=(this.time+(edge.b.x+edge.b.y)*5)%c.cycle;return edge.horizontal?phase<c.cycle*c.green/100:phase>=c.cycle*c.green/100;}
 entrance(edge){let best=-1,space=-1;for(let lane=0;lane<edge.lanes;lane++){const first=this.agents.filter(a=>a.edge.id===edge.id&&a.lane===lane).reduce((m,a)=>Math.min(m,a.pos),Infinity);if(first>=9&&first>space){best=lane;space=first;}}return best;}
 step(dt=.25){
 if(!(dt>0&&dt<=.5))throw new Error('Time step must be in (0, 0.5] seconds');
 this.time+=dt;
 // A seeded exponential arrival process, independent of model infrastructure.
 if(this.nextArrival===undefined)this.nextArrival=-Math.log(1-this.rng())/(this.config.demand/3600||1e-12);
 while(this.time>=this.nextArrival&&this.config.demand>0){const source=this.terminals[Math.floor(this.rng()*this.terminals.length)];let dest;do{dest=this.terminals[Math.floor(this.rng()*this.terminals.length)];}while(source===dest);this.generated++;if(this.pending.length<2000)this.pending.push({route:this.paths.get(`${source.id}|${dest.id}`),born:this.nextArrival});else this.excess++;this.nextArrival+=-Math.log(1-this.rng())/(this.config.demand/3600);}
 const waiting=[];for(const request of this.pending){const edge=request.route[0],lane=this.entrance(edge);if(lane>=0&&this.agents.length<2000){this.agents.push({id:this.nextId++,route:request.route,index:0,edge,lane,pos:0,speed:0,born:request.born,wait:0});}else waiting.push(request);}this.pending=waiting;
 const groups=new Map();for(const a of this.agents){const key=`${a.edge.id}:${a.lane}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}const finished=new Set();const transferred=new Set();
 for(const cars of groups.values()){
 cars.sort((a,b)=>b.pos-a.pos);let leader=null;
 for(const a of cars){if(transferred.has(a.id))continue;const e=a.edge;const next=a.route[a.index+1];const targetLane=next?this.entrance(next):-1;const permitted=this.green(e)&&(!next||targetLane>=0);const gap=Math.max(0,(leader?leader.pos-7:permitted?e.length+100:e.length-.5)-a.pos);const safe=Math.sqrt(2*3*gap);a.speed=Math.min(e.speed,a.speed+2*dt,safe);const movement=Math.min(a.speed*dt,gap);a.pos+=movement;
 if(a.speed<1)a.wait+=dt;
 if(a.pos>=e.length-.001&&permitted){if(next){a.index++;a.edge=next;a.lane=targetLane;a.pos=0;a.speed=Math.min(a.speed,next.speed);transferred.add(a.id);}else{finished.add(a.id);this.completed++;this.totalTrip+=this.time-a.born;this.totalWait+=a.wait;}}else leader=a;
 }
 }
 this.agents=this.agents.filter(a=>!finished.has(a.id));
 if(this.time-this.lastSample>=5){const m=this.metrics();this.series.push({time:this.time,speed:m.speed,queue:m.queue,completed:m.completed,active:m.active});this.lastSample=this.time;}
 }
 run(seconds){const steps=Math.round(seconds/.25);for(let i=0;i<steps;i++)this.step();return this.metrics();}
 metrics(){return {time:this.time,active:this.agents.length,queue:this.agents.filter(a=>a.speed<1).length,external:this.pending.length,unserved:this.excess,generated:this.generated,completed:this.completed,speed:this.agents.length?this.agents.reduce((s,a)=>s+a.speed,0)/this.agents.length*3.6:0,trip:this.completed?this.totalTrip/this.completed:null,wait:this.completed?this.totalWait/this.completed:null,throughput:this.time?this.completed*3600/this.time:0};}
}
