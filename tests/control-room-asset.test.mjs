import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../art-source/control-room/', import.meta.url);
const load = p => readFileSync(new URL(p, root));
const man = JSON.parse(load('export/manifesto_control_room_v001.json'));
const bytes = load('export/control_room_v001.glb');
const len = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + len));
const parts = gltf.nodes.filter(n => n.mesh !== undefined);
test('Control Room: limite real de 10k, IDs únicos e manifesto completo', () => {
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  const ids = parts.map(n => n.extras.id_estavel);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(ids.sort(), man.parts.map(p => p.id).sort());
  let count = 0;
  for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
    assert.equal(p.mode ?? 4, 4);
    count += gltf.accessors[p.indices].count / 3;
    assert.ok(p.attributes.TEXCOORD_0 !== undefined);
    assert.ok(p.attributes.NORMAL !== undefined);
  }
  assert.equal(count, man.triangles); assert.ok(count > 0 && count <= 10000);
  assert.equal(gltf.materials.length, 2);
  assert.ok(gltf.materials.some(m => m.alphaMode === 'BLEND'));
});
test('Control Room: teto e suportes sincronizados, paredes preservadas e estados explícitos', () => {
  const hidden = new Set(['TET_Control']);
  for (const part of man.parts) {
    const node = parts.find(n => n.extras.id_estavel === part.id);
    for (const k of ['papel','estado_inicial','estado_operacao','ambiente']) assert.equal(node.extras[k], part[k]);
    for (const k of ['apoiado_em','apoiado_em_todos']) {
      assert.deepEqual(JSON.parse(node.extras[k]), part[k]);
      assert.ok(part[k].every(id => man.parts.some(p => p.id === id)));
    }
  }
  let prior;
  do {
    prior = hidden.size;
    for (const p of man.parts) if (p.apoiado_em.some(s => hidden.has(s))) hidden.add(p.id);
  } while (prior !== hidden.size);
  assert.ok(hidden.has('PROP_Control_Telhado') && hidden.has('TET_Control_Luminarias'));
  assert.ok(!man.parts.some(p => p.papel === 'wall' && hidden.has(p.id)));
  assert.equal(parts.find(n => n.extras.id_estavel === 'PROP_Control_Interacao').extras.estado_inicial, 'oculto');
  for (const side of ['S','L']) for (const leaf of ['A','B']) assert.ok(parts.some(n => n.extras.id_estavel === `D_Control_${side}_${leaf}`));
});
test('Control Room: atlas embutidos 2K e arte reimportada vinculada por hash', () => {
  for (const image of gltf.images) {
    assert.equal(image.mimeType, 'image/png');
    const view = gltf.bufferViews[image.bufferView], off = 20 + len + 8 + (view.byteOffset || 0);
    assert.equal(bytes.readUInt32BE(off + 16), 2048); assert.equal(bytes.readUInt32BE(off + 20), 2048);
  }
  const report = JSON.parse(load('notas/roundtrip.json'));
  for (const [file, hash] of Object.entries(report.sha256)) assert.equal(createHash('sha256').update(load(file)).digest('hex'), hash);
  assert.ok(report.max_error_m < .0002);
  assert.ok(report.max_geometric_normal_deviation_degrees < .1);
  assert.equal(report.objects, parts.length);
});
test('Control Room: implantação, interação e circulação propostas sem malha na física', () => {
  assert.deepEqual(man.position, {x:0,z:-10.5}); assert.deepEqual(man.size,{width:7,depth:6.5});
  assert.deepEqual(man.entrances,['south','east']);
  assert.equal(man.interaction.existingAction,'openEden');
  assert.ok(!gltf.nodes.some(n => n.name?.startsWith('COL_')));
  const circulation = JSON.parse(load('notas/circulacao.json'));
  for (const r of ['0.32','0.36']) {
    assert.equal(circulation[r].reachable_targets.length, 4);
    for (const path of Object.values(circulation[r].paths_local_blender_xy)) assert.ok(path.length > 1);
  }
  assert.ok(circulation.interaction_distance_m < man.interaction.existingRadius);
});

test('Control Room: implantação medida, piso nivelado e portas fechadas sem sobreposição na verga', () => {
  const floor=man.parts.find(p=>p.id==='PIS_Control').bounds;
  assert.ok(Math.abs(floor.minX+3.5)<1e-5 && Math.abs(floor.maxX-3.5)<1e-5);
  assert.ok(Math.abs(floor.minZ+13.75)<1e-5 && Math.abs(floor.maxZ+7.25)<1e-5);
  assert.ok(Math.abs(floor.maxY)<.006);
  for (const p of man.parts.filter(p=>p.papel==='wall')) {
    assert.ok(p.bounds.minX>=-3.75 && p.bounds.maxX<=3.75);
    assert.ok(p.bounds.minZ>=-14 && p.bounds.maxZ<=-7);
  }
  for (const side of ['S','L']) for (const leaf of ['A','B']) {
    const door=man.parts.find(p=>p.id===`D_Control_${side}_${leaf}`).bounds;
    assert.ok(Math.abs(door.minY)<1e-5);
    assert.ok(door.maxY<=2.21);
  }
});

test('Control Room: móveis assentados, envelopes completos e folgas das folhas', () => {
  for (const [partId,colId] of [['PROP_Control_Console','COL_CR_Console'],['PROP_Control_Rack','COL_CR_Rack'],['PROP_Control_Consoles_N','COL_CR_Consoles_N']]) {
    const b=man.parts.find(p=>p.id===partId).bounds,c=man.colliders_proposed.find(c=>c.id===colId);
    assert.ok(Math.abs(b.minY)<1e-5,partId);
    for (const [axis,min,max] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]) {
      assert.ok(c.center[axis]-c.halfExtents[axis]<=b[min]+1e-5,`${partId} ${min}`);
      assert.ok(c.center[axis]+c.halfExtents[axis]>=b[max]-1e-5,`${partId} ${max}`);
    }
  }
  for (const side of ['S','L']) {
    const a=man.parts.find(p=>p.id===`D_Control_${side}_A`).bounds,b=man.parts.find(p=>p.id===`D_Control_${side}_B`).bounds;
    if(side==='S')assert.ok(b.minX-a.maxX>=.014);
    else assert.ok(a.minZ-b.maxZ>=.014);
  }
});
