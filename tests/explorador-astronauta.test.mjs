import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Box3, LoopOnce, PropertyBinding, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';

const base = 'art-source/personagens/explorador-astronauta/';
const report = JSON.parse(fs.readFileSync(base + 'notas/f1-v003.json'));
const file = base + report.glb.arquivo;
const bytes = fs.readFileSync(file), jsonSize = bytes.readUInt32LE(12);
const raw = JSON.parse(bytes.subarray(20, 20 + jsonSize));
const binary = bytes.subarray(28 + jsonSize);
const expected = ['Idle', 'Run', 'Backward', 'Fall', 'Death', 'Aim_Rifle', 'Reload_Rifle', 'Run_Rifle_Start', 'Dash', 'Jump_Rifle'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const bone = (g, name) => g.scene.getObjectByName(PropertyBinding.sanitizeNodeName('mixamorig:' + name));
function play(g, name) {
    const mixer = new AnimationMixer(g.scene), clip = g.animations.find(c => c.name === name);
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    return time => { mixer.setTime(time); g.scene.updateMatrixWorld(true); };
}
function dimensions(image) {
    if (image.subarray(1, 4).toString() === 'PNG') return [image.readUInt32BE(16), image.readUInt32BE(20)];
    assert.equal(image.readUInt16BE(0), 0xffd8, 'PNG ou JPEG');
    let offset = 2;
    while (offset < image.length) {
        assert.equal(image[offset], 0xff);
        const marker = image[offset + 1], length = image.readUInt16BE(offset + 2);
        if ([0xc0, 0xc1, 0xc2].includes(marker)) return [image.readUInt16BE(offset + 7), image.readUInt16BE(offset + 5)];
        offset += 2 + length;
    }
    throw new Error('SOF JPEG não encontrado');
}

test('S6.8 F1: fontes usadas intactas, pipeline e GLB conferem SHA-256; pacote abaixo de 3 MB', () => {
    assert.equal(hash(file), report.glb.sha256);
    assert.equal(hash(base + 'scripts/preparar_f1.py'), report.script_sha256);
    assert.equal(bytes.length, report.glb.bytes);
    assert.ok(bytes.length <= 3_000_000);
    assert.equal(report.fontes.arquivos.length, 16);
    for (const source of report.fontes.arquivos) {
        assert.equal(hash(base + 'mixamo/' + source.file), source.sha256, source.file);
        assert.equal(fs.statSync(base + 'mixamo/' + source.file).size, source.bytes);
    }
});

test('S6.8 F1: um skin de 57 ossos mixamorig com dedos, dez ações e 10.000 triângulos', () => {
    assert.equal(raw.skins.length, 1);
    const names = raw.skins[0].joints.map(i => raw.nodes[i].name);
    assert.equal(names.length, 57);
    assert.ok(names.every(n => n.startsWith('mixamorig:')));
    for (const suffix of ['Hips', 'Head', 'Spine2', 'RightHand', 'RightHandIndex1', 'RightHandThumb1', 'LeftHandIndex1']) assert.ok(names.includes('mixamorig:' + suffix));
    assert.deepEqual(raw.animations.map(a => a.name).sort(), [...expected].sort());
    const triangles = raw.meshes.flatMap(m => m.primitives).reduce((n, p) => n + raw.accessors[p.indices].count / 3, 0);
    assert.equal(triangles, 10000);
    assert.ok(report.mascara_tronco.includes('mixamorig:RightHand'));
    assert.ok(!report.mascara_tronco.includes('mixamorig:Hips') && !report.mascara_tronco.includes('mixamorig:LeftUpLeg'));
});

test('S6.8 F1: altura no Idle posado de 1,5 m, piso na origem e frente da empunhadura +Z', async () => {
    const g = await loadGlb(file), at = play(g, 'Idle');
    at(0);
    g.scene.traverse(o => { if (o.isSkinnedMesh) o.computeBoundingBox(); });
    const bounds = new Box3().setFromObject(g.scene), size = bounds.getSize(new Vector3());
    assert.ok(Math.abs(size.y - 1.5) <= .02, `altura ${size.y}`);
    assert.ok(Math.abs(bounds.min.y) <= .002, `piso ${bounds.min.y}`);
    const aim = play(g, 'Aim_Rifle'); aim(0);
    const right = bone(g, 'RightHand').getWorldPosition(new Vector3());
    const left = bone(g, 'LeftHand').getWorldPosition(new Vector3());
    assert.ok(left.z > right.z + .25, 'mão de apoio à frente da empunhadura, no +Z');
});

test('S6.8 F1: quadril dos loops sem deriva X/Z; altura original do FBX preservada', async () => {
    for (const clip of report.clipes.filter(c => c.loop)) {
        const g = await loadGlb(file), at = play(g, clip.clipe);
        const trajectory = JSON.parse(fs.readFileSync(base + clip.trajetoria));
        for (const sample of trajectory) {
            at((sample.frame - clip.quadros[0]) / report.fps);
            const p = bone(g, 'Hips').getWorldPosition(new Vector3());
            assert.ok(Math.hypot(p.x, p.z) < 1e-5, `${clip.clipe}: deriva ${p.x}/${p.z}`);
            assert.ok(Math.abs(p.y - (sample.Hips[2] + report.ajuste_origem_blender_m[2])) < 1e-4, `${clip.clipe}: perdeu altura`);
        }
    }
});

test('S6.8 F1: passada lida dos pés do GLB sustenta as taxas de 4,2/1,2 m/s, não a altura da pose de repouso', async () => {
    const median = values => { values.sort((a, b) => a - b); const i = Math.floor(values.length / 2); return values.length % 2 ? values[i] : (values[i - 1] + values[i]) / 2; };
    for (const name of ['Run', 'Backward']) {
        const clip = report.clipes.find(c => c.clipe === name), g = await loadGlb(file), at = play(g, name), samples = [];
        for (let f = clip.quadros[0]; f <= clip.quadros[1]; f++) {
            at((f - clip.quadros[0]) / report.fps);
            samples.push(Object.fromEntries(['Hips', 'LeftToeBase', 'RightToeBase'].map(n => [n, bone(g, n).getWorldPosition(new Vector3())])));
        }
        const sign = name === 'Backward' ? -1 : 1, speeds = [];
        for (const side of ['LeftToeBase', 'RightToeBase']) {
            const floor = Math.min(...samples.map(s => s[side].y));
            for (let i = 1; i < samples.length; i++) {
                const a = samples[i - 1], b = samples[i];
                const velocity = -((b[side].z - b.Hips.z) - (a[side].z - a.Hips.z)) * report.fps * sign;
                if (a[side].y <= floor + .01 && b[side].y <= floor + .01 && velocity > 0) speeds.push(velocity);
            }
        }
        assert.ok(speeds.length >= 6);
        const speed = median(speeds), target = name === 'Run' ? 4.2 : 1.2;
        assert.ok(Math.abs(speed * clip.taxa_sugerida - target) < .01, `${name}: pés a ${speed}, taxa ${clip.taxa_sugerida}`);
        assert.ok(Math.abs(speed * clip.duracao_s - clip.passada.efetiva_m) < .01);
    }
});

test('S6.8 F1: texturas embutidas 1024² e Dash in place guarda o percurso original para F3', async () => {
    assert.equal(raw.images.length, 2);
    for (const image of raw.images) {
        const view = raw.bufferViews[image.bufferView];
        assert.deepEqual(dimensions(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)), [1024, 1024]);
    }
    const clip = report.clipes.find(c => c.clipe === 'Dash'), g = await loadGlb(file), at = play(g, 'Dash');
    assert.equal(clip.fonte, 'dash_Jump_Over.fbx');
    assert.deepEqual(clip.quadros, [1,39]);
    assert.equal(clip.quantidade_quadros,39);
    assert.ok(Math.abs(clip.duracao_s - 38/30)<1e-6);
    assert.ok(clip.root_fonte_horizontal_reta_m > 3.1 && clip.root_fonte_horizontal_reta_m < 3.2, 'medido no FBX atual: 3,169 m antes de K');
    assert.ok(clip.root_original_horizontal_reta_m > 5.19 && clip.root_original_horizontal_reta_m < 5.22);
    assert.ok(clip.root_original_horizontal_percurso_m > 5.20 && clip.root_original_horizontal_percurso_m < 5.22);
    for (let f = 0; f < 39; f++) { at(f / 30); const p = bone(g, 'Hips').getWorldPosition(new Vector3()); assert.ok(Math.hypot(p.x, p.z) < 1e-5); }
    assert.deepEqual(report.faltam, ['Talk', 'Hit', 'Idle armado em loop']);
    assert.equal(report.fora_do_escopo.length, 5);
});


