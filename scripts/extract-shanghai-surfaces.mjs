// Extrai só pisos do layout exportado; nunca lê malha, escreve fonte ou reexporta GLB/Blender.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const source=process.argv[2]??'art-source/shanghai-fase01/export/layout.json';
const bytes=fs.readFileSync(source),layout=JSON.parse(bytes);
const parts=layout.parts.filter(p=>/^(Rua_|Calcada_|Borda_|Canteiro_|Grama_|Faixa_|Retencao_|Seta[HP]_|Bueiro_)/.test(p.id))
 .map(({id,x,z,y,w,h,d,angle,radius,ring})=>({id,x,z,w,d,top:Math.ceil((y+h/2)*1000-1e-8)/1000,angle,...(radius?{radius}:{}),...(ring?{ring}:{} )}));
fs.writeFileSync('src/assets/shanghai-fase01/surfaces.json',JSON.stringify({version:layout.version,sourceSha256:createHash('sha256').update(bytes).digest('hex'),parts},null,2)+'\n');
console.log(`${parts.length} superfícies de ${source}`);
