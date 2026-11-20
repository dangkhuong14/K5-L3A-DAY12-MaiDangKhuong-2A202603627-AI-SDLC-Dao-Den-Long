import {readFileSync,writeFileSync} from 'node:fs';
import {createGame,idle,step,snapshot} from './core.ts';
const fail=(message:string,code=2):never=>{console.error(message);process.exit(code);};
const args=process.argv.slice(2), opts:Record<string,string>={};
for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||!args[i+1])fail('Expected --flag value');opts[args[i].slice(2)]=args[i+1];}
for(const k of Object.keys(opts))if(!['seed','night','scenario','inputs','ticks','out','snapshot-every'].includes(k))fail(`Unknown option ${k}`);
const integer=(k:string,def?:number)=>{const v=opts[k]===undefined?def:Number(opts[k]);if(v===undefined||!Number.isSafeInteger(v))fail(`Invalid ${k}`);return v as number;};
const seed=integer('seed'),night=integer('night'),ticks=integer('ticks'),every=integer('snapshot-every',10);
if(night!==1||ticks<0||every<1||!opts.out)fail('Require night 1, ticks >=0, snapshot-every >=1, out');
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const num=(v:any)=>typeof v==='number'&&Number.isFinite(v);
const count=(v:any)=>num(v)&&Number.isInteger(v)&&v>=0;
const vec=(v:any)=>Array.isArray(v)&&v.length===3&&v.every(num);
function load(path:string){try{return JSON.parse(readFileSync(path,'utf8'));}catch{fail(`Cannot read valid JSON: ${path}`);}}
const scenario=opts.scenario?load(opts.scenario):{};
if(!object(scenario))fail('Scenario must be object');
if(scenario.player!==undefined){const p=scenario.player;if(!object(p)||(p.pos!==undefined&&!vec(p.pos))||['carried','flames'].some(k=>p[k]!==undefined&&!count(p[k])))fail('Invalid player');}
for(const k of ['random_motes','random_shades'])if(scenario[k]!==undefined&&typeof scenario[k]!=='boolean')fail(`Invalid ${k}`);
if(scenario.time_left_s!==undefined&&(!num(scenario.time_left_s)||scenario.time_left_s<0))fail('Invalid time');
if(scenario.motes!==undefined&&(!Array.isArray(scenario.motes)||!scenario.motes.every(vec)))fail('Invalid motes');
for(const k of ['shades','lanterns'])if(scenario[k]!==undefined){if(!Array.isArray(scenario[k]))fail(`Invalid ${k}`);const ids=new Set();for(const s of scenario[k]){if(!object(s)||(s.pos!==undefined&&!vec(s.pos))||(k==='shades'&&!vec(s.pos)))fail(`Invalid ${k} entry`);if(s.id!==undefined){if(typeof s.id!=='string'||ids.has(s.id))fail('Invalid/duplicate id');ids.add(s.id);}if(k==='lanterns'&&(!/^L[1-5]$/.test(s.id)||(s.lit!==undefined&&typeof s.lit!=='boolean')||(s.deposited!==undefined&&(!count(s.deposited)||s.deposited>10))))fail('Invalid lantern');}}
const source=opts.inputs?load(opts.inputs):{frames:[]};if(!object(source)||!Array.isArray(source.frames))fail('Invalid inputs');
let last=-1;for(const f of source.frames){if(!object(f)||!count(f.tick)||f.tick<=last)fail('Frame ticks must strictly increase');last=f.tick;if(f.move!==undefined&&(!Array.isArray(f.move)||f.move.length!==2||!f.move.every((v:any)=>num(v)&&v>=-1&&v<=1)))fail('Invalid move');if(f.cam_yaw_deg!==undefined&&!num(f.cam_yaw_deg))fail('Invalid yaw');for(const k of ['jump','interact','pulse','dash'])if(f[k]!==undefined&&typeof f[k]!=='boolean')fail(`Invalid ${k}`);}
try{const g=createGame(seed,scenario),input=idle(),lines=[JSON.stringify(snapshot(g))];let frame=0;
while(g.tick<ticks&&g.state==='playing'){if(source.frames[frame]?.tick===g.tick){const {tick,...changes}=source.frames[frame++];Object.assign(input,changes);}lines.push(...step(g,input).map(e=>JSON.stringify(e)));if(g.tick%every===0)lines.push(JSON.stringify(snapshot(g)));}
lines.push(JSON.stringify({type:'end',ticks:g.tick,state:g.state,score:g.score}));writeFileSync(opts.out,lines.join('\n')+'\n');}catch(e){fail(String(e),1);}
