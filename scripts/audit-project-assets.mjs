// Inventário somente de leitura. Não remove, move ou reescreve assets/fontes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.json', '.md', '.html', '.css', '.txt', '.sh', '.yaml', '.yml']);
const mediaExtensions = new Set(['.glb', '.gltf', '.fbx', '.obj', '.mtl', '.blend', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp3', '.wav', '.ogg', '.mp4', '.webm', '.woff', '.woff2', '.ttf', '.otf']);
const analysisFiles = new Set(['docs/ASSETS.md', 'scripts/audit-project-assets.mjs', 'tests/asset-inventory.test.mjs']);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function globRegex(pattern) {
  let result = '^';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern.slice(i, i + 3) === '**/') { result += '(?:.*/)?'; i += 2; }
    else if (pattern.slice(i, i + 2) === '**') { result += '.*'; i++; }
    else if (pattern[i] === '*') result += '[^/]*';
    else if (pattern[i] === '?') result += '[^/]';
    else if (pattern[i] === '{' && pattern.indexOf('}', i) !== -1) {
      const end = pattern.indexOf('}', i);
      result += '(?:' + pattern.slice(i + 1, end).split(',').map(escape).join('|') + ')'; i = end;
    } else result += escape(pattern[i]);
  }
  return new RegExp(result + '$');
}

function category(file) {
  if (!file.includes('/') && /\.(tsx?|jsx?|mjs)$/.test(file)) return 'codigo_na_raiz';
  return file.startsWith('src/') ? 'codigo'
    : file.startsWith('tests/') ? 'testes'
    : file.startsWith('scripts/') ? 'ferramentas'
    : file.startsWith('art-source/') || file.startsWith('blender/') ? 'fonte_arte' : 'documentacao';
}

