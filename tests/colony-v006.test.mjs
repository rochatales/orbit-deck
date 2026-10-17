import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group, Object3D, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
const { ColonyVisibility } = loadSource('src/scene/marsColony/visibility.ts');
const manifest = JSON.parse(fs.readFileSync('src/assets/colony-v006.manifest.json', 'utf8'));
function fixture(parts) {
 const scene = new Group();
 for (const part of parts) { const node = new Object3D(); node.name = part.name; scene.add(node); }
 return { scene, visibility: new ColonyVisibility(scene, parts) };
}
const part = (name, extra = {}) => ({name, bounds:{minX:-2,maxX:2,minY:0,maxY:3,minZ:1,maxZ:1.2},apoiado_em:[],apoiado_em_todos:[],...extra});

test('S6.12: exportação completa B3 sem referências, variantes antigas ou colisores de malha', () => {
 const file = fs.readFileSync('src/assets/colony-v006.glb');
 assert.equal(file.readUInt32LE(0), 0x46546c67);
 const json = JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
 const names = new Set(json.nodes.map(node=>node.name));
 assert.ok(manifest.parts.length > 350);
 assert.equal(new Set(manifest.parts.map(p=>p.name)).size,manifest.parts.length);
 for (const p of manifest.parts) {
  assert.ok(names.has(p.name),p.name);
  assert.ok(json.nodes.some(node=>node.extras?.colony_name===p.name),`identidade estável: ${p.name}`);
  assert.doesNotMatch(p.name,/^(REF_|COL_|SPAWN_|INTERACT_|CAM_|LUZ_|PLAT_[AB]_|PLAT_B2_)/);
  for (const support of [...p.apoiado_em,...p.apoiado_em_todos]) assert.ok(names.has(support), support);
 }
 assert.ok(names.has('PLAT_B3_Foguete'));
 assert.ok(names.has('TET_Laboratorio'));
 assert.equal(json.cameras,undefined);
});

test('S6.12: libera a linha de visão e respeita a histerese sem ocultar pisos', () => {
 const {scene,visibility}=fixture([part('ARQ_Parede'),part('ARQ_Piso')]);
 visibility.update({x:0,z:0},new Vector3(0,2,10),0.016);
 assert.equal(scene.getObjectByName('ARQ_Parede').visible,false);
 assert.equal(scene.getObjectByName('ARQ_Piso').visible,true);
 visibility.update({x:0,z:0},new Vector3(0,2,-10),0.2);
 assert.equal(scene.getObjectByName('ARQ_Parede').visible,false);
 visibility.update({x:0,z:0},new Vector3(0,2,-10),0.31);
 assert.equal(scene.getObjectByName('ARQ_Parede').visible,true);
});

test('S6.12: dependências não deixam props suspensos e se restauram com a parede', () => {
 const {scene,visibility}=fixture([part('PROP_Tela',{apoiado_em:['ARQ_Parede']}),part('ARQ_Parede')]);
 visibility.update({x:0,z:0},new Vector3(0,2,10),0.016);
 assert.equal(scene.getObjectByName('PROP_Tela').visible,false);
 visibility.update({x:0,z:0},new Vector3(0,2,-10),0.6);
 assert.equal(scene.getObjectByName('PROP_Tela').visible,true);
});

test('S6.12: porta do laboratório troca folhas na aproximação e ao afastar', () => {
 const {scene,visibility}=fixture([part('ARQ_Laboratorio_Porta_Folhas'),part('ARQ_Laboratorio_Porta_Folhas_Aberta')]);
 visibility.update({x:9.5,z:-10},new Vector3(20,14,-10),0.016);
 assert.equal(scene.getObjectByName('ARQ_Laboratorio_Porta_Folhas').visible,false);
 assert.equal(scene.getObjectByName('ARQ_Laboratorio_Porta_Folhas_Aberta').visible,true);
 visibility.update({x:0,z:0},new Vector3(0,14,0),0.016);
 assert.equal(scene.getObjectByName('ARQ_Laboratorio_Porta_Folhas').visible,true);
 assert.equal(scene.getObjectByName('ARQ_Laboratorio_Porta_Folhas_Aberta').visible,false);
});

test('S6.12: os 129 retângulos físicos coincidem com a referência do Blender', () => {
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
 const {createWorld}=loadSource('src/game/marsWorld.ts');
 const world=createWorld();
 const key = rect => rect.map(v=>v.toFixed(3)).join(',');
 assert.equal(manifest.colliders.length,129);
 assert.deepEqual(world.obstacles.map(r=>key([r.minX,r.maxX,r.minZ,r.maxZ])).sort(),manifest.colliders.map(key).sort());
});
