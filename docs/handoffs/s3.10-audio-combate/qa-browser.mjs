// QA técnico assistido: nenhum julgamento de timbre/volume ou aceite de jogabilidade.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out = 'docs/handoffs/s3.10-audio-combate', origin = process.env.HORDA_QA_ORIGIN ?? 'http://127.0.0.1:5194';
const report = { base: '1956a6e', method: 'Chromium GPU, Web Audio real; horda curta assistida por reposicionamento de ameaças/tiros/contato e coleta na simulação, sem ouvir ou aceitar timbre. Movimento via teclado, suspensão e mudo pela UI.', errors: [], httpErrors: [] };
const browser = await chromium.launch({ headless: true, executablePath: process.env.HORDA_QA_CHROMIUM, args: ['--enable-gpu', '--use-angle=metal', '--autoplay-policy=user-gesture-required'] });
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', e => report.errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) report.httpErrors.push({ status: r.status(), url: r.url() }); });
    await page.goto(`${origin}/tests/shanghai-phase01.html`);
    await page.waitForFunction(() => window.__shanghaiQA?.state().ready, null, { timeout: 60000 });
    async function audioState() { return page.evaluate(async () => { const { audio: a } = await import('/src/audio/runtime.ts'); return { context: a.context?.state ?? null, unlocked: a.unlocked, blocked: a.blocked, buffers: a.buffers.size, decodedVariations: [...a.buffers.values()].reduce((n, list) => n + list.length, 0), muted: a.muted, volume: a.volume, stats: JSON.parse(JSON.stringify(a.stats)) }; }); }
    await page.evaluate(async () => { window.qaAudio = (await import('/src/audio/runtime.ts')).audio; window.qaCombat = (await import('/src/state/useCombatStore.ts')).combatRuntime; });
    report.beforeGesture = await audioState(); assert.equal(report.beforeGesture.context, null);
    await page.getByRole('button', { name: 'Controles', exact: true }).click();
    await page.waitForFunction(() => window.qaAudio.buffers.size === 14 && window.qaAudio.context?.state === 'running', null, { timeout: 60000 });
    report.unlocked = await audioState(); assert.equal(report.unlocked.context, 'running'); assert.equal(report.unlocked.stats.decodeErrors, 0); assert.equal(report.unlocked.decodedVariations, 39);
    await page.getByRole('button', { name: 'Controles', exact: true }).click();
    await page.evaluate(async () => { const { useCombatStore: c } = await import('/src/state/useCombatStore.ts'); const { useExpeditionStore: e } = await import('/src/state/useExpeditionStore.ts'); c.getState().selectEncounter('hordas'); e.getState().restartMission(); });
    await page.waitForFunction(() => window.qaCombat.simulation?.waves[0] === 13 && !document.querySelector('[role=status]'), null, { timeout: 60000 });
    await page.evaluate(() => window.__shanghaiQA.place(-17.5, 19.5, 0)); await page.waitForTimeout(1100);
    await page.waitForFunction(() => !!window.qaCombat.simulation && !document.querySelector('[role=status]'), null, { timeout: 60000 });
    await page.evaluate(async () => {
        const { combatRuntime: r } = await import('/src/state/useCombatStore.ts'), { playerPosition: p } = await import('/src/state/playerTransient.ts');
        for (let retry = 0; !r.simulation && retry < 200; retry++) await new Promise(resolve => setTimeout(resolve, 50));
        if (!r.simulation) throw new Error('Runtime não montou depois do reposicionamento');
        const s = r.simulation, input = { player: p, aim: { x: p.x, z: p.z - 5 }, facingAngle: Math.PI, firing: false, reload: false };
        if (s.wave === 0) { s.waveLeft = .0001; s.step(1 / 60, input); }
        s.hearts.forEach(h => h.active = false);
        const common = s.robots.find(a => a.spawned && a.kind === 'patrol'), animal = s.robots.find(a => a.spawned && a.kind === 'smallMutant');
        for (const target of [common, animal]) {
            while (target.hp > 0) { target.x = p.x; target.z = p.z - 5; s.cooldown = 0; s.step(1 / 60, { ...input, firing: true }); }
        }
        for (const kind of ['patrol', 'smallMutant']) {
            const target = s.robots.find(a => a.spawned && a.hp > 0 && a.kind === kind); target.x = p.x; target.z = p.z + .1; target.alerted = true;
            s.invulnerable = 0; s.step(1 / 60, input); target.x = p.x - 7; target.z = p.z;
        }
        for (const drop of s.drops) if (drop.active) { drop.x = p.x; drop.z = p.z; }
        s.step(1 / 60, input); s.step(1 / 60, { ...input, reload: true });
        s.robots.forEach((a, i) => { if (a.hp > 0) { a.x = p.x - 5 - i; a.z = p.z; a.alerted = true; a.path.length = 0; a.repath = 0; } });
        s.hp = 100;
    });
    await page.mouse.move(850, 450); await page.keyboard.down('KeyW'); await page.waitForTimeout(1100); await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyS'); await page.waitForTimeout(900); await page.keyboard.up('KeyS'); await page.waitForTimeout(1200);
    report.horde = await page.evaluate(async () => { const { combatRuntime: r } = await import('/src/state/useCombatStore.ts'); return r.simulation.snapshot; });
    report.afterHorde = await audioState();
    for (const key of ['shot:patrol', 'reload:patrol', 'bulletHit:patrol', 'death:patrol', 'bulletHit:smallMutant', 'death:smallMutant', 'attack:patrol', 'attack:smallMutant', 'collect:patrol', 'enemyStep:patrol', 'playerStep:patrol']) assert.ok(report.afterHorde.stats.events[key] > 0, key);
    assert.ok(report.afterHorde.stats.played.SFX_Rifle_shot > 0); assert.ok(report.afterHorde.stats.played.SFX_Main_character_step > 0);
    await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.waitForTimeout(100);
    report.paused = await audioState(); assert.equal(report.paused.context, 'suspended');
    const slider = page.getByRole('slider', { name: 'Volume geral' }); await slider.focus(); await slider.press('Home'); for (let i = 0; i < 7; i++) await slider.press('ArrowRight');
    await page.screenshot({ path: `${out}/painel-audio.png` });
    await page.evaluate(async () => { const { combatRuntime: r } = await import('/src/state/useCombatStore.ts'); r.simulation.sounds.emit('shot', 0, 0); }); await page.waitForTimeout(100);
    const shotsBefore = (await audioState()).stats.played.SFX_Rifle_shot;
    await page.getByRole('button', { name: 'Retomar exploração', exact: true }).click(); await page.waitForTimeout(200);
    report.resumed = await audioState(); assert.equal(report.resumed.stats.played.SFX_Rifle_shot, shotsBefore); assert.equal(report.resumed.context, 'running');
    // Eventos de foco usam os mesmos listeners do browser, sem substituir o AudioContext.
    await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.waitForTimeout(100);
    report.blur = await audioState(); assert.equal(report.blur.context, 'suspended');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('button', { name: 'Retomar exploração', exact: true }).click();
    await page.keyboard.press('m'); report.muted = await audioState(); assert.equal(report.muted.muted, true);
    report.saved = await page.evaluate(() => JSON.parse(localStorage.getItem('exoden:audio:v1'))); assert.equal(report.saved.muted, true); assert.ok(Math.abs(report.saved.volume - .35) < .001);
    await page.evaluate(async () => { const { useExpeditionStore: e } = await import('/src/state/useExpeditionStore.ts'); e.setState({ panel: 'eden' }); }); await page.waitForTimeout(100); report.dialog = await audioState(); assert.equal(report.dialog.context, 'suspended');
    await page.reload(); await page.waitForFunction(() => window.__shanghaiQA?.state().ready, null, { timeout: 60000 }); report.restored = await audioState(); assert.equal(report.restored.muted, true); assert.equal(report.restored.context, null);
    // O formulário real também desbloqueia o contexto no clique de entrada.
    const welcome = await browser.newPage(); await welcome.goto(origin); await welcome.getByLabel('Nome do explorador').fill('QA áudio');
    await welcome.evaluate(async () => { window.qaAudio = (await import('/src/audio/runtime.ts')).audio; });
    await welcome.getByRole('button', { name: 'Entrar na colônia' }).click(); await welcome.waitForFunction(() => window.qaAudio.unlocked && window.qaAudio.buffers.size === 14 && window.qaAudio.context?.state === 'running', null, { timeout: 60000 });
    report.welcomeGesture = await welcome.evaluate(async () => { const { audio: a } = await import('/src/audio/runtime.ts'); return { unlocked: a.unlocked, buffers: a.buffers.size, context: a.context?.state }; });
    assert.deepEqual(report.errors, []); assert.deepEqual(report.httpErrors, []);
    fs.writeFileSync(`${out}/browser.json`, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
} catch (error) { report.failure = String(error); fs.writeFileSync(`${out}/browser.json`, JSON.stringify(report, null, 2) + '\n'); throw error; } finally { await browser.close(); }