/** Também aceita templates/globs: conserva candidatos que uma busca exata perderia. */
export function referencesInText(file, text, assetPaths) {
  const found = new Map();
  const directory = path.posix.dirname(file);
  const literals = [...text.matchAll(/['"`]([^'"`\r\n]+)['"`]/g)].map(match => match[1]);
  for (const raw of literals) {
    const template = raw.includes('${');
    const value = raw.replace(/\$\{[^}]+\}/g, '**').replace(/\?(?:url|raw)(?:&.*)?$/, '');
    const candidates = value.startsWith('.') ? [path.posix.normalize(path.posix.join(directory, value))]
      : value.startsWith('/') ? ['public' + value]
      : value.startsWith('src/assets/') || value.startsWith('public/') ? [value] : [];
    for (const candidate of candidates) {
      const match = /[*?{]/.test(candidate) ? globRegex(candidate) : null;
      for (const asset of assetPaths) if (match ? match.test(asset) : candidate === asset) {
        const kind = template ? 'template_nao_resolvido' : match ? 'glob' : 'caminho';
        if (!found.has(asset) || found.get(asset) === 'template_nao_resolvido') found.set(asset, kind);
      }
    }
  }
  for (const asset of assetPaths) {
    if (found.has(asset)) continue;
    if (asset.includes('/') && new RegExp('(^|[^\\w./-])' + escape(asset) + '(?=$|[^\\w./-])').test(text)) {
      found.set(asset, 'caminho');
    } else if (new RegExp('(^|[^\\w.-])' + escape(path.posix.basename(asset)) + '(?=$|[^\\w.-])').test(text)) {
      // Pode ser ambíguo (ex.: manifesto.json). É evidência fraca, nunca prova de uso em produção.
      found.set(asset, 'nome_apenas');
    }
  }
  return [...found].map(([asset, kind]) => ({ asset, kind }));
}

export function inventoryAssets({ root, trackedFiles, manifest, revision }) {
  const assetPaths = trackedFiles.filter(file => file.startsWith('src/assets/') || file.startsWith('public/')
    || (!file.includes('/') && mediaExtensions.has(path.extname(file))));
  const buildDir = path.join(root, 'dist', 'assets');
  const chunks = fs.existsSync(buildDir) ? fs.readdirSync(buildDir).filter(file => /\.(js|css)$/.test(file))
    .map(file => ({ file: 'assets/' + file, text: fs.readFileSync(path.join(buildDir, file), 'utf8') })) : [];
  const produced = new Map();
  for (const [key, entry] of Object.entries(manifest)) {
    const original = entry.src ?? key;
    if (assetPaths.includes(original)) produced.set(original, entry.file);
  }
  const refs = new Map(assetPaths.map(file => [file, []]));
  for (const file of trackedFiles) {
    if (file.startsWith('archive/') || file.startsWith('docs/organizacao/') || analysisFiles.has(file)
      || !textExtensions.has(path.extname(file))) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const ref of referencesInText(file, text, assetPaths)) {
      if (ref.asset !== file) refs.get(ref.asset).push({ file, category: category(file), kind: ref.kind });
    }
  }
  const sources = trackedFiles.filter(file => file.startsWith('art-source/') || file.startsWith('blender/')).map(file => ({
    file, bytes: fs.statSync(path.join(root, file)).size, sha256: hash(path.join(root, file))
  }));
  const sourceByHash = new Map();
  for (const source of sources) {
    const list = sourceByHash.get(source.sha256) ?? [];
    list.push(source.file); sourceByHash.set(source.sha256, list);
  }
  const assets = assetPaths.map(file => {
    const sha256 = hash(path.join(root, file)), references = refs.get(file);
    const bytes = fs.statSync(path.join(root, file)).size;
    const publicFile = file.startsWith('public/') ? file.slice('public/'.length) : null;
    const publicCopy = publicFile && fs.existsSync(path.join(root, 'dist', publicFile))
      && hash(path.join(root, 'dist', publicFile)) === sha256 ? publicFile : null;
    const data = !produced.has(file) && !publicFile && mediaExtensions.has(path.extname(file)) && bytes > 0 && bytes <= 65536
      ? fs.readFileSync(path.join(root, file)).toString('base64') : null;
    const inlineChunks = data ? chunks.filter(chunk => ['"', "'", '`', ')'].some(end => chunk.text.includes(';base64,' + data + end))).map(chunk => chunk.file) : [];
    const backup = /\.(bak|blend\d+|backup)$/i.test(file);
    const strong = references.filter(ref => ref.kind !== 'nome_apenas' && ref.kind !== 'template_nao_resolvido');
    const groups = new Set(strong.map(ref => ref.category));
    const classification = backup ? 'backup_protegido'
      : produced.has(file) ? 'emitido_no_build'
      : publicCopy ? 'copiado_de_public_para_dist'
      : inlineChunks.length ? 'incorporado_no_javascript_verificado'
      : groups.has('codigo') ? 'referencia_no_codigo_sem_asset_emitido'
      : groups.has('codigo_na_raiz') ? 'referencia_em_codigo_na_raiz'
      : groups.has('ferramentas') || groups.has('fonte_arte') ? 'ferramenta_ou_fonte'
      : groups.has('testes') ? 'referencia_de_teste'
      : groups.has('documentacao') ? 'referencia_documental'
      : references.length ? 'apenas_nome_ou_template_nao_resolvido' : 'sem_referencia_detectada';
    return {
      file, bytes, sha256,
      classification, action: 'preservar', buildFile: produced.get(file) ?? publicCopy ?? null, inlineChunks,
      exactSourceCopies: sourceByHash.get(sha256) ?? [], references
    };
  });
  const groups = new Map();
  for (const file of [...assets, ...sources]) {
    const entries = groups.get(file.sha256) ?? [];
    entries.push(file.file); groups.set(file.sha256, entries);
  }
  const duplicates = [...groups].filter(([, files]) => files.length > 1).map(([sha256, files]) => ({ sha256, files }));
  const counts = {};
  for (const asset of assets) {
    const item = counts[asset.classification] ??= { files: 0, bytes: 0 };
    item.files++; item.bytes += asset.bytes;
  }
  return {
    version: 2, revision, method: 'Manifesto Vite, cópias public/dist por hash e mídia base64 em chunks do build. Caminhos/globs e referências conservadoras; SHA-256 dos assets/fontes rastreados.',
    limits: [
      'Emitido no build não significa carregado na rota padrão: inclui variantes e recursos de comparação.',
      'O manifesto não lista public. Cópias public/dist são conferidas por SHA-256; a mídia incorporada é confirmada por base64 completo, somente até 64 KiB. JSON pode estar incorporado ao JS sem essa verificação.',
      'Referência em src pode vir de módulo fora da entrada. Templates dinâmicos e nomes isolados são evidências fracas, não prova de uso. Globs suportam *, **, ?, e alternativas simples {a,b}; outras formas podem escapar da análise.',
      'Escopo rastreado: src/assets, public, mídias da raiz, art-source e blender. Archive e evidências não são assets de produção; outros diretórios arbitrários não são varridos como mídia.',
      'Archive, relatórios, docs/ASSETS, o gerador deste inventário e seu próprio teste são excluídos da busca de referências para evitar prova circular.',
      'Fontes art-source/blender, backups e arquivos não rastreados são protegidos. Nenhum asset é removido ou movido por este script.',
      'Não avalia outros branches/worktrees nem decide quais fontes são obsoletas.'
    ],
    summary: { assets: assets.length, assetBytes: assets.reduce((sum, file) => sum + file.bytes, 0), sources: sources.length, sourceBytes: sources.reduce((sum, file) => sum + file.bytes, 0), classifications: counts },
    assets, sources, duplicates
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd(), manifestPath = process.argv[2], output = process.argv[3];
  if (!manifestPath || !output) throw new Error('Uso: node scripts/audit-project-assets.mjs dist/manifest.json pasta/inventario.json');
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const report = inventoryAssets({ root, trackedFiles, revision, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) });
  const destination = path.resolve(output);
  if (['src', 'public', 'art-source', 'blender', 'archive'].some(dir => destination === path.join(root, dir) || destination.startsWith(path.join(root, dir) + path.sep))) {
    throw new Error('O inventário deve ser salvo fora de assets, fontes e archive.');
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report.summary, null, 2) + '\n');
}
