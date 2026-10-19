# Estudo de arte — Colônia de Marte (Horda Survivor)
# Biblioteca de apoio para build_colony_study.py. Executar dentro do Blender 5.x.
#
# Conversão de eixos (jogo three.js, Y para cima) -> Blender (Z para cima):
#   blender.X =  jogo.x
#   blender.Y = -jogo.z      (norte do jogo = -Z = +Y no Blender)
#   blender.Z =  jogo.y
# O exportador glTF com "+Y Up" faz a conversão inversa, então um objeto em
# Blender (x, y, z) chega ao jogo em (x, z, -y). 1 unidade = 1 metro.

import bpy
import bmesh
import math
from mathutils import Vector, Matrix, Euler

T = 0.28          # espessura de parede do piloto (ROOM_WALL_THICKNESS)
WALL_H = 2.7      # altura de parede do piloto (ROOM_WALL_HEIGHT)


def G(x, z, y=0.0):
    """Coordenada do jogo (x, z, altura y) -> Vector do Blender."""
    return Vector((x, -z, y))


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h, a=1.0):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (_lin(r), _lin(g), _lin(b), a)


# ---------------------------------------------------------------- coleções

def collection(name, parent=None):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
    par = parent or bpy.context.scene.collection
    if c.name not in par.children:
        par.children.link(c)
    return c


# ---------------------------------------------------------------- materiais

MATS = {}


def material(name, hexc, rough=0.7, metal=0.0, emit=None, strength=0.0,
             alpha=1.0, vcol=False, spec=0.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (300, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = hexcol(hexc)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    for key in ('Specular IOR Level', 'Specular'):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = spec
            break
    if vcol:
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        vc.location = (-300, 0)
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    if emit:
        bsdf.inputs['Emission Color'].default_value = hexcol(emit)
        bsdf.inputs['Emission Strength'].default_value = strength
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
        try:
            m.use_transparency_overlap = False
        except Exception:
            pass
    m.diffuse_color = hexcol(hexc, alpha)
    m.roughness = rough
    m.metallic = metal
    MATS[name] = m
    return m


# ---------------------------------------------------------------- malhas

class Builder:
    """Acumula primitivas numa única bmesh, com índice de material por peça.

    As coordenadas recebidas são do mundo Blender; `origin` vira o pivô do
    objeto, e `post` (Matrix) é aplicada a cada peça antes da translação,
    permitindo montar em eixos locais (ex.: paredes giradas)."""

    def __init__(self, origin=(0, 0, 0), post=None):
        self.bm = bmesh.new()
        self.mats = []
        self.origin = Vector(origin)
        self.post = post or Matrix.Identity(4)

    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _assign(self, verts, m):
        i = self._mi(m)
        faces = set()
        for v in verts:
            faces.update(v.link_faces)
        for f in faces:
            f.material_index = i
            f.smooth = False
        return faces

    def _M(self, c):
        return Matrix.Translation(Vector(c) - self.origin)

    def box(self, c, s, m, rz=0.0, rx=0.0):
        M = (self.post @ self._M(c) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(rx, 4, 'X') @
             Matrix.Diagonal((s[0], s[1], s[2], 1.0)))
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)
        return self._assign(r['verts'], m)

    def bounds(self, x0, x1, y0, y1, z0, z1, m):
        """Caixa por limites (coordenadas locais/mundo conforme post)."""
        return self.box(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
                        (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)), m)

    def cyl(self, c, r, h, m, seg=12, r2=None, rx=0.0, ry=0.0, rz=0.0):
        M = (self.post @ self._M(c) @ Matrix.Rotation(rz, 4, 'Z') @
             Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X'))
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg,
                                    radius1=r, radius2=(r if r2 is None else r2), depth=h, matrix=M)
        return self._assign(res['verts'], m)

    def sphere(self, c, r, m, sub=1, sz=1.0):
        M = self.post @ self._M(c) @ Matrix.Diagonal((1, 1, sz, 1))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=r, matrix=M)
        return self._assign(res['verts'], m)

    def pipe(self, p0, p1, r, m, seg=8):
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        rot = d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()
        M = self.post @ self._M((p0 + p1) / 2) @ rot
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg,
                                    radius1=r, radius2=r, depth=d.length, matrix=M)
        return self._assign(res['verts'], m)

    def polypipe(self, pts, r, m, seg=8, elbow=None):
        for a, b in zip(pts[:-1], pts[1:]):
            self.pipe(a, b, r, m, seg)
        for p in pts[1:-1]:
            self.sphere(p, r * 1.18, elbow or m, sub=1)

    def poly(self, pts, m):
        vs = [self.bm.verts.new(self.post @ (Vector(p) - self.origin)) for p in pts]
        f = self.bm.faces.new(vs)
        f.material_index = self._mi(m)
        f.smooth = False
        return f

    def prism(self, base_pts, top_pts, m):
        """Sólido a partir de dois contornos com o mesmo número de pontos."""
        bv = [self.bm.verts.new(self.post @ (Vector(p) - self.origin)) for p in base_pts]
        tv = [self.bm.verts.new(self.post @ (Vector(p) - self.origin)) for p in top_pts]
        n = len(bv)
        faces = [self.bm.faces.new(list(reversed(bv))), self.bm.faces.new(tv)]
        for i in range(n):
            j = (i + 1) % n
            faces.append(self.bm.faces.new((bv[i], bv[j], tv[j], tv[i])))
        idx = self._mi(m)
        for f in faces:
            f.material_index = idx
            f.smooth = False
        return faces

    def mesh(self, name):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        return me

    def build(self, name, coll, bevel=None, props=None, loc=None):
        me = self.mesh(name)
        return make_obj(name, me, coll, self.origin if loc is None else loc, bevel=bevel, props=props)


