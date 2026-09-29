import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url),cache=new Map();
/** Compile the actual TS modules for Node tests; no generated files enter src. */
export function loadSource(file){
  const absolute=path.resolve(file);
  if(cache.has(absolute))return cache.get(absolute).exports;
  const module={exports:{}};cache.set(absolute,module);
  const code=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const localRequire=specifier=>specifier.startsWith('.')?loadSource(path.resolve(path.dirname(absolute),specifier)+'.ts'):nativeRequire(specifier);
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:absolute})(localRequire,module,module.exports);
  return module.exports;
}
