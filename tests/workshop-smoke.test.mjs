import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { createSourceLoader } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';

test('S5.3: fumaça acompanha o fade real do teto da Oficina, congela na pausa e volta ao sair', async () => {
    globalThis.localStorage = { getItem: () => null, setItem() {} };
    const load = createSourceLoader(), native = createRequire(import.meta.url);
    const file = 'src/scene/marsColony/ColonyPowerSigns.tsx';
    const module = { exports: {} };
    let frame;
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    runInThisContext('(function(require,exports){' + code + '\n})')(spec => {
        if (spec === 'react') return { useMemo: create => create(), useEffect() {} };
        if (spec === '@react-three/fiber') return { useFrame: callback => { frame = callback; } };
        if (spec.startsWith('.')) return load(path.resolve(path.dirname(file), spec) + '.ts');
        return native(spec);
    }, module.exports);
    const { COLONY_BUILDINGS } = load('src/game/colonyBuildingsLayout.ts');
    const { ColonyBuildingRuntime } = load('src/scene/marsColony/colonyBuildingRuntime.ts');
    const world = load('src/game/marsWorld.ts').createWorld();
    const spec = COLONY_BUILDINGS.find(building => building.id === 'workshop');
    const gltf = await loadGlb('src/assets/buildings/workshop.glb'), scene = gltf.scene.clone(true);
    const runtime = { current: new ColonyBuildingRuntime(scene, gltf.animations, spec, world.movingCuboids) };
    const smoke = module.exports.WorkshopSmoke({ runtime });
    const { material, onBeforeRender } = smoke.props, roof = scene.getObjectByName('Building_Roof');
    const inside = { x: spec.placement.x, z: spec.placement.z }, outside = { x: 0, z: 6 };
    try {
        onBeforeRender();
        assert.equal(material.uniforms.power.value, 1);
        runtime.current.update(inside, 1 / 60);
        onBeforeRender();
        assert.equal(material.uniforms.power.value, runtime.current.status.roofOpacity);
        assert.ok(material.uniforms.power.value > 0 && material.uniforms.power.value < 1);
        for (let i = 0; i < 90; i++) runtime.current.update(inside, 1 / 60);
        onBeforeRender();
        assert.equal(roof.visible, false);
        assert.equal(material.uniforms.power.value, 0);
        const paused = runtime.current.status.roofOpacity;
        runtime.current.update(outside, 0);
        load('src/state/useGameStore.ts').useGameStore.setState({ isPaused: true });
        const time = material.uniforms.time.value;
        frame({ size: { height: 720 }, camera: { projectionMatrix: { elements: Array(16).fill(1) } } }, 1 / 60);
        onBeforeRender();
        assert.equal(runtime.current.status.roofOpacity, paused);
        assert.equal(material.uniforms.time.value, time);
        assert.equal(material.uniforms.power.value, 0);
        for (let i = 0; i < 90; i++) runtime.current.update(outside, 1 / 60);
        onBeforeRender();
        assert.equal(roof.visible, true);
        assert.ok(material.uniforms.power.value > .99);
        assert.equal(material.uniforms.power.value, runtime.current.status.roofOpacity);
        runtime.current.dispose();
        runtime.current = undefined;
        onBeforeRender();
        assert.equal(material.uniforms.power.value, 0);
    } finally {
        runtime.current?.dispose();
        smoke.props.geometry.dispose();
        material.dispose();
    }
});