def make_obj(name, data, coll, loc=(0, 0, 0), rot=None, bevel=None, props=None):
    o = bpy.data.objects.new(name, data)
    o.location = Vector(loc)
    if rot is not None:
        o.rotation_euler = rot
    coll.objects.link(o)
    if bevel:
        add_bevel(o, *bevel) if isinstance(bevel, tuple) else add_bevel(o, bevel)
    if props:
        for k, v in props.items():
            o[k] = v
    return o


def add_bevel(o, width=0.03, segments=2, angle=40):
    md = o.modifiers.new('Bevel', 'BEVEL')
    md.width = width
    md.segments = segments
    md.limit_method = 'ANGLE'
    md.angle_limit = math.radians(angle)
    md.use_clamp_overlap = True
    return md


def add_solidify(o, thickness, offset=-1.0):
    md = o.modifiers.new('Espessura', 'SOLIDIFY')
    md.thickness = thickness
    md.offset = offset
    md.use_even_offset = True
    return md


def text_mesh(name, body, size, coll, loc, rot, mat, extrude=0.004, align='CENTER'):
    """Texto convertido em malha (exportável). rot = Euler em radianos, embutida na malha."""
    cu = bpy.data.curves.new(name + '_tmp', 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = 'CENTER'
    cu.resolution_u = 3
    tmp = bpy.data.objects.new(name + '_tmp', cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.name = name
    me.transform(Euler(rot).to_matrix().to_4x4())
    me.materials.clear()
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = False
    return make_obj(name, me, coll, loc)


def empty(name, coll, loc, kind='PLAIN_AXES', size=0.5, props=None):
    o = bpy.data.objects.new(name, None)
    o.empty_display_type = kind
    o.empty_display_size = size
    o.location = Vector(loc)
    coll.objects.link(o)
    if props:
        for k, v in props.items():
            o[k] = v
    return o


def link_dup(name, mesh, coll, loc, rz=0.0, scale=1.0):
    o = bpy.data.objects.new(name, mesh)
    o.location = Vector(loc)
    o.rotation_euler = (0, 0, rz)
    o.scale = (scale, scale, scale)
    coll.objects.link(o)
    return o
