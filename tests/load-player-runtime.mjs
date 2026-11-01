// Executa os módulos reais da variante em Node; URLs de assets e import.meta.env são do Vite no navegador.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const nativeRequire = createRequire(import.meta.url), cache = new Map();
export function loadPlayerRuntime(file) {
    const absolute = path.resolve(file);
    if (absolute.endsWith('.glb')) return absolute;
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const source = fs.readFileSync(absolute, 'utf8').replaceAll('import.meta.env', '({ DEV: false })');
    const code = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const require = specifier => specifier.startsWith('.')
        ? loadPlayerRuntime(path.resolve(path.dirname(absolute), specifier) + (path.extname(specifier) ? '' : '.ts')) : nativeRequire(specifier);
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: absolute })(require, module, module.exports);
    return module.exports;
}
