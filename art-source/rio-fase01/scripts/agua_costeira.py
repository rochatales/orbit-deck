"""Refinamento costeiro do Rio (v005): transição contínua areia seca -> areia úmida ->
areia molhada -> fundo submerso raso (X = 36..39,2, até -0,30 m) -> mar profundo (X > 39,2),
ondas costeiras e espuma orgânica rendada com vazios internos.
"""
import bpy
import math
import random

WATERLINE_X = 36.0
SHALLOW_LIMIT_X = 39.2
SHALLOW_MIN_Z = -45.2
MAX_SHALLOW_DEPTH = 0.30
MAX_DEEP_DEPTH = 1.15


def clamp01(v):
    return 0.0 if v < 0.0 else (1.0 if v > 1.0 else v)


def smoothstep(e0, e1, x):
    t = clamp01((x - e0) / (e1 - e0))
    return t * t * (3.0 - 2.0 * t)


def coastline_offset(z):
    """Mesma função de contorno costeiro em escala de metros usada no runtime (seabed.ts)."""
    return (
        0.34 * math.sin(z * 0.11 + 0.4)
        + 0.19 * math.cos(z * 0.23 - 1.1)
        + 0.09 * math.sin(z * 0.47 + 2.0)
    )


def seabed_height(x, z):
    """Perfil físico do fundo arenoso submerso (idêntico a rioSeabedHeight no runtime)."""
    if x <= 34.0:
        return 0.0
    if x <= WATERLINE_X:
        return -0.045 * smoothstep(34.0, WATERLINE_X, x)
    pier_channel = smoothstep(SHALLOW_MIN_Z + 0.8, SHALLOW_MIN_Z - 1.4, z)
    eff_shallow = SHALLOW_LIMIT_X - pier_channel * 2.6
    if x <= eff_shallow:
        span = max(0.4, eff_shallow - WATERLINE_X)
        u = clamp01((x - WATERLINE_X) / span)
        ease = u * (0.65 + 0.35 * u)
        return -(0.045 + (MAX_SHALLOW_DEPTH - 0.045) * ease)
    deep_t = smoothstep(eff_shallow, eff_shallow + 9.0, x)
    return -(MAX_SHALLOW_DEPTH + (MAX_DEEP_DEPTH - MAX_SHALLOW_DEPTH) * deep_t)


def wave_height(x, z):
    """Ondulação costeira suave para a superfície estática no Blender."""
    depth = max(0.0, -seabed_height(x, z))
    env = smoothstep(0.01, 0.14, depth)
    p1 = (-0.992 * x + 0.126 * z) * 0.72 + 0.45 * math.sin(z * 0.14)
    p2 = (-0.94 * x - 0.22 * z) * 1.12 + 0.35 * math.cos(z * 0.27)
    w = (math.sin(p1) + 0.22 * math.cos(2.0 * p1)) * 0.68 + 0.32 * math.sin(p2)
    return 0.020 * w * env


