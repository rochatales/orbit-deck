import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Box3, KeyframeTrack, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
const base='art-source/personagens/explorador-astronauta/';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=JSON.parse(fs.readFileSync(base+'notas/f1-v009.json'));
const data=c=>({name:c.name,duration:c.duration,tracks:c.tracks.map(t=>KeyframeTrack.toJSON(t))});
async function sample(file) {
    const g=await loadGlb(file),clip=g.animations.find(c=>c.name==='Run');
    const mixer=new AnimationMixer(g.scene),action=mixer.clipAction(clip);action.play();
    const head=g.scene.getObjectByName('mixamorigHead'),hips=g.scene.getObjectByName('mixamorigHips');
    const p=new Vector3(),h=new Vector3(),last=new Vector3();
    const rate=4.2/2.1189701557;let maxStep=0,lowest=Infinity,maxHipStep=0,lastHip=0;
    // Duas voltas reais a 144 Hz: inclui a emenda do loop e as chaves reparadas.
    for(let f=0;f<=Math.ceil(clip.duration/rate*144*2);f++) {
        mixer.setTime(f/144*rate);g.scene.updateMatrixWorld(true);
        head.getWorldPosition(h);hips.getWorldPosition(p);
        if(f){maxStep=Math.max(maxStep,h.distanceTo(last));maxHipStep=Math.max(maxHipStep,Math.abs(p.y-lastHip));}
        last.copy(h);lastHip=p.y;
        assert.ok(Math.hypot(p.x,p.z)<1e-5,'quadril continua in-place');
        g.scene.traverse(n=>{if(n.isSkinnedMesh)n.computeBoundingBox();});
        lowest=Math.min(lowest,new Box3().setFromObject(g.scene).min.y);
    }
    mixer.stopAllAction();return {maxStep,maxHipStep,lowest};
}

test('Run v009: repara só a ponta da bota q9/q10 e o apoio do Hips; outras 13 ações e fontes intactas',async()=>{
    assert.equal(hash(base+report.glb.arquivo),report.glb.sha256);
    assert.equal(hash('src/assets/characters/player/explorador-astronauta.glb'),report.glb.sha256);
    assert.equal(hash(base+'scripts/preparar_f1.py'),report.script_sha256);
    for(const p of report.preservados)assert.equal(hash(base+p.glb),p.sha256);
    for(const f of report.fontes.arquivos)assert.equal(hash(base+'mixamo/'+f.file),f.sha256);
    const old=await loadGlb(base+report.anterior.glb),g=await loadGlb(base+report.glb.arquivo);
    assert.equal(g.animations.length,14);
    for(const clip of old.animations.filter(c=>c.name!=='Run'))assert.deepEqual(data(g.animations.find(c=>c.name===clip.name)),data(clip),clip.name);
    const before=old.animations.find(c=>c.name==='Run'),after=g.animations.find(c=>c.name==='Run');
    assert.equal(after.duration,before.duration);
    for(const track of after.tracks){
        const original=before.tracks.find(t=>t.name===track.name);
        if(track.name==='mixamorigRightToeBase.quaternion'){
            assert.deepEqual(track.times,original.times);
            for(let i=0;i<track.times.length;i++){
                const frame=Math.round(track.times[i]*30)+1;
                if(frame!==9 && frame!==10)assert.deepEqual(track.values.slice(i*4,i*4+4),original.values.slice(i*4,i*4+4),`ponta preservada q${frame}`);
            }
        }
        if(!['mixamorigHips.position','mixamorigRightToeBase.quaternion'].includes(track.name))assert.deepEqual(KeyframeTrack.toJSON(track),KeyframeTrack.toJSON(original),track.name);
    }
    assert.deepEqual(report.run_pe_reparado.perfil.map(p=>p.quadro),[9,10]);
    assert.ok(report.run_altura.elevacao_maxima_aplicada_m<.025,'sem elevação de 11 cm do corpo');
});

test('Run v009: cabeça sem degrau, emenda contínua e pés apoiados entre chaves na taxa real de corrida',async()=>{
    const before=await sample(base+report.anterior.glb),after=await sample(base+report.glb.arquivo);
    assert.ok(before.maxStep>.04,'ensaio reproduz o degrau antigo');
    assert.ok(after.maxStep<.015,JSON.stringify(after));
    assert.ok(after.maxStep<before.maxStep*.4,'redução de pelo menos 60% no maior salto');
    assert.ok(after.maxHipStep<.012,JSON.stringify(after));
    assert.ok(after.lowest>=-.01,`pé abaixo do piso: ${after.lowest}`);
});
