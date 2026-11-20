export type Vec = [number, number, number];
export const tuning = {
  player_speed: 7, carry_capacity: 15, lantern_cost: 10, lantern_count_night1: 5,
  pickup_radius: 1.5, interact_radius: 3, pulse_cost: 3, pulse_radius: 7,
  night1_duration_s: 300, flames: 5, invuln_s: 2, hit_drop_ratio: 0.25,
  pulse_stun_s: 3, pulse_push_m: 4, pulse_cooldown_s: 1, safe_radius: 6,
  shade_speed: 2.4, shade_hit_radius: 1.1, fall_enabled: false,
  score: { per_mote: 10, per_lantern: 100, per_stun: 20, per_second_left: 2, per_flame_left: 50 }
};
export type Input = {move:[number,number];cam_yaw_deg:number;jump:boolean;interact:boolean;pulse:boolean};
export const idle = ():Input => ({move:[0,0],cam_yaw_deg:0,jump:false,interact:false,pulse:false});
export type Event = {type:'event';tick:number;name:string;data:Record<string,unknown>};
type Lantern = {id:string;pos:Vec;lit:boolean;deposited:number};
type Shade = {id:string;pos:Vec;state:string;stun:number};
export type Game = {tick:number;state:'playing'|'won'|'lost';time_left_s:number;score:number;
 player:{pos:Vec;carried:number;flames:number};lanterns:Lantern[];motes:{id:string;pos:Vec}[];shades:Shade[];
 previous:Input;velocity:number;invuln:number;cooldown:number;initialTime:number};
