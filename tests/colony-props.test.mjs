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