test('S6.8 F1 v002: Dash não afunda, flutuação da aterrissagem ≤12 cm e salto natural preservado', async () => {
    const g=await loadGlb(file),at=play(g,'Dash'),data=report.dash_altura;
    assert.equal(data.perfil.length,39);
    assert.deepEqual(data.quadros_elevados,Array.from({length:19},(_,i)=>i+21));
    assert.equal(data.curvas_protegidas_sha256_antes,data.curvas_protegidas_sha256_depois,'só canal vertical alterado');
    assert.ok(data.elevacao_maxima_aplicada_m>.34&&data.elevacao_maxima_aplicada_m<.35);
    let highestContact=-Infinity,lowest=Infinity;
    for(const sample of data.perfil){
        at((sample.quadro-1)/30);
        g.scene.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});
        const min=new Box3().setFromObject(g.scene).min.y;
        lowest=Math.min(lowest,min);
        assert.ok(min>=-.01,`q${sample.quadro}: ${min}`);
        assert.ok(Math.abs(min-sample.min_z_depois_m)<1e-4,`q${sample.quadro}: GLB difere da medição`);
        if(sample.min_z_antes_m<0){highestContact=Math.max(highestContact,min);assert.ok(min<=.12,`q${sample.quadro}: flutuação ${min}`);}
        if(sample.quadro===15){assert.equal(sample.elevacao_aplicada_m,0);assert.ok(min>.87&&min<.89,'salto natural não é flutuação induzida');}
    }
    assert.ok(lowest>-.003&&lowest<0);
    assert.ok(highestContact>.10&&highestContact<.12);
});

