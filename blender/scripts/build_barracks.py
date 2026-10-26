"""
build_barracks.py
Procedural low-poly build of the colony barracks ("Quartel — Alojamento dos
Residentes"): a 12 m x 10 m pressurised module with rounded corners, ivory /
warm-grey shell, graphite baseboards, a west airlock door and a furnished
interior (3 two-tier bunks for 6 residents, 6 lockers, NE sanitation
compartment, west boot/helmet/environment entrance, south communal table).

Node contract (names the runtime relies on):
  Barracks                   root empty (origin = ground level, building centre)
    Ground                   martian soil plate (diorama base, optional)
    Building_Shell           plinth, walls, baseboards, windows, AC unit, ramp
    Building_Roof            roof + rooftop equipment -> hide it for the interior cutaway
    Building_Interior        floor, sanitation partitions, furniture
    EntranceDoor             sliding airlock door (action "Door_Open")
    Anchor_Entrance          empty just outside the west door (spawn / interact point)
    Anchor_Interior          empty in the middle of the room
  Emissive materials: Glow_Accent (cyan exterior markers), Glow_Warm (interior
  light strips), Glow_Screen (environment panel / tablet).

Axes (Blender): +X east, +Y north, +Z up. Door on the west (-X) facade,
windows on the south (-Y) and east (+X) facades.

Usage:
  Blender MCP / Scripting tab:
      exec(open("<repo>/blender/scripts/build_barracks.py").read())
  Headless (Blender binary or the `bpy` pip module):
      blender -b -P blender/scripts/build_barracks.py -- --export --render
      python  blender/scripts/build_barracks.py --export --render
"""
import bpy
import math
import os
import random
import sys
from mathutils import Vector

try:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
except NameError:  # exec() from Blender MCP has no __file__
    PROJECT_ROOT = os.environ.get("ORBIT_DECK_ROOT", "/Users/rochatales/Automations/game-workplace")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "blender/scripts"))
from build_emergency_locker import (  # noqa: E402
    Builder, trs, new_empty, count_triangles, _lin, load_font, label,
)

OUTPUT_GLB = os.path.join(PROJECT_ROOT, "src/assets/buildings/barracks.glb")
OUTPUT_BLEND = os.path.join(PROJECT_ROOT, "blender/buildings/barracks.blend")
PREVIEW_DIR = os.path.join(PROJECT_ROOT, "blender/buildings")

SCENE_NAME = "Barracks"
TRI_BUDGET = 15000

# name: (hex, roughness, metalness, emission hex, emission strength)
MATERIALS = {
    "Shell_Ivory":    ("#E6DDC6", 0.80, 0.05, None, 0.0),
    "Shell_Warm":     ("#C9BFA8", 0.85, 0.05, None, 0.0),
    "Graphite":       ("#3A3E44", 0.70, 0.30, None, 0.0),
    "Roof_Grey":      ("#8F8B82", 0.90, 0.05, None, 0.0),
    "Roof_Seam":      ("#6A665E", 0.90, 0.05, None, 0.0),
    "Concrete":       ("#8E8C86", 0.95, 0.00, None, 0.0),
    "Soil_Red":       ("#9C452C", 0.95, 0.00, None, 0.0),
    "Soil_Dark":      ("#6E3020", 0.95, 0.00, None, 0.0),
    "Glass":          ("#1F2C36", 0.15, 0.40, None, 0.0),
    "Metal_Dark":     ("#474D55", 0.50, 0.50, None, 0.0),
    "Metal_Light":    ("#A9B0B8", 0.40, 0.55, None, 0.0),
    "Floor_Grey":     ("#8B8E90", 0.85, 0.05, None, 0.0),
    "Floor_Dark":     ("#5F6367", 0.90, 0.05, None, 0.0),
    "Interior_Wall":  ("#EDE6D3", 0.88, 0.00, None, 0.0),
    "Mattress_Teal":  ("#4F8E89", 0.90, 0.00, None, 0.0),
    "Curtain_Teal":   ("#2E6A6E", 0.90, 0.00, None, 0.0),
    "Fabric_Light":   ("#E8E3D8", 0.90, 0.00, None, 0.0),
    "Locker_Grey":    ("#B4B9BE", 0.55, 0.40, None, 0.0),
    "Wood":           ("#8A6A4B", 0.80, 0.00, None, 0.0),
    "Sanitary_White": ("#EEF0EF", 0.35, 0.05, None, 0.0),
    "Glow_Accent":    ("#7FEFFF", 0.30, 0.00, "#4FE8FF", 4.0),
    "Glow_Warm":      ("#FFE2B8", 0.40, 0.00, "#FFC27A", 4.0),
    "Glow_Screen":    ("#7FEFFF", 0.20, 0.00, "#45D8FF", 2.5),
}

# Building dimensions (metres)
HX, HY = 6.0, 5.0          # outer half extents (12 x 10)
R = 1.3                    # outer corner radius
T = 0.25                   # wall thickness
FLOOR = 0.35               # interior floor level (top of plinth)
WALL_TOP = 3.2
ROOF_TOP = 3.62
CORNER_SEG = 5
IX, IY = HX - T, HY - T    # inner half extents

