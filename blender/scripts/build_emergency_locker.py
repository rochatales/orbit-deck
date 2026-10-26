"""
build_emergency_locker.py
Procedural low-poly build of the "emergency supply locker" map prop
(orange 应急物资 cabinet on a rubble tile). Target: < 5k triangles.

Gameplay contract (node / material names the runtime relies on):
  EmergencyLocker            root empty (origin = bottom centre of the tile)
    Base                     tile + rubble + bricks + street sign (static)
    Cabinet                  empty, slight tilt
      Cabinet_Body           shell, trims, bolts, hazard stripes, labels
      Cabinet_Interior       dark liner + shelves + beacon lamp
      DoorPivot              empty on the hinge (rotation Z opens the door)
        Door
      Loot                   supply case; hide it once collected
      GlowLightAnchor        empty where the runtime may add a point light
  Materials Glow_Interior / Glow_Lamp / Glow_Loot carry the cyan emissive.
  Action "Door_Open": DoorPivot rotation from ajar (frame 1) to open (frame 24).

States:
  active  door ajar, glow on, loot visible   (item available)
  empty   door open, glow off, loot hidden   (item collected)

Usage:
  Blender MCP / Scripting tab:
      exec(open("<repo>/blender/scripts/build_emergency_locker.py").read())
  Headless (Blender binary or the `bpy` pip module):
      blender -b -P blender/scripts/build_emergency_locker.py -- --export --render
      python  blender/scripts/build_emergency_locker.py --export --render
  Inside the UI the build happens in its own scene ("EmergencyLocker") so the
  open file is left untouched.
"""
import bpy
import bmesh
import math
import os
import random
import sys
from contextlib import contextmanager
from mathutils import Matrix, Vector, Euler

try:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
except NameError:  # exec() from Blender MCP has no __file__
    PROJECT_ROOT = os.environ.get("ORBIT_DECK_ROOT", "/Users/rochatales/Automations/game-workplace")

OUTPUT_GLB = os.path.join(PROJECT_ROOT, "src/assets/props/emergency-locker.glb")
OUTPUT_BLEND = os.path.join(PROJECT_ROOT, "blender/props/emergency_locker.blend")
PREVIEW_DIR = os.path.join(PROJECT_ROOT, "blender/props")

SCENE_NAME = "EmergencyLocker"
TRI_BUDGET = 5000

DOOR_AJAR_DEG = 62.0
DOOR_OPEN_DEG = 108.0

# Fonts tried in order for the CJK labels (labels are skipped if none exist).
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/simhei.ttf",
]

# name: (hex, roughness, metalness, emission hex, emission strength)
MATERIALS = {
    "Paint_Orange":   ("#D9662B", 0.82, 0.10, None, 0.0),
    "Paint_OrangeDk": ("#9E4320", 0.88, 0.10, None, 0.0),
    "Paint_Yellow":   ("#E8B53A", 0.78, 0.10, None, 0.0),
    "Stripe_Black":   ("#1E1E22", 0.85, 0.05, None, 0.0),
    "Label_Cream":    ("#F2DDB8", 0.90, 0.00, None, 0.0),
    "Metal_Dark":     ("#3A3F47", 0.55, 0.40, None, 0.0),
    "Metal_Light":    ("#AEB6BF", 0.40, 0.60, None, 0.0),
    "Door_Inner":     ("#6E737A", 0.75, 0.20, None, 0.0),
    "Interior_Dark":  ("#1C2129", 0.90, 0.10, None, 0.0),
    "Glow_Interior":  ("#1C2129", 0.80, 0.00, "#3FE0FF", 3.0),
    "Glow_Lamp":      ("#7FEFFF", 0.25, 0.00, "#4FE8FF", 6.0),
    "Glow_Loot":      ("#7FEFFF", 0.30, 0.00, "#4FE8FF", 3.0),
    "Concrete":       ("#8C8E8F", 0.95, 0.00, None, 0.0),
    "Concrete_Dark":  ("#5E6163", 0.95, 0.00, None, 0.0),
    "Crack":          ("#2A2B2D", 0.95, 0.00, None, 0.0),
    "Dirt":           ("#5A3E2E", 0.95, 0.00, None, 0.0),
    "Brick":          ("#A9482F", 0.92, 0.00, None, 0.0),
    "Rebar":          ("#4A4644", 0.70, 0.50, None, 0.0),
    "Sign_Blue":      ("#3E5F8A", 0.70, 0.20, None, 0.0),
    "Sign_White":     ("#E6EAEE", 0.80, 0.10, None, 0.0),
}
GLOW_MATERIALS = ("Glow_Interior", "Glow_Lamp", "Glow_Loot")


