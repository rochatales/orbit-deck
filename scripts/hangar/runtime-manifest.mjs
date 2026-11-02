// Dados simples da implantação aprovada. Não altera Blender, v001 ou GLB v002.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const colony=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
const fit=JSON.parse(fs.readFileSync('art-source/hangar/notas/encaixe_v002.json'));
const removedRooms=['meeting-suite','meeting-exterior-airlock'];
const dock=colony.walkableAreas.find(a=>a.id==='meeting-suite');
const inside=(r,a)=>r.minX>=a.minX&&r.maxX<=a.maxX&&r.minZ>=a.minZ&&r.maxZ<=a.maxZ;
const removedColliders=colony.colliders.filter(r=>r.id.startsWith('wall-meeting-suite-')||(r.id.startsWith('interior-')&&inside(r,dock))).map(r=>r.id);
const box=(id,minX,maxX,minZ,maxZ)=>({id,minX,maxX,minZ,maxZ});
const c=fit.placement.z;
const colliders=[
 box('hangar-north-west',-4.29,-1.1,11.415,11.585),box('hangar-north-east',1.1,4.29,11.415,11.585),
 box('hangar-west',-4.79,-3.65,11.585,18.4),
 box('hangar-east-north',3.65,4.79,11.585,13.9),box('hangar-east-south',3.65,4.79,16.1,18.4),
 box('hangar-front-west',-4.79,-2.45,17.475,18.4),box('hangar-front-east',2.45,4.79,17.475,18.4),
 box('hangar-ramp-edge-west',-2.46,-2.34,17.795,20.15),box('hangar-ramp-edge-east',2.34,2.46,17.795,20.15),
 // Veículo e envelopes conservadores do içamento/trole, sem colisor nos trilhos elevados.
 box('hangar-vehicle',1.0,2.81,c-2.45,c+.15),
 box('hangar-crane-load-left',-2.04,-.44,c+.32,c+1.48),
 box('hangar-crane-hook-right',1.075,1.571,c+.34,c+1.34),
];
const out={version:'hangar-v002-runtime',sha256:createHash('sha256').update(fs.readFileSync('src/assets/hangar/hangar-v002.glb')).digest('hex'),placement:fit.placement,
 removedRooms,removedParts:colony.parts.filter(p=>removedRooms.includes(p.ambiente)).map(p=>p.id),removedColliders,
 removedFloorAreas:colony.walkableAreas.filter(a=>[...removedRooms,'meeting-east-connector'].includes(a.id)),
 walkableAreas:[box('hangar-interior',-4.025,4.025,c-3.22,c+3.22),box('hangar-ramp',-2.45,2.45,17.795,20.15),box('hangar-east-connector',4,5.3,13.9,16.1)],colliders,
 roofArea:box('hangar',-3.9,3.9,-3.0,3.0),
 doors:[{id:'D_hangar_north',x:0,z:-3.075,axis:'x',width:2.2,owner:'hangar'},{id:'D_hangar_east',x:4.05,z:.425,axis:'z',width:2.2,owner:'hangar'}],
 ramp:{thresholdZ:17.795,endZ:20.15,top:.16,tip:.02,halfWidth:2.45,nearInsideZ:14.795,nearOutsideZ:23.15,nearHalfWidth:3.1},
 bridge:{minX:4,maxX:5.3,minZ:13.9,maxZ:16.1,top:.16},animation:{response:12,landingPulse:3},
 notes:['Colisores de equipamento cobrem envelopes animados; trilhos do teto acima do jogador não viram barreira 2D.','Apoio analítico do piso/rampa/ponte, sem geometria de GLB na física.','PISO_v007 compartilhado é recortado em cópia de memória, só nas áreas substituídas.']};
fs.writeFileSync('src/assets/hangar/hangar-v002.manifest.json',JSON.stringify(out,null,2)+'\n');
console.log(out.sha256,removedColliders.length,'colisores antigos removidos,',colliders.length,'novos');
