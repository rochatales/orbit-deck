import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { loadSource } from './load-source.mjs';

const policy = loadSource('src/scene/marsColony/sandwindPolicy.ts');
const { SandwindController } = loadSource('src/scene/marsColony/SandwindController.ts');
const settings = (extra = {}) => ({ enabled: true, culling: true, wind: true, profile: 'compact', ...extra });

function fixture() {
    const colony = new Group(), world = new Group(), geometry = new BoxGeometry(2, 3, 2);
    const shared = new MeshStandardMaterial(), cutMaterial = shared.clone();
    const add = (name, x, material = shared) => {
        const mesh = new Mesh(geometry, material); mesh.name = name; mesh.position.x = x; colony.add(mesh); return mesh;
    };
    const near = add('ARQ_Near', 0, cutMaterial), far = add('ARQ_Far', 60);
    const removed = add('PROP_Removed', 90); removed.visible = false;
    const ground = add('TER_Solo', 100);
    const door = new Mesh(geometry, cutMaterial); world.add(door);
    const source = new Group(); source.add(new Mesh(geometry, shared));
    colony.add(world);
    const controller = new SandwindController(colony, [source], [{ id: 'near', nodes: [near] }, { id: 'far', nodes: [far] }], SRGBColorSpace);
    return { colony, world, geometry, shared, cutMaterial, near, far, removed, ground, door, controller };
}

test('S6.19c: atmosfera padrão e fronteiras de descarte sempre sob areia opaca', () => {
    assert.equal(policy.sandwindPreviewEnabled(''), true);
    assert.equal(policy.sandwindPreviewEnabled('?perf'), true);
    assert.equal(policy.sandwindPreviewEnabled('?sandwindPreview&perf'), true);
    for (const p of Object.values(policy.SANDWIND_PROFILES)) {
        assert.ok(p.clear > 0 && p.clear < p.opaque && p.opaque < p.reveal && p.reveal < p.hide);
    }
});

test('S6.19c: histerese e distância à borda preservam peças grandes perto do jogador', () => {
    const bounds = { minX: -4, maxX: 60, minZ: -2, maxZ: 2 };
    assert.equal(policy.distanceToBoundsSquared(0, 0, bounds), 0);
    assert.equal(policy.distanceToBoundsSquared(-7, -6, bounds), 25);
    assert.equal(policy.shouldHideInSandwind(false, 35 ** 2, 'compact'), true);
    assert.equal(policy.shouldHideInSandwind(false, 32 ** 2, 'compact'), false);
    assert.equal(policy.shouldHideInSandwind(true, 32 ** 2, 'compact'), true);
    assert.equal(policy.shouldHideInSandwind(true, 30 ** 2, 'compact'), false);
});

test('S6.19c: descarte real, terreno preservado, peça retirada não ressuscita e A/B restaura', () => {
    const f = fixture();
    f.controller.update(0, 0, .2, settings(), false);
    assert.equal(f.near.visible, true);
    assert.equal(f.far.parent.visible, false);
    assert.equal(f.removed.visible, false);
    assert.equal(f.ground.visible, true);
    assert.equal(f.controller.stats.total, 2);
    assert.equal(f.controller.stats.hidden, 1);
    assert.equal(f.controller.stats.hiddenTriangles, 12);
    f.controller.update(0, 0, .01, settings({ culling: false }), false);
    assert.equal(f.far.parent.visible, true, 'mudar A/B tem efeito imediato');
    assert.equal(f.controller.stats.hidden, 0);
    f.controller.update(0, 0, .01, settings(), false);
    assert.equal(f.far.parent.visible, false);
    f.controller.update(0, 0, .01, settings({ enabled: false }), false);
    assert.equal(f.far.parent.visible, true, 'desligar areia também desliga descarte');
    assert.equal(f.controller.uniforms.swEnabled.value, 0);
    f.controller.dispose();
    assert.equal(f.removed.visible, false);
});

test('S6.19c: aproximação revela peça ainda sob areia e giro de câmera não altera raio', () => {
    const f = fixture();
    f.controller.update(0, 0, .2, settings(), false);
    f.controller.update(26, 0, .2, settings(), false);
    assert.equal(f.far.parent.visible, false, 'borda a 32 m: conserva estado oculto');
    f.controller.update(29, 0, .2, settings(), false);
    assert.equal(f.far.parent.visible, true, 'borda a 29 m: reaparece além da zona opaca de 28 m');
    f.controller.dispose();
});

test('S6.19c: preserva cache GLTF e referências dos materiais de corte e folhas', () => {
    const f = fixture();
    assert.notEqual(f.far.material, f.shared);
    assert.equal(f.near.material, f.cutMaterial);
    assert.equal(f.door.material, f.cutMaterial);
    f.cutMaterial.opacity = .08;
    assert.equal(f.near.material.opacity, .08);
    const shader = { uniforms: {}, vertexShader: '#include <project_vertex>', fragmentShader: '#include <fog_fragment>' };
    f.near.material.onBeforeCompile(shader, {});
    assert.match(shader.vertexShader, /modelMatrix \* swWorld/);
    assert.match(shader.fragmentShader, /vSandwindPosition.xz - swCenter/);
    assert.equal(shader.uniforms.swCenter, f.controller.uniforms.swCenter);
    assert.match(f.near.material.customProgramCacheKey(), /exoden-sandwind-v007/);
    let disposed = 0, sharedDisposed = 0;
    f.far.material.addEventListener('dispose', () => disposed++);
    f.shared.addEventListener('dispose', () => sharedDisposed++);
    f.controller.update(0, 0, .2, settings(), false);
    f.controller.dispose(); f.controller.dispose();
    assert.equal(disposed, 1); assert.equal(sharedDisposed, 0);
    assert.equal(f.far.material, f.shared);
    assert.equal(f.far.visible, true);
    assert.doesNotMatch(f.cutMaterial.customProgramCacheKey(), /exoden-sandwind-v007/);
});

test('S6.19c: vento respeita pausa e efeitos reduzidos; perfil amplo recompõe o alcance', () => {
    const f = fixture();
    f.controller.update(0, 0, .2, settings(), false);
    assert.equal(f.controller.uniforms.swTime.value, .05);
    f.controller.update(0, 0, .2, settings(), true);
    f.controller.update(0, 0, .2, settings({ wind: false }), false);
    assert.equal(f.controller.uniforms.swTime.value, .05);
    f.controller.update(0, 0, .01, settings({ profile: 'extended' }), false);
    assert.equal(f.far.parent.visible, true);
    assert.equal(f.controller.uniforms.swOpaque.value, 62);
    f.controller.dispose();
});

test('S6.19c: identidade id_estavel v007 independe do nome saneado pelo GLTFLoader', () => {
    const { sandwindTargets } = loadSource('src/scene/marsColony/sandwindTargets.ts');
    const colony = new Group(), source = new Group();
    const rock = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial());
    rock.name = 'TER_Rocha000'; rock.userData.id_estavel = 'TER_Rocha.000'; rock.position.x = 70;
    colony.add(rock);
    const part = { id: 'TER_Rocha.000', ambiente: '', papel: 'terrain', apoiado_em: [], apoiado_em_todos: [] };
    const targets = sandwindTargets(colony, colony, { parts: [part] });
    const controller = new SandwindController(colony, [source], targets, SRGBColorSpace);
    controller.update(0, 0, .2, settings(), false);
    assert.equal(controller.stats.total, 1);
    assert.equal(rock.visible, true, 'nó original não recebe visible=false');
    assert.equal(rock.parent.visible, false);
    controller.dispose();
    assert.equal(rock.parent, colony);
});