DOOR_W, DOOR_H = 1.3, 2.25
WIN_ZB, WIN_ZT = 1.75, 2.45

# Openings per facade: (u centre, width, z bottom, z top). u runs along the
# facade in its local frame (see side_frame()).
OPENINGS = {
    "S": [(-2.6, 1.7, WIN_ZB, WIN_ZT), (0.0, 1.7, WIN_ZB, WIN_ZT), (2.6, 1.7, WIN_ZB, WIN_ZT)],
    "E": [(-2.0, 1.4, WIN_ZB, WIN_ZT)],
    "N": [],
    "W": [(0.0, DOOR_W, FLOOR, FLOOR + DOOR_H)],
}


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
        bsdf.inputs["Emission Strength"].default_value = strength if emi else 0.0
        m.diffuse_color = _lin(col)
        mats[name] = m
    return mats


# --------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------

def face(b, pts, mat, hint):
    """Polygon whose normal is forced to agree with `hint` (frame-local)."""
    p = [Vector(v) for v in pts]
    n = Vector((0, 0, 0))
    for a, c in zip(p, p[1:] + p[:1]):
        n += Vector(((a.y - c.y) * (a.z + c.z), (a.z - c.z) * (a.x + c.x), (a.x - c.x) * (a.y + c.y)))
    if n.dot(Vector(hint)) < 0:
        p.reverse()
    b.poly([tuple(v) for v in p], mat)


