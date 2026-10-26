import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out = 'docs/handoffs/s3.3-mutante-grande/complemento-26-10';
const previous = JSON.parse(fs.readFileSync('docs/handoffs/s3.3-mutante-grande/ajustes-26-10/blocked-browser.json'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.HORDA_QA_CHROMIUM, args: ['--enable-gpu', '--use-angle=metal'] });
const errors = [];
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5196/tests/shanghai-phase01.html');
    await page.waitForFunction(() => window.__shanghaiQA?.state().ready, null, { timeout: 60000 });
    await page.evaluate(() => window.__shanghaiQA.hordes());
    await page.waitForFunction(() => window.__shanghaiQA.simulation()?.robots.length === 44, null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.evaluate(async previous => {
        const { robotConfig } = await import('/src/combat/config.ts');
        const s = window.__shanghaiQA.simulation(), p = window.__shanghaiQA.position();
        const step = Object.getPrototypeOf(s).step.bind(s);
        const input = { player: p, aim: p, facingAngle: 0, firing: false, reload: false };
        s.wave = 3; s.waveLeft = .001; s.robots.forEach(r => r.hp = 0); step(1 / 60, input);
        s.robots.forEach(r => r.hp = 0);
        const r = s.robots.find(o => o.kind === 'largeMutant');
        Object.assign(r, { kind: 'largeMutant', x: 1.5333283122279486, z: -44.29530769075945, hp: 280, alerted: true, angle: 0, path: [], repath: 0, chargePhase: 'cooldown', chargeLeft: 1000 });
        const neighbors = previous.survivors.filter(r => r.kind !== 'largeMutant').concat([{kind:'patrol',x:1.5,z:-47},{kind:'patrol',x:0,z:-48.5},{kind:'patrol',x:3,z:-48.5},{kind:'patrol',x:1.5,z:-50}]);
        const assigned = new Set([r]);
        neighbors.forEach(o => { const slot=s.robots.find(a=>!assigned.has(a)&&a.kind===o.kind);if(!slot)throw new Error('Pool do tipo ausente');assigned.add(slot);Object.assign(slot, { x:o.x,z:o.z,hp:robotConfig(o).hp,alerted:true,path:[],repath:0 }); });
        s.step = (dt, _input, paused) => { s.hp = 100; step(dt, input, paused); };
        window.motionActor = r;
    }, previous);
    await page.waitForTimeout(250);
    await page.evaluate(async () => {
        const src = await (await fetch('/src/app/GameCanvas.tsx')).text();
        const { _roots } = await import(src.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);
        window.motionScene = [..._roots.values()][0].store.getState();
        let wrapper;
        motionScene.scene.traverse(o => {
            if (o.children.some(c => c.geometry?.type === 'RingGeometry' && c.geometry.parameters.innerRadius === .43) && Math.hypot(o.position.x - motionActor.x, o.position.z - motionActor.z) < .1) wrapper = o;
        });
        if (!wrapper) throw new Error('Grupo visual da aranha não encontrado');
        window.motionFrames = [];
        let until = performance.now() + 6000, last = performance.now(), angle = wrapper.rotation.y;
        await new Promise(resolve => {
            function sample(now) {
                const delta = now - last, yaw = wrapper.rotation.y;
                motionFrames.push({time:now,dt:delta/1000,x:motionActor.x,z:motionActor.z,physicalAngle:motionActor.angle,visualAngle:yaw,turn:Math.atan2(Math.sin(yaw-angle),Math.cos(yaw-angle))});
                last = now; angle = yaw;
                if (now < until) requestAnimationFrame(sample); else resolve();
            }
            requestAnimationFrame(sample);
        });
        window.__shanghaiQA.simulation().step = () => {};
    });
    await page.waitForTimeout(100);
    const report = await page.evaluate(() => {
        motionScene.setFrameloop('never');
        motionScene.camera.position.set(1, 18, -54);
        motionScene.camera.lookAt(1, 0, -41);
        motionScene.camera.updateProjectionMatrix();
        motionScene.scene.updateMatrixWorld(true);
        motionScene.gl.render(motionScene.scene, motionScene.camera);
        return { method: 'Fixture do App: aranha entre nove robôs no congestionamento antigo, seis segundos reais de marcha sem tiros; frames do grupo visual renderizado, não apenas do simulador. HP restaurado para isolar marcha. Ensaio Node complementar registra também velocidade/clipe dos quatro tipos.', frames: motionFrames, position: {x:motionActor.x,z:motionActor.z}, alive:window.__shanghaiQA.simulation().alive };
    });
    assert.ok(report.frames.length > 200);
    assert.ok(report.frames.every(f => Number.isFinite(f.visualAngle)));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${out}/marcha-grupo.png` });
    fs.writeFileSync(`${out}/browser-motion.json`, JSON.stringify({ ...report, errors }, null, 2) + '\n');
    // Novo mundo para capturar um segmento longo e o ricochete, sem alterar o runtime entregue.
    await page.evaluate(() => { motionScene.setFrameloop('always'); __shanghaiQA.place(0,-33,0); });
    await page.waitForTimeout(1000);
    const shot = await page.evaluate(() => {
        const s=__shanghaiQA.simulation(),step=Object.getPrototypeOf(s).step.bind(s),p=__shanghaiQA.position();
        const input={player:p,aim:{x:0,z:-20},facingAngle:0,firing:false,reload:false};
        s.wave=3;s.waveLeft=.001;s.robots.forEach(r=>r.hp=0);step(1/60,input);
        const target=s.robots.find(r=>r.kind==='patrol');s.robots.forEach(r=>r.hp=0);
        Object.assign(target,{hp:75,x:0,z:-20,alerted:false,pace:0});
        step(1/60,{...input,firing:true});step(1/60,input);s.step=()=>{};
        return{targetHp:target.hp,shot:s.shots[0],particles:s.effects.particles.filter(p=>p.life>0).length};
    });
    assert.equal(shot.targetHp,50);assert.equal(shot.particles,40);
    await page.waitForTimeout(100);
    await page.evaluate(() => { motionScene.setFrameloop('never');motionScene.camera.position.set(12,21,-25);motionScene.camera.lookAt(0,0,-26);motionScene.camera.updateProjectionMatrix();motionScene.scene.updateMatrixWorld(true);motionScene.gl.render(motionScene.scene,motionScene.camera); });
    await page.screenshot({path:`${out}/tracador-056-ricochete.png`});
    fs.writeFileSync(`${out}/browser-shot.json`,JSON.stringify({...shot,errors},null,2)+'\n');
    assert.deepEqual(errors, []);
    console.log({ frames: report.frames.length, position: report.position, errors });
} finally { await browser.close(); }
