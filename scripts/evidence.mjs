import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

// New directory per run: never replace earlier evidence or convert failures to passes.
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const dir=join('docs','proof','phase-1',stamp);
mkdirSync(dir,{recursive:true});
const save=(name,data)=>writeFileSync(join(dir,name),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
const git=(...args)=>spawnSync('git',args,{encoding:'utf8'}).stdout?.trim()??'unavailable';
save('environment.json',{created_at:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,commit:git('rev-parse','HEAD'),working_tree:git('status','--short','--untracked-files=normal'),note:'Working-tree run. If later tagged, verify the tagged source matches this run. Generated proof files are not source changes.'});
const results=[];
function run(label,cmd,args){
 const p=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:32*1024*1024});
 save(label+'.stdout.txt',p.stdout??'');save(label+'.stderr.txt',(p.stderr??'')+(p.error?String(p.error):''));
 const result={label,command:cmd===process.execPath?'node':cmd,args:args.map(x=>x===process.env.npm_execpath?'<npm-cli>':x),exit_code:p.status,passed:p.status===0};
 results.push(result);console.log(`${result.passed?'PASS':'FAIL'} ${label}`);return result;
}
function check(label,fn){try{fn();results.push({label,passed:true});console.log('PASS '+label);}catch(e){results.push({label,passed:false,error:String(e)});console.error('FAIL '+label+': '+e.message);}}
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run via npm run evidence');
run('tests',process.execPath,[npm,'test']);
run('build',process.execPath,[npm,'run','build']);
const base={random_motes:false,random_shades:false};
const cases=[
 {name:'light-five-lanterns',scenario:{...base,motes:Array.from({length:50},()=>[0,0,0]),lanterns:Array.from({length:5},(_,i)=>({id:`L${i+1}`,pos:[0,0,0]}))},inputs:{frames:Array.from({length:9},(_,tick)=>({tick,interact:tick%2===0}))},ticks:60},
 {name:'lose-by-shade',scenario:{...base,player:{flames:1},shades:[{id:'S-contact',pos:[0,0,0]}]},ticks:60},
 {name:'lose-by-dawn',scenario:{...base,time_left_s:1/60},ticks:60},
 {name:'pulse',scenario:{...base,player:{carried:3},shades:[{id:'S-pulse',pos:[3,0,0]}]},inputs:{frames:[{tick:0,pulse:true}]},ticks:2},
 {name:'seeded-replay-a',ticks:600},
 {name:'seeded-replay-b',ticks:600}
];
for(const c of cases){const args=['--import','tsx','game/src/headless.ts','--seed','42','--night','1','--ticks',String(c.ticks),'--out',join(dir,c.name+'.jsonl')];if(c.scenario){save(c.name+'.scenario.json',c.scenario);args.push('--scenario',join(dir,c.name+'.scenario.json'));}if(c.inputs){save(c.name+'.inputs.json',c.inputs);args.push('--inputs',join(dir,c.name+'.inputs.json'));}run(c.name,process.execPath,args);}
const records=name=>readFileSync(join(dir,name+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
check('oracle-five-lanterns',()=>{const r=records('light-five-lanterns');assert(r[0].tick===0&&r[0].score===0,'initial snapshot');assert(r.filter(x=>x.name==='lantern_lit').length===5,'five lighting events');assert(r.at(-1).type==='end'&&r.at(-1).state==='won'&&r.at(-1).ticks===9,'win at step9');assert(r.at(-1).score===1848,'independent score: 50*10 + 5*100 + floor(300-9/60)*2 + 5*50');});
for(const [name,reason] of [['lose-by-shade','no_flames'],['lose-by-dawn','dawn']])check('oracle-'+name,()=>{const r=records(name);assert(r.some(x=>x.name==='game_over'&&x.data.reason===reason),'expected loss reason');assert(r.at(-1).state==='lost'&&r.at(-1).ticks===1,'stop at step1');});
check('oracle-pulse',()=>{const r=records('pulse');assert(r.filter(x=>x.name==='pulse').length===1,'one pulse while held');assert(r.find(x=>x.name==='pulse').data.stunned_ids.includes('S-pulse'),'shade stunned');});
check('byte-identical-replay',()=>{const a=readFileSync(join(dir,'seeded-replay-a.jsonl')),b=readFileSync(join(dir,'seeded-replay-b.jsonl'));assert(a.equals(b),'outputs differ');save('replay-sha256.json',{a:createHash('sha256').update(a).digest('hex'),b:createHash('sha256').update(b).digest('hex')});});
const passed=results.every(r=>r.passed);save('results.json',{passed,results,limitations:['Isolated headless scenarios, not a full playthrough of the default map.','No browser, screenshot, visual inspection or macOS/Linux validation in this script.']});
console.log(`Evidence: ${dir}`);process.exitCode=passed?0:1;
