"""Módulo determinístico dos morros divisórios do Rio (Level 02 · v004).

Constrói as cadeias de granito costeiro e mata atlântica integrada nos limites
oeste (`Limite_Oeste_Morro`) e norte (`Limite_Norte_Morro_Escombros`), preservando
integralmente a sequência aleatória, a planta, o píer e o restante da cena.
"""
import math
import random
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree


HILL_MATERIALS = (
    ('pedra_morro', (1.0, 1.0, 1.0), 'pedra_morro', 0.84),
    ('pedra_umida', (1.0, 1.0, 1.0), 'pedra_umida', 0.74),
    ('mata_escura', (1.0, 1.0, 1.0), 'mata_escura', 0.92),
    ('mata_media', (1.0, 1.0, 1.0), 'mata_media', 0.86),
    ('mata_clara', (1.0, 1.0, 1.0), 'mata_clara', 0.80),
)


def ensure_hill_materials(M):
    """Cria os materiais exclusivos dos morros sem alterar os materiais compartilhados do mapa."""
    for name, col, tex, rough in HILL_MATERIALS:
        if name in M:
            continue
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (*col, 1.0)
        bs.inputs['Roughness'].default_value = rough
        if tex:
            t = m.node_tree.nodes.new('ShaderNodeTexImage')
            t.image = bpy.data.images.get('RIO_' + tex)
            if t.image:
                t.image.pack()
            t.extension = 'REPEAT'
            m.node_tree.links.new(t.outputs['Color'], bs.inputs['Base Color'])
        M[name] = m


def _ang_diff(a, b):
    d = (a - b + math.pi) % math.tau - math.pi
    return d


def _lobe(theta, center, width, power=2.0):
    d = abs(_ang_diff(theta, center))
    if d >= width:
        return 0.0
    u = 0.5 * (1.0 + math.cos(math.pi * d / width))
    return u ** power


def _spatial_noise(x, z):
    """Campo determinístico suave de multi-frequência para quebrar linhas horizontais."""
    return (
        0.50 * math.sin(x * 0.075 + z * 0.062 + 0.8)
        + 0.30 * math.cos(x * 0.142 - z * 0.118 + 1.9)
        + 0.20 * math.sin(x * 0.235 + z * 0.271 - 0.6)
    )


def _finalize_mesh_data(name, verts, faces, mat_obj, is_rock=True, sharp_deg=28.0, world_offset=(0.0, 0.0, 0.0)):
    """Cria malha validada com normais externas, UVs contínuas sem costuras por face e arestas vivas deliberadas."""
    bm = bmesh.new()
    bm_verts = [bm.verts.new(v) for v in verts]
    bm.verts.ensure_lookup_table()
    for f in faces:
        try:
            uniquely = []
            for idx in f:
                if idx not in uniquely:
                    uniquely.append(idx)
            if len(uniquely) >= 3:
                bm.faces.new([bm_verts[idx] for idx in uniquely])
        except ValueError:
            pass
    bm.faces.ensure_lookup_table()
    # Remove faces degeneradas de área nula se existirem.
    degen = [f for f in bm.faces if f.calc_area() < 1e-6]
    if degen:
        bmesh.ops.delete(bm, geom=degen, context='FACES')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()

    # Garante orientação externa verificando o produto escalar com o vetor centro->face.
    inv = 0
    for f in bm.faces:
        c = f.calc_center_median()
        ref = Vector((c.x, c.y, max(0.2, c.z)))
        if f.normal.dot(ref) < -0.15 and c.z > 0.5:
            inv += 1
    if inv > len(bm.faces) * 0.5:
        for f in bm.faces:
            f.normal_flip()
        bm.normal_update()

    sharp_rad = math.radians(sharp_deg)
    horiz_sharp_rad = math.radians(32.0 if is_rock else 115.0)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2:
            f0, f1 = e.link_faces[0], e.link_faces[1]
            ang = f0.normal.angle(f1.normal, 0.0)
            ev = e.verts[1].co - e.verts[0].co
            ev_len = ev.length
            is_horiz = (abs(ev.z) / ev_len < 0.28) if ev_len > 1e-5 else False
            thresh = horiz_sharp_rad if is_horiz else sharp_rad
            e.smooth = not (ang > thresh)
        else:
            e.smooth = False

    data = bpy.data.meshes.new(name)
    bm.to_mesh(data)
    bm.free()
    data.update()
    data.materials.append(mat_obj)

    # UVs contínuas por vértice: zero costuras UV entre faces vizinhas e escala coerente em metros.
    ox, oy, oz = world_offset
    layer = data.uv_layers.new(name='UVMap')
    for poly in data.polygons:
        for li in poly.loop_indices:
            vi = data.loops[li].vertex_index
            co = data.vertices[vi].co
            wx = ox + co.x
            wy = oy + co.y
            wz = oz + co.z
            if is_rock:
                # u acompanha a extensão longitudinal da cadeia; v acompanha a altura Y (Blender Z),
                # alinhando as estrias de escorrimento verticalmente nas escarpas em escala ampla (~30 m).
                u = (wx - wy) * 0.032 + 0.008 * wz
                v = wz * 0.038
            else:
                u = (co.x + co.y) * 0.11 + 0.03 * ox
                v = (co.z + 0.45 * (co.x - co.y)) * 0.11 + 0.03 * oy
            layer.data[li].uv = (u, v)
    return data