def setup_gradient_material(mat, img_name, min_rough, max_rough, spec_level):
    """Conecta textura contínua à cor base e modula a rugosidade (areia molhada/água polidas, areia seca/espuma foscas)."""
    mat.use_nodes = True
    nt = mat.node_tree
    bs = nt.nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value = min_rough
    if 'Specular IOR Level' in bs.inputs:
        bs.inputs['Specular IOR Level'].default_value = spec_level
    img = bpy.data.images.get(img_name)
    if not img:
        return
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.image.pack()
    tex.extension = 'REPEAT'
    nt.links.new(tex.outputs['Color'], bs.inputs['Base Color'])

    ramp = nt.nodes.new('ShaderNodeValToRGB')
    el0 = ramp.color_ramp.elements[0]
    el1 = ramp.color_ramp.elements[1]
    el0.position = 0.28
    el0.color = (min_rough, min_rough, min_rough, 1.0)
    el1.position = 0.78
    el1.color = (max_rough, max_rough, max_rough, 1.0)
    nt.links.new(tex.outputs['Color'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bs.inputs['Roughness'])


def ensure_coastal_materials(M):
    """Configura materiais costeiros contínuos com resposta especular e rugosidade variáveis."""
    specs = [
        ('areia_umida', (1.0, 1.0, 1.0), 'areia_umida', 0.54, 0.48),
        ('areia_molhada', (1.0, 1.0, 1.0), 'areia_molhada', 0.22, 0.68),
        ('mar_raso', (1.0, 1.0, 1.0), 'mar_raso', 0.15, 0.74),
        ('mar_costeiro', (1.0, 1.0, 1.0), 'mar_costeiro', 0.16, 0.76),
        ('espuma_renda', (1.0, 1.0, 1.0), 'espuma_renda', 0.68, 0.35),
    ]
    for name, col, tex, rough, spec in specs:
        if name in M:
            continue
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (*col, 1.0)
        bs.inputs['Roughness'].default_value = rough
        if 'Specular IOR Level' in bs.inputs:
            bs.inputs['Specular IOR Level'].default_value = spec
        if tex:
            img = bpy.data.images.get('RIO_' + tex)
            if img:
                t = m.node_tree.nodes.new('ShaderNodeTexImage')
                t.image = img
                t.image.pack()
                t.extension = 'REPEAT'
                m.node_tree.links.new(t.outputs['Color'], bs.inputs['Base Color'])
        M[name] = m

    if 'costa_praia' not in M:
        mp = bpy.data.materials.new('costa_praia')
        setup_gradient_material(mp, 'RIO_costa_praia', 0.20, 0.72, 0.65)
        M['costa_praia'] = mp

    if 'costa_mar' not in M:
        mm = bpy.data.materials.new('costa_mar')
        setup_gradient_material(mm, 'RIO_costa_mar', 0.14, 0.68, 0.76)
        M['costa_mar'] = mm

    if 'mar' in M:
        setup_gradient_material(M['mar'], 'RIO_costa_mar', 0.14, 0.68, 0.76)
    if 'espuma' in M:
        bs = M['espuma'].node_tree.nodes.get('Principled BSDF')
        bs.inputs['Roughness'].default_value = 0.68
        img = bpy.data.images.get('RIO_espuma_renda')
        if img:
            t = M['espuma'].node_tree.nodes.new('ShaderNodeTexImage')
            t.image = img
            t.image.pack()
            t.extension = 'REPEAT'
            M['espuma'].node_tree.links.new(t.outputs['Color'], bs.inputs['Base Color'])


def create_coastal_mesh(SOURCE, M, name, verts, faces, mat_name, dest, family, uv_fn=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    for poly in data.polygons:
        poly.use_smooth = True
    data.materials.append(M[mat_name])
    layer = data.uv_layers.new(name='UVMap')
    for poly in data.polygons:
        for li in poly.loop_indices:
            vi = data.loops[li].vertex_index
            co = data.vertices[vi].co
            if uv_fn is not None:
                layer.data[li].uv = uv_fn(co.x, -co.y, co.z)
            else:
                layer.data[li].uv = (co.x / 6.0, co.y / 6.0)
    obj = bpy.data.objects.new(name, data)
    SOURCE.objects.link(obj)
    obj['familia'] = family
    obj['destino'] = dest
    obj['morro_refinado'] = True
    return obj


def build_grid_strip(SOURCE, M, name, x_fn, y_fn, z_stops, u_stops, mat_name, dest, family, uv_fn=None):
    """Cria fita costeira contínua parametrizada por (z, u in [0,1]) com normais compartilhadas suaves."""
    verts = []
    faces = []
    nu = len(u_stops)
    nz = len(z_stops)
    for z in z_stops:
        for u in u_stops:
            x = x_fn(z, u)
            y = y_fn(x, z, u)
            verts.append((x, -z, y))
    for iz in range(nz - 1):
        r0 = iz * nu
        r1 = (iz + 1) * nu
        for iu in range(nu - 1):
            a = r0 + iu
            b = r0 + iu + 1
            c = r1 + iu + 1
            d = r1 + iu
            faces.append((a, b, c, d))
    return create_coastal_mesh(SOURCE, M, name, verts, faces, mat_name, dest, family, uv_fn=uv_fn)


def build_piling_foam_collar(SOURCE, M, name, px, pz, rx, rz, y_base, dest, family):
    """Anel suave de 16 segmentos com vazio central ao redor dos pilares do píer."""
    n_seg = 16
    verts = []
    faces = []
    for i in range(n_seg):
        a = i * math.tau / n_seg
        mod_out = 0.90 + 0.10 * math.sin(a * 3.0 + 0.4)
        mod_in = 0.56 + 0.07 * math.cos(a * 2.0 - 0.3)
        for r_scale in (mod_in, mod_out):
            gx = px + math.cos(a) * rx * r_scale
            gz = pz + math.sin(a) * rz * r_scale
            verts.append((gx, -gz, y_base))
    for i in range(n_seg):
        ni = (i + 1) % n_seg
        i_in, i_out = 2 * i, 2 * i + 1
        n_in, n_out = 2 * ni, 2 * ni + 1
        faces.append((i_in, i_out, n_out, n_in))
    return create_coastal_mesh(
        SOURCE, M, name, verts, faces, 'mar', dest, family,
        uv_fn=lambda x, z, _y: (0.025, ((z + 54.0) / 27.0) % 1.0),
    )


def build_coastal_transition(SOURCE, M, MODULES):
    """
    Constrói a transição costeira contínua entre praia e mar (v005):
    - Orla_Transicao_Praia (X = 33,05..36,0, destino='mapa'): gradiente contínuo areia seca -> areia úmida -> areia molhada -> espraiamento
    - Fundo_mar_raso (X = 36,0..42,5, destino='limites'): leito físico inclinado (-0,045 m a -0,30 m em X=39,2, aprofundando além)
    - Mar (X = 36,0..51,0, destino='limites', planta='Mar'): superfície contínua com ondulação 3D e gradiente costa_mar (espuma rendada com vazios internos, mar raso translúcido e mar profundo)
    - Relevo sutil de arrebentação costeira e colares nos pilares do píer quebrado
    """
    ensure_coastal_materials(M)
    _ = random.Random(16112026)

    z_stops = [-54.0 + i * 2.0 for i in range(55)]  # -54..+54 a cada 2,0 m

    # 1. TRANSIÇÃO CONTÍNUA NA PRAIA (destino = 'mapa', X = 33,05..36,00, fora do Deck_Pouso X <= 33,0)
    beach_start = len(SOURCE.objects)
    beach_u = [0.0, 0.20, 0.42, 0.64, 0.84, 1.0]

    def beach_uv(x, z, _y):
        u = max(0.004, min(0.996, (x - 33.05) / (36.0 - 33.05)))
        v = (z + 54.0) / 27.0
        return (u, v)

    build_grid_strip(
        SOURCE, M, 'Orla_Transicao_Praia',
        lambda _z, u: 33.05 + (36.0 - 33.05) * u,
        lambda _x, _z, u: 0.003 + 0.004 * smoothstep(0.15, 0.95, u),
        z_stops, beach_u,
        'costa_praia', 'mapa', 'Areia_costeira',
        uv_fn=beach_uv,
    )

    if 'orla_umida' not in MODULES:
        MODULES['orla_umida'] = (list(SOURCE.objects)[beach_start:], 34.5, 0.0)

    # 2. FUNDO SUBMERSO E SUPERFÍCIE CONTÍNUA DO MAR (destino = 'limites', X = 36,0..51,0)
    sea_start = len(SOURCE.objects)

    # 2a. Fundo arenoso submerso inclinado (X = 36,0..42,5)
    seabed_u = [0.0, 0.25, 0.492, 0.75, 1.0]
    build_grid_strip(
        SOURCE, M, 'Fundo_mar_raso',
        lambda _z, u: 36.0 + (42.5 - 36.0) * u,
        lambda x, z, _u: seabed_height(x, z),
        z_stops, seabed_u,
        'areia_molhada', 'limites', 'Limite_Leste_Mar',
        uv_fn=lambda x, z, _y: (x / 5.0, z / 5.0),
    )

    # 2b. Superfície única e contínua do mar (X = 36,0..51,0) com subdivisão mais densa na arrebentação e faixa rasa
    sea_x_stops = [
        36.0, 36.4, 36.9, 37.5, 38.3, 39.2,
        40.4, 42.0, 44.5, 47.5, 51.0,
    ]
    sea_u = [(x - 36.0) / 15.0 for x in sea_x_stops]

    def sea_uv(x, z, _y):
        u = max(0.004, min(0.996, (x - 36.0) / 15.0))
        v = (z + 54.0) / 27.0
        return (u, v)

    mar_obj = build_grid_strip(
        SOURCE, M, 'Mar',
        lambda _z, u: 36.0 + 15.0 * u,
        lambda x, z, u: 0.008 * math.exp(-(((u - 0.03) / 0.025) ** 2)) + 0.006 * (1.0 - smoothstep(0.0, 0.12, u)) - 0.018 * smoothstep(0.0, 0.65, u) + wave_height(x, z),
        z_stops, sea_u,
        'mar', 'limites', 'Limite_Leste_Mar',
        uv_fn=sea_uv,
    )
    mar_obj['planta'] = 'Mar'
    mar_obj['classe'] = 'piso'

    # 2c. Colares discretos de espuma ao redor dos pilares do píer quebrado (Z = -52,6..-47,4)
    for k, (px, pz) in enumerate([
        (37.2, -52.58), (37.2, -47.42),
        (41.2, -52.58), (41.2, -47.42),
        (45.2, -52.58), (45.2, -47.42),
        (48.2, -52.50), (49.6, -47.60),
    ]):
        build_piling_foam_collar(
            SOURCE, M, f'Espuma_pilar_pier_{k:02d}',
            px, pz, 0.58, 0.58, 0.003, 'limites', 'Limite_Leste_Mar',
        )

    if 'mar_costeiro' not in MODULES:
        MODULES['mar_costeiro'] = (list(SOURCE.objects)[sea_start:], 38.0, 0.0)
