import fs from 'node:fs';
import assert from 'node:assert/strict';
import { navigationSizeReport, patrolSizeReport, surroundSizeReport, clearWavesSizeReport, largeArrivalSizeReport } from '../../../../tests/enemy-size-scenarios.mjs';
const report={base:'aa74335adc051d756f615c42682c52006ab4842d',date:'2026-10-26',navigation:navigationSizeReport(),patrol:patrolSizeReport(),surround:surroundSizeReport(),waves:clearWavesSizeReport(),largeArrival:largeArrivalSizeReport()};
fs.writeFileSync('docs/handoffs/s2.12-b/etapa-3/ensaios.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,navigation:{...report.navigation,types:Object.fromEntries(Object.entries(report.navigation.types).map(([k,v])=>[k,{...v,spawns:undefined}]))}},null,2));
assert.ok(report.waves.cleared);assert.equal(report.patrol.invalid,0);assert.ok(report.patrol.maxIdle<3);assert.equal(report.largeArrival.arrivals,10);
