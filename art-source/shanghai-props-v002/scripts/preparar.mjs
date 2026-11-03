// Na raiz: node art-source/shanghai-props-v002/scripts/preparar.mjs
// Originais são apenas lidos/conferidos; cópias próprias alimentam o runtime.
import fs from 'node:fs';
import crypto from 'node:crypto';
const root='art-source/shanghai-props-v002/';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const item of JSON.parse(fs.readFileSync(root+'notas/fontes.json','utf8'))){
 if(fs.existsSync(item.source)&&hash(item.source)!==item.sha256)throw new Error('Fonte original mudou: '+item.source);
 const copy=root+item.copy;if(hash(copy)!==item.sha256)throw new Error('Cópia de fonte diverge: '+copy);
 fs.copyFileSync(copy,'src/assets/props/shanghai/'+item.copy.split('/').at(-1));
}
const source=JSON.parse(fs.readFileSync('art-source/shanghai-fase01/export/layout.json','utf8'));
const parts=source.parts.filter(p=>/^(Carro_|Pneu_)/.test(p.id)).map(p=>({...p,sector:`${Math.min(2,Math.max(0,Math.trunc((p.x+51)/34)))}${Math.min(2,Math.max(0,Math.trunc((p.z+54)/36)))}`}));
if(parts.length!==36)throw new Error('Layout original mudou: esperado 36 peças dos seis carros');
fs.writeFileSync('src/assets/props/shanghai/legacy-cars.json',JSON.stringify(parts,null,2)+'\n');
