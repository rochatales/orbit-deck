import fs from 'node:fs';
import { measureEnemyHeights } from '../../../tests/measure-enemy-height.mjs';
import { loadSource } from '../../../tests/load-source.mjs';
const { robotConfig } = loadSource('src/combat/config.ts');
const report = await measureEnemyHeights();
report.base = '48e0882c8e26a5f57e6bd70122322d087dea3f48';
for (const [kind, row] of Object.entries(report.types)) row.hitHeight = robotConfig({kind}).hitHeight;
fs.writeFileSync('docs/handoffs/s2.12-b/alturas-etapa-2.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.types).map(([kind,r])=>[kind,{minY:r.minY,maxY:r.maxY,hitHeight:r.hitHeight}]))));
