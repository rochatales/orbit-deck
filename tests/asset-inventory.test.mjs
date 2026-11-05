import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { inventoryAssets, referencesInText, globRegex } from '../scripts/audit-project-assets.mjs';

test('Inventário: caminho relativo, glob e template protegem assets referenciados', () => {
  const assets = ['src/assets/old.glb', 'src/assets/sfx/a.mp3', 'src/assets/sfx/b.mp3'];
  const refs = referencesInText('src/game/map.ts', "import old from '../assets/old.glb?url'; const sounds = import.meta.glob('../assets/sfx/*.mp3');", assets);
  assert.deepEqual(refs.map(ref => ref.asset).sort(), assets.slice().sort());
  assert.equal(referencesInText('tests/check.mjs', '`src/assets/${name}.glb`', assets)[0].kind, 'template_nao_resolvido');
  assert.ok(globRegex('src/assets/**/*.glb').test('src/assets/a.glb'));
  assert.ok(globRegex('src/assets/**/*.glb').test('src/assets/dir/a.glb'));
  assert.ok(globRegex('src/assets/*.{png,jpg}').test('src/assets/a.jpg'));
  assert.equal(referencesInText('src/map.ts', "'old.glb.bak'", ['src/assets/old.glb']).length, 0, 'backup não vira referência falsa ao nome sem sufixo');
});

test('Inventário: variantes emitidas, fontes de ferramenta e backups não são candidatos automáticos a remoção', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exoden-assets-test-'));
  try {
    const fixture = {
      'src/assets/comparacao.glb': 'modelo', 'src/assets/input.glb': 'origem',
      'src/assets/player.glb.bak': 'backup', 'src/assets/solto.glb': 'sem referencias',
      'src/assets/config.json': '{}',
      'src/map.ts': "import config from './assets/config.json';",
      'tests/config.mjs': "const file = 'src/assets/config.json';",
      'public/art/legacy.png': 'imagem copiada', 'dist/art/legacy.png': 'imagem copiada',
      'root-legacy.glb': 'modelo legado da raiz', 'blender/source.fbx': 'fonte antiga',
      'src/assets/inline.mp3': 'audio curto incorporado',
      'src/assets/empty-original.mp3': 'original de ferramenta',
      'src/audio.ts': "const takes=import.meta.glob('./assets/rifle-empty-v*.wav'); const take=takes[`./assets/${v.file}`];",
      'dist/assets/app.js': 'const sound="data:audio/mpeg;base64,' + Buffer.from('audio curto incorporado').toString('base64') + '";',
      'art-source/exports/comparacao.glb': 'modelo',
      'scripts/export.mjs': "const source = 'src/assets/input.glb';"
    };
    for (const [file, contents] of Object.entries(fixture)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), contents);
    }
    const before = Object.fromEntries(Object.keys(fixture).map(file => [file, fs.readFileSync(path.join(root, file))]));
    const result = inventoryAssets({ root, trackedFiles: Object.keys(fixture).filter(file => !file.startsWith('dist/')), revision: 'teste', manifest: { 'src/assets/comparacao.glb': { file: 'assets/comparacao-hash.glb' } } });
    const byName = Object.fromEntries(result.assets.map(file => [path.basename(file.file), file]));
    assert.equal(byName['comparacao.glb'].classification, 'emitido_no_build');
    assert.deepEqual(byName['comparacao.glb'].exactSourceCopies, ['art-source/exports/comparacao.glb']);
    assert.equal(byName['input.glb'].classification, 'ferramenta_ou_fonte');
    assert.equal(byName['player.glb.bak'].classification, 'backup_protegido');
    assert.equal(byName['config.json'].classification, 'referencia_no_codigo_sem_asset_emitido', 'JSON usado em código e teste pode estar incorporado ao JS, não é exclusivo de QA');
    assert.notEqual(byName['solto.glb'].classification, 'referencia_no_codigo_sem_asset_emitido', 'template amplo sozinho não comprova uso de um arquivo solto');
    assert.equal(byName['legacy.png'].classification, 'copiado_de_public_para_dist');
    assert.equal(byName['inline.mp3'].classification, 'incorporado_no_javascript_verificado');
    assert.equal(byName['root-legacy.glb'].classification, 'sem_referencia_detectada');
    assert.ok(result.sources.some(file => file.file === 'blender/source.fbx'));
    assert.notEqual(byName['empty-original.mp3'].classification, 'referencia_no_codigo_sem_asset_emitido', 'consulta por template a um glob não prova que o original é carregado');
    assert.ok(result.assets.every(file => file.action === 'preservar'));
    for (const file of Object.keys(fixture)) assert.deepEqual(fs.readFileSync(path.join(root, file)), before[file], file);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