# --------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------

def _lin(hex_color):
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def build_materials():
    mats = {}
    for name, (col, rough, metal, emi, strength) in MATERIALS.items():
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = _lin(col)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metal
        if emi:
            bsdf.inputs["Emission Color"].default_value = _lin(emi)
            bsdf.inputs["Emission Strength"].default_value = strength
        else:
            bsdf.inputs["Emission Strength"].default_value = 0.0
        m.diffuse_color = _lin(col)
        mats[name] = m
    return mats


# --------------------------------------------------------------------------
# Mesh builder: accumulates primitives into one bmesh with material slots
# --------------------------------------------------------------------------

class Builder:
    def __init__(self, name, mats):
        self.name = name
        self.mats = mats
        self.slots = []
        self.bm = bmesh.new()
        self.stack = [Matrix.Identity(4)]

    @contextmanager
    def frame(self, matrix):
        self.stack.append(self.stack[-1] @ matrix)
        try:
            yield
        finally:
            self.stack.pop()

    def _slot(self, mat_name):
        if mat_name not in self.slots:
            self.slots.append(mat_name)
        return self.slots.index(mat_name)

    def _tag(self, verts, mat_name):
        idx = self._slot(mat_name)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = idx
        return faces

    def box(self, size, loc, mat, rot=(0, 0, 0), bevel=0.0):
        m = self.stack[-1] @ trs(loc, rot, size)
        verts = bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)["verts"]
        if bevel > 0:
            edges = list({e for v in verts for e in v.link_edges})
            res = bmesh.ops.bevel(self.bm, geom=verts + edges, offset=bevel,
                                  segments=1, affect="EDGES", profile=0.5)
            verts = list(set(verts) | set(res.get("verts", [])))
            verts = [v for v in verts if v.is_valid]
            verts = list({v2 for v in verts for f in v.link_faces for v2 in f.verts})
        self._tag(verts, mat)
        return verts

    def cyl(self, radius, depth, loc, mat, rot=(0, 0, 0), seg=8, radius2=None):
        m = self.stack[-1] @ trs(loc, rot, (1, 1, 1))
        verts = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg,
                                      radius1=radius, radius2=radius if radius2 is None else radius2,
                                      depth=depth, matrix=m)["verts"]
        self._tag(verts, mat)
        return verts

    def rod(self, points, radius, mat, seg=5):
        for a, b in zip(points[:-1], points[1:]):
            a, b = Vector(a), Vector(b)
            d = b - a
            q = Vector((0, 0, 1)).rotation_difference(d.normalized())
            m = self.stack[-1] @ Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
            verts = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg,
                                          radius1=radius, radius2=radius,
                                          depth=d.length + radius, matrix=m)["verts"]
            self._tag(verts, mat)

    def rock(self, radius, loc, mat, squash=0.6, subdiv=1, rng=None, rot_z=0.0):
        rng = rng or random
        m = self.stack[-1] @ trs(loc, (0, 0, rot_z), (1, 1, squash))
        verts = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius,
                                           matrix=Matrix.Identity(4))["verts"]
        for v in verts:
            v.co *= 0.82 + rng.random() * 0.3
            v.co = m @ v.co
        self._tag(verts, mat)

    def poly(self, pts, mat):
        """Flat polygon from world-in-frame points (counter-clockwise seen from its front)."""
        m = self.stack[-1]
        verts = [self.bm.verts.new(m @ Vector(p)) for p in pts]
        self.bm.faces.new(verts)
        self._tag(verts, mat)

    def mesh(self, src_bm, matrix, mat):
        m = self.stack[-1] @ matrix
        lut = {v: self.bm.verts.new(m @ v.co) for v in src_bm.verts}
        idx = self._slot(mat)
        for f in src_bm.faces:
            nf = self.bm.faces.new([lut[v] for v in f.verts])
            nf.material_index = idx

    def finish(self, parent=None, collection=None):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me)
        self.bm.free()
        for s in self.slots:
            me.materials.append(self.mats[s])
        for p in me.polygons:
            p.use_smooth = False
        obj = bpy.data.objects.new(self.name, me)
        (collection or bpy.context.scene.collection).objects.link(obj)
        obj.parent = parent
        return obj


