import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const {relativeMovement}=loadSource('src/characters/player/relativeMovement.ts');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('movement follows character facing at cardinal and intermediate angles',()=>{
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2,.73]){
    const front=relativeMovement(angle,0,1),back=relativeMovement(angle,0,-1);
    close(front.x,Math.sin(angle));close(front.z,Math.cos(angle));
    close(back.x,-front.x);close(back.z,-front.z);
    const right=relativeMovement(angle,1,0),left=relativeMovement(angle,-1,0);
    close(right.x,-Math.cos(angle));close(right.z,Math.sin(angle));
    close(left.x,-right.x);close(left.z,-right.z);close(front.x*right.x+front.z*right.z,0);
  }
});
test('diagonal movement is capped and release is stationary for every facing',()=>{
  for(const angle of [0,.7,2,4]){
    for(const side of [-1,1])for(const forward of [-1,1]){
      const p=relativeMovement(angle,side,forward);close(Math.hypot(p.x,p.z),1);
    }
    const p=relativeMovement(angle,0,0);close(p.x,0);close(p.z,0);
  }
});