const dist = (a:Vec,b:Vec) => Math.hypot(a[0]-b[0],a[2]-b[2]);
export function createGame(seed=1, scenario:any={}):Game {
 let s=seed>>>0; const random=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
 const point=():Vec=>{const a=random()*Math.PI*2,r=5+random()*28;return [Math.sin(a)*r,0,Math.cos(a)*r];};
 const lanterns:Lantern[]=Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5;return {id:`L${i+1}`,pos:[Math.sin(a)*24,0,Math.cos(a)*24],lit:false,deposited:0};});
 for(const patch of scenario.lanterns??[]){const l=lanterns.find(x=>x.id===patch.id);if(l)Object.assign(l,patch,{pos:patch.pos?[...patch.pos]:l.pos});}
 const motes=(scenario.motes??(scenario.random_motes===false?[]:Array.from({length:100},point))).map((p:Vec,i:number)=>({id:`M${i+1}`,pos:[...p] as Vec}));
 const shades=(scenario.shades??(scenario.random_shades===false?[]:Array.from({length:4},()=>({pos:point()})))).map((x:any,i:number)=>({id:x.id??`S${i+1}`,pos:[...x.pos] as Vec,state:'chase',stun:0}));
 return {tick:0,state:'playing',time_left_s:scenario.time_left_s??tuning.night1_duration_s,initialTime:scenario.time_left_s??tuning.night1_duration_s,score:0,
 player:{pos:[...(scenario.player?.pos??[0,0,0])] as Vec,carried:scenario.player?.carried??0,flames:scenario.player?.flames??tuning.flames},
 lanterns,motes,shades,previous:idle(),velocity:0,invuln:0,cooldown:0};
}
export function step(g:Game,input:Input):Event[]{
 if(g.state!=='playing')return [];
 const events:Event[]=[];g.tick++;const dt=1/60,p=g.player;
 const emit=(name:string,data:Record<string,unknown>)=>events.push({type:'event',tick:g.tick,name,data});
 g.invuln=Math.max(0,g.invuln-dt);g.cooldown=Math.max(0,g.cooldown-dt);
 const yaw=input.cam_yaw_deg*Math.PI/180;const [x,z]=input.move;const norm=Math.max(1,Math.hypot(x,z));
 p.pos[0]+=(x*Math.cos(yaw)+z*Math.sin(yaw))/norm*tuning.player_speed*dt;
 p.pos[2]+=(-x*Math.sin(yaw)+z*Math.cos(yaw))/norm*tuning.player_speed*dt;
 const r=Math.hypot(p.pos[0],p.pos[2]);if(r>37){p.pos[0]*=37/r;p.pos[2]*=37/r;}
 if(input.jump&&!g.previous.jump&&p.pos[1]===0)g.velocity=8;
 p.pos[1]=Math.max(0,p.pos[1]+g.velocity*dt);g.velocity-=20*dt;if(p.pos[1]===0)g.velocity=0;
 g.motes=g.motes.filter(m=>{if(p.carried<tuning.carry_capacity&&dist(p.pos,m.pos)<=tuning.pickup_radius){p.carried++;g.score+=tuning.score.per_mote;emit('mote_picked',{carried:p.carried});return false;}return true;});
 if(input.interact&&!g.previous.interact){
 const l=g.lanterns.filter(l=>!l.lit&&dist(p.pos,l.pos)<=tuning.interact_radius).sort((a,b)=>dist(p.pos,a.pos)-dist(p.pos,b.pos)||a.id.localeCompare(b.id))[0];
 if(l&&p.carried>0){const amount=Math.min(p.carried,tuning.lantern_cost-l.deposited);p.carried-=amount;l.deposited+=amount;emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});if(l.deposited>=tuning.lantern_cost){l.lit=true;g.score+=tuning.score.per_lantern;emit('lantern_lit',{lantern_id:l.id});}}
 }
 if(input.pulse&&!g.previous.pulse&&g.cooldown===0&&p.carried>=tuning.pulse_cost){p.carried-=tuning.pulse_cost;g.cooldown=tuning.pulse_cooldown_s;const ids:string[]=[];
 for(const s of g.shades)if(dist(p.pos,s.pos)<=tuning.pulse_radius){s.stun=tuning.pulse_stun_s;s.state='stunned';ids.push(s.id);const d=dist(p.pos,s.pos);const dx=d?(s.pos[0]-p.pos[0])/d:1,dz=d?(s.pos[2]-p.pos[2])/d:0;s.pos[0]+=dx*tuning.pulse_push_m;s.pos[2]+=dz*tuning.pulse_push_m;g.score+=tuning.score.per_stun;}
 emit('pulse',{stunned_ids:ids});}
 for(const s of g.shades){
 if(s.stun>0){s.stun=Math.max(0,s.stun-dt);s.state=s.stun>0?'stunned':'chase';continue;}
 const d=dist(p.pos,s.pos);let target:Vec=[...s.pos];if(d>0){const amount=Math.min(d,tuning.shade_speed*dt);target[0]+=(p.pos[0]-s.pos[0])/d*amount;target[2]+=(p.pos[2]-s.pos[2])/d*amount;}
 for(const l of g.lanterns)if(l.lit&&dist(target,l.pos)<=tuning.safe_radius){const dd=dist(target,l.pos);const dx=dd?(target[0]-l.pos[0])/dd:1,dz=dd?(target[2]-l.pos[2])/dd:0;target[0]=l.pos[0]+dx*(tuning.safe_radius+0.001);target[2]=l.pos[2]+dz*(tuning.safe_radius+0.001);}
 s.pos=target;s.state='chase';
 if(g.invuln===0&&dist(p.pos,s.pos)<=tuning.shade_hit_radius){p.flames=Math.max(0,p.flames-1);const dropped=Math.floor(p.carried*tuning.hit_drop_ratio);p.carried-=dropped;g.invuln=tuning.invuln_s;emit('player_hit',{by:'shade',flames:p.flames,dropped});}
 }
 g.time_left_s=Math.max(0,g.initialTime-g.tick/60);
 const reason=g.lanterns.every(l=>l.lit)?'all_lit':p.flames<=0?'no_flames':g.time_left_s<=0?'dawn':null;
 if(reason){g.state=reason==='all_lit'?'won':'lost';if(g.state==='won')g.score+=Math.floor(g.time_left_s)*tuning.score.per_second_left+p.flames*tuning.score.per_flame_left;emit('game_over',{result:g.state,reason});}
 g.previous={...input,move:[...input.move]};return events;
}
const rounded=(p:Vec)=>p.map(v=>Math.round(v*1000)/1000);
export function snapshot(g:Game){return {type:'snapshot',tick:g.tick,sim_tick:g.tick,state:g.state,time_left_s:g.time_left_s,score:g.score,
 player:{...g.player,pos:rounded(g.player.pos)},lanterns:g.lanterns.map(l=>({...l,pos:rounded(l.pos)})),shades:g.shades.map(s=>({id:s.id,pos:rounded(s.pos),state:s.state})),motes_active:g.motes.length,motes:g.motes.map(m=>({...m,pos:rounded(m.pos)}))};}
