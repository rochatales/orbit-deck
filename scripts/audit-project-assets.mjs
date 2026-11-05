// Inventário somente de leitura. Não remove, move ou reescreve assets/fontes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.json', '.md', '.html', '.css', '.txt', '.sh', '.yaml', '.yml']);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slash = value => value.split(path.sep).join('/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function globRegex(pattern) {
  const parts = pattern.split(/(\*\*|\*)/);
  return new RegExp('^' + parts.map(part => part === '**' ? '.*' : part === '*' ? '[^/]*' : escape(part)).join('') + '$');
}

function category(file) {
  return file.startsWith('src/') ? 'codigo'
    : file.startsWith('tests/') ? 'testes'
    : file.startsWith('scripts/') ? 'ferramentas'
    : file.startsWith('art-source/') ? 'fonte_arte' : 'documentacao';
}

/** Também aceita templates/globs: conserva candidatos que uma busca exata perderia. */
export function referencesInText(file, text, assetPaths) {
  const found = new Map();
  const directory = path.posix.dirname(file);
  const literals = [...text.matchAll(/['"`]([^'"`\r\n]+)['"`]/g)].map(match => match[1]);
  for (const raw of literals) {
    const value = raw.replace(/\$\{[^}]+\}/g, '**').replace(/\?(?:url|raw)(?:&.*)?$/, '');
    const candidates = value.startsWith('.') ? [path.posix.normalize(path.posix.join(directory, value))]
      : value.startsWith('src/assets/') ? [value] : [];
    for (const candidate of candidates) {
      const match = candidate.includes('*') ? globRegex(candidate) : null;
      for (const asset of assetPaths) if (match ? match.test(asset) : candidate === asset) {
        found.set(asset, match ? 'glob_ou_template' : 'caminho');
      }
    }
  }
  for (const asset of assetPaths) {
    if (found.has(asset)) continue;
    if (new RegExp('(^|[^\\w./-])' + escape(asset) + '(?=$|[^\\w./-])').test(text)) {
      found.set(asset, 'caminho');
    } else if (new RegExp('(^|[^\\w.-])' + escape(path.posix.basename(asset)) + '(?=$|[^\\w.-])').test(text)) {
      // Pode ser ambíguo (ex.: manifesto.json). É evidência fraca, nunca prova de uso em produção.
      found.set(asset, 'nome_apenas');
    }
  }
  return [...found].map(([asset, kind]) => ({ asset, kind }));
}

export function inventoryAssets({ root, trackedFiles, manifest, revision }) {
  const assetPaths = trackedFiles.filter(file => file.startsWith('src/assets/'));
  const produced = new Map();
  for (const [key, entry] of Object.entries(manifest)) {
    const original = entry.src ?? key;
    if (assetPaths.includes(original)) produced.set(original, entry.file);
  }
  const refs = new Map(assetPaths.map(file => [file, []]));
  for (const file of trackedFiles) {
    if (file.startsWith('archive/') || file.startsWith('docs/organizacao/') || file === 'docs/ASSETS.md'
      || !textExtensions.has(path.extname(file))) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const ref of referencesInText(file, text, assetPaths)) {
      if (ref.asset !== file) refs.get(ref.asset).push({ file, category: category(file), kind: ref.kind });
    }
  }
  const sources = trackedFiles.filter(file => file.startsWith('art-source/')).map(file => ({
    file, bytes: fs.statSync(path.join(root, file)).size, sha256: hash(path.join(root, file))
  }));
  const sourceByHash = new Map();
  for (const source of sources) {
    const list = sourceByHash.get(source.sha256) ?? [];
    list.push(source.file); sourceByHash.set(source.sha256, list);
  }
  const assets = assetPaths.map(file => {
    const sha256 = hash(path.join(root, file)), references = refs.get(file);
    const backup = /\.(bak|blend\d+|backup)$/i.test(file);
    const strong = references.filter(ref => ref.kind !== 'nome_apenas');
    const groups = new Set(strong.map(ref => ref.category));
    const classification = backup ? 'backup_protegido'
      : produced.has(file) ? 'emitido_no_build'
      : groups.has('codigo') ? 'referencia_no_codigo_sem_asset_emitido'
      : groups.has('ferramentas') || groups.has('fonte_arte') ? 'ferramenta_ou_fonte'
      : groups.has('testes') ? 'referencia_de_teste'
      : groups.has('documentacao') ? 'referencia_documental'
      : references.length ? 'apenas_nome_possivelmente_ambiguo' : 'sem_referencia_detectada';
    return {
      file, bytes: fs.statSync(path.join(root, file)).size, sha256,
      classification, action: 'preservar', buildFile: produced.get(file) ?? null,
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
    version: 1, revision, method: 'Manifesto Vite do build; caminhos, globs/templates e nomes nos arquivos rastreados. SHA-256 de assets e art-source.',
    limits: [
      'Emitido no build não significa carregado na rota padrão: inclui variantes e recursos de comparação.',
      'JSONs podem estar incorporados ao JavaScript sem entrada própria no manifesto. Referência em src também pode pertencer a um módulo fora da entrada de produção.',
      'Nomes isolados podem ser ambíguos. Referências dinâmicas/construídas podem escapar da análise; ausência não autoriza remoção.',
      'Fontes art-source, backups e arquivos não rastreados são protegidos. Nenhum asset é removido ou movido por este script.',
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
  if (['src', 'art-source', 'archive'].some(dir => destination === path.join(root, dir) || destination.startsWith(path.join(root, dir) + path.sep))) {
    throw new Error('O inventário deve ser salvo fora de assets, fontes e archive.');
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report.summary, null, 2) + '\n');
}
