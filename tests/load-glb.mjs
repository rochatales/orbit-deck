// Leitura de geometria/animações reais em Node, sem decodificar texturas (nenhum asset é alterado).
import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
if (!globalThis.ProgressEvent) globalThis.ProgressEvent = class { constructor(type, init) { this.type = type; Object.assign(this, init); } };
export async function loadGlb(file) {
    const bytes = fs.readFileSync(file), jsonLength = bytes.readUInt32LE(12);
    const data = JSON.parse(bytes.subarray(20, 20 + jsonLength));
    const binOffset = 20 + jsonLength, binLength = bytes.readUInt32LE(binOffset);
    data.buffers[0].uri = `data:application/octet-stream;base64,${bytes.subarray(binOffset + 8, binOffset + 8 + binLength).toString('base64')}`;
    delete data.images; delete data.textures;
    for (const material of data.materials ?? []) {
        for (const name of Object.keys(material)) if (name.endsWith('Texture')) delete material[name];
        if (material.pbrMetallicRoughness) { delete material.pbrMetallicRoughness.baseColorTexture; delete material.pbrMetallicRoughness.metallicRoughnessTexture; }
    }
    return new GLTFLoader().parseAsync(JSON.stringify(data), '');
}
