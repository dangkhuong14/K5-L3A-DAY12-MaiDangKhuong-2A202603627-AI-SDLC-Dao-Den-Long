import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,idle,step,shadeBehavior,tuning,snapshot} from '../src/core.ts';
const base={random_motes:false,random_shades:false};
const distance=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[2]-b[2]);
test('pulse lives exactly 120 ticks, follows player, held input does not refresh',()=>{
 const g=createGame(1,{...base,player:{carried:9},shades:[{id:'S',pos:[1,0,0]}]});
 step(g,{...idle(),pulse:true});assert.equal(g.pulseUntilTick,121);assert.equal(g.shades[0].state,'stunned');assert.equal(g.player.flames,5);
 for(let i=0;i<119;i++)step(g,{...idle(),pulse:true,move:[0,1]});
 assert.equal(g.tick,120);assert.equal(g.pulseUntilTick-g.tick,1);assert.equal(g.player.carried,6);
 step(g,{...idle(),pulse:true});assert.equal(g.tick,121);assert.equal(g.pulseUntilTick-g.tick,0);assert.notEqual(g.shades[0].state,'stunned');
});
test('pulse retreats smoothly and does not remove or teleport shades',()=>{
 const g=createGame(1,{...base,player:{carried:3},shades:[{id:'S',pos:[2,0,0]}]});
 let previous=[...g.shades[0].pos];
 for(let i=0;i<120;i++){step(g,{...idle(),pulse:i===0});assert.equal(g.shades.length,1);assert.equal(g.shades[0].id,'S');assert.ok(distance(previous,g.shades[0].pos)<=shadeBehavior.retreat_speed/60+1e-9);previous=[...g.shades[0].pos];}
 assert.ok(distance(g.player.pos,g.shades[0].pos)>tuning.pulse_radius);
 assert.equal(g.player.flames,5);
});
test('newly lit lantern evacuates shades smoothly and stays safe beyond two seconds',()=>{
 const g=createGame(1,{...base,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]}],shades:[{id:'S',pos:[1,0,0]}]});
 let previous=[...g.shades[0].pos];
 for(let i=0;i<360;i++){step(g,{...idle(),interact:i===0});const s=g.shades[0];assert.ok(distance(previous,s.pos)<=shadeBehavior.retreat_speed/60+1e-9);previous=[...s.pos];assert.equal(g.player.flames,5);if(i>100)assert.ok(distance([0,0,0],s.pos)>tuning.safe_radius);}
 assert.equal(g.shades.length,1);assert.equal(g.lanterns[0].lit,true);
});
test('outside shades never enter permanent safe area',()=>{
 const g=createGame(1,{...base,lanterns:[{id:'L1',pos:[0,0,0],lit:true}],shades:[{pos:[8,0,0]}]});
 for(let i=0;i<400;i++){step(g,idle());assert.ok(distance([0,0,0],g.shades[0].pos)>tuning.safe_radius);}
});
test('coincident pursuers separate, keep all IDs and deterministic replay',()=>{
 const scenario={...base,player:{flames:100},shades:Array.from({length:4},(_,i)=>({id:`S${i}`,pos:[3,0,0]}))};
 const a=createGame(5,scenario),b=createGame(5,scenario);
 for(let i=0;i<90;i++){step(a,idle());step(b,idle());}
 assert.deepEqual(snapshot(a),snapshot(b));assert.equal(a.shades.length,4);
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(distance(a.shades[i].pos,a.shades[j].pos)>.8,'shades visibly separated');
});
test('pulse border rejects new entrants without repeated score or cost',()=>{
 const g=createGame(1,{...base,player:{carried:3},shades:[{id:'outside',pos:[7.1,0,0]}]});
 for(let i=0;i<120;i++){step(g,{...idle(),pulse:true});assert.ok(distance(g.player.pos,g.shades[0].pos)>7);}
 assert.equal(g.score,0);assert.equal(g.player.carried,0);
});
