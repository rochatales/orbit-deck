import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, SRGBColorSpace, Color, Mesh, PlaneGeometry, MeshStandardMaterial } from 'three';
import { loadSource } from './load-source.mjs';
const {SandwindWind,SandCloudField,SAND_WIND}=loadSource('src/scene/marsColony/sandwindWind.ts');
const {SandCloudVisual}=loadSource('src/scene/marsColony/sandCloudVisual.ts');
const {SandwindController}=loadSource('src/scene/marsColony/SandwindController.ts');
const {SANDWIND_APPEARANCE,defaultSandwindSettings,SANDWIND_PROFILES}=loadSource('src/scene/marsColony/sandwindPolicy.ts');

test('Sandwind: cor avermelhada escura, transição suave e ocultação ainda opaca nos limites',()=>{
 const c=new Color(SANDWIND_APPEARANCE.color).getRGB({r:0,g:0,b:0},SRGBColorSpace);
 assert.ok(c.r>c.g&&c.g>c.b&&c.r<.5);
 assert.ok(SANDWIND_APPEARANCE.falloffExponent>1);
 const mid=Math.pow(.5,SANDWIND_APPEARANCE.falloffExponent);assert.ok(mid<.35,'reduz a vinheta na metade da faixa');
 for(const p of Object.values(SANDWIND_PROFILES))assert.ok(p.opaque<p.reveal&&p.reveal<p.hide);
 const scope=new Group(),cloud=new SandCloudVisual(new SandwindWind(),[]);scope.add(cloud.mesh);
 const receiver=new Mesh(new PlaneGeometry(1,1),new MeshStandardMaterial());scope.add(receiver);
 const ctl=new SandwindController(scope,[],[],SRGBColorSpace);assert.equal(ctl.stats.materials,1,'só o piso recebe patch; nuvem tem shader próprio');
 const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <fog_fragment>'};receiver.material.onBeforeCompile(shader,{});
 assert.match(shader.fragmentShader,/pow\(smoothstep/);assert.equal(shader.uniforms.swFalloff.value,SANDWIND_APPEARANCE.falloffExponent);
 ctl.update(0,0,1/60,defaultSandwindSettings(false),false);assert.ok(shader.uniforms.swDrift.value.x>0);assert.equal(shader.uniforms.swDrift.value.x,ctl.wind.offsetX);
 ctl.dispose();cloud.dispose();receiver.geometry.dispose();receiver.material.dispose();
});

test('Vento: direção coerente, rajadas com inércia, pausa e reduced motion sem tempo acumulado',()=>{
 const wind=new SandwindWind(),vx=wind.velocityX;
 wind.update(1/60,true,false);assert.ok(Math.abs(wind.velocityX-vx)<.02);
 for(let i=0;i<600;i++)wind.update(1/60,true,false);
 assert.ok(wind.offsetX>wind.offsetZ&&wind.offsetZ>0);
 assert.ok(wind.velocityX>1&&wind.velocityX<2);
 const state={...wind};wind.update(10,true,true);wind.update(10,false,false);wind.update(NaN,true,false);assert.deepEqual({...wind},state);
 wind.update(10,true,false);assert.ok(Math.abs(wind.time-state.time-.05)<1e-8);
 assert.equal(defaultSandwindSettings(true).wind,false);
});

test('Nuvens: pool fixo, advecção pelo vento, reciclagem nas bordas e pausa sem alocação de arrays',()=>{
 const wind=new SandwindWind(),field=new SandCloudField(),positions=field.positions,phases=field.phases,sizes=field.sizes;
 const x=positions[0],z=positions[1];for(let i=0;i<120;i++){wind.update(1/60,true,false);field.update(1/60,wind,true,false);}
 assert.ok(positions[0]>x&&positions[1]>z);
 assert.equal(field.positions,positions);assert.equal(field.phases,phases);assert.equal(field.sizes,sizes);
 const copy=positions.slice();field.update(10,wind,true,true);assert.deepEqual(positions,copy);
 positions[0]=SAND_WIND.maxX-.001;field.update(.05,wind,true,false);assert.ok(positions[0]<SAND_WIND.minX+.2);
 for(let i=0;i<4000;i++){wind.update(1/60,true,false);field.update(1/60,wind,true,false);}
 for(let i=0;i<SAND_WIND.cloudCount;i++){assert.ok(positions[i*2]>=SAND_WIND.minX&&positions[i*2]<=SAND_WIND.maxX);assert.ok(positions[i*2+1]>=SAND_WIND.minZ&&positions[i*2+1]<=SAND_WIND.maxZ);}
});

test('Nuvens: instanciadas, sem sombra/luzes, máscara de interior e pausa/descarte dos recursos',()=>{
 const wind=new SandwindWind(),visual=new SandCloudVisual(wind,[{minX:-4,maxX:4,minZ:-4,maxZ:4}]),mesh=visual.mesh;
 assert.equal(mesh.count,28);assert.equal(mesh.castShadow,false);assert.equal(mesh.material.depthWrite,false);
 assert.match(mesh.material.fragmentShader,/shelters\[1\]/);assert.match(mesh.material.fragmentShader,/vCloudWorld.y<2.8/);
 assert.match(mesh.material.fragmentShader,/ground\*bounds/);assert.ok(mesh.material.uniforms.opacity.value<=.16);
 const matrices=mesh.instanceMatrix.array,first=matrices.slice();visual.update(1/60,true,true,true);assert.deepEqual(matrices,first);
 wind.update(1/60,true,false);visual.update(1/60,true,true,false);assert.equal(mesh.instanceMatrix.array,matrices);assert.notDeepEqual(matrices,first);
 visual.update(1/60,true,false,false);assert.equal(mesh.visible,false);visual.update(1/60,false,true,false);assert.equal(mesh.visible,false);
 let geometry=0,material=0,instance=0;mesh.addEventListener('dispose',()=>instance++);mesh.geometry.addEventListener('dispose',()=>geometry++);mesh.material.addEventListener('dispose',()=>material++);
 visual.dispose();visual.dispose();assert.equal(geometry,1);assert.equal(material,1);assert.equal(instance,1);
});
