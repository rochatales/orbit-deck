/** Build de QA em /tmp: App real + fixture de posicionamento; não distribui os atalhos de QA. */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({root:process.cwd(),assetsInclude:["**/*.glb","**/*.gltf"],build:{outDir:'/tmp/horda-s6-3-qa',emptyOutDir:true,rollupOptions:{input:{app:resolve('index.html'),qa:resolve('tests/shanghai-phase01.html')}}}});