def build_massif_data(
    name, cx, cz, rx, rz, h, mat_obj,
    crest_offset=(0.0, 0.0),
    ridge_vec=(0.0, 3.2),
    cliff_angle=0.0,
    spurs=(),
    flutes=(),
    shoulders=(),
    clamp_max_x=None,
    clamp_max_z=None,
    sharp_deg=11.5,
):
    """Gera a malha de um maciço granítico assimétrico com contrafortes, diedros verticais e coroamento convexo em domo/crista."""
    n_ang = 20
    # Perfil parabólico-convexo de domo granítico costeiro (largo nos ombros e arredondado no topo, sem cone pontudo e sem topo plano).
    levels = [
        (0.00, 1.00),
        (0.14, 0.96),
        (0.30, 0.89),
        (0.46, 0.80),
        (0.62, 0.69),
        (0.76, 0.56),
        (0.88, 0.39),
        (0.96, 0.19),
    ]
    verts = []
    ridge_dir_ang = math.atan2(-ridge_vec[1], ridge_vec[0])
    ridge_len = math.hypot(ridge_vec[0], ridge_vec[1])
    elong = min(0.42, ridge_len * 0.09)

    for li, (t, base_sc) in enumerate(levels):
        for i in range(n_ang):
            theta = i * math.tau / n_ang
            # Assimetria direcional: lado da escarpa (cliff_angle) tem parede mais íngreme/convexa;
            # lado oposto tem encosta mais longa e ombros escalonados.
            cliff_align = math.cos(_ang_diff(theta, cliff_angle))
            ridge_align = math.cos(_ang_diff(theta, ridge_dir_ang))
            ridge_elong = 1.0 + elong * (ridge_align ** 2 - 0.35) * (0.35 + 0.65 * t)
            slope_profile = base_sc * ridge_elong * (1.0 + 0.12 * cliff_align * math.sin(t * math.pi))

            # Contrafortes estruturais (spurs) que avançam na base/meia-encosta e criam cristas dorsais nítidas.
            spur_add = 0.0
            spur_h_boost = 0.0
            for s_ang, s_w, s_amp, s_top in spurs:
                w = _lobe(theta, s_ang, s_w, power=1.45)
                if w > 0.0 and t < s_top:
                    fade = math.sin((1.0 - t / s_top) * math.pi * 0.5) ** 1.05
                    spur_add += s_amp * w * fade * 1.18
                    spur_h_boost += 0.055 * s_amp * w * math.sin(t / s_top * math.pi)

            # Caneluras/diedros verticais côncavos (flutes) profundos que recolhem sombra lateral.
            flute_cut = 0.0
            for f_ang, f_w, f_depth, f_twist in flutes:
                w = _lobe(theta, f_ang + f_twist * (t - 0.4), f_w, power=1.85)
                if w > 0.0 and 0.04 < t < 0.93:
                    env = math.sin((t - 0.04) / 0.89 * math.pi) ** 0.75
                    flute_cut += f_depth * w * env * 1.35

            # Patamares/ombros intermediários (shoulders) onde a silhueta quebra e a mata se apoia.
            sh_add = 0.0
            sh_y_dip = 0.0
            for sh_ang, sh_w, sh_t, sh_amp in shoulders:
                w = _lobe(theta, sh_ang, sh_w, power=1.35)
                if w > 0.0:
                    dt = abs(t - sh_t)
                    if dt < 0.30:
                        bell = 0.5 * (1.0 + math.cos(math.pi * dt / 0.30))
                        sh_add += sh_amp * w * bell * 1.25
                        if t > sh_t:
                            sh_y_dip -= 0.075 * w * bell

            # Facetamento geológico de baixa frequência para quebrar simetria radial.
            geo_mod = (
                0.065 * math.sin(theta * 3.0 + cx * 0.13 + cz * 0.09 + t * 1.1)
                + 0.045 * math.cos(theta * 4.0 - cz * 0.17 + t * 1.7)
            ) * (1.0 - 0.35 * t)

            rad_factor = max(0.10, slope_profile + spur_add - flute_cut + sh_add + geo_mod)
            shift_t = (t ** 1.15)
            dx_c = crest_offset[0] * shift_t
            dz_c = crest_offset[1] * shift_t

            x_g = cx + dx_c + math.cos(theta) * rx * rad_factor
            z_g = cz - dz_c - math.sin(theta) * rz * rad_factor

            # Inclinação assimétrica da cumeeira (um lado do domo mais alto, outro descendo em ombro).
            crest_tilt = 0.055 * ridge_align * (t ** 1.3) + 0.030 * cliff_align * math.sin(t * math.pi)
            y_norm = max(0.0, min(0.985, t + spur_h_boost + sh_y_dip + (crest_tilt if li > 0 else 0.0)))
            y_g = 0.0 if li == 0 else h * y_norm

            if clamp_max_x is not None:
                if li <= 1 and math.cos(theta) > 0.15 and x_g > clamp_max_x - 3.2:
                    blend = min(1.0, (math.cos(theta) - 0.15) / 0.55) * (1.0 if li == 0 else 0.45)
                    x_g = x_g * (1.0 - blend) + clamp_max_x * blend
                x_g = min(x_g, clamp_max_x - (0.08 * li if li > 1 else 0.0))
            if clamp_max_z is not None:
                if li <= 1 and (-math.sin(theta)) > 0.15 and z_g > clamp_max_z - 3.2:
                    blend = min(1.0, ((-math.sin(theta)) - 0.15) / 0.55) * (1.0 if li == 0 else 0.45)
                    z_g = z_g * (1.0 - blend) + clamp_max_z * blend
                z_g = min(z_g, clamp_max_z - (0.08 * li if li > 1 else 0.0))

            verts.append((x_g - cx, (-z_g) - (-cz), y_g))

    # Ápice convexo exatamente no baricentro do anel superior (impossibilita dobras ou faces invertidas no cume).
    n_rings = len(levels)
    top_base = (n_rings - 1) * n_ang
    top_ring_verts = [verts[top_base + i] for i in range(n_ang)]
    ap_x = sum(v[0] for v in top_ring_verts) / n_ang
    ap_y = sum(v[1] for v in top_ring_verts) / n_ang
    ap_z = max(v[2] for v in top_ring_verts) + h * 0.032
    idx_apex = len(verts)
    verts.append((ap_x, ap_y, ap_z))

    faces = [tuple(reversed(range(n_ang)))]
    for l in range(n_rings - 1):
        base0 = l * n_ang
        base1 = (l + 1) * n_ang
        for i in range(n_ang):
            ni = (i + 1) % n_ang
            faces.append((base0 + i, base0 + ni, base1 + ni, base1 + i))
    for i in range(n_ang):
        ni = (i + 1) % n_ang
        faces.append((top_base + i, top_base + ni, idx_apex))

    return _finalize_mesh_data(
        name, verts, faces, mat_obj,
        is_rock=True, sharp_deg=sharp_deg, world_offset=(cx, -cz, 0.0)
    )


def build_continuous_apron_data(name, chain_axis, span_start, span_end, n_steps, inner_limit, outer_extent, heights, mat_obj, cx_ref, cz_ref, pier_extension=False):
    """Cria o embasamento rochoso contínuo (saia + selas) que elimina 100% das frestas entre o mapa e os morros."""
    verts = []
    faces = []
    for idx in range(n_steps + 1):
        u = idx / n_steps
        pos = span_start + (span_end - span_start) * u
        h_sec = heights(u, pos)
        wave = 1.4 * math.sin(u * math.tau * 3.5 + 0.6) + 0.8 * math.cos(u * math.tau * 6.0)
        outer_wave = 2.8 * math.sin(u * math.tau * 4.0 + 1.2) + 1.6 * math.cos(u * math.tau * 7.0 - 0.4)
        End_taper = min(1.0, min(u / 0.08, (1.0 - u) / 0.08))
        if chain_axis == 'west':
            z_g = pos
            x0 = inner_limit
            x1 = inner_limit - (2.6 + 0.9 * math.sin(u * 19.0))
            x2 = inner_limit - (8.2 + wave)
            ext_x = outer_extent + outer_wave + (1.0 - End_taper) * 4.5
            x3 = min(x2 - 1.5, ext_x + 2.8)
            x4 = min(x3 - 1.0, ext_x)
            pts_g = [
                (x0, z_g, 0.0),
                (x1, z_g, h_sec * 0.44),
                (x2, z_g, h_sec),
                (x3, z_g, h_sec * 0.48),
                (x4, z_g, 0.0),
            ]
        else:
            x_g = pos
            if pier_extension:
                t_ramp = max(0.0, min(1.0, (x_g - 21.5) / 6.5))
                t_smooth = t_ramp * t_ramp * (3.0 - 2.0 * t_ramp)
                z_lim = inner_limit * (1.0 - t_smooth) + (-53.02) * t_smooth
            else:
                z_lim = inner_limit
            z0 = z_lim
            z1 = z_lim - (2.4 + 0.8 * math.cos(u * 17.0))
            z2 = z_lim - (7.8 + wave)
            ext_z = outer_extent + outer_wave + (1.0 - End_taper) * 4.0
            z3 = min(z2 - 1.4, ext_z + 2.5)
            z4 = min(z3 - 1.0, ext_z)
            pts_g = [
                (x_g, z0, 0.0),
                (x_g, z1, h_sec * 0.46),
                (x_g, z2, h_sec),
                (x_g, z3, h_sec * 0.48),
                (x_g, z4, h_sec),
            ]
            pts_g[4] = (x_g, z4, 0.0)
        for xg, zg, yg in pts_g:
            verts.append((xg - cx_ref, (-zg) - (-cz_ref), yg))

    stride = 5
    for idx in range(n_steps):
        b0 = idx * stride
        b1 = (idx + 1) * stride
        for k in range(stride - 1):
            faces.append((b0 + k, b0 + k + 1, b1 + k + 1, b1 + k))
        faces.append((b0 + 4, b0 + 0, b1 + 0, b1 + 4))
    faces.append((0, 4, 3, 2, 1))
    last = n_steps * stride
    faces.append((last + 0, last + 1, last + 2, last + 3, last + 4))

    return _finalize_mesh_data(
        name, verts, faces, mat_obj,
        is_rock=True, sharp_deg=11.0, world_offset=(cx_ref, -cz_ref, 0.0)
    )