def trs(loc, rot_deg, scale):
    r = Euler([math.radians(a) for a in rot_deg], "XYZ").to_matrix().to_4x4()
    s = Matrix.Diagonal((*scale, 1.0))
    return Matrix.Translation(loc) @ r @ s


def new_empty(name, loc=(0, 0, 0), rot_deg=(0, 0, 0), parent=None, collection=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.2
    e.location = loc
    e.rotation_euler = [math.radians(a) for a in rot_deg]
    e.parent = parent
    (collection or bpy.context.scene.collection).objects.link(e)
    return e


# --------------------------------------------------------------------------
# Details
# --------------------------------------------------------------------------

def clip_poly(poly, x0, x1, z0, z1):
    """Sutherland-Hodgman clip of a 2D polygon (x, z) against a rectangle."""
    def clip(pts, inside, inter):
        out = []
        for i, cur in enumerate(pts):
            prev = pts[i - 1]
            if inside(cur):
                if not inside(prev):
                    out.append(inter(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(inter(prev, cur))
        return out

    def ix(xc):
        return lambda a, b: (xc, a[1] + (b[1] - a[1]) * (xc - a[0]) / (b[0] - a[0]))

    def iz(zc):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (zc - a[1]) / (b[1] - a[1]), zc)

    pts = poly
    for inside, inter in ((lambda p: p[0] >= x0, ix(x0)), (lambda p: p[0] <= x1, ix(x1)),
                          (lambda p: p[1] >= z0, iz(z0)), (lambda p: p[1] <= z1, iz(z1))):
        if not pts:
            break
        pts = clip(pts, inside, inter)
    return pts


def hazard_stripes(b, x0, x1, z0, z1, y, width=0.05, gap=0.05, slant=1.0):
    """Black diagonal stripes on a plane facing -Y at depth y."""
    h = z1 - z0
    x = x0 - h * slant
    while x < x1:
        para = [(x, z0), (x + width, z0), (x + width + h * slant, z1), (x + h * slant, z1)]
        pts = clip_poly(para, x0, x1, z0, z1)
        if len(pts) >= 3:
            b.poly([(px, y, pz) for px, pz in pts], "Stripe_Black")
        x += width + gap


def load_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return bpy.data.fonts.load(path, check_existing=True)
            except RuntimeError:
                continue
    print("[emergency_locker] no CJK font found, labels skipped")
    return None


def text_bmesh(font, body, size):
    """Flat filled text mesh in the XY plane, centred on the origin."""
    cu = bpy.data.curves.new("tmp_text", "FONT")
    cu.body = body
    cu.font = font
    cu.size = size
    cu.resolution_u = 1
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.fill_mode = "BOTH"
    ob = bpy.data.objects.new("tmp_text", cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    bm = bmesh.new()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1), verts=bm.verts, edges=bm.edges)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    return bm


def label(b, font, body, size, loc, mat, rot=(90, 0, 0)):
    """Text decal; default rotation turns +Z facing text into a -Y facing decal."""
    if font is None:
        return
    bm = text_bmesh(font, body, size)
    b.mesh(bm, trs(loc, rot, (1, 1, 1)), mat)
    bm.free()


def bolt(b, loc, rot=(90, 0, 0)):
    b.cyl(0.022, 0.024, loc, "Metal_Dark", rot=rot, seg=6)


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

# Cabinet dimensions (cabinet local space: origin bottom centre, front = -Y)
W, D, H, T, ZB = 0.90, 0.62, 1.80, 0.05, 0.08
FW = 0.36              # fixed front-left panel width
DW = W - FW            # door width
DT = 0.045             # door thickness
DZ0, DZ1 = ZB + 0.02, H - 0.27
SHELVES = (0.68, 1.22)

TILE = 1.70
TILE_TOP = 0.20


def build_base(mats, root, coll, font):
    rng = random.Random(7)
    b = Builder("Base", mats)
    # tile: dirt block + concrete slab
    b.box((TILE, TILE, 0.14), (0, 0, 0.07), "Dirt", bevel=0.01)
    b.box((TILE - 0.02, TILE - 0.02, 0.06), (0, 0, 0.17), "Concrete", bevel=0.015)
    # painted kerb line (white road mark like the reference)
    b.box((0.55, 0.06, 0.004), (0.45, -0.70, TILE_TOP + 0.002), "Sign_White", rot=(0, 0, -8))
    # cracked slab chunks around the foot of the cabinet
    chunks = [((0.40, 0.32), (-0.20, -0.52), 6, (3, -2)), ((0.34, 0.28), (0.22, -0.55), -12, (-4, 3)),
              ((0.30, 0.26), (0.10, -0.25 - 0.55), 20, (2, 4)), ((0.28, 0.30), (0.62, -0.30), 8, (-3, -5)),
              ((0.26, 0.22), (-0.62, 0.10), -5, (5, 2)), ((0.32, 0.24), (0.55, 0.40), 15, (-2, 3))]
    for (sx, sy), (x, y), rz, (rx, ry) in chunks:
        b.box((sx, sy, 0.05), (x, y, TILE_TOP + 0.02), "Concrete_Dark" if rng.random() < 0.4 else "Concrete",
              rot=(rx, ry, rz), bevel=0.012)
    # cracks
    for (x, y, l, rz) in [(-0.05, -0.38, 0.45, 35), (0.35, -0.62, 0.35, -50), (-0.55, -0.45, 0.3, 80),
                          (0.68, 0.05, 0.4, 10), (-0.3, -0.75, 0.25, -20)]:
        b.box((l, 0.018, 0.006), (x, y, TILE_TOP + 0.003), "Crack", rot=(0, 0, rz))
    # rubble rocks (front, where the light spills in the reference)
    rocks = [(0.17, (-0.02, -0.62), 1), (0.13, (0.30, -0.70), 1), (0.15, (-0.30, -0.70), 1),
             (0.11, (0.12, -0.42), 1), (0.12, (0.52, -0.55), 1), (0.10, (-0.62, -0.25), 1),
             (0.07, (0.15, -0.78), 0), (0.06, (-0.12, -0.80), 0), (0.05, (0.42, -0.35), 0),
             (0.06, (0.70, -0.70), 0), (0.05, (-0.48, -0.60), 0), (0.05, (0.62, 0.15), 0),
             (0.06, (-0.70, 0.45), 0), (0.04, (0.05, -0.30), 0), (0.05, (0.75, -0.40), 0)]
    for r, (x, y), sub in rocks:
        b.rock(r, (x, y, TILE_TOP + r * 0.25), "Concrete" if rng.random() < 0.6 else "Concrete_Dark",
               squash=0.55, subdiv=sub, rng=rng, rot_z=rng.uniform(0, 360))
    # bricks: small stack back-right + strays
    bricks = [((0.58, 0.05, 0.035), (0, 0, 10)), ((0.62, -0.02, 0.10), (0, 0, -6)),
              ((0.60, 0.22, 0.035), (0, 0, 80)), ((0.70, 0.25, 0.10), (12, 0, 70)),
              ((0.68, -0.18, 0.035), (0, 8, 30)), ((-0.50, -0.38, 0.035), (0, 0, 25)),
              ((0.25, -0.30, 0.04), (0, 15, -40)), ((-0.72, -0.62, 0.035), (0, 0, 60))]
    for (x, y, z), rot in bricks:
        b.box((0.20, 0.095, 0.065), (x, y, TILE_TOP + z), "Brick", rot=rot, bevel=0.008)
    # rebar sticking out of the slab
    b.rod([(-0.55, 0.42, 0.15), (-0.58, 0.40, 0.62), (-0.70, 0.30, 0.78)], 0.013, "Rebar")
    b.rod([(-0.45, 0.50, 0.15), (-0.40, 0.48, 0.70), (-0.30, 0.45, 0.80)], 0.013, "Rebar")
    b.rod([(-0.72, 0.20, 0.25), (-0.80, 0.10, 0.48)], 0.012, "Rebar")
    b.rod([(0.62, 0.58, 0.15), (0.66, 0.55, 0.55), (0.60, 0.48, 0.60)], 0.012, "Rebar")
    b.rod([(-0.60, -0.10, 0.22), (-0.76, -0.08, 0.30)], 0.010, "Rebar")
    # fallen street sign leaning on the rubble (上海路)
    sign = trs((-0.40, -0.52, 0.34), (-62, 0, 14), (1, 1, 1))
    with b.frame(sign):
        b.box((0.74, 0.020, 0.27), (0, 0.004, 0), "Sign_White", bevel=0.01)
        b.box((0.70, 0.024, 0.23), (0, 0, 0), "Sign_Blue", bevel=0.006)
        label(b, font, "上海路", 0.15, (0, -0.0125, 0), "Sign_White")
        b.rod([(0.28, 0.02, -0.10), (0.28, 0.02, -0.45)], 0.018, "Metal_Dark", seg=6)
    return b.finish(parent=root, collection=coll)


def build_cabinet_body(mats, parent, coll, font):
    b = Builder("Cabinet_Body", mats)
    zc, hz = ZB + (H - ZB) / 2, H - ZB
    # plinth + shell
    b.box((W - 0.04, D - 0.04, ZB + 0.02), (0, 0, (ZB + 0.02) / 2), "Metal_Dark", bevel=0.01)
    b.box((W, T, hz), (0, D / 2 - T / 2, zc), "Paint_Orange", bevel=0.012)
    b.box((T, D, hz), (-W / 2 + T / 2, 0, zc), "Paint_Orange", bevel=0.012)
    b.box((T, D, hz), (W / 2 - T / 2, 0, zc), "Paint_Orange", bevel=0.012)
    b.box((W, D, T), (0, 0, ZB + T / 2), "Paint_Orange")
    b.box((FW, T, hz), (-W / 2 + FW / 2, -D / 2 + T / 2, zc), "Paint_Orange", bevel=0.012)
    # door frame lip on the opening (dark edge reads as depth)
    b.box((0.03, 0.02, DZ1 - DZ0), (-W / 2 + FW + 0.015, -D / 2 + 0.01, (DZ0 + DZ1) / 2), "Paint_OrangeDk")
    # weathered lower skirt
    b.box((W + 0.012, D + 0.012, 0.10), (0, 0, ZB + 0.05), "Paint_OrangeDk", bevel=0.01)
    # top: yellow band + orange cap slab
    b.box((W + 0.06, D + 0.06, 0.22), (0, 0, H - 0.15), "Paint_Yellow", bevel=0.02)
    b.box((W + 0.10, D + 0.10, 0.10), (0, 0, H + 0.01), "Paint_Orange", bevel=0.03)
    b.box((W - 0.2, D - 0.2, 0.03), (0.04, 0.02, H + 0.07), "Paint_OrangeDk", rot=(0, 0, 4), bevel=0.01)
    yf = -(D + 0.06) / 2 - 0.006
    for x in (-W / 2 + 0.03, -0.05, W / 2 - 0.03):
        bolt(b, (x, yf, H - 0.15))
    xs = W / 2 + 0.036
    for y in (-D / 2 + 0.04, D / 2 - 0.04):
        bolt(b, (xs, y, H - 0.15), rot=(0, 90, 0))
    # label "应急物资 / 应急" on the fixed panel
    px = -W / 2 + FW / 2
    yfront = -D / 2 - 0.002
    label(b, font, "应急物资", 0.075, (px, yfront, 1.44), "Label_Cream")
    b.box((FW - 0.08, 0.004, 0.012), (px, yfront, 1.385), "Label_Cream")
    label(b, font, "应急", 0.13, (px, yfront, 1.27), "Label_Cream")
    # hazard band on the fixed panel
    bz0, bz1 = 0.80, 1.04
    b.box((FW + 0.02, 0.024, bz1 - bz0), (px, -D / 2 - 0.012, (bz0 + bz1) / 2), "Paint_Yellow", bevel=0.008)
    hazard_stripes(b, -W / 2 + 0.03, -W / 2 + FW - 0.03, bz0 + 0.03, bz1 - 0.03, -D / 2 - 0.0255,
                   width=0.045, gap=0.045)
    for x in (-W / 2 + 0.035, -W / 2 + FW - 0.035):
        for z in (bz0 - 0.04, bz1 + 0.04):
            bolt(b, (x, -D / 2 - 0.006, z))
    # side hazard plate + bolts on the right wall (visible from the iso camera)
    b.box((0.02, D - 0.16, 0.20), (W / 2 + 0.01, 0, 0.92), "Paint_Yellow", bevel=0.006)
    with b.frame(trs((W / 2 + 0.0205, 0, 0), (0, 0, 90), (1, 1, 1))):
        hazard_stripes(b, -(D - 0.20) / 2, (D - 0.20) / 2, 0.85, 0.99, 0, width=0.04, gap=0.04)
    # hinges on the right edge
    for z in (DZ0 + 0.25, DZ1 - 0.25):
        b.cyl(0.022, 0.12, (W / 2 + 0.005, -D / 2 - 0.02, z), "Metal_Dark", seg=6)
    return b.finish(parent=parent, collection=coll)


def build_cabinet_interior(mats, parent, coll):
    b = Builder("Cabinet_Interior", mats)
    zi0, zi1 = ZB + T, H - T
    zc, hz = (zi0 + zi1) / 2, zi1 - zi0
    iw, idp = W - 2 * T, D - 2 * T
    # liners (inner faces)
    b.box((iw, 0.006, hz), (0, D / 2 - T - 0.003, zc), "Glow_Interior")
    b.box((0.006, D - T, hz), (-W / 2 + T + 0.003, -T / 2 + 0.001, zc), "Interior_Dark")
    b.box((0.006, D - T, hz), (W / 2 - T - 0.003, -T / 2 + 0.001, zc), "Interior_Dark")
    b.box((iw, D - T, 0.006), (0, -T / 2, zi0 + 0.003), "Interior_Dark")
    b.box((iw, D - T, 0.006), (0, -T / 2, zi1 - 0.003), "Interior_Dark")
    b.box((FW - T, 0.006, hz), (-W / 2 + T + (FW - T) / 2, -D / 2 + T + 0.003, zc), "Interior_Dark")
    # shelves with front lip
    for z in SHELVES:
        b.box((iw - 0.012, idp + 0.02, 0.025), (0, -0.01, z), "Metal_Dark")
        b.box((iw - 0.012, 0.02, 0.05), (0, -D / 2 + T - 0.005, z + 0.012), "Metal_Dark")
    # beacon lamp on the top shelf
    lx, ly, lz = 0.0, 0.02, SHELVES[1] + 0.0125
    b.cyl(0.075, 0.04, (lx, ly, lz + 0.02), "Metal_Dark", seg=10)
    b.cyl(0.058, 0.085, (lx, ly, lz + 0.082), "Glow_Lamp", seg=10, radius2=0.04)
    b.cyl(0.04, 0.02, (lx, ly, lz + 0.135), "Glow_Lamp", seg=10, radius2=0.02)
    for a in (0, 90):
        b.box((0.13, 0.008, 0.008), (lx, ly, lz + 0.09), "Metal_Dark", rot=(0, 0, a + 45))
    # interior light strip under the top
    b.box((iw - 0.1, 0.04, 0.012), (0, D / 2 - T - 0.08, zi1 - 0.012), "Glow_Lamp")
    return b.finish(parent=parent, collection=coll)


def build_door(mats, pivot, coll):
    b = Builder("Door", mats)
    zc, hz = (DZ0 + DZ1) / 2, DZ1 - DZ0
    # door local space: hinge at origin, door extends to -X, front face at y = -DT
    b.box((DW, DT, hz), (-DW / 2, -DT / 2, zc), "Paint_Orange", bevel=0.012)
    b.box((DW - 0.06, 0.004, hz - 0.06), (-DW / 2, 0.002, zc), "Door_Inner")
    b.box((DW - 0.14, 0.01, 0.03), (-DW / 2, 0.006, zc - 0.25), "Metal_Dark")
    b.box((DW - 0.14, 0.01, 0.03), (-DW / 2, 0.006, zc + 0.25), "Metal_Dark")
    yf = -DT
    # vents (top + bottom)
    for vz in (DZ1 - 0.17, DZ0 + 0.18):
        b.box((0.26, 0.014, 0.15), (-DW / 2 + 0.03, yf - 0.007, vz), "Metal_Dark", bevel=0.005)
        for i in range(3):
            b.box((0.22, 0.012, 0.018), (-DW / 2 + 0.03, yf - 0.016, vz - 0.045 + i * 0.045), "Metal_Light")
    # hazard band
    hz0, hz1 = 0.66, 0.86
    b.box((DW - 0.10, 0.016, hz1 - hz0), (-DW / 2 + 0.01, yf - 0.008, (hz0 + hz1) / 2), "Paint_Yellow", bevel=0.006)
    hazard_stripes(b, -DW + 0.07, -0.05, hz0 + 0.025, hz1 - 0.025, yf - 0.0165, width=0.04, gap=0.04)
    # biohazard-style emblem (simple ring + hub)
    b.cyl(0.075, 0.008, (-DW / 2 + 0.03, yf - 0.004, 1.22), "Paint_OrangeDk", rot=(90, 0, 0), seg=12)
    b.cyl(0.03, 0.012, (-DW / 2 + 0.03, yf - 0.006, 1.22), "Paint_Yellow", rot=(90, 0, 0), seg=8)
    # handle on the free edge
    hx = -DW + 0.07
    b.box((0.025, 0.05, 0.025), (hx, yf - 0.025, 0.80), "Metal_Light")
    b.box((0.025, 0.05, 0.025), (hx, yf - 0.025, 1.08), "Metal_Light")
    b.box((0.03, 0.025, 0.32), (hx, yf - 0.055, 0.94), "Metal_Light", bevel=0.006)
    # lock latch
    b.box((0.05, 0.02, 0.07), (hx, yf - 0.01, 1.16), "Metal_Dark")
    obj = b.finish(parent=pivot, collection=coll)
    return obj


def build_loot(mats, parent, coll):
    """Supply case resting on the middle shelf (the collectible)."""
    b = Builder("Loot", mats)
    with b.frame(trs((-0.01, -0.02, SHELVES[0] + 0.0125), (0, -8, -12), (1, 1, 1))):
        sx, sy, sz = 0.34, 0.16, 0.42
        b.box((sx, sy, sz), (0, 0, sz / 2 + 0.02), "Metal_Light", bevel=0.015)
        b.box((sx + 0.01, sy + 0.01, 0.05), (0, 0, sz * 0.55), "Paint_Yellow")
        b.box((0.012, sy + 0.004, sz * 0.7), (-sx / 4, 0, sz / 2 + 0.02), "Glow_Loot")
        b.box((0.012, sy + 0.004, sz * 0.7), (sx / 4, 0, sz / 2 + 0.02), "Glow_Loot")
        b.box((0.12, 0.03, 0.025), (0, 0, sz + 0.045), "Metal_Dark")
    return b.finish(parent=parent, collection=coll)


def door_action(pivot):
    pivot.rotation_mode = "XYZ"
    pivot.rotation_euler = (0, 0, math.radians(DOOR_AJAR_DEG))
    pivot.keyframe_insert("rotation_euler", index=2, frame=1)
    pivot.rotation_euler = (0, 0, math.radians(DOOR_OPEN_DEG))
    pivot.keyframe_insert("rotation_euler", index=2, frame=24)
    act = pivot.animation_data.action
    act.name = "Door_Open"
    pivot.rotation_euler = (0, 0, math.radians(DOOR_AJAR_DEG))
    return act


def prepare_scene():
    if bpy.app.background and bpy.context.window is None:
        scene = bpy.context.scene
        for ob in list(scene.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        scene.name = SCENE_NAME
    else:
        old = bpy.data.scenes.get(SCENE_NAME)
        if old:
            for ob in list(old.objects):
                bpy.data.objects.remove(ob, do_unlink=True)
            bpy.data.scenes.remove(old)
        scene = bpy.data.scenes.new(SCENE_NAME)
        bpy.context.window.scene = scene
    scene.unit_settings.system = "METRIC"
    scene.frame_start, scene.frame_end = 1, 24
    return scene


def build():
    scene = prepare_scene()
    coll = scene.collection
    mats = build_materials()
    font = load_font()

    root = new_empty("EmergencyLocker", collection=coll)
    build_base(mats, root, coll, font)
    cabinet = new_empty("Cabinet", (0.0, 0.10, TILE_TOP - 0.03), (-1.0, -3.0, 25.0), root, coll)
    build_cabinet_body(mats, cabinet, coll, font)
    build_cabinet_interior(mats, cabinet, coll)
    pivot = new_empty("DoorPivot", (W / 2, -D / 2, 0), parent=cabinet, collection=coll)
    build_door(mats, pivot, coll)
    build_loot(mats, cabinet, coll)
    new_empty("GlowLightAnchor", (0.05, -0.22, 0.95), parent=cabinet, collection=coll)
    door_action(pivot)
    scene.frame_set(1)

    tris = count_triangles(scene)
    print(f"[emergency_locker] triangles: {tris} (budget {TRI_BUDGET})")
    if tris > TRI_BUDGET:
        print("[emergency_locker] WARNING: over triangle budget")
    return scene


def count_triangles(scene):
    total = 0
    for ob in scene.objects:
        if ob.type == "MESH":
            total += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return total


# --------------------------------------------------------------------------
# States, export, preview
# --------------------------------------------------------------------------

def set_state(state, scene=None):
    """'active' = item available (glow on, door ajar); 'empty' = collected."""
    scene = scene or bpy.context.scene
    active = state == "active"
    for name in GLOW_MATERIALS:
        bsdf = bpy.data.materials[name].node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Emission Strength"].default_value = MATERIALS[name][4] if active else 0.0
        if name != "Glow_Interior":
            col = MATERIALS[name][0] if active else "#2A3440"
            bsdf.inputs["Base Color"].default_value = _lin(col)
    scene.frame_set(1 if active else 24)
    loot = scene.objects["Loot"]
    loot.hide_render = loot.hide_viewport = not active
    light = scene.objects.get("Preview_GlowLight")
    if light:
        light.data.energy = 90.0 if active else 0.0


def export_glb(path=OUTPUT_GLB):
    set_state("active")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for ob in bpy.context.scene.objects:
        ob.hide_viewport = False
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_active_scene=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=False,
        export_materials="EXPORT",
    )
    print(f"[emergency_locker] exported {path} ({os.path.getsize(path) // 1024} KB)")


def setup_preview(scene):
    cam_data = bpy.data.cameras.new("Preview_Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2.9
    cam = bpy.data.objects.new("Preview_Cam", cam_data)
    scene.collection.objects.link(cam)
    target = Vector((0.0, 0.0, 0.85))
    direction = Vector((1.0, -1.0, 0.95)).normalized()
    cam.location = target + direction * 8
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    sun = bpy.data.objects.new("Preview_Sun", bpy.data.lights.new("Preview_Sun", "SUN"))
    sun.data.energy = 3.2
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    scene.collection.objects.link(sun)

    glow = bpy.data.objects.new("Preview_GlowLight", bpy.data.lights.new("Preview_GlowLight", "POINT"))
    glow.data.color = (0.35, 0.9, 1.0)
    glow.data.shadow_soft_size = 0.2
    glow.parent = scene.objects["GlowLightAnchor"]
    scene.collection.objects.link(glow)

    world = scene.world or bpy.data.worlds.new("Preview_World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = _lin("#262626")
    bg.inputs["Strength"].default_value = 1.6

    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX" if "AgX" in [
        i.identifier for i in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"


def render_previews():
    scene = bpy.context.scene
    setup_preview(scene)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    for state in ("active", "empty"):
        set_state(state)
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"_preview_emergency_locker_{state}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[emergency_locker] preview {scene.render.filepath}")
    set_state("active")
    for name in ("Preview_Cam", "Preview_Sun", "Preview_GlowLight"):
        ob = scene.objects.get(name)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)


def main(argv):
    build()
    if "--render" in argv:
        render_previews()
    if "--export" in argv:
        export_glb()
        os.makedirs(os.path.dirname(OUTPUT_BLEND), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND, copy=True)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    main(args)