def rrect(hx, hy, r, seg=CORNER_SEG):
    """Rounded rectangle outline, counter-clockwise from +Z."""
    pts = []
    for cx, cy, a0 in ((hx - r, -hy + r, -90), (hx - r, hy - r, 0), (-hx + r, hy - r, 90), (-hx + r, -hy + r, 180)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def loft(b, rings, mat_sides, mat_top=None, mat_bottom=None):
    """Stack of rounded-rect rings (hx, hy, r, z) joined by quads, optional caps."""
    loops = [[(x, y, z) for x, y in rrect(hx, hy, r)] for hx, hy, r, z in rings]
    for lo, hi in zip(loops, loops[1:]):
        n = len(lo)
        for k in range(n):
            a, c = lo[k], lo[(k + 1) % n]
            mid = Vector(((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0))
            face(b, [a, c, hi[(k + 1) % n], hi[k]], mat_sides, mid)
    if mat_top:
        face(b, loops[-1], mat_top, (0, 0, 1))
    if mat_bottom:
        face(b, loops[0], mat_bottom, (0, 0, -1))


SIDES = {
    # name: (origin, rotation about Z in degrees, straight length)
    "S": ((0, -HY, 0), 0, 2 * (HX - R)),
    "E": ((HX, 0, 0), 90, 2 * (HY - R)),
    "N": ((0, HY, 0), 180, 2 * (HX - R)),
    "W": ((-HX, 0, 0), 270, 2 * (HY - R)),
}
CORNERS = [((HX - R, -HY + R), -90), ((HX - R, HY - R), 0), ((-HX + R, HY - R), 90), ((-HX + R, -HY + R), 180)]


def side_frame(side):
    """Facade frame: local x = u along the wall, local +y = inward, z up."""
    origin, rot, _ = SIDES[side]
    return trs(origin, (0, 0, rot), (1, 1, 1))


def straight_band(b, side, v0, v1, z0, z1, mat, openings=()):
    """Straight part of a facade between depths v0..v1 (inward), cut by openings."""
    length = SIDES[side][2]
    ops = sorted(o for o in openings if o[2] < z1 and o[3] > z0)
    with b.frame(side_frame(side)):
        u = -length / 2
        for uc, w, zb, zt in ops:
            a, c = uc - w / 2, uc + w / 2
            if a > u:
                b.box((a - u, v1 - v0, z1 - z0), ((u + a) / 2, (v0 + v1) / 2, (z0 + z1) / 2), mat)
            if zb > z0:
                b.box((w, v1 - v0, zb - z0), (uc, (v0 + v1) / 2, (z0 + zb) / 2), mat)
            if zt < z1:
                b.box((w, v1 - v0, z1 - zt), (uc, (v0 + v1) / 2, (zt + z1) / 2), mat)
            u = c
        if u < length / 2:
            b.box((length / 2 - u, v1 - v0, z1 - z0), ((u + length / 2) / 2, (v0 + v1) / 2, (z0 + z1) / 2), mat)


def corner_band(b, v0, v1, z0, z1, mat, seg=CORNER_SEG):
    """Quarter-ring corner pieces between depths v0..v1 (inward from the outer skin)."""
    r_out, r_in = R - v0, R - v1
    for (cx, cy), a0 in CORNERS:
        for i in range(seg):
            t0, t1 = math.radians(a0 + 90 * i / seg), math.radians(a0 + 90 * (i + 1) / seg)

            def p(r, t, z):
                return (cx + r * math.cos(t), cy + r * math.sin(t), z)
            tm = (t0 + t1) / 2
            out = (math.cos(tm), math.sin(tm), 0)
            face(b, [p(r_out, t0, z0), p(r_out, t1, z0), p(r_out, t1, z1), p(r_out, t0, z1)], mat, out)
            face(b, [p(r_in, t0, z0), p(r_in, t1, z0), p(r_in, t1, z1), p(r_in, t0, z1)], mat,
                 (-out[0], -out[1], 0))
            face(b, [p(r_out, t0, z1), p(r_out, t1, z1), p(r_in, t1, z1), p(r_in, t0, z1)], mat, (0, 0, 1))
            face(b, [p(r_out, t0, z0), p(r_out, t1, z0), p(r_in, t1, z0), p(r_in, t0, z0)], mat, (0, 0, -1))


def ring_band(b, v0, v1, z0, z1, mat, cut=True):
    for side in SIDES:
        straight_band(b, side, v0, v1, z0, z1, mat, OPENINGS[side] if cut else ())
    corner_band(b, v0, v1, z0, z1, mat)


# --------------------------------------------------------------------------
# Exterior
# --------------------------------------------------------------------------

def build_ground(mats, root, coll):
    rng = random.Random(5)
    b = Builder("Ground", mats)
    b.box((17.0, 15.0, 0.2), (0, 0, -0.1), "Soil_Red", bevel=0.06)
    for _ in range(18):
        while True:
            x, y = rng.uniform(-8.2, 8.2), rng.uniform(-7.2, 7.2)
            if abs(x) > HX + 0.9 or abs(y) > HY + 0.9:
                break
        r = rng.uniform(0.06, 0.18)
        b.rock(r, (x, y, r * 0.2), "Soil_Dark", squash=0.5, subdiv=0, rng=rng, rot_z=rng.uniform(0, 360))
    return b.finish(parent=root, collection=coll)


def window(b, side, uc, w, zb, zt):
    h = zt - zb
    with b.frame(side_frame(side)):
        b.box((w, 0.03, h), (uc, T / 2, (zb + zt) / 2), "Glass")
        f = 0.08
        b.box((w + 2 * f, 0.12, f), (uc, -0.02, zt + f / 2), "Graphite")
        b.box((w + 2 * f, 0.12, f), (uc, -0.02, zb - f / 2), "Graphite")
        for s in (-1, 1):
            b.box((f, 0.12, h), (uc + s * (w / 2 + f / 2), -0.02, (zb + zt) / 2), "Graphite")
        b.box((w + 0.36, 0.32, 0.07), (uc, -0.16, zt + 0.16), "Graphite", bevel=0.015)
        b.box((w + 0.2, 0.16, 0.05), (uc, -0.07, zb - 0.1), "Shell_Warm")
        b.box((w + 0.1, 0.12, 0.04), (uc, T + 0.06, zb - 0.02), "Interior_Wall")
        # horizontal mullion, reads like the louvred windows of the concept
        b.box((w, 0.04, 0.035), (uc, T / 2 - 0.03, (zb + zt) / 2), "Graphite")


def build_shell(mats, root, coll):
    b = Builder("Building_Shell", mats)
    # plinth: concrete step with a chamfered top edge
    loft(b, [(HX + 0.45, HY + 0.45, R + 0.45, 0.0), (HX + 0.45, HY + 0.45, R + 0.45, 0.25),
             (HX + 0.32, HY + 0.32, R + 0.32, FLOOR)], "Concrete", mat_top="Concrete")
    # walls
    ring_band(b, 0.0, T, FLOOR, WALL_TOP, "Shell_Ivory")
    # graphite baseboard skin + warm-grey cornice band
    ring_band(b, -0.05, 0.0, FLOOR - 0.05, FLOOR + 0.6, "Graphite")
    ring_band(b, -0.03, 0.0, WALL_TOP - 0.28, WALL_TOP - 0.06, "Shell_Warm", cut=False)
    # dark wall-top cap (reads as the cut line when the roof is hidden)
    ring_band(b, 0.0, T, WALL_TOP, WALL_TOP + 0.02, "Graphite", cut=False)

    # vertical panel seams + cyan markers where the straight walls meet the corners
    seams = {"S": [-1.3, 1.3], "E": [0.6], "N": [-1.6, 1.6], "W": [-2.2, 2.2]}
    for side, (_, _, length) in SIDES.items():
        with b.frame(side_frame(side)):
            for u in [-length / 2, length / 2] + seams[side]:
                b.box((0.05, 0.03, WALL_TOP - FLOOR - 0.9), (u, -0.015, (FLOOR + 0.55 + WALL_TOP - 0.28) / 2),
                      "Graphite")
            for u in (-length / 2 + 0.25, length / 2 - 0.25):
                b.box((0.18, 0.03, 0.06), (u, -0.035, WALL_TOP - 0.45), "Glow_Accent")

    for side, ops in OPENINGS.items():
        for uc, w, zb, zt in ops:
            if side != "W":
                window(b, side, uc, w, zb, zt)

    # west airlock: jambs, deep hood, threshold, status light, side keypad
    with b.frame(side_frame("W")):
        zt = FLOOR + DOOR_H
        for s in (-1, 1):
            b.box((0.2, 0.14, DOOR_H + 0.1), (s * (DOOR_W / 2 + 0.1), -0.06, FLOOR + (DOOR_H + 0.1) / 2),
                  "Graphite", bevel=0.02)
        b.box((DOOR_W + 0.7, 0.5, 0.3), (0, -0.2, zt + 0.2), "Shell_Warm", bevel=0.06)
        b.box((DOOR_W + 0.74, 0.52, 0.06), (0, -0.2, zt + 0.06), "Graphite")
        b.box((0.5, 0.04, 0.06), (0, -0.46, zt + 0.22), "Glow_Accent")
        b.box((DOOR_W, T + 0.1, 0.03), (0, T / 2 - 0.02, FLOOR + 0.015), "Metal_Dark")
        b.box((0.22, 0.05, 0.32), (DOOR_W / 2 + 0.42, -0.03, FLOOR + 1.25), "Metal_Dark", bevel=0.01)
        b.box((0.12, 0.06, 0.08), (DOOR_W / 2 + 0.42, -0.04, FLOOR + 1.32), "Glow_Screen")
    # ramp down to the soil
    x0, x1, hw = -HX - 0.4, -HX - 2.0, 0.95
    A, B = (x0, -hw, FLOOR), (x0, hw, FLOOR)
    C, D = (x1, hw, 0.0), (x1, -hw, 0.0)
    face(b, [A, B, C, D], "Metal_Dark", (-1, 0, 4))
    face(b, [A, D, (x0, -hw, 0.0)], "Metal_Dark", (0, -1, 0))
    face(b, [B, C, (x0, hw, 0.0)], "Metal_Dark", (0, 1, 0))
    for i in range(5):
        t = (i + 0.5) / 5
        x, z = x0 + (x1 - x0) * t, FLOOR * (1 - t)
        b.box((0.06, 2 * hw - 0.2, 0.02), (x, 0, z + 0.012), "Graphite", rot=(0, -math.degrees(math.atan2(FLOOR, 1.6)), 0))
    for s in (-1, 1):
        b.box((1.65, 0.05, 0.05), ((x0 + x1) / 2, s * (hw - 0.03), FLOOR / 2 + 0.05), "Metal_Light",
              rot=(0, -math.degrees(math.atan2(FLOOR, 1.6)), 0))

    # small external air-recycling unit on the south facade (east end)
    with b.frame(side_frame("S")):
        b.box((0.95, 0.42, 0.75), (3.85, -0.26, FLOOR + 0.75), "Metal_Light", bevel=0.03)
        b.cyl(0.27, 0.03, (3.75, -0.48, FLOOR + 0.75), "Graphite", rot=(90, 0, 0), seg=14)
        b.cyl(0.07, 0.04, (3.75, -0.5, FLOOR + 0.75), "Metal_Dark", rot=(90, 0, 0), seg=8)
        for a in (0, 60, 120):
            b.box((0.46, 0.012, 0.05), (3.75, -0.5, FLOOR + 0.75), "Metal_Dark", rot=(0, a, 0))
        for k in range(4):
            b.box((0.12, 0.012, 0.025), (4.18, -0.475, FLOOR + 0.55 + k * 0.1), "Graphite")
        b.rod([(3.55, -0.1, FLOOR + 1.12), (3.55, -0.1, FLOOR + 1.6), (3.55, 0.0, FLOOR + 1.6)], 0.035, "Metal_Dark")
    return b.finish(parent=root, collection=coll)


def build_roof(mats, root, coll):
    b = Builder("Building_Roof", mats)
    e = 0.08
    loft(b, [(HX + e, HY + e, R + e, WALL_TOP + 0.02), (HX + e, HY + e, R + e, WALL_TOP + 0.12),
             (HX - 0.3, HY - 0.3, R - 0.3, ROOF_TOP)], "Shell_Ivory", mat_top="Roof_Grey",
         mat_bottom="Interior_Wall")
    # panel seams
    zt = ROOF_TOP + 0.01
    for x in (-1.9, 1.9):
        b.box((0.06, 2 * (HY - 0.45), 0.02), (x, 0, zt), "Roof_Seam")
    b.box((2 * (HX - 0.45), 0.06, 0.02), (0, 0, zt), "Roof_Seam")
    for x in (-4.0, 4.0):
        b.box((0.06, 2 * (HY - 1.4), 0.02), (x, 0, zt), "Roof_Seam")
    # HVAC box with top grille and side pipes
    hx, hy = 0.6, 0.9
    b.box((1.55, 1.15, 0.08), (hx, hy, ROOF_TOP + 0.04), "Graphite")
    b.box((1.4, 1.0, 0.5), (hx, hy, ROOF_TOP + 0.33), "Metal_Light", bevel=0.04)
    for k in range(6):
        b.box((1.15, 0.05, 0.02), (hx, hy - 0.35 + k * 0.14, ROOF_TOP + 0.585), "Graphite")
    for k in range(4):
        b.box((0.02, 0.012, 0.3), (hx - 0.45 + k * 0.12, hy - 0.505, ROOF_TOP + 0.33), "Graphite")
    for dy in (-0.25, 0.25):
        b.rod([(hx + 0.7, hy + dy, ROOF_TOP + 0.3), (hx + 1.05, hy + dy, ROOF_TOP + 0.3),
               (hx + 1.05, hy + dy, ROOF_TOP + 0.02)], 0.05, "Metal_Dark", seg=6)
    # vent stacks
    for (x, y, h) in ((-1.4, 2.6, 1.0), (-0.75, 2.95, 0.7)):
        b.cyl(0.16, 0.08, (x, y, ROOF_TOP + 0.04), "Graphite", seg=10)
        b.cyl(0.11, h, (x, y, ROOF_TOP + h / 2), "Metal_Light", seg=10)
        b.cyl(0.18, 0.07, (x, y, ROOF_TOP + h + 0.03), "Metal_Dark", seg=10)
        b.cyl(0.13, 0.06, (x, y, ROOF_TOP + h - 0.12), "Graphite", seg=10)
    # roof hatch
    b.box((0.9, 0.9, 0.12), (-3.2, -1.6, ROOF_TOP + 0.06), "Shell_Warm", bevel=0.03)
    b.box((0.7, 0.05, 0.03), (-3.2, -1.9, ROOF_TOP + 0.13), "Graphite")
    return b.finish(parent=root, collection=coll)


def build_door(mats, root, coll):
    b = Builder("EntranceDoor", mats)
    with b.frame(side_frame("W")):
        zc = FLOOR + DOOR_H / 2
        b.box((DOOR_W + 0.12, 0.08, DOOR_H + 0.05), (0, -0.18, zc), "Shell_Warm", bevel=0.02)
        b.box((DOOR_W - 0.2, 0.03, DOOR_H - 0.3), (0, -0.23, zc), "Shell_Ivory", bevel=0.01)
        b.box((0.32, 0.03, 0.55), (0, -0.25, FLOOR + 1.55), "Glass")
        b.box((0.06, 0.03, 0.9), (DOOR_W / 2 - 0.15, -0.24, zc), "Glow_Accent")
        b.box((0.05, 0.08, 0.3), (-DOOR_W / 2 + 0.12, -0.26, FLOOR + 1.05), "Metal_Dark")
        b.box((DOOR_W - 0.2, 0.03, 0.12), (0, -0.24, FLOOR + 0.3), "Graphite")
    return b.finish(parent=root, collection=coll)


# --------------------------------------------------------------------------
# Interior
# --------------------------------------------------------------------------

def bunk(b, x, y):
    """Two-tier bunk, long axis along Y, head against the north wall."""
    with b.frame(trs((x, y, FLOOR), (0, 0, 0), (1, 1, 1))):
        for sx in (-1, 1):
            for sy in (-1, 1):
                b.box((0.05, 0.05, 1.9), (sx * 0.45, sy * 0.97, 0.95), "Metal_Dark")
        for z in (0.38, 1.48):
            for sx in (-1, 1):
                b.box((0.04, 1.98, 0.07), (sx * 0.45, 0, z), "Metal_Dark")
            for sy in (-1, 1):
                b.box((0.9, 0.04, 0.07), (0, sy * 0.97, z), "Metal_Dark")
            b.box((0.86, 1.9, 0.03), (0, 0, z - 0.02), "Metal_Dark")
            b.box((0.84, 1.86, 0.14), (0, 0, z + 0.1), "Mattress_Teal", bevel=0.03)
            b.box((0.58, 0.3, 0.1), (0, 0.72, z + 0.22), "Fabric_Light", bevel=0.035)
            b.box((0.8, 0.42, 0.05), (0, -0.62, z + 0.19), "Curtain_Teal", bevel=0.01)
            b.box((0.6, 0.03, 0.025), (0, 0.3, z - 0.06), "Glow_Warm")
        # guard rails on the top bunk
        for sx in (-1, 1):
            b.box((0.03, 1.9, 0.03), (sx * 0.45, 0, 1.78), "Metal_Dark")
        for sy in (-1, 1):
            b.box((0.9, 0.03, 0.25), (0, sy * 0.97, 1.7), "Metal_Light")
        # ladder at the foot
        for lx in (0.1, 0.38):
            b.box((0.03, 0.03, 1.75), (lx, -1.0, 0.88), "Metal_Light")
        for k in range(4):
            b.box((0.3, 0.025, 0.025), (0.24, -1.0, 0.6 + k * 0.32), "Metal_Light")
        # retractable curtains on the aisle (east) side: folded panels + rods
        for z0, z1 in ((0.48, 1.38), (1.58, 2.12)):
            b.box((0.02, 1.98, 0.02), (0.5, 0, z1 + 0.03), "Metal_Light")
            for k, yy in enumerate((0.82, 0.62, 0.44, -0.62, -0.8)):
                b.box((0.03, 0.2, z1 - z0), (0.5 + (0.03 if k % 2 else 0), yy, (z0 + z1) / 2),
                      "Curtain_Teal", rot=(0, 0, 28 if k % 2 else -28))


def locker(b, x, y, w=0.56):
    with b.frame(trs((x, y, FLOOR), (0, 0, 0), (1, 1, 1))):
        b.box((w, 0.55, 1.95), (0, 0, 0.975), "Locker_Grey", bevel=0.015)
        b.box((w - 0.08, 0.01, 1.8), (0, -0.28, 0.98), "Metal_Light")
        for k in range(3):
            b.box((w - 0.24, 0.012, 0.02), (0, -0.287, 1.7 - k * 0.05), "Graphite")
        b.box((0.03, 0.03, 0.18), (w / 2 - 0.09, -0.3, 1.05), "Graphite")
        b.box((0.14, 0.012, 0.05), (0, -0.287, 1.85), "Fabric_Light")


def build_interior(mats, root, coll, font):
    rng = random.Random(3)
    b = Builder("Building_Interior", mats)
    # floor + tile seams
    face(b, [(x, y, FLOOR + 0.005) for x, y in rrect(IX, IY, R - T)], "Floor_Grey", (0, 0, 1))
    for x in (-4, -2, 0, 2, 4):
        b.box((0.03, 2 * IY - 0.1, 0.004), (x, 0, FLOOR + 0.007), "Floor_Dark")
    for y in (-2.4, 0, 2.4):
        b.box((2 * IX - 0.1, 0.03, 0.004), (0, y, FLOOR + 0.007), "Floor_Dark")

    # --- NE sanitation compartment
    px, py, pt = 2.4, 1.5, 0.12
    dz = FLOOR + 2.3
    zc = (FLOOR + WALL_TOP) / 2
    b.box((pt, IY - py, WALL_TOP - FLOOR), (px, (py + IY) / 2, zc), "Interior_Wall")
    d0, d1 = 3.0, 3.85
    b.box((d0 - px + pt / 2, pt, WALL_TOP - FLOOR), ((px - pt / 2 + d0) / 2, py, zc), "Interior_Wall")
    b.box((IX - d1, pt, WALL_TOP - FLOOR), ((d1 + IX) / 2, py, zc), "Interior_Wall")
    b.box((d1 - d0, pt, WALL_TOP - dz), ((d0 + d1) / 2, py, (dz + WALL_TOP) / 2), "Interior_Wall")
    b.box((d1 - d0 - 0.04, 0.05, dz - FLOOR - 0.02), ((d0 + d1) / 2, py - 0.02, (FLOOR + dz) / 2), "Locker_Grey")
    b.box((0.03, 0.03, 0.2), (d1 - 0.12, py - 0.07, FLOOR + 1.0), "Graphite")
    b.box((0.18, 0.02, 0.06), ((d0 + d1) / 2, py - 0.08, dz - 0.25), "Glow_Accent")
    label(b, font, "SANITÁRIO", 0.12, ((d0 + d1) / 2 - 0.0, py - 0.075, dz + 0.25), "Graphite")
    for k in range(2):  # partition tops (cut line)
        pass
    b.box((pt, IY - py, 0.02), (px, (py + IY) / 2, WALL_TOP + 0.01), "Graphite")
    b.box((IX - px, pt, 0.02), ((px + IX) / 2, py, WALL_TOP + 0.01), "Graphite")
    # toilet, sink + mirror, shower
    b.box((0.42, 0.55, 0.38), (4.2, IY - 0.32, FLOOR + 0.19), "Sanitary_White", bevel=0.05)
    b.box((0.42, 0.2, 0.45), (4.2, IY - 0.1, FLOOR + 0.6), "Sanitary_White", bevel=0.03)
    b.box((0.6, 0.42, 0.12), (3.0, IY - 0.21, FLOOR + 0.85), "Sanitary_White", bevel=0.03)
    b.box((0.05, 0.05, 0.85), (3.0, IY - 0.21, FLOOR + 0.42), "Metal_Light")
    b.box((0.5, 0.02, 0.6), (3.0, IY - 0.01, FLOOR + 1.55), "Glass")
    b.box((1.1, 1.05, 0.08), (IX - 0.58, py + 0.62, FLOOR + 0.04), "Sanitary_White")
    b.box((0.03, 1.0, 1.9), (IX - 1.12, py + 0.62, FLOOR + 1.05), "Glass")
    b.cyl(0.08, 0.04, (IX - 0.2, py + 0.62, FLOOR + 2.1), "Metal_Light", rot=(0, 90, 0), seg=8)
    b.box((0.9, 0.04, 0.03), (3.7, IY - 0.02, WALL_TOP - 0.3), "Glow_Warm")

    # --- north wall: 3 bunks (6 residents) + 6 lockers + posters + light strip
    by = IY - 1.05
    for x in (-4.35, -2.05, 0.25):
        bunk(b, x, by)
    for x in (-3.5, -2.92, -1.2, -0.62):
        locker(b, x, IY - 0.3)
    for x in (1.2, 1.8):
        locker(b, x, IY - 0.3, w=0.58)
    for x in (-3.2, -0.9, 1.5):
        b.box((0.55, 0.02, 0.4), (x, IY - 0.01, FLOOR + 2.35), "Graphite")
        b.box((0.45, 0.02, 0.3), (x, IY - 0.02, FLOOR + 2.35), "Fabric_Light" if x < 0 else "Mattress_Teal")
    b.box((7.0, 0.04, 0.04), (-1.9, IY - 0.02, WALL_TOP - 0.25), "Glow_Warm")

    # --- west entrance: decontamination mat, boot bench, helmet niches, environment panel
    b.box((1.2, 1.7, 0.02), (-IX + 0.65, 0, FLOOR + 0.01), "Floor_Dark")
    for k in range(7):
        b.box((1.1, 0.03, 0.006), (-IX + 0.65, -0.72 + k * 0.24, FLOOR + 0.022), "Graphite")
    bx, y0, y1 = -IX + 0.24, -2.75, -1.15
    yc, ly = (y0 + y1) / 2, y1 - y0
    b.box((0.44, ly, 0.06), (bx, yc, FLOOR + 0.45), "Wood", bevel=0.01)
    for yy in (y0 + 0.1, y1 - 0.1):
        b.box((0.4, 0.05, 0.42), (bx, yy, FLOOR + 0.21), "Metal_Dark")
    b.box((0.38, ly - 0.2, 0.03), (bx, yc, FLOOR + 0.12), "Metal_Dark")
    for k in range(4):
        b.box((0.22, 0.11, 0.1), (bx + 0.03, y0 + 0.3 + k * 0.33, FLOOR + 0.19), "Graphite", bevel=0.02)
    # helmet niche shelves
    sz0, sz1 = FLOOR + 1.45, FLOOR + 2.35
    b.box((0.36, ly, 0.04), (bx - 0.04, yc, sz0), "Locker_Grey")
    b.box((0.36, ly, 0.04), (bx - 0.04, yc, sz1), "Locker_Grey")
    b.box((0.36, ly, 0.03), (bx - 0.04, yc, (sz0 + sz1) / 2), "Locker_Grey")
    for k in range(4):
        b.box((0.36, 0.03, sz1 - sz0), (bx - 0.04, y0 + k * ly / 3, (sz0 + sz1) / 2), "Locker_Grey")
    for k in range(3):
        yy = y0 + (k + 0.5) * ly / 3
        b.rock(0.15, (bx - 0.02, yy, sz0 + 0.17), "Fabric_Light", squash=0.85, subdiv=1, rng=rng)
        b.box((0.04, 0.2, 0.09), (bx + 0.12, yy, sz0 + 0.18), "Glass")
    # environmental conditions panel (north of the door)
    b.box((0.08, 0.7, 0.95), (-IX + 0.04, 1.45, FLOOR + 1.6), "Metal_Dark", bevel=0.015)
    b.box((0.02, 0.56, 0.38), (-IX + 0.09, 1.45, FLOOR + 1.78), "Glow_Screen")
    for k in range(3):
        b.box((0.02, 0.08, 0.06), (-IX + 0.09, 1.25 + k * 0.2, FLOOR + 1.38), "Glow_Accent" if k == 0 else "Metal_Light")
    b.box((0.4, 0.6, 0.85), (-IX + 0.2, 1.45, FLOOR + 0.42), "Locker_Grey", bevel=0.02)
    b.box((0.04, 0.4, 0.03), (-IX + 0.02, 0.0, WALL_TOP - 0.3), "Glow_Warm")

    # --- south communal area: table + 2 fixed benches
    tx, ty = 0.8, -IY + 1.45
    b.box((3.2, 2.4, 0.01), (tx, ty, FLOOR + 0.009), "Floor_Dark")
    b.box((2.2, 0.9, 0.07), (tx, ty, FLOOR + 0.76), "Metal_Light", bevel=0.015)
    for dx in (-0.75, 0.75):
        b.box((0.12, 0.5, 0.72), (tx + dx, ty, FLOOR + 0.36), "Metal_Dark")
        b.box((0.5, 0.6, 0.03), (tx + dx, ty, FLOOR + 0.015), "Metal_Dark")
    for dy in (-0.78, 0.78):
        b.box((2.0, 0.38, 0.06), (tx, ty + dy, FLOOR + 0.45), "Wood", bevel=0.01)
        for dx in (-0.7, 0.7):
            b.box((0.1, 0.3, 0.42), (tx + dx, ty + dy, FLOOR + 0.21), "Metal_Dark")
    b.cyl(0.045, 0.1, (tx - 0.5, ty + 0.15, FLOOR + 0.845), "Mattress_Teal", seg=8)
    b.cyl(0.045, 0.1, (tx + 0.3, ty - 0.2, FLOOR + 0.845), "Fabric_Light", seg=8)
    b.box((0.3, 0.22, 0.015), (tx + 0.55, ty + 0.1, FLOOR + 0.8), "Graphite", rot=(0, 0, 12))
    b.box((0.26, 0.18, 0.006), (tx + 0.55, ty + 0.1, FLOOR + 0.81), "Glow_Screen", rot=(0, 0, 12))
    b.box((6.0, 0.04, 0.04), (0.0, -IY + 0.02, WALL_TOP - 0.25), "Glow_Warm")
    # storage cabinet under the east window
    b.box((1.2, 0.5, 0.9), (IX - 0.27, -2.0, FLOOR + 0.45), "Locker_Grey", rot=(0, 0, 90), bevel=0.02)
    return b.finish(parent=root, collection=coll)


# --------------------------------------------------------------------------
# Assembly, export, preview
# --------------------------------------------------------------------------

def door_action(door):
    door.location = (0, 0, 0)
    door.keyframe_insert("location", index=1, frame=1)
    door.location = (0, -(DOOR_W + 0.15), 0)  # slides south along the west facade
    door.keyframe_insert("location", index=1, frame=20)
    door.animation_data.action.name = "Door_Open"
    door.location = (0, 0, 0)


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
    scene.frame_start, scene.frame_end = 1, 20
    return scene


def build():
    scene = prepare_scene()
    coll = scene.collection
    mats = build_materials()
    font = load_font()
    root = new_empty("Barracks", collection=coll)
    build_ground(mats, root, coll)
    build_shell(mats, root, coll)
    build_roof(mats, root, coll)
    build_interior(mats, root, coll, font)
    door = build_door(mats, root, coll)
    door_action(door)
    new_empty("Anchor_Entrance", (-HX - 2.4, 0, 0), parent=root, collection=coll)
    new_empty("Anchor_Interior", (-1.0, -0.6, FLOOR), parent=root, collection=coll)
    scene.frame_set(1)
    tris = count_triangles(scene)
    print(f"[barracks] triangles: {tris} (budget {TRI_BUDGET})")
    for ob in scene.objects:
        if ob.type == "MESH":
            print(f"[barracks]   {ob.name}: {sum(len(p.vertices) - 2 for p in ob.data.polygons)}")
    if tris > TRI_BUDGET:
        print("[barracks] WARNING: over triangle budget")
    return scene


def set_view(scene, cutaway):
    roof = scene.objects["Building_Roof"]
    roof.hide_render = roof.hide_viewport = cutaway
    for name in ("Preview_Warm1", "Preview_Warm2"):
        ob = scene.objects.get(name)
        if ob:
            ob.data.energy = 900.0 if cutaway else 0.0


def export_glb(path=OUTPUT_GLB):
    scene = bpy.context.scene
    set_view(scene, False)
    scene.frame_set(1)
    os.makedirs(os.path.dirname(path), exist_ok=True)
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
    print(f"[barracks] exported {path} ({os.path.getsize(path) // 1024} KB)")


def setup_preview(scene):
    cam_data = bpy.data.cameras.new("Preview_Cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("Preview_Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    sun = bpy.data.objects.new("Preview_Sun", bpy.data.lights.new("Preview_Sun", "SUN"))
    sun.data.energy = 3.2
    sun.data.angle = math.radians(6)
    sun.rotation_euler = (math.radians(45), math.radians(-15), math.radians(-60))
    scene.collection.objects.link(sun)
    for name, loc in (("Preview_Warm1", (-2.0, 1.5, 2.6)), ("Preview_Warm2", (1.5, -2.5, 2.6))):
        lt = bpy.data.objects.new(name, bpy.data.lights.new(name, "POINT"))
        lt.data.color = (1.0, 0.82, 0.6)
        lt.data.shadow_soft_size = 1.0
        lt.location = loc
        scene.collection.objects.link(lt)

    world = scene.world or bpy.data.worlds.new("Preview_World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = _lin("#1E2228")
    bg.inputs["Strength"].default_value = 1.8

    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1400, 1050
    scene.view_settings.view_transform = "AgX"
    return cam


def aim(cam, direction, target, scale):
    cam.data.ortho_scale = scale
    cam.location = Vector(target) + Vector(direction).normalized() * 40
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()


def render_previews():
    scene = bpy.context.scene
    cam = setup_preview(scene)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    shots = [
        ("exterior", False, (-1.0, -1.0, 0.95), (0, 0, 1.2), 19.5),
        ("cutaway", True, (-0.8, -1.0, 1.45), (0.3, 0.6, 0.8), 16.5),
        ("cutaway_east", True, (1.0, -0.35, 1.5), (-0.6, 0.2, 0.8), 16.5),
        ("exterior_back", False, (1.0, 1.0, 0.95), (0, 0, 1.2), 19.5),
    ]
    for name, cut, d, target, scale in shots:
        set_view(scene, cut)
        aim(cam, d, target, scale)
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"_preview_barracks_{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[barracks] preview {scene.render.filepath}")
    set_view(scene, False)
    for name in ("Preview_Cam", "Preview_Sun", "Preview_Warm1", "Preview_Warm2"):
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