def build_granite_slab_data(name, w, d, h, tilt_x, tilt_z, taper, mat_obj, yaw=0.0, world_offset=(0.0, 0.0, 0.0), clamp_local_x=None, clamp_local_y_min=None):
    """Cria uma placa/contraforte de esfoliação de granito com faces amplas calmas e arestas vivas."""
    n = 7
    verts = []
    ca, sa = math.cos(yaw), math.sin(yaw)
    # Três níveis: base larga, corpo inclinado com aresta frontal pronunciada e crista afilada.
    for lvl, zf, sc, shx, shy in [
        (0, 0.0, 1.00, 0.0, 0.0),
        (1, 0.52, 0.78, tilt_x * 0.5, tilt_z * 0.5),
        (2, 1.00, taper, tilt_x, tilt_z),
    ]:
        for i in range(n):
            a = i * math.tau / n + (0.18 if lvl == 1 else 0.0)
            asym = 1.15 if i in (0, 1, 6) else 0.85
            lx = shx + math.cos(a) * (w * 0.5) * sc * asym
            ly = shy + math.sin(a) * (d * 0.5) * sc
            vx = lx * ca - ly * sa
            vy = lx * sa + ly * ca
            if clamp_local_x is not None:
                vx = min(vx, clamp_local_x)
            if clamp_local_y_min is not None:
                vy = max(vy, clamp_local_y_min)
            vz = h * zf * (1.0 - 0.14 * (1.0 - math.cos(a)) if lvl == 2 else 1.0)
            verts.append((vx, vy, max(0.0, vz)))
    faces = [tuple(reversed(range(n))), tuple(range(2 * n, 3 * n))]
    for l in range(2):
        for i in range(n):
            ni = (i + 1) % n
            faces.append((l * n + i, l * n + ni, (l + 1) * n + ni, (l + 1) * n + i))
    return _finalize_mesh_data(name, verts, faces, mat_obj, is_rock=True, sharp_deg=24.0, world_offset=world_offset)


def build_canopy_module_data(name, variant, mat_obj):
    """Cria módulos orgânicos de vegetação em 3 escalas (sem troncos de cone repetidos).

    variant:
      'massa_a', 'massa_b' -> Escala 1: grandes massas florestais multi-lobadas para selas e bases.
      'grupo_a', 'grupo_b', 'grupo_c' -> Escala 2: agrupamentos médios assimétricos de copas.
      'moita_a', 'moita_b' -> Escala 3: pequenos bolsões de fenda e borda de transição.
    """
    specs = {
        'massa_a': [
            (0.0, 0.0, 0.0, 3.6, 3.1, 2.7, 0.2),
            (-2.1, 0.9, -0.2, 2.8, 2.5, 2.2, 1.1),
            (2.0, -0.7, -0.1, 2.9, 2.4, 2.3, 2.4),
        ],
        'massa_b': [
            (0.0, 0.0, 0.0, 3.3, 3.5, 2.8, 0.7),
            (1.8, 1.4, -0.2, 2.6, 2.5, 2.1, 1.9),
            (-1.9, -1.1, -0.3, 2.5, 2.6, 2.0, 3.1),
        ],
        'grupo_a': [
            (0.0, 0.0, 0.0, 2.15, 1.95, 2.15, 0.4),
            (1.15, 0.55, -0.15, 1.55, 1.45, 1.65, 1.7),
        ],
        'grupo_b': [
            (0.0, 0.0, 0.0, 1.95, 2.20, 2.30, 1.2),
            (-1.10, -0.60, -0.20, 1.50, 1.60, 1.70, 2.8),
        ],
        'grupo_c': [
            (0.0, 0.0, 0.0, 2.35, 2.10, 1.95, 2.1),
        ],
        'moita_a': [
            (0.0, 0.0, 0.0, 1.15, 0.95, 1.05, 0.5),
            (0.62, 0.32, -0.10, 0.85, 0.78, 0.82, 2.0),
        ],
        'moita_b': [
            (0.0, 0.0, 0.0, 0.98, 1.12, 0.92, 1.6),
        ],
    }
    lobes = specs[variant]
    verts = []
    faces = []
    n_seg = 7
    # Cada lobo é um domo orgânico assimétrico de 3 anéis + ápice arredondado (sem topo truncado e sem cone pontudo).
    rings = [
        (-0.26, 0.76),
        (0.24, 1.00),
        (0.76, 0.62),
    ]
    for lx, ly, lz, rx, ry, hz, phase in lobes:
        base_v = len(verts)
        for r_idx, (zf, sc) in enumerate(rings):
            for i in range(n_seg):
                a = i * math.tau / n_seg + phase * 0.25
                wobble = 0.90 + 0.12 * math.sin(a * 2.0 + phase) + 0.07 * math.cos(a * 3.0 - phase + r_idx)
                vx = lx + math.cos(a) * rx * sc * wobble
                vy = ly + math.sin(a) * ry * sc * wobble
                vz = lz + hz * zf + 0.12 * hz * math.sin(a + phase) * (1.0 - abs(zf))
                verts.append((vx, vy, vz))
        bot_center = len(verts)
        verts.append((lx, ly, lz - 0.30 * hz))
        top_center = len(verts)
        verts.append((lx + 0.14 * rx * math.cos(phase), ly + 0.14 * ry * math.sin(phase), lz + hz * 1.02))

        for i in range(n_seg):
            ni = (i + 1) % n_seg
            faces.append((base_v + ni, base_v + i, bot_center))
        for l in range(len(rings) - 1):
            b0 = base_v + l * n_seg
            b1 = base_v + (l + 1) * n_seg
            for i in range(n_seg):
                ni = (i + 1) % n_seg
                faces.append((b0 + i, b0 + ni, b1 + ni, b1 + i))
        top_ring = base_v + (len(rings) - 1) * n_seg
        for i in range(n_seg):
            ni = (i + 1) % n_seg
            faces.append((top_ring + i, top_ring + ni, top_center))

    return _finalize_mesh_data(name, verts, faces, mat_obj, is_rock=False, sharp_deg=115.0)


