"""Texturas autorais repetíveis, executadas dentro do Blender com numpy."""
from pathlib import Path
import bpy
import numpy as np
import json

OUT = Path(__file__).resolve().parents[1] / 'texturas'
PALETTE = {
    'reboco': (203, 195, 174), 'concreto': (151, 145, 128),
    'asfalto': (66, 70, 68), 'pedra': (144, 138, 119),
    'areia': (205, 181, 137), 'madeira': (110, 91, 69),
    'ferrugem': (134, 78, 49), 'folha': (74, 94, 45),
}

def generate():
    OUT.mkdir(exist_ok=True)
    rng = np.random.default_rng(13112026)
    records = []
    for name in [*PALETTE, 'ondas']:
        n = 1024 if name == 'ondas' else 256
        y, x = np.mgrid[0:n, 0:n]
        u, v = x / n, y / n
        variation = 6 * np.sin(u*6.283)*np.cos(v*12.566) + rng.normal(0, 2, (n,n))
        if name == 'ondas':
            # Azulejo de 5 × 8 m, periódico nos dois eixos. Pedras miúdas com junta.
            pattern = np.cos(2*np.pi*(u*2 + .48*np.sin(v*2*np.pi)))
            dark = pattern > .4
            rgb = np.where(dark[...,None], [39,42,38], [213,207,185]).astype(float)
            joints = ((np.mod(u*80,1)<.08) | (np.mod(v*80+(np.floor(u*80)%2)*.5,1)<.08))
            rgb[joints] *= .77
            rgb += variation[...,None]
        else:
            rgb = np.zeros((n,n,3)) + PALETTE[name] + variation[...,None]
            if name == 'reboco':
                streak = np.maximum(0, np.sin(u*31*2*np.pi))**15
                rust = streak * (np.cos(v*2*np.pi)*.5+.5)**4
                rgb -= rust[...,None] * [23,48,57]
                rgb -= ((np.sin(u*8*np.pi)*np.sin(v*6*np.pi)) > .65)[...,None]*18
            elif name == 'madeira':
                rgb -= (np.mod(x,64)<3)[...,None]*28
                rgb += (np.sin(u*180*np.pi)*3)[...,None]
            elif name == 'asfalto':
                cracks = np.abs(np.sin(2*np.pi*(u*3+.08*np.sin(v*16*np.pi)))) < .018
                rgb -= cracks[...,None]*22
            elif name == 'concreto':
                rgb -= ((x%128<2)|(y%128<2))[...,None]*19
            elif name == 'ferrugem':
                patch = np.sin(u*14*np.pi)*np.cos(v*12*np.pi) > .25
                rgb[patch] = rgb[patch]*.45 + np.array([42,50,48])
            elif name == 'areia':
                rgb += np.sin((u*24+.18*np.sin(v*2*np.pi))*2*np.pi)[...,None]*3
        rgba = np.ones((n,n,4),dtype=np.float32)
        rgba[:,:,:3] = np.clip(rgb/255,0,1)
        image = bpy.data.images.new('RIO_'+name, n, n, alpha=False)
        image.pixels.foreach_set(rgba.ravel())
        image.filepath_raw = str(OUT/(name+'.png'))
        image.file_format = 'PNG'
        image.save()
        records.append(dict(file=name+'.png',width=n,height=n,origin='Procedural autoral, numpy, semente 13112026',
                            uv='REPEAT, família isolada; sem blocos de cores vizinhos no atlas'))
    # Variantes exclusivas dos morros (v004): semente separada para preservar intactas as 9 texturas originais.
    rng_m = np.random.default_rng(15112026)
    n = 256
    y, x = np.mgrid[0:n, 0:n]
    u, v = x / n, y / n
    tau = 2 * np.pi
    hill_specs = {
        'pedra_morro': (148, 141, 126),
        'pedra_umida': (94, 89, 78),
        'mata_escura': (45, 65, 34),
        'mata_media': (66, 89, 43),
        'mata_clara': (88, 112, 54),
    }
    for name, base in hill_specs.items():
        rgb = np.zeros((n, n, 3), dtype=float) + base
        if name in ('pedra_morro', 'pedra_umida'):
            # Estrias verticais contínuas de escorrimento pluvial (típicas do gnaisse/granito carioca) + variação mineral suave sem manchas circulares/booleanas.
            warp_u = u + 0.06 * np.sin(tau * v) + 0.03 * np.cos(tau * (v * 2.0 + u))
            vert_streaks = (
                0.55 * np.sin(tau * (warp_u * 3.0))
                + 0.30 * np.cos(tau * (warp_u * 7.0 + 0.4))
                + 0.15 * np.sin(tau * (warp_u * 13.0 - 0.7))
            )
            elev_band = 0.50 * np.cos(tau * (v * 1.0 - 0.08 * np.sin(tau * u * 2.0))) + 0.30 * np.sin(tau * (v * 2.0 + 0.12 * np.cos(tau * u)))
            mineral_warmth = np.sin(tau * (u * 1.0 + v * 1.0)) * np.cos(tau * (u * 1.0 - v * 2.0))
            if name == 'pedra_morro':
                rgb += (vert_streaks * 9.5 + elev_band * 6.5)[..., None] * np.array([1.04, 1.00, 0.92])
                rgb += (mineral_warmth * 5.0)[..., None] * np.array([1.15, 0.85, 0.45])
            else:
                rgb += (vert_streaks * 8.0 + elev_band * 5.5)[..., None] * np.array([0.95, 1.02, 0.90])
                rgb += (mineral_warmth * 4.5)[..., None] * np.array([-0.6, 0.85, -0.7])
        else:
            # Variação orgânica suave de dossel florestal sem limiares duros ou quadriculados.
            warp_u = u + 0.08 * np.sin(tau * v * 2.0)
            warp_v = v + 0.08 * np.cos(tau * u * 2.0)
            dapple = (
                0.55 * np.sin(tau * (warp_u * 2.0 + warp_v * 1.0))
                + 0.30 * np.cos(tau * (warp_u * 3.0 - warp_v * 2.0))
                + 0.15 * np.sin(tau * (warp_u * 5.0 + warp_v * 4.0))
            )
            rgb += (dapple * 8.5)[..., None] * np.array([0.85, 1.15, 0.65])
        # Quantização suave em passos de 1/255 sem ruído aleatório por pixel para compressão PNG compacta e leitura limpa.
        _ = rng_m.random()
        rgba = np.ones((n, n, 4), dtype=np.float32)
        rgba[:, :, :3] = np.clip(np.round(rgb) / 255.0, 0.0, 1.0)
        image = bpy.data.images.new('RIO_' + name, n, n, alpha=False)
        image.pixels.foreach_set(rgba.ravel())
        image.filepath_raw = str(OUT / (name + '.png'))
        image.file_format = 'PNG'
        image.save()
        records.append(dict(
            file=name + '.png', width=n, height=n,
            origin='Procedural autoral (morros v004), numpy, semente 15112026',
            uv='REPEAT, família isolada exclusiva dos morros; sem ruído de alta frequência'
        ))
    # Variantes costeiras de transição praia-mar (v005): semente isolada para preservar todas as texturas anteriores.
    rng_w = np.random.default_rng(16112026)
    coastal_specs = {
        'areia_umida': (168, 140, 96),
        'areia_molhada': (108, 84, 56),
        'mar_raso': (86, 116, 112),
        'mar_costeiro': (49, 84, 94),
        'espuma_renda': (236, 230, 216),
    }
    for name, base in coastal_specs.items():
        rgb = np.zeros((n, n, 3), dtype=float) + base
        warp_u = u + 0.05 * np.sin(tau * v * 2.0)
        warp_v = v + 0.05 * np.cos(tau * u * 2.0)
        if name in ('areia_umida', 'areia_molhada'):
            ripple = np.sin(tau * (warp_u * 6.0 + 0.25 * np.sin(tau * warp_v * 2.0)))
            tide = np.cos(tau * (warp_u * 2.0 - warp_v * 1.0))
            scale = 5.5 if name == 'areia_umida' else 4.5
            rgb += (ripple * scale + tide * 3.5)[..., None] * np.array([1.05, 0.96, 0.82])
        elif name in ('mar_raso', 'mar_costeiro'):
            swell = (
                0.60 * np.sin(tau * (warp_u * 3.0 + 0.2 * np.cos(tau * warp_v)))
                + 0.40 * np.cos(tau * (warp_u * 5.0 - warp_v * 2.0))
            )
            depth_mod = np.sin(tau * warp_u) * np.cos(tau * warp_v)
            rgb += (swell * 6.5)[..., None] * np.array([0.82, 1.04, 1.08])
            rgb += (depth_mod * 4.5)[..., None] * (np.array([1.1, 0.95, 0.75]) if name == 'mar_raso' else np.array([-0.7, 0.6, 0.9]))
        else:
            # Renda de espuma com células suaves
            cell = np.sin(tau * warp_u * 4.0) * np.cos(tau * warp_v * 4.0)
            rgb += (cell * 7.0)[..., None] * np.array([1.0, 0.98, 0.94])
        _ = rng_w.random()
        rgba = np.ones((n, n, 4), dtype=np.float32)
        rgba[:, :, :3] = np.clip(np.round(rgb) / 255.0, 0.0, 1.0)
        image = bpy.data.images.new('RIO_' + name, n, n, alpha=False)
        image.pixels.foreach_set(rgba.ravel())
        image.filepath_raw = str(OUT / (name + '.png'))
        image.file_format = 'PNG'
        image.save()
        records.append(dict(
            file=name + '.png', width=n, height=n,
            origin='Procedural autoral (transição costeira v005), numpy, semente 16112026',
            uv='REPEAT, família isolada exclusiva da transição praia-mar; sem emendas duras'
        ))

    def sstep(e0, e1, val):
        t = np.clip((val - e0) / (e1 - e0), 0.0, 1.0)
        return t * t * (3.0 - 2.0 * t)

    # Gradientes costeiros contínuos 256x256 (v005): transição sem faixas duras entre areia seca,
    # areia úmida, areia molhada, espuma rendada com vazios internos, mar raso e mar profundo.
    nc = 256
    yc, xc = np.mgrid[0:nc, 0:nc]
    uc, vc = xc / (nc - 1.0), yc / nc
    coast_curve = (
        0.075 * np.sin(tau * vc * 1.0 + 0.4)
        + 0.045 * np.cos(tau * vc * 2.0 - 1.1)
        + 0.025 * np.sin(tau * vc * 4.0 + 2.0)
    )

    # 1) costa_praia.png: mapeia X = 33,05..36,00 (u=0 é areia seca idêntica a areia.png; u=1 encontra a linha d'água)
    env_p = sstep(0.0, 0.22, uc) * sstep(1.0, 0.88, uc)
    up = uc + coast_curve * env_p
    sand_grain = 3.0 * np.sin(tau * (uc * 8.0 + 0.18 * np.sin(tau * vc * 4.0))) + 2.5 * np.cos(tau * (vc * 12.0 + uc * 4.0))
    dry_col = np.array([205.0, 181.0, 137.0])
    damp_col = np.array([168.0, 141.0, 98.0])
    wet_col = np.array([104.0, 80.0, 54.0])
    swash_water_col = np.array([112.0, 114.0, 92.0])
    foam_col = np.array([236.0, 230.0, 216.0])

    m_damp = sstep(0.10, 0.48, up + 0.03 * np.sin(tau * vc * 3.0))
    m_wet = sstep(0.42, 0.84, up + 0.04 * np.cos(tau * vc * 2.0 - 0.5))
    m_edge = sstep(0.84, 0.99, up + 0.02 * np.sin(tau * vc * 5.0))

    rgb_p = (
        dry_col * (1.0 - m_damp)[..., None]
        + damp_col * (m_damp * (1.0 - m_wet))[..., None]
        + wet_col * (m_wet * (1.0 - m_edge))[..., None]
        + swash_water_col * m_edge[..., None]
    )
    rgb_p += sand_grain[..., None] * (1.0 - 0.45 * m_wet)[..., None]

    # Línguas sinuosas de espuma de espraiamento na borda u -> 1 com vazios internos
    swash_line = up - (0.91 + 0.035 * np.sin(tau * vc * 3.0 + 0.6) + 0.02 * np.cos(tau * vc * 7.0))
    swash_band = np.exp(-((swash_line / 0.032) ** 2))
    swash_gaps = sstep(-0.15, 0.45, np.sin(tau * vc * 6.0 + 0.3) + 0.55 * np.cos(tau * vc * 11.0 - 0.8))
    swash_foam = np.clip(swash_band * swash_gaps * sstep(0.76, 0.88, uc), 0.0, 1.0)
    rgb_p = rgb_p * (1.0 - 0.78 * swash_foam)[..., None] + foam_col * (0.78 * swash_foam)[..., None]

    # 2) costa_mar.png: mapeia X = 36,00..51,00 (u=0..0,213 é a faixa rasa caminhável; u>0,213 aprofunda gradualmente)
    um = np.clip(uc - coast_curve * 0.26 * sstep(0.48, 0.0, uc), 0.0, 1.0)
    shallow_sand_col = np.array([112.0, 114.0, 92.0])
    shallow_teal_col = np.array([82.0, 114.0, 108.0])
    mid_sea_col = np.array([54.0, 88.0, 98.0])
    deep_sea_col = np.array([38.0, 68.0, 80.0])

    t_sh = sstep(0.00, 0.14, um)
    t_mid = sstep(0.12, 0.36, um)
    t_deep = sstep(0.32, 0.82, um)

    rgb_m = shallow_sand_col * (1.0 - t_sh)[..., None] + shallow_teal_col * t_sh[..., None]
    rgb_m = rgb_m * (1.0 - t_mid)[..., None] + mid_sea_col * t_mid[..., None]
    rgb_m = rgb_m * (1.0 - t_deep)[..., None] + deep_sea_col * t_deep[..., None]

    # Ondulações oblíquas suaves em direção à praia
    swell_m = (
        0.60 * np.sin(tau * (um * 6.0 - vc * 1.0 + 0.12 * np.sin(tau * vc * 2.0)))
        + 0.40 * np.cos(tau * (um * 11.0 + vc * 2.0))
    )
    rgb_m += (swell_m * (3.5 + 3.0 * t_mid))[..., None] * np.array([0.82, 1.02, 1.08])

    # Arrebentação principal sinuosa junto à linha d'água (u ~ 0.00..0.06) com interrupções e vazios internos
    crest_pos = 0.024 + 0.014 * np.sin(tau * vc * 2.0 + 0.5) + 0.009 * np.cos(tau * vc * 5.0 - 0.8)
    crest_dist = (um - crest_pos) / (0.018 + 0.008 * (0.5 + 0.5 * np.sin(tau * vc * 3.0)))
    crest_core = np.exp(-(crest_dist ** 2))
    # Vazios internos arredondados dentro da faixa de espuma
    hole_field = (
        np.sin(tau * (um * 26.0 + 0.35 * np.sin(tau * vc * 3.0)))
        * np.cos(tau * (vc * 9.0 + 0.25 * np.cos(tau * um * 18.0)))
    )
    internal_holes = sstep(0.32, 0.58, hole_field)
    along_break = sstep(-0.35, 0.25, np.sin(tau * vc * 3.0 + 0.4) + 0.5 * np.cos(tau * vc * 7.0 - 1.1))
    main_foam = crest_core * along_break * (1.0 - 0.72 * internal_holes)

    # Renda celular conectada na faixa rasa (u ~ 0.02..0.19) envolvendo vazios internos de água mais escura
    lace_f1 = (
        np.sin(tau * (um * 18.0 + 0.30 * np.sin(tau * vc * 3.0)))
        * np.cos(tau * (vc * 7.0 + 0.25 * np.cos(tau * um * 14.0)))
        + 0.28 * np.sin(tau * (um * 29.0 - vc * 11.0))
    )
    lace_filaments = sstep(0.24, 0.04, np.abs(lace_f1))
    lace_env = sstep(0.005, 0.035, um) * sstep(0.21, 0.07, um) * (0.55 + 0.45 * np.sin(tau * vc * 4.0 + 0.9))
    lace_foam = lace_filaments * lace_env * 0.68

    # Segunda crista costeira descontínua na borda externa do banco raso (u ~ 0.19..0.25, X ~ 38,8..39,7)
    sec_pos = 0.215 + 0.016 * np.sin(tau * vc * 2.0 - 0.7) + 0.010 * np.cos(tau * vc * 4.0 + 0.9)
    sec_core = np.exp(-(((um - sec_pos) / 0.015) ** 2))
    sec_mask = sstep(0.05, 0.55, np.sin(tau * vc * 2.0 + 1.2) + 0.45 * np.cos(tau * vc * 5.0 - 0.4))
    sec_foam = sec_core * sec_mask * (1.0 - 0.55 * internal_holes) * 0.62

    total_foam = np.clip(np.maximum(main_foam, np.maximum(lace_foam, sec_foam)), 0.0, 1.0)
    # Escurece sutilmente o interior dos vazios da renda para acentuar o contraste água/espuma
    cavity_shade = sstep(0.28, 0.62, hole_field) * sstep(0.01, 0.04, um) * sstep(0.22, 0.08, um)
    rgb_m *= (1.0 - 0.10 * cavity_shade)[..., None]
    rgb_m = rgb_m * (1.0 - 0.88 * total_foam)[..., None] + foam_col * (0.88 * total_foam)[..., None]

    for cname, crgb in [('costa_praia', rgb_p), ('costa_mar', rgb_m)]:
        rgba_c = np.ones((nc, nc, 4), dtype=np.float32)
        rgba_c[:, :, :3] = np.clip(np.round(crgb) / 255.0, 0.0, 1.0)
        img_c = bpy.data.images.new('RIO_' + cname, nc, nc, alpha=False)
        img_c.pixels.foreach_set(rgba_c.ravel())
        img_c.filepath_raw = str(OUT / (cname + '.png'))
        img_c.file_format = 'PNG'
        img_c.save()
        records.append(dict(
            file=cname + '.png', width=nc, height=nc,
            origin='Procedural autoral (gradiente costeiro contínuo v005), numpy, semente 16112026',
            uv='U contínuo transversal à costa (sem faixas duras), V periódico ao longo da praia'
        ))
    (OUT/'manifesto.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
