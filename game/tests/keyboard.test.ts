import {test} from 'node:test';
import assert from 'node:assert/strict';
import {keyboardMove} from '../src/keyboard.ts';
import {createGame,idle,step} from '../src/core.ts';

test('browser keys map A/left to screen-left and D/right to screen-right at every yaw',()=>{
  for(const yaw of [0,45,90,180,270]){
    const a=yaw*Math.PI/180;
    // With camera behind -forward, screen-right = forward cross world-up.
    const right=[-Math.cos(a),Math.sin(a)];
    for(const [key,sign] of [['KeyA',-1],['ArrowLeft',-1],['KeyD',1],['ArrowRight',1]] as const){
      const g=createGame(1,{random_motes:false,random_shades:false});
      step(g,{...idle(),move:keyboardMove(new Set([key])),cam_yaw_deg:yaw});
      const screenDisplacement=g.player.pos[0]*right[0]+g.player.pos[2]*right[1];
      assert.ok(screenDisplacement*sign>0,`${key} at yaw ${yaw}`);
    }
  }
});
test('W/S remain forward/backward; opposite keys cancel',()=>{
  assert.deepEqual(keyboardMove(new Set(['KeyW'])),[0,1]);
  assert.deepEqual(keyboardMove(new Set(['KeyS'])),[0,-1]);
  assert.deepEqual(keyboardMove(new Set(['KeyA','KeyD','KeyW','KeyS'])),[0,0]);
  assert.deepEqual(keyboardMove(new Set(['ArrowUp','ArrowLeft'])),[1,1]);
});
