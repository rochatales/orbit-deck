import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';

test('S6.12: props exportados não têm área coplanar sobreposta, incluindo caixas, rótulos e bases', async () => {
 const {coplanarProps}=await import('../scripts/lib/colony-geometry.mjs');
 const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const bytes=fs.readFileSync('src/assets/colony-v006.glb');
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const report=coplanarProps(scene);
 assert.equal(report.props,132);
 assert.equal(report.trianglePairs,0,JSON.stringify(report.pairs));
 // A auditoria diferencia uma junta legítima de uma face sobreposta de área positiva.
 const a=new Group();a.userData.colony_name='PROP_Auditoria';a.name='PROP_Auditoria';
 a.add(new Mesh(new BoxGeometry(1,1,1),new MeshStandardMaterial()));
 const group=new Group();group.add(a);
 const b=a.children[0].clone();a.add(b);
 assert.ok(coplanarProps(group).trianglePairs>0);
 b.position.x=1;assert.equal(coplanarProps(group).trianglePairs,0);
});

test('S6.12: molduras de porta não dividem plano com a parede (z-fighting dos batentes verdes)', async () => {
 // Causa documentada em scripts/colony_arch_geometry.py: batente, verga e portal tinham
 // faces nos mesmos planos do painel/vidro da parede; com DoubleSide, a cor alternava
 // verde/bege conforme a câmera seguia o jogador.
 const {coplanarDoorFrames,isDoorFrame}=await import('../scripts/lib/colony-geometry.mjs');
 const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const bytes=fs.readFileSync('src/assets/colony-v006.glb');
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const report=coplanarDoorFrames(scene);
 assert.equal(report.parts,91);
 assert.equal(report.trianglePairs,0,JSON.stringify(report.pairs));
 assert.ok(isDoorFrame('ARQ_Hub_Porta_S')&&isDoorFrame('ARQ_Hub_Porta_S_Verga')&&isDoorFrame('ARQ_Laboratorio_Portal_L'));
 assert.ok(!isDoorFrame('ARQ_Laboratorio_Porta_Folhas')&&!isDoorFrame('ARQ_Hub_Parede_S_1'));
 // A auditoria pega o defeito original: batente rente ao painel de outra cor.
 const wall=new Group();wall.userData.colony_name='ARQ_Teste_Parede_S_1';
 wall.add(new Mesh(new BoxGeometry(3,2,0.28),new MeshStandardMaterial({name:'M_Painel'})));
 const frame=new Group();frame.userData.colony_name='ARQ_Teste_Porta_S';
 const post=new Mesh(new BoxGeometry(0.2,2,0.28),new MeshStandardMaterial({name:'M_Estrutura'}));post.position.x=-1.4;frame.add(post);
 const group=new Group();group.add(wall,frame);
 assert.ok(coplanarDoorFrames(group).trianglePairs>0);
 post.scale.set(1.02,1.02,1.02);assert.equal(coplanarDoorFrames(group).trianglePairs,0);
});
