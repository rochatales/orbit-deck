// Servidor de referência 0c56448 na mesma worktree; não reposiciona nem escreve fontes.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const files=new Map(['src/scene/marsColony/layout.ts','src/game/marsLanding.ts'].map(file=>[
 path.join(root,file),execFileSync('git',['show',`0c56448:${file}`],{encoding:'utf8'})
]));
export default {root,assetsInclude:['**/*.glb','**/*.gltf'],cacheDir:path.join(root,'node_modules/.vite-deck-base'),
 plugins:[{name:'deck-base-0c56448',enforce:'pre',load(id){return files.get(id.split('?')[0])??null;}}]};