def build_morros(SOURCE, M, MODULES, include_vegetation=True):
    """Constrói os morros oeste e norte na coleção editável SOURCE e registra amostras no KIT."""
    ensure_hill_materials(M)
    rng = random.Random(15112026)

    def link_obj(name, data, x, y, z, familia, rot=(0.0, 0.0, 0.0), scale=(1.0, 1.0, 1.0)):
        o = bpy.data.objects.new(name, data)
        SOURCE.objects.link(o)
        o.location = (x, -z, y)
        o.rotation_euler = rot
        o.scale = scale
        o['familia'] = familia
        o['destino'] = 'limites'
        o['morro_refinado'] = True
        return o

    # Pré-constrói os módulos reutilizáveis de vegetação em 3 escalas e 3 tons de verde.
    canopy_cache = {}
    for var in ('massa_a', 'massa_b', 'grupo_a', 'grupo_b', 'grupo_c', 'moita_a', 'moita_b'):
        for mat_name in ('mata_escura', 'mata_media', 'mata_clara'):
            key = (var, mat_name)
            canopy_cache[key] = build_canopy_module_data(f'Copa_{var}_{mat_name}', var, M[mat_name])

    rock_objects_by_family = {
        'Limite_Oeste_Morro': [],
        'Limite_Norte_Morro_Escombros': [],
    }

    # =========================================================================
    # 1. CADEIA OESTE (`Limite_Oeste_Morro`)
    # =========================================================================
    fam_w = 'Limite_Oeste_Morro'
    start_w = len(SOURCE.objects)

    # 1.1 Embasamento contínuo e saia úmida basal ao longo de X = -51.02 (elimina 100% das frestas).
    def west_saddle_height(u, z_pos):
        # Alturas das selas entre os picos: mais baixas nas gargantas das travessas (Z=34, 0, -34), mais altas junto aos picos.
        base = 13.5 + 3.2 * math.sin(z_pos * 0.095 + 0.4) - 2.4 * math.cos(z_pos * 0.185)
        taper = min(1.0, min((u + 0.02) / 0.10, (1.02 - u) / 0.10))
        return max(5.5, base * taper)

    apron_w_data = build_continuous_apron_data(
        'Granito_Embasamento_Oeste', 'west', -54.0, 58.0, 34,
        inner_limit=-51.02, outer_extent=-65.2,
        heights=west_saddle_height, mat_obj=M['pedra_morro'],
        cx_ref=-61.0, cz_ref=2.0
    )
    rock_objects_by_family[fam_w].append(link_obj('Granito_Embasamento_Oeste', apron_w_data, -61.0, 0.0, 2.0, fam_w))

    def west_damp_skirt_height(u, z_pos):
        return 4.6 + 1.8 * math.sin(z_pos * 0.14 + 1.1) + 1.1 * math.cos(z_pos * 0.27)

    skirt_w_data = build_continuous_apron_data(
        'Granito_Saia_Umida_Oeste', 'west', -55.0, 58.5, 34,
        inner_limit=-51.015, outer_extent=-59.5,
        heights=west_damp_skirt_height, mat_obj=M['pedra_umida'],
        cx_ref=-55.0, cz_ref=2.0
    )
    rock_objects_by_family[fam_w].append(link_obj('Granito_Saia_Umida_Oeste', skirt_w_data, -55.0, 0.0, 2.0, fam_w))

    # 1.2 Maciços hierárquicos da Cadeia Oeste (perfis, larguras, inclinações e cumes distintos).
    west_massifs = [
        dict(
            name='Granito_Macico_Oeste_Sul',
            cx=-62.4, cz=47.2, rx=11.4, rz=13.2, h=33.0,
            crest_offset=(2.4, -1.8), ridge_vec=(1.2, 3.6), cliff_angle=0.18,
            spurs=[
                (0.05, 0.55, 0.34, 0.85), (0.85, 0.52, 0.28, 0.75), (-0.95, 0.55, 0.28, 0.72),
                (2.55, 0.55, 0.32, 0.82), (-2.35, 0.55, 0.28, 0.76),
            ],
            flutes=[
                (0.42, 0.25, 0.24, 0.12), (-0.38, 0.24, 0.22, -0.10),
                (2.95, 0.26, 0.25, 0.14), (-2.75, 0.24, 0.22, -0.12),
            ],
            shoulders=[(1.45, 0.75, 0.48, 0.25), (-1.65, 0.75, 0.40, 0.22)],
            clamp_max_x=-51.02, clamp_max_z=None, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Contraforte_Travessa_Sul',
            cx=-59.4, cz=32.8, rx=8.8, rz=10.2, h=22.4,
            crest_offset=(2.0, 0.9), ridge_vec=(2.5, -1.6), cliff_angle=-0.12,
            spurs=[
                (0.0, 0.55, 0.36, 0.82), (-0.75, 0.50, 0.28, 0.70), (1.15, 0.58, 0.25, 0.68),
                (2.70, 0.55, 0.30, 0.78), (-2.40, 0.52, 0.26, 0.70),
            ],
            flutes=[
                (0.35, 0.25, 0.24, 0.08), (-0.35, 0.22, 0.20, -0.08),
                (3.05, 0.25, 0.23, 0.10), (-2.05, 0.24, 0.20, -0.10),
            ],
            shoulders=[(1.80, 0.80, 0.52, 0.26)],
            clamp_max_x=-51.02, clamp_max_z=None, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Pico_Oeste_Dominante',
            cx=-62.8, cz=15.6, rx=11.6, rz=15.4, h=37.3,
            crest_offset=(2.6, 2.0), ridge_vec=(-1.4, 3.8), cliff_angle=0.08,
            spurs=[
                (0.02, 0.52, 0.36, 0.88), (-0.68, 0.50, 0.32, 0.80), (0.78, 0.54, 0.30, 0.76),
                (2.35, 0.54, 0.34, 0.84), (3.10, 0.52, 0.30, 0.78), (-2.25, 0.56, 0.28, 0.74),
            ],
            flutes=[
                (0.36, 0.24, 0.26, 0.14), (-0.30, 0.25, 0.25, -0.12), (1.18, 0.22, 0.20, 0.06),
                (2.72, 0.25, 0.27, 0.15), (-2.68, 0.25, 0.25, -0.14),
            ],
            shoulders=[(1.55, 0.78, 0.44, 0.26), (-1.45, 0.76, 0.58, 0.24)],
            clamp_max_x=-51.02, clamp_max_z=None, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Ombro_Travessa_Central',
            cx=-59.2, cz=-1.2, rx=8.8, rz=10.6, h=23.4,
            crest_offset=(1.6, -1.1), ridge_vec=(2.4, 1.9), cliff_angle=0.10,
            spurs=[
                (-0.08, 0.54, 0.35, 0.80), (0.68, 0.50, 0.28, 0.72), (-1.05, 0.58, 0.25, 0.68),
                (2.50, 0.54, 0.34, 0.82), (-2.45, 0.52, 0.28, 0.74),
            ],
            flutes=[
                (0.28, 0.24, 0.22, -0.10), (-0.48, 0.24, 0.21, 0.10),
                (2.90, 0.26, 0.26, 0.12), (-2.05, 0.24, 0.22, -0.11),
            ],
            shoulders=[(-1.55, 0.82, 0.48, 0.28)],
            clamp_max_x=-51.02, clamp_max_z=None, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Pico_Oeste_Medio',
            cx=-62.2, cz=-18.2, rx=11.4, rz=14.4, h=34.6,
            crest_offset=(2.2, -1.8), ridge_vec=(1.1, 3.6), cliff_angle=-0.06,
            spurs=[
                (0.0, 0.52, 0.35, 0.86), (0.72, 0.52, 0.31, 0.78), (-0.82, 0.54, 0.28, 0.74),
                (2.40, 0.54, 0.36, 0.86), (3.12, 0.50, 0.32, 0.80), (-2.30, 0.54, 0.30, 0.75),
            ],
            flutes=[
                (0.34, 0.24, 0.25, 0.11), (-0.38, 0.25, 0.24, -0.14),
                (2.76, 0.26, 0.28, 0.15), (-2.68, 0.25, 0.26, -0.13), (1.95, 0.22, 0.20, 0.08),
            ],
            shoulders=[(-1.50, 0.78, 0.46, 0.26), (1.60, 0.74, 0.60, 0.22)],
            clamp_max_x=-51.02, clamp_max_z=None, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Ombro_Travessa_Norte',
            cx=-59.6, cz=-33.2, rx=9.0, rz=10.2, h=24.8,
            crest_offset=(1.8, 1.2), ridge_vec=(-1.8, 2.6), cliff_angle=0.14,
            spurs=[
                (0.08, 0.55, 0.34, 0.80), (-0.65, 0.52, 0.28, 0.74), (1.10, 0.58, 0.24, 0.68),
                (2.55, 0.54, 0.33, 0.80), (-2.38, 0.54, 0.28, 0.74),
            ],
            flutes=[
                (-0.26, 0.24, 0.22, 0.09), (0.48, 0.22, 0.20, -0.09),
                (2.92, 0.25, 0.25, 0.12), (-2.00, 0.24, 0.21, -0.10),
            ],
            shoulders=[(1.50, 0.80, 0.48, 0.26)],
            clamp_max_x=-51.02, clamp_max_z=None, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Macico_Canto_Noroeste',
            cx=-61.8, cz=-48.5, rx=11.4, rz=11.6, h=31.8,
            crest_offset=(2.2, 1.4), ridge_vec=(2.4, 2.4), cliff_angle=-0.35,
            spurs=[
                (-0.20, 0.56, 0.34, 0.84), (0.65, 0.54, 0.30, 0.78), (-1.15, 0.58, 0.28, 0.74),
                (2.35, 0.56, 0.32, 0.80), (-2.45, 0.55, 0.28, 0.74),
            ],
            flutes=[
                (0.22, 0.25, 0.24, 0.12), (-0.65, 0.25, 0.23, -0.10),
                (2.80, 0.25, 0.25, 0.12), (-1.95, 0.24, 0.22, -0.10),
            ],
            shoulders=[(1.35, 0.78, 0.46, 0.24), (-1.65, 0.76, 0.54, 0.24)],
            clamp_max_x=-51.02, clamp_max_z=None, sharp_deg=8.5,
        ),
    ]

    for idx, spec in enumerate(west_massifs):
        m_start = len(SOURCE.objects)
        data = build_massif_data(mat_obj=M['pedra_morro'], **spec)
        obj = link_obj(spec['name'], data, spec['cx'], 0.0, spec['cz'], fam_w)
        rock_objects_by_family[fam_w].append(obj)
        if idx == 2:
            # Registra o maciço dominante no kit de módulos reutilizáveis.
            MODULES['rocha_morro'] = ([obj], spec['cx'], spec['cz'])

    # 1.3 Placas secundárias de esfoliação e contrafortes de diedro no Oeste (faces leste e oeste).
    # Todas as placas inclinam o topo para dentro do maciço principal (tx < 0 na face +X, tx > 0 na face -X com yaw moderado),
    # integrando-se à encosta sem criar pontas soltas no céu.
    west_slabs = [
        # Faces leste (+X, vistas em CAM_Jogo / CAM_Geral)
        (-56.8, 45.0, 6.2, 7.6, 17.5, -3.6, 0.5, 0.42, 0.10, 'pedra_morro'),
        (-54.8, 34.0, 5.2, 6.6, 12.2, -2.8, -0.4, 0.46, -0.14, 'pedra_umida'),
        (-57.2, 20.5, 6.8, 8.2, 19.5, -4.0, 0.6, 0.40, 0.08, 'pedra_morro'),
        (-56.8, 10.8, 6.4, 7.8, 18.8, -3.8, -0.6, 0.42, -0.12, 'pedra_morro'),
        (-54.6, 1.2, 5.0, 6.4, 12.5, -2.8, 0.4, 0.46, 0.15, 'pedra_umida'),
        (-56.8, -13.8, 6.4, 7.8, 18.0, -3.7, 0.5, 0.42, 0.06, 'pedra_morro'),
        (-56.6, -22.8, 6.2, 7.2, 17.2, -3.5, -0.5, 0.42, -0.10, 'pedra_morro'),
        (-54.8, -33.6, 5.2, 6.6, 12.8, -2.9, 0.3, 0.46, 0.12, 'pedra_umida'),
        (-56.8, -45.0, 6.4, 7.6, 17.4, -3.6, -0.5, 0.42, -0.15, 'pedra_morro'),
        # Contrafortes e placas na escarpa externa oeste (-X, vistos em CAM_Morro e CAM_Topo; tx > 0 inclina para +X rumo ao pico)
        (-67.6, 21.5, 6.8, 8.4, 18.5, 3.8, -0.6, 0.42, -0.12, 'pedra_morro'),
        (-67.2, 8.8, 6.4, 7.8, 17.2, 3.6, 0.5, 0.44, 0.14, 'pedra_morro'),
        (-65.4, -3.2, 5.6, 6.8, 12.8, 2.9, -0.4, 0.48, -0.16, 'pedra_umida'),
        (-67.4, -14.2, 6.6, 8.2, 18.0, 3.7, 0.5, 0.42, 0.10, 'pedra_morro'),
        (-67.0, -24.2, 6.2, 7.6, 16.5, 3.5, -0.5, 0.44, -0.12, 'pedra_morro'),
        (-65.2, -34.8, 5.6, 6.8, 12.4, 2.8, 0.4, 0.48, 0.15, 'pedra_umida'),
    ]
    for k, (sx, sz, sw, sd, sh, tx, tz, tap, yaw, mkey) in enumerate(west_slabs):
        sdata = build_granite_slab_data(
            f'Placa_Oeste_{k}', sw, sd, sh, tx, tz, tap, M[mkey],
            yaw=yaw, world_offset=(sx, -sz, 0.0), clamp_local_x=(-51.02 - sx)
        )
        rock_objects_by_family[fam_w].append(link_obj(f'Placa_Oeste_{k}', sdata, sx, 0.0, sz, fam_w))

    # =========================================================================
    # 2. CADEIA NORTE E PROMONTÓRIO DO PÍER (`Limite_Norte_Morro_Escombros`)
    # =========================================================================
    fam_n = 'Limite_Norte_Morro_Escombros'

    # 2.1 Embasamento contínuo norte (X = -54..25, Z <= -54.02) e embasamento costeiro do píer (X = 20..45.4, transição suave até Z = -53.02).
    def north_saddle_height(u, x_pos):
        if x_pos > 28.0:
            t_p = (x_pos - 28.0) / 18.0
            return max(3.2, 11.5 * (1.0 - 0.68 * t_p) + 1.2 * math.sin(x_pos * 0.3))
        base = 12.8 + 2.8 * math.sin(x_pos * 0.11 + 0.7) - 2.0 * math.cos(x_pos * 0.21)
        return max(6.0, base)

    apron_n_data = build_continuous_apron_data(
        'Granito_Embasamento_Norte', 'north', -54.0, 25.0, 26,
        inner_limit=-54.02, outer_extent=-66.5,
        heights=north_saddle_height, mat_obj=M['pedra_morro'],
        cx_ref=-14.5, cz_ref=-62.0, pier_extension=False
    )
    rock_objects_by_family[fam_n].append(link_obj('Granito_Embasamento_Norte', apron_n_data, -14.5, 0.0, -62.0, fam_n))

    apron_pier_data = build_continuous_apron_data(
        'Granito_Embasamento_Pier', 'north', 20.0, 45.4, 14,
        inner_limit=-54.02, outer_extent=-62.5,
        heights=north_saddle_height, mat_obj=M['pedra_morro'],
        cx_ref=33.0, cz_ref=-57.5, pier_extension=True
    )
    rock_objects_by_family[fam_n].append(link_obj('Granito_Embasamento_Pier', apron_pier_data, 33.0, 0.0, -57.5, fam_n))

    def north_damp_skirt_height(u, x_pos):
        if x_pos > 28.0:
            t_p = (x_pos - 28.0) / 18.0
            return max(1.8, 4.2 * (1.0 - 0.55 * t_p))
        return 4.4 + 1.5 * math.cos(x_pos * 0.16 - 0.5)

    skirt_n_data = build_continuous_apron_data(
        'Granito_Saia_Umida_Norte', 'north', -54.5, 25.0, 26,
        inner_limit=-54.015, outer_extent=-60.2,
        heights=north_damp_skirt_height, mat_obj=M['pedra_umida'],
        cx_ref=-14.5, cz_ref=-57.0, pier_extension=False
    )
    rock_objects_by_family[fam_n].append(link_obj('Granito_Saia_Umida_Norte', skirt_n_data, -14.5, 0.0, -57.0, fam_n))

    skirt_pier_data = build_continuous_apron_data(
        'Granito_Saia_Umida_Pier', 'north', 20.0, 45.8, 14,
        inner_limit=-54.015, outer_extent=-58.2,
        heights=north_damp_skirt_height, mat_obj=M['pedra_umida'],
        cx_ref=33.0, cz_ref=-55.5, pier_extension=True
    )
    rock_objects_by_family[fam_n].append(link_obj('Granito_Saia_Umida_Pier', skirt_pier_data, 33.0, 0.0, -55.5, fam_n))

    # 2.2 Maciços da Cadeia Norte e Promontório Costeiro do Píer.
    north_massifs = [
        dict(
            name='Granito_Macico_Norte_Noroeste',
            cx=-46.0, cz=-64.8, rx=12.4, rz=10.8, h=27.4,
            crest_offset=(1.6, 2.4), ridge_vec=(3.4, 1.2), cliff_angle=-1.45,
            spurs=[(-1.55, 0.62, 0.32, 0.82), (-0.85, 0.55, 0.26, 0.74), (-2.30, 0.65, 0.24, 0.70)],
            flutes=[(-1.20, 0.24, 0.20, 0.10), (-1.90, 0.24, 0.18, -0.10)],
            shoulders=[(0.25, 0.85, 0.48, 0.22), (2.80, 0.80, 0.44, 0.22)],
            clamp_max_x=None, clamp_max_z=-54.02, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Contraforte_Rua_Fundo',
            cx=-33.2, cz=-63.2, rx=9.8, rz=9.2, h=21.6,
            crest_offset=(-1.2, 2.1), ridge_vec=(2.8, -1.1), cliff_angle=-1.57,
            spurs=[(-1.57, 0.60, 0.34, 0.78), (-0.90, 0.52, 0.24, 0.68), (-2.25, 0.58, 0.24, 0.68)],
            flutes=[(-1.22, 0.24, 0.19, -0.09), (-1.88, 0.22, 0.17, 0.09)],
            shoulders=[(0.0, 0.88, 0.50, 0.24)],
            clamp_max_x=None, clamp_max_z=-54.02, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Pico_Norte_Orla',
            cx=-18.4, cz=-65.4, rx=13.0, rz=11.0, h=28.8,
            crest_offset=(2.1, 2.6), ridge_vec=(3.5, -0.9), cliff_angle=-1.40,
            spurs=[(-1.50, 0.58, 0.34, 0.84), (-0.78, 0.55, 0.28, 0.76), (-2.25, 0.62, 0.26, 0.72), (1.60, 0.75, 0.20, 0.68)],
            flutes=[(-1.12, 0.25, 0.22, 0.12), (-1.85, 0.24, 0.20, -0.11)],
            shoulders=[(-0.15, 0.85, 0.45, 0.24), (2.95, 0.85, 0.52, 0.22)],
            clamp_max_x=None, clamp_max_z=-54.02, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Domo_Costeiro_Avenida',
            cx=1.8, cz=-65.0, rx=13.6, rz=11.2, h=30.5,
            crest_offset=(2.4, 2.9), ridge_vec=(3.2, 1.4), cliff_angle=-1.35,
            spurs=[(-1.48, 0.56, 0.35, 0.86), (-0.72, 0.54, 0.30, 0.78), (-2.20, 0.60, 0.27, 0.74), (1.75, 0.75, 0.18, 0.70)],
            flutes=[(-1.10, 0.24, 0.23, 0.14), (-1.82, 0.25, 0.21, -0.12), (-0.38, 0.22, 0.16, 0.08)],
            shoulders=[(2.85, 0.88, 0.44, 0.25), (-0.10, 0.82, 0.55, 0.22)],
            clamp_max_x=None, clamp_max_z=-54.02, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Ombro_Norte_Calcadao',
            cx=15.2, cz=-63.5, rx=10.6, rz=9.6, h=23.6,
            crest_offset=(1.8, 2.2), ridge_vec=(2.9, -1.2), cliff_angle=-1.45,
            spurs=[(-1.52, 0.60, 0.32, 0.80), (-0.82, 0.55, 0.26, 0.72), (-2.25, 0.60, 0.24, 0.68)],
            flutes=[(-1.18, 0.24, 0.19, 0.10), (-1.88, 0.24, 0.18, -0.10)],
            shoulders=[(-0.10, 0.85, 0.46, 0.24)],
            clamp_max_x=None, clamp_max_z=-54.02, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Morro_Costao_Praia',
            cx=26.8, cz=-62.4, rx=10.8, rz=8.8, h=18.8,
            crest_offset=(1.6, 2.0), ridge_vec=(2.8, 1.0), cliff_angle=-1.35,
            spurs=[(-1.45, 0.62, 0.33, 0.82), (-0.70, 0.58, 0.28, 0.75), (-2.20, 0.60, 0.24, 0.70)],
            flutes=[(-1.08, 0.24, 0.20, 0.10), (-1.82, 0.24, 0.18, -0.08)],
            shoulders=[(2.90, 0.85, 0.48, 0.22)],
            clamp_max_x=None, clamp_max_z=-54.02, sharp_deg=8.5,
        ),
        # Promontório rochoso escalonado junto ao píer e avançando sobre o mar (X = 29..47, Z encostando em -53.02).
        dict(
            name='Granito_Promontorio_Pier_Oeste',
            cx=33.6, cz=-57.4, rx=5.6, rz=4.4, h=11.4,
            crest_offset=(0.9, 1.1), ridge_vec=(2.0, 0.6), cliff_angle=-1.30,
            spurs=[(-1.50, 0.65, 0.34, 0.82), (-0.65, 0.58, 0.28, 0.74), (-2.30, 0.60, 0.24, 0.70)],
            flutes=[(-1.08, 0.25, 0.20, 0.08), (-1.92, 0.24, 0.18, -0.08)],
            shoulders=[(0.15, 0.80, 0.46, 0.20)],
            clamp_max_x=None, clamp_max_z=-53.02, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Promontorio_Pier_Leste',
            cx=41.2, cz=-57.8, rx=5.4, rz=4.6, h=9.4,
            crest_offset=(0.8, 1.1), ridge_vec=(1.9, -0.5), cliff_angle=-1.25,
            spurs=[(-1.48, 0.65, 0.34, 0.84), (-0.55, 0.60, 0.30, 0.76), (-2.25, 0.60, 0.24, 0.70)],
            flutes=[(-1.02, 0.25, 0.21, 0.10), (-1.88, 0.24, 0.18, -0.08)],
            shoulders=[(2.85, 0.80, 0.44, 0.18)],
            clamp_max_x=None, clamp_max_z=-53.02, sharp_deg=8.5,
        ),
        dict(
            name='Granito_Ponta_Mar_Pier',
            cx=45.0, cz=-56.5, rx=3.4, rz=3.2, h=5.0,
            crest_offset=(0.5, 0.7), ridge_vec=(1.4, 0.4), cliff_angle=-1.15,
            spurs=[(-1.45, 0.68, 0.32, 0.82), (-0.45, 0.62, 0.28, 0.75)],
            flutes=[(-0.95, 0.25, 0.18, 0.06)],
            shoulders=[],
            clamp_max_x=None, clamp_max_z=-53.03, sharp_deg=8.5,
        ),
    ]

    for spec in north_massifs:
        mkey = 'pedra_umida' if spec['name'] == 'Granito_Ponta_Mar_Pier' else 'pedra_morro'
        data = build_massif_data(mat_obj=M[mkey], **spec)
        obj = link_obj(spec['name'], data, spec['cx'], 0.0, spec['cz'], fam_n)
        rock_objects_by_family[fam_n].append(obj)

    # 2.3 Placas de esfoliação norte e matacões costeiros encostando na rampa e no tablado do píer.
    # Em coordenadas do Blender (Y = -Z), tilt_z > 0 inclina o topo para +Y (Norte, para dentro do maciço).
    north_slabs = [
        # (x, z, w, d, h, tilt_x, tilt_z, taper, yaw, mat_key)
        (-42.5, -59.2, 7.2, 5.8, 16.5, 0.5, 3.4, 0.42, 0.10, 'pedra_morro'),
        (-33.0, -58.0, 6.4, 5.2, 12.8, -0.4, 2.8, 0.46, -0.14, 'pedra_umida'),
        (-16.5, -59.5, 7.6, 6.0, 18.2, 0.6, 3.6, 0.40, 0.08, 'pedra_morro'),
        (3.2, -59.2, 8.2, 6.4, 19.5, 0.7, 3.8, 0.40, -0.08, 'pedra_morro'),
        (14.5, -58.4, 6.8, 5.4, 15.2, -0.4, 3.2, 0.42, 0.12, 'pedra_morro'),
        (25.2, -57.8, 6.4, 5.0, 12.4, 0.5, 2.8, 0.44, -0.12, 'pedra_umida'),
        # Matacões e afloramentos costeiros junto ao píer (Z = -54.0 .. -53.02, X = 29.5 .. 46.0)
        (30.4, -54.2, 3.6, 2.4, 3.8, 0.3, 1.1, 0.48, 0.18, 'pedra_umida'),
        (35.8, -54.1, 4.0, 2.5, 4.5, -0.3, 1.2, 0.45, -0.14, 'pedra_morro'),
        (38.8, -54.0, 3.4, 2.2, 3.2, 0.2, 0.9, 0.50, 0.12, 'pedra_umida'),
        (43.2, -54.1, 3.6, 2.3, 3.6, -0.2, 1.0, 0.46, -0.18, 'pedra_umida'),
        (46.0, -54.4, 2.8, 2.0, 2.2, 0.3, 0.7, 0.52, 0.25, 'pedra_umida'),
    ]
    for k, (sx, sz, sw, sd, sh, tx, tz, tap, yaw, mkey) in enumerate(north_slabs):
        lim_z = -53.02 if sx >= 28.0 else -54.02
        sdata = build_granite_slab_data(
            f'Placa_Norte_{k}', sw, sd, sh, tx, tz, tap, M[mkey],
            yaw=yaw, world_offset=(sx, -sz, 0.0), clamp_local_y_min=(-lim_z) - (-sz)
        )
        rock_objects_by_family[fam_n].append(link_obj(f'Placa_Norte_{k}', sdata, sx, 0.0, sz, fam_n))

    if not include_vegetation:
        return

    # =========================================================================
    # 3. VEGETAÇÃO INTEGRADA EM 3 ESCALAS COM ASSENTAMENTO POR BVHTREE
    # =========================================================================
    def build_family_bvh(objs):
        all_v = []
        all_f = []
        for o in objs:
            off = len(all_v)
            mat_b = Matrix.Translation(o.location) @ o.rotation_euler.to_matrix().to_4x4()
            all_v.extend(tuple(mat_b @ v.co) for v in o.data.vertices)
            for p in o.data.polygons:
                all_f.append(tuple(off + vi for vi in p.vertices))
        return BVHTree.FromPolygons(all_v, all_f)

    bvh_w = build_family_bvh(rock_objects_by_family[fam_w])
    bvh_n = build_family_bvh(rock_objects_by_family[fam_n])

    def place_on_surface(bvh, x_g, z_g, fam, var_key, mat_key, scale_xyz, yaw, max_x=None, max_z=None, embed=0.55):
        """Projeta sobre a superfície do maciço e assenta com embutimento proporcional à inclinação."""
        origin = Vector((x_g, -z_g, 60.0))
        hit_loc, hit_norm, _, _ = bvh.ray_cast(origin, Vector((0.0, 0.0, -1.0)), 65.0)
        if hit_loc is None:
            return None
        min_nz = 0.12 if var_key.startswith('moita') else 0.16
        if hit_norm.z < min_nz:
            return None
        # Afunda a base ao longo da normal (embutimento calibrado para contato firme sem enterrar o volume na encosta).
        embed_eff = embed + 0.35 * (1.0 - hit_norm.z)
        pos_b = hit_loc - hit_norm * embed_eff
        if pos_b.z < 0.25:
            pos_b.z = 0.25
        # Garante que nenhuma copa baixa (< 4.2 m) avance sobre as vias/mapa; acima de 4.2 m mantém a copa
        # assentada na face externa da encosta sem empurrá-la para dentro da rocha.
        rad_est = 3.6 * max(scale_xyz[0], scale_xyz[1]) if var_key.startswith('massa') else (2.2 * max(scale_xyz[0], scale_xyz[1]) if var_key.startswith('grupo') else 1.15 * max(scale_xyz[0], scale_xyz[1]))
        margin = rad_est if pos_b.z < 4.2 else 0.65
        if max_x is not None and pos_b.x + margin > max_x:
            pos_b.x = max_x - margin
        if max_z is not None and (-pos_b.y) + margin > max_z:
            pos_b.y = -(max_z - margin)

        # Inclina moderadamente o volume na direção da normal da encosta.
        tilt_strength = 0.30 if var_key.startswith('massa') else 0.22
        target_up = Vector((hit_norm.x * tilt_strength, hit_norm.y * tilt_strength, 1.0)).normalized()
        rot_q = target_up.to_track_quat('Z', 'Y')
        rot_e = rot_q.to_euler()
        rot_e.z = yaw

        data = canopy_cache[(var_key, mat_key)]
        return link_obj(f'Mata_{var_key}', data, pos_b.x, pos_b.z, -pos_b.y, fam, rot=tuple(rot_e), scale=scale_xyz)

    # 3.1 Distribuição guiada por selas, ombros, inclinação e ruído espacial 2D (sem linha horizontal!).
    west_saddles = [54.5, 33.5, 22.5, 1.5, -10.5, -32.5, -52.5]
    west_cliffs = [(47.5, 18.0), (15.6, 15.0), (-18.2, 16.0), (-48.0, 16.5)]

    def west_veg_ceiling(x_g, z_g):
        """Retorna o teto orgânico de vegetação em metros para cada ponto (x_g, z_g), preservando cumes e escarpas de granito nu."""
        saddle_boost = max(math.exp(-((z_g - sz) / 7.2) ** 2) for sz in west_saddles)
        cliff_suppress = max(math.exp(-((z_g - cz) / 4.8) ** 2) * (0.95 if x_g > -62.5 else 0.80) for cz, _ in west_cliffs)
        base_skirt_boost = max(0.0, (x_g - (-57.5)) / 5.5) * 3.5 if x_g > -57.5 else max(0.0, (-65.5 - x_g) / 7.5) * 4.0
        n_val = _spatial_noise(x_g, z_g)
        return max(10.5, 15.2 + 12.8 * saddle_boost + base_skirt_boost - 8.5 * cliff_suppress + 3.8 * n_val)

    # Passagem A (Oeste) — Escala 1: Grandes massas florestais nas selas, bases e meias-encostas (`Mata_massa`).
    veg_w_objs = []
    for idx in range(30):
        z_g = -55.0 + (112.5 * idx / 29.0) + rng.uniform(-0.9, 0.9)
        for band in range(3):
            x_g = (-53.6 if band == 0 else (-60.5 if band == 1 else -68.2)) + rng.uniform(-1.5, 1.5)
            origin = Vector((x_g, -z_g, 60.0))
            hit_loc, hit_norm, _, _ = bvh_w.ray_cast(origin, Vector((0.0, 0.0, -1.0)), 65.0)
            if hit_loc is None:
                continue
            h_y = hit_loc.z
            ceil_y = west_veg_ceiling(x_g, z_g)
            if h_y > ceil_y or hit_norm.z < 0.16:
                continue
            var_k = 'massa_a' if (idx + band) % 2 == 0 else 'massa_b'
            mat_k = 'mata_escura' if (h_y < ceil_y * 0.62 or abs(hit_norm.x) < 0.22) else 'mata_media'
            sc = (rng.uniform(0.84, 1.20), rng.uniform(0.84, 1.20), rng.uniform(0.80, 1.14))
            o = place_on_surface(bvh_w, x_g, z_g, fam_w, var_k, mat_k, sc, rng.uniform(0, math.tau), max_x=-51.05, embed=0.55)
            if o:
                veg_w_objs.append(o)

    # Passagem B (Oeste) — Escala 2: Grupos médios de copas nos ombros, patamares e encostas (`Copa_grupo`).
    for idx in range(60):
        z_g = -55.5 + (113.5 * idx / 59.0) + rng.uniform(-0.8, 0.8)
        x_g = rng.uniform(-58.2, -52.2) if (idx % 2 == 0) else rng.uniform(-71.5, -58.2)
        origin = Vector((x_g, -z_g, 60.0))
        hit_loc, hit_norm, _, _ = bvh_w.ray_cast(origin, Vector((0.0, 0.0, -1.0)), 65.0)
        if hit_loc is None:
            continue
        h_y = hit_loc.z
        ceil_y = west_veg_ceiling(x_g, z_g) + 2.2
        if h_y > ceil_y or hit_norm.z < 0.15:
            continue
        var_k = ('grupo_a', 'grupo_b', 'grupo_c')[idx % 3]
        if h_y > ceil_y * 0.72:
            mat_k = 'mata_clara'
        elif h_y < 9.5:
            mat_k = 'mata_escura'
        else:
            mat_k = 'mata_media'
        sc = (rng.uniform(0.80, 1.22), rng.uniform(0.80, 1.22), rng.uniform(0.82, 1.18))
        o = place_on_surface(bvh_w, x_g, z_g, fam_w, var_k, mat_k, sc, rng.uniform(0, math.tau), max_x=-51.05, embed=0.42)
        if o:
            veg_w_objs.append(o)

    # Passagem C (Oeste) — Escala 3: Pequenos bolsões e arbustos nas bordas rocha/mata e fendas (`Moita_fenda`).
    for idx in range(42):
        z_g = -55.0 + (113.0 * idx / 41.0) + rng.uniform(-0.7, 0.7)
        x_g = rng.uniform(-57.5, -52.0) if (idx % 2 == 0) else rng.uniform(-71.2, -57.5)
        origin = Vector((x_g, -z_g, 60.0))
        hit_loc, hit_norm, _, _ = bvh_w.ray_cast(origin, Vector((0.0, 0.0, -1.0)), 65.0)
        if hit_loc is None:
            continue
        h_y = hit_loc.z
        ceil_y = west_veg_ceiling(x_g, z_g)
        if not (abs(h_y - ceil_y) < 5.5 or h_y < 8.5):
            continue
        var_k = 'moita_a' if idx % 2 == 0 else 'moita_b'
        mat_k = 'mata_clara' if h_y > 13.5 else ('mata_media' if idx % 3 else 'mata_escura')
        sc = (rng.uniform(0.76, 1.24), rng.uniform(0.76, 1.24), rng.uniform(0.76, 1.20))
        o = place_on_surface(bvh_w, x_g, z_g, fam_w, var_k, mat_k, sc, rng.uniform(0, math.tau), max_x=-51.04, embed=0.28)
        if o:
            veg_w_objs.append(o)

    if veg_w_objs:
        MODULES['vegetacao_morro'] = ([veg_w_objs[0]], veg_w_objs[0].location.x, -veg_w_objs[0].location.y)

    # 3.2 Distribuição na Cadeia Norte e Promontório Costeiro do Píer (`Limite_Norte_Morro_Escombros`).
    north_saddles = [-52.0, -33.5, -9.0, 14.5, 22.5, 36.8]
    north_cliffs = [(-18.4, 16.0), (1.8, 14.0), (26.8, 11.0)]

    def north_veg_ceiling(x_g, z_g):
        if x_g > 30.0:
            # No promontório do píer, mantém bolsões costeiros nas selas e ombros médios,
            # preservando as escarpas baixas e os matacões expostos junto ao píer e ao mar!
            pier_saddle = math.exp(-((x_g - 36.8) / 4.2) ** 2) * 3.8
            return 8.6 + pier_saddle - 0.12 * (x_g - 30.0) + 1.5 * _spatial_noise(x_g, z_g)
        saddle_boost = max(math.exp(-((x_g - sx) / 6.8) ** 2) for sx in north_saddles)
        cliff_suppress = max(math.exp(-((x_g - cx) / 4.8) ** 2) * (0.95 if z_g > -65.0 else 0.75) for cx, _ in north_cliffs)
        base_skirt_boost = max(0.0, (z_g - (-59.5)) / 5.0) * 3.2 if z_g > -59.5 else max(0.0, (-65.0 - z_g) / 8.0) * 3.8
        n_val = _spatial_noise(x_g, z_g)
        return max(9.5, 14.2 + 12.0 * saddle_boost + base_skirt_boost - 8.2 * cliff_suppress + 3.5 * n_val)

    # Passagem A (Norte) — Escala 1: Grandes massas florestais (`Mata_massa`, até X = 29).
    for idx in range(24):
        x_g = -54.0 + (83.0 * idx / 23.0) + rng.uniform(-0.9, 0.9)
        for band in range(2):
            z_g = (-56.6 if band == 0 else -65.2) + rng.uniform(-1.5, 1.5)
            origin = Vector((x_g, -z_g, 60.0))
            hit_loc, hit_norm, _, _ = bvh_n.ray_cast(origin, Vector((0.0, 0.0, -1.0)), 65.0)
            if hit_loc is None:
                continue
            h_y = hit_loc.z
            ceil_y = north_veg_ceiling(x_g, z_g)
            if h_y > ceil_y or hit_norm.z < 0.16:
                continue
            var_k = 'massa_a' if (idx + band) % 2 == 0 else 'massa_b'
            mat_k = 'mata_escura' if (h_y < ceil_y * 0.62 or hit_norm.y > -0.1) else 'mata_media'
            sc = (rng.uniform(0.82, 1.18), rng.uniform(0.82, 1.18), rng.uniform(0.80, 1.12))
            lim_z = -53.20 if x_g >= 28.5 else -54.05
            place_on_surface(bvh_n, x_g, z_g, fam_n, var_k, mat_k, sc, rng.uniform(0, math.tau), max_z=lim_z, embed=0.55)

    # Passagem B (Norte) — Escala 2: Grupos médios de copas (`Copa_grupo`).
    for idx in range(44):
        x_g = -54.5 + (97.5 * idx / 43.0) + rng.uniform(-0.8, 0.8)
        z_g = rng.uniform(-60.2, -55.0 if x_g < 28.5 else -54.5) if (idx % 2 == 0) else rng.uniform(-68.5, -60.0)
        origin = Vector((x_g, -z_g, 60.0))
        hit_loc, hit_norm, _, _ = bvh_n.ray_cast(origin, Vector((0.0, 0.0, -1.0)), 65.0)
        if hit_loc is None:
            continue
        h_y = hit_loc.z
        ceil_y = north_veg_ceiling(x_g, z_g) + (1.6 if x_g > 30.0 else 2.2)
        if h_y > ceil_y or (x_g > 30.0 and h_y < 2.8) or hit_norm.z < 0.15:
            continue
        var_k = ('grupo_a', 'grupo_b', 'grupo_c')[idx % 3]
        if h_y > ceil_y * 0.72:
            mat_k = 'mata_clara'
        elif h_y < 8.5:
            mat_k = 'mata_escura'
        else:
            mat_k = 'mata_media'
        sc_f = 0.74 if x_g > 31.0 else 1.0
        sc = (rng.uniform(0.78, 1.18) * sc_f, rng.uniform(0.78, 1.18) * sc_f, rng.uniform(0.80, 1.16) * sc_f)
        lim_z = -53.22 if x_g >= 28.5 else -54.05
        place_on_surface(bvh_n, x_g, z_g, fam_n, var_k, mat_k, sc, rng.uniform(0, math.tau), max_z=lim_z, embed=0.40)

    # Passagem C (Norte e Píer) — Escala 3: Pequenos bolsões costeiros e moitas de fenda (`Moita_fenda`).
    for idx in range(34):
        x_g = -53.5 + (98.5 * idx / 33.0) + rng.uniform(-0.7, 0.7)
        z_g = rng.uniform(-59.5, -54.6 if x_g < 28.5 else -53.8) if (idx % 2 == 0) else rng.uniform(-64.5, -58.5)
        origin = Vector((x_g, -z_g, 60.0))
        hit_loc, hit_norm, _, _ = bvh_n.ray_cast(origin, Vector((0.0, 0.0, -1.0)), 65.0)
        if hit_loc is None:
            continue
        h_y = hit_loc.z
        ceil_y = north_veg_ceiling(x_g, z_g)
        if x_g <= 30.0 and not (abs(h_y - ceil_y) < 5.5 or h_y < 8.0):
            continue
        if x_g > 30.0 and h_y < 2.2:
            continue
        var_k = 'moita_a' if idx % 2 == 0 else 'moita_b'
        mat_k = 'mata_clara' if h_y > 10.0 else ('mata_media' if idx % 2 else 'mata_escura')
        sc = (rng.uniform(0.74, 1.20), rng.uniform(0.74, 1.20), rng.uniform(0.74, 1.16))
        lim_z = -53.12 if x_g >= 28.5 else -54.04
        place_on_surface(bvh_n, x_g, z_g, fam_n, var_k, mat_k, sc, rng.uniform(0, math.tau), max_z=lim_z, embed=0.26)