function animationData(buffer){
    const n=buffer.readUInt32LE(12),json=JSON.parse(buffer.subarray(20,20+n)),bin=buffer.subarray(28+n);
    const width={SCALAR:1,VEC3:3,VEC4:4};
    function values(index){
        const a=json.accessors[index],v=json.bufferViews[a.bufferView];assert.equal(a.componentType,5126);
        const dim=width[a.type],stride=v.byteStride??dim*4,offset=(v.byteOffset??0)+(a.byteOffset??0),result=[];
        for(let row=0;row<a.count;row++)for(let col=0;col<dim;col++)result.push(bin.readFloatLE(offset+row*stride+col*4));
        return result;
    }
    return Object.fromEntries(json.animations.map(a=>[a.name,a.channels.map(c=>{
        const sampler=a.samplers[c.sampler];
        return{node:json.nodes[c.target.node].name,path:c.target.path,interpolation:sampler.interpolation??'LINEAR',times:values(sampler.input),values:values(sampler.output)};
    }).sort((a,b)=>(a.node+a.path).localeCompare(b.node+b.path))]));
}

test('S6.8 F1 v003: ações preservadas após troca dos loops armados; v001/v002 preservados e só Hips translada',()=>{
    for(const version of ['v001','v002']){
        const historical=JSON.parse(fs.readFileSync(base+`notas/f1-${version}.json`));
        assert.equal(hash(base+historical.glb.arquivo),historical.glb.sha256,version);
        assert.ok(report.preservados.some(p=>p.sha256===historical.glb.sha256));
    }
    const historical=JSON.parse(fs.readFileSync(base+'notas/f1-v002.json'));
    assert.equal(report.anterior.sha256,JSON.parse(fs.readFileSync(base+'notas/f1-v004.json')).glb.sha256);
    assert.equal(report.escala,historical.escala,'altura do Idle não foi recalibrada');
    const before=animationData(fs.readFileSync(base+historical.glb.arquivo)),after=animationData(bytes);
    for(const name of expected.filter(n=>!['Run','Backward','Fall','Death'].includes(n)))assert.deepEqual(after[name],before[name],name);
    for(const name of ['Fall','Death']){
        for(const channel of after[name]){
            if(channel.node==='mixamorig:Hips'&&channel.path==='translation')continue;
            const original=before[name].find(c=>c.node===channel.node&&c.path===channel.path);
            if(channel.path!=='translation')assert.deepEqual(channel,original,`${name}: ${channel.node} ${channel.path}`);
            else{
                // O exportador decompõe matrizes com novo Hips: arredondamento Float32 submicrométrico.
                assert.deepEqual({...channel,values:undefined},{...original,values:undefined});
                assert.equal(channel.values.length,original.values.length);
                channel.values.forEach((v,i)=>assert.ok(Math.abs(v-original.values[i])<=3e-7,`${name}: ${channel.node} translação local`));
            }
        }
    }
});

test('S6.8 F1 v003: relatório conserva os 24 renders críticos antes/depois',()=>{
    assert.equal(report.renders.length,24);
    for(const r of report.renders)assert.equal(hash(base+r.arquivo),r.sha256);
    for(const[clip,frames]of [['Fall',[1,7,46,80]],['Death',[87,104]]])
        for(const frame of frames)for(const view of ['frente','lado'])for(const state of ['antes','depois']){
            assert.ok(report.renders.some(r=>r.clipe===clip&&r.quadro===frame&&r.vista===view&&r.estado===state));
        }
});

function minY(g){
    g.scene.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});
    return new Box3().setFromObject(g.scene).min.y;
}

test('S6.8 F1 v003: Fall sem borda, solo ≥-1 cm, pernas naturais ≤25 cm e flutuação induzida ≤8 cm',async()=>{
    const g=await loadGlb(file),at=play(g,'Fall'),data=report.fall_altura;
    assert.equal(data.perfil.length,81);
    assert.equal(data.curvas_protegidas_sha256_antes,data.curvas_protegidas_sha256_depois);
    const idle=await loadGlb(file);play(idle,'Idle')(0);
    const anchor=bone(idle,'Hips').getWorldPosition(new Vector3()).y;
    let lowest=Infinity,highest=-Infinity,highestContact=-Infinity;
    for(const sample of data.perfil){
        at((sample.quadro-1)/30);const y=minY(g);
        lowest=Math.min(lowest,y);highest=Math.max(highest,y);
        assert.ok(y>=-.01,`Fall q${sample.quadro}: ${y}`);
        assert.ok(y<=.25,`Fall q${sample.quadro}: borda não removida ${y}`);
        assert.ok(Math.abs(y-sample.min_z_depois_m)<1e-4);
        if(sample.min_z_antes_m<0){highestContact=Math.max(highestContact,y);assert.ok(y<=.08,`Fall q${sample.quadro}: flutuação ${y}`);}
        const hip=bone(g,'Hips').getWorldPosition(new Vector3()).y;
        assert.ok(Math.abs(sample.quadril_z_base_m-anchor)<1e-5,'base no anchor do Idle');
        assert.ok(Math.abs(hip-anchor-sample.elevacao_aplicada_m)<1e-4,'Hips sem o desnível vertical da borda');
        const p=bone(g,'Hips').getWorldPosition(new Vector3());assert.ok(Math.hypot(p.x,p.z)<1e-5);
    }
    assert.ok(lowest>-.004&&lowest<0);
    assert.ok(highest>.20&&highest<.25,'encolhimento natural das pernas preservado');
    assert.ok(highestContact>.05&&highestContact<.08);
});

test('S6.8 F1 v003: Death mantém queda natural, solo ≥-1 cm e flutuação induzida ≤6 cm',async()=>{
    const g=await loadGlb(file),at=play(g,'Death'),data=report.death_altura;
    assert.equal(data.perfil.length,104);
    assert.equal(data.quadros_elevados.length,66);
    assert.equal(data.curvas_protegidas_sha256_antes,data.curvas_protegidas_sha256_depois);
    let lowest=Infinity,highestContact=-Infinity;
    for(const sample of data.perfil){
        at((sample.quadro-1)/30);const y=minY(g);lowest=Math.min(lowest,y);
        assert.ok(y>=-.01,`Death q${sample.quadro}: ${y}`);
        assert.ok(Math.abs(y-sample.min_z_depois_m)<1e-4);
        if(sample.min_z_antes_m<0){highestContact=Math.max(highestContact,y);assert.ok(y<=.06,`Death q${sample.quadro}: flutuação ${y}`);}
        assert.ok(Math.abs(sample.quadril_z_base_m-sample.quadril_z_original_m)<1e-5,'queda original preservada na base');
        const hip=bone(g,'Hips').getWorldPosition(new Vector3());
        assert.ok(Math.abs(hip.y-sample.quadril_z_original_m-sample.elevacao_aplicada_m)<1e-4);
        assert.ok(Math.hypot(hip.x,hip.z)<1e-5);
    }
    assert.ok(lowest>-.009&&lowest<0);
    assert.ok(highestContact>.04&&highestContact<.06);
    const base=data.perfil.map(p=>p.quadril_z_base_m);
    assert.ok(Math.max(...base)-Math.min(...base)>.3,'queda vertical não virou pose fixa');
});


test('S6.8 PBR: v003 exporta o dielétrico original, rugoso e sem specular acima de 1', () => {
    assert.ok(raw.materials.length > 0);
    for (const material of raw.materials) {
        assert.equal(material.pbrMetallicRoughness.metallicFactor, 0);
        assert.ok((material.pbrMetallicRoughness.roughnessFactor ?? 1) >= .8);
        const specular = material.extensions?.KHR_materials_specular;
        assert.ok((specular?.specularColorFactor ?? [1, 1, 1]).every(v => v <= 1));
        assert.ok((specular?.specularFactor ?? 1) <= 1);
    }
    assert.equal(report.material_pbr.materiais[0].depois.Metallic, 0);
    assert.equal(report.material_pbr.materiais[0].depois.Roughness, 1);
});

test('S6.8 histórico v004: preservado; oito ações continuam idênticas na consolidação', async () => {
    const next = JSON.parse(fs.readFileSync(base + 'notas/f1-v004.json'));
    const exported = base + next.glb.arquivo;
    assert.equal(hash(exported), next.glb.sha256);
    assert.equal(next.glb.sha256, '714cc97b621fd860abac539af9997c1a462bdc467b6038f0366ca968502400be');
    assert.ok(next.glb.bytes < 3_000_000);
    for (const source of next.fontes.arquivos) assert.equal(hash(base + 'mixamo/' + source.file), source.sha256);
    assert.equal(next.fontes.arquivos.length, 15);
    for (const previous of next.preservados.filter(p=>!p.glb.endsWith('v003.glb'))) assert.equal(hash(base + previous.glb), previous.sha256);
    const data = animationData(fs.readFileSync(exported)), original = animationData(bytes);
    assert.equal(Object.keys(data).length, 11);
    for (const name of expected.filter(n=>!['Run','Backward'].includes(n))) assert.deepEqual(data[name], original[name], name);
    const run = next.clipes.find(c => c.clipe === 'Run_Rifle');
    assert.equal(run.fonte, 'Rifle_Run_00.fbx'); assert.equal(run.loop, true);
    assert.deepEqual(run.quadros, [1, 21]);
    assert.ok(Math.abs(run.passada.velocidade_apoio_mediana_m_s - 2.7706128358840942) < 1e-7);
    const g = await loadGlb(exported), at = play(g, 'Run_Rifle');
    for (let f = 0; f < 21; f++) {
        at(f / 30); const p = bone(g, 'Hips').getWorldPosition(new Vector3());
        assert.ok(Math.hypot(p.x, p.z) < 1e-5, `Run_Rifle q${f + 1}`);
    }
});
