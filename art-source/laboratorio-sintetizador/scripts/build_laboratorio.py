#!/usr/bin/env python3
"""
Build Laboratory with Diamond Synthesis Machine (Horda Survivor // v001)
Created via Blender 5.1.1 Python API.

Visual References:
- maquina_estudo.jpg: Diamond Synthesis Machine Study Board (Ivory body, copper coils,
  front retrieval drawer, blue glass viewport, diamond crystal, electrode clamps, pistons, hazard base).
- maquina_render.jpg: Photorealistic detail of synthesis machine, floor conduits, gauges, displays.
- laboratorio_estudo.jpg: Laboratory Study Board (14x10m modular lab, 6x5m technical machine bay,
  90-deg corner cutaway for isometric gameplay, analysis workbench, reception bench, sample cabinets,
  activation console, crates, power conduits, airlock door, south service door).

Budget Target: <= 15,000 triangles total for the combined set (Room + Machine + Props).
"""

import os
import sys
import math
import json
import random
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

ROOT = "/Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador"
BLEND_PATH = os.path.join(ROOT, "blend", "laboratorio_sintetizador_v001.blend")
GLB_PATH = os.path.join(ROOT, "export", "laboratorio_sintetizador_v001.glb")
TEX_DIR = os.path.join(ROOT, "texturas")
NOTES_DIR = os.path.join(ROOT, "notas")

os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
os.makedirs(TEX_DIR, exist_ok=True)
os.makedirs(NOTES_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0


def make_material(name, base_color, metallic=0.0, roughness=0.5, emission=(0.0, 0.0, 0.0), emission_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return m


# -----------------------------------------------------------------------------
# GEOMETRY HELPERS
# -----------------------------------------------------------------------------

def add_box(bm, center, size, mat_idx=0):
    """Adds an axis-aligned box with given center and size (sx, sy, sz)."""
    cx, cy, cz = center
    sx, sy, sz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    v = [
        bm.verts.new((cx - sx, cy - sy, cz - sz)),
        bm.verts.new((cx + sx, cy - sy, cz - sz)),
        bm.verts.new((cx + sx, cy + sy, cz - sz)),
        bm.verts.new((cx - sx, cy + sy, cz - sz)),
        bm.verts.new((cx - sx, cy - sy, cz + sz)),
        bm.verts.new((cx + sx, cy - sy, cz + sz)),
        bm.verts.new((cx + sx, cy + sy, cz + sz)),
        bm.verts.new((cx - sx, cy + sy, cz + sz)),
    ]
    faces_idx = [
        [0, 1, 2, 3],  # bottom
        [4, 7, 6, 5],  # top
        [0, 4, 5, 1],  # front
        [1, 5, 6, 2],  # right
        [2, 6, 7, 3],  # back
        [3, 7, 4, 0],  # left
    ]
    new_faces = []
    for f in faces_idx:
        face = bm.faces.new([v[i] for i in f])
        face.material_index = mat_idx
        new_faces.append(face)
    return new_faces


def add_bevelled_box(bm, center, size, bevel_w=0.04, mat_body=0, mat_bevel=1):
    """Adds a box and bevels all edges for crisp industrial chamfers."""
    faces = add_box(bm, center, size, mat_idx=mat_body)
    edges = list(set(e for f in faces for e in f.edges))
    res = bmesh.ops.bevel(
        bm,
        geom=edges,
        offset=bevel_w,
        offset_type='OFFSET',
        segments=1,
        profile=0.5,
        affect='EDGES',
    )
    for f in res.get("faces", []):
        if isinstance(f, bmesh.types.BMFace):
            f.material_index = mat_bevel
    return faces


def add_cylinder(bm, p1, p2, radius, n_sides=10, mat_idx=0, cap_ends=True):
    """Adds a cylinder from p1 to p2."""
    v1 = Vector(p1)
    v2 = Vector(p2)
    axis = (v2 - v1).normalized()
    length = (v2 - v1).length
    if length < 1e-6:
        return []

    up = Vector((0.0, 0.0, 1.0))
    if abs(axis.dot(up)) > 0.95:
        up = Vector((1.0, 0.0, 0.0))
    x_axis = axis.cross(up).normalized()
    y_axis = x_axis.cross(axis).normalized()

    ring1 = []
    ring2 = []
    for i in range(n_sides):
        ang = math.radians(i * (360.0 / n_sides))
        off = (x_axis * math.cos(ang) + y_axis * math.sin(ang)) * radius
        ring1.append(bm.verts.new(v1 + off))
        ring2.append(bm.verts.new(v2 + off))

    faces = []
    for i in range(n_sides):
        ni = (i + 1) % n_sides
        f = bm.faces.new([ring1[i], ring1[ni], ring2[ni], ring2[i]])
        f.material_index = mat_idx
        faces.append(f)

    if cap_ends:
        f_start = bm.faces.new(ring1[::-1])
        f_start.material_index = mat_idx
        f_end = bm.faces.new(ring2)
        f_end.material_index = mat_idx
        faces.extend([f_start, f_end])

    return faces


def add_pipe_ring(bm, p1, p2, r_inner, r_outer, n_sides=16, mat_idx=0):
    """Adds a hollow tubular ring/flange from p1 to p2 with inner and outer walls."""
    v1 = Vector(p1)
    v2 = Vector(p2)
    axis = (v2 - v1).normalized()
    up = Vector((0.0, 0.0, 1.0))
    if abs(axis.dot(up)) > 0.95:
        up = Vector((1.0, 0.0, 0.0))
    x_axis = axis.cross(up).normalized()
    y_axis = x_axis.cross(axis).normalized()

    outer1, outer2 = [], []
    inner1, inner2 = [], []
    for i in range(n_sides):
        ang = math.radians(i * (360.0 / n_sides))
        off_dir = x_axis * math.cos(ang) + y_axis * math.sin(ang)
        outer1.append(bm.verts.new(v1 + off_dir * r_outer))
        outer2.append(bm.verts.new(v2 + off_dir * r_outer))
        inner1.append(bm.verts.new(v1 + off_dir * r_inner))
        inner2.append(bm.verts.new(v2 + off_dir * r_inner))

    faces = []
    for i in range(n_sides):
        ni = (i + 1) % n_sides
        # Outer surface
        f_out = bm.faces.new([outer1[i], outer1[ni], outer2[ni], outer2[i]])
        f_out.material_index = mat_idx
        faces.append(f_out)
        # Inner surface
        f_in = bm.faces.new([inner2[i], inner2[ni], inner1[ni], inner1[i]])
        f_in.material_index = mat_idx
        faces.append(f_in)
        # Front annular cap (p2)
        f_cap2 = bm.faces.new([outer2[i], outer2[ni], inner2[ni], inner2[i]])
        f_cap2.material_index = mat_idx
        faces.append(f_cap2)
        # Back annular cap (p1)
        f_cap1 = bm.faces.new([inner1[i], inner1[ni], outer1[ni], outer1[i]])
        f_cap1.material_index = mat_idx
        faces.append(f_cap1)
    return faces


def add_torus_ring(bm, center, axis_dir, major_r, minor_r, n_major=16, n_minor=6, mat_idx=0):
    """Adds a toroidal coil segment/ring."""
    c = Vector(center)
    z_axis = Vector(axis_dir).normalized()
    up = Vector((0.0, 0.0, 1.0))
    if abs(z_axis.dot(up)) > 0.95:
        up = Vector((1.0, 0.0, 0.0))
    x_axis = z_axis.cross(up).normalized()
    y_axis = x_axis.cross(z_axis).normalized()

    rings = []
    for i in range(n_major):
        ang_maj = math.radians(i * (360.0 / n_major))
        dir_maj = x_axis * math.cos(ang_maj) + y_axis * math.sin(ang_maj)
        pt_maj = c + dir_maj * major_r
        rad_axis = dir_maj

        rv = []
        for j in range(n_minor):
            ang_min = math.radians(j * (360.0 / n_minor))
            off = (rad_axis * math.cos(ang_min) + z_axis * math.sin(ang_min)) * minor_r
            rv.append(bm.verts.new(pt_maj + off))
        rings.append(rv)

    faces = []
    for i in range(n_major):
        ni = (i + 1) % n_major
        r0 = rings[i]
        r1 = rings[ni]
        for j in range(n_minor):
            nj = (j + 1) % n_minor
            f = bm.faces.new([r0[j], r1[j], r1[nj], r0[nj]])
            f.material_index = mat_idx
            faces.append(f)
    return faces


def add_diamond_gem(bm, center, radius=0.32, height=0.48, mat_idx=0):
    """Adds a classic brilliant cut diamond crystal shape."""
    cx, cy, cz = center
    n_pts = 8
    # Top flat table
    r_table = radius * 0.55
    z_table = cz + height * 0.45
    # Crown girdle (widest point)
    r_girdle = radius
    z_girdle = cz + height * 0.10
    # Bottom culet apex
    z_culet = cz - height * 0.55

    v_table = []
    v_girdle_up = []
    v_girdle_down = []
    v_culet = bm.verts.new((cx, cy, z_culet))

    for i in range(n_pts):
        ang = math.radians(i * (360.0 / n_pts))
        vx = math.cos(ang)
        vy = math.sin(ang)
        v_table.append(bm.verts.new((cx + vx * r_table, cy + vy * r_table, z_table)))
        v_girdle_up.append(bm.verts.new((cx + vx * r_girdle, cy + vy * r_girdle, z_girdle + 0.015)))
        v_girdle_down.append(bm.verts.new((cx + vx * r_girdle, cy + vy * r_girdle, z_girdle - 0.015)))

    # Table face
    f_table = bm.faces.new(v_table)
    f_table.material_index = mat_idx

    # Crown facets (table to girdle)
    for i in range(n_pts):
        ni = (i + 1) % n_pts
        f1 = bm.faces.new([v_table[i], v_girdle_up[i], v_girdle_up[ni], v_table[ni]])
        f1.material_index = mat_idx

    # Girdle band
    for i in range(n_pts):
        ni = (i + 1) % n_pts
        f_g = bm.faces.new([v_girdle_up[i], v_girdle_down[i], v_girdle_down[ni], v_girdle_up[ni]])
        f_g.material_index = mat_idx

    # Pavilion facets (girdle to culet)
    for i in range(n_pts):
        ni = (i + 1) % n_pts
        f_p = bm.faces.new([v_girdle_down[i], v_culet, v_girdle_down[ni]])
        f_p.material_index = mat_idx


def add_hazard_stripe_plane(bm, corner_min, corner_max, n_stripes=8, slant_dx=0.08, z_offset=0.002, mat_yellow=0, mat_black=1):
    """Creates a flat diagonal hazard striped panel."""
    x0, y0, z0 = corner_min
    x1, y1, _  = corner_max
    z = z0 + z_offset
    total_w = x1 - x0
    total_h = y1 - y0

    # Subdivide into diagonal quads along X
    step = total_w / n_stripes
    for i in range(n_stripes):
        sx0 = x0 + i * step
        sx1 = x0 + (i + 1) * step
        mat_i = mat_yellow if (i % 2 == 0) else mat_black

        v0 = bm.verts.new((sx0, y0, z))
        v1 = bm.verts.new((min(x1, sx1), y0, z))
        v2 = bm.verts.new((min(x1, sx1 + slant_dx), y1, z))
        v3 = bm.verts.new((min(x1, sx0 + slant_dx), y1, z))

        f = bm.faces.new([v0, v1, v2, v3])
        f.material_index = mat_i


# -----------------------------------------------------------------------------
# 1. DIAMOND SYNTHESIS MACHINE BUILDER
# -----------------------------------------------------------------------------

def build_synthesis_machine(materials):
    """
    Builds the central Diamond Synthesis Machine (3.2m W x 2.4m D x 2.6m H).
    Returns list of part objects.
    """
    mat_ivory = materials["ivory"]
    mat_copper = materials["copper"]
    mat_dark_steel = materials["dark_steel"]
    mat_steel_light = materials["steel_light"]
    mat_hazard_y = materials["hazard_yellow"]
    mat_hazard_k = materials["hazard_black"]
    mat_cyan_glow = materials["cyan_plasma"]
    mat_amber_glow = materials["amber_glow"]

    parts = []

    # 1.1 Machine Plinth Base with Hazard Chamfer (Z: 0.0 to 0.40)
    bm_base = bmesh.new()
    # Main platform block (3.30m x 2.50m x 0.35m)
    add_bevelled_box(bm_base, (0.0, 0.0, 0.175), (3.30, 2.50, 0.35), bevel_w=0.08, mat_body=0, mat_bevel=1)
    # Recessed base floor lip
    add_box(bm_base, (0.0, 0.0, 0.04), (3.45, 2.65, 0.08), mat_idx=0)
    # Hazard strip border on front and sides of plinth
    add_hazard_stripe_plane(bm_base, (-1.55, -1.20, 0.35), (1.55, -1.10, 0.35), n_stripes=14, slant_dx=0.06, mat_yellow=2, mat_black=3)
    add_hazard_stripe_plane(bm_base, (-1.60, -1.15, 0.35), (-1.50, 1.15, 0.35), n_stripes=10, slant_dx=0.05, mat_yellow=2, mat_black=3)
    add_hazard_stripe_plane(bm_base, ( 1.50, -1.15, 0.35), ( 1.60, 1.15, 0.35), n_stripes=10, slant_dx=0.05, mat_yellow=2, mat_black=3)

    # Footing anchor brackets and floor conduit connectors (as seen in photoreal ref)
    for bx, by in [(-1.50, -1.0), (-1.50, 1.0), (1.50, -1.0), (1.50, 1.0), (0.0, -1.15), (0.0, 1.15)]:
        add_box(bm_base, (bx, by, 0.20), (0.22, 0.22, 0.22), mat_idx=1)
        add_cylinder(bm_base, (bx, by, 0.31), (bx, by, 0.38), radius=0.06, n_sides=8, mat_idx=0)

    # Floor cable conduits radiating outward from plinth
    conduit_routes = [
        [(-1.50, -1.0, 0.04), (-2.20, -1.0, 0.04), (-2.80, -1.5, 0.04)],
        [( 1.50, -1.0, 0.04), ( 2.20, -1.0, 0.04), ( 2.80, -1.5, 0.04)],
        [(-1.50,  1.0, 0.04), (-2.20,  1.0, 0.04), (-2.60,  1.8, 0.04)],
        [( 1.50,  1.0, 0.04), ( 2.20,  1.0, 0.04), ( 2.60,  1.8, 0.04)],
        [( 0.0,   1.25, 0.04), ( 0.0,   1.95, 0.04), ( 0.0,   2.50, 0.04)],
    ]
    for route in conduit_routes:
        for idx in range(len(route) - 1):
            add_cylinder(bm_base, route[idx], route[idx + 1], radius=0.035, n_sides=6, mat_idx=0, cap_ends=True)

    part_base = make_part_obj("Synthesizer_Base", bm_base, [mat_dark_steel, mat_steel_light, mat_hazard_y, mat_hazard_k], "Machine_Base")
    parts.append(part_base)

    # 1.2 Main Ivory Chassis & End Bells (Z: 0.35 to 2.45)
    bm_chassis = bmesh.new()
    # Left & Right main body housings (leaves central hollow bay for the synthesis chamber!)
    # Left housing block (X: -1.35 to -0.55, Y: -0.92 to 0.92, Z: 0.50 to 2.20)
    add_bevelled_box(bm_chassis, (-0.95, 0.0, 1.35), (0.80, 1.84, 1.70), bevel_w=0.14, mat_body=0, mat_bevel=1)
    # Right housing block (X: 0.55 to 1.35, Y: -0.92 to 0.92, Z: 0.50 to 2.20)
    add_bevelled_box(bm_chassis, ( 0.95, 0.0, 1.35), (0.80, 1.84, 1.70), bevel_w=0.14, mat_body=0, mat_bevel=1)

    # Rear connecting bulkhead casing (X: -0.55 to +0.55, Y: 0.55 to 0.92, Z: 0.50 to 2.20)
    add_bevelled_box(bm_chassis, (0.0, 0.72, 1.35), (1.10, 0.38, 1.70), bevel_w=0.08, mat_body=0, mat_bevel=1)

    # Bottom cradle deck under chamber (X: -0.55 to +0.55, Y: -0.85 to 0.55, Z: 0.35 to 0.72)
    add_bevelled_box(bm_chassis, (0.0, -0.15, 0.54), (1.10, 1.40, 0.36), bevel_w=0.05, mat_body=0, mat_bevel=1)

    # Top roof arch hood over chamber (X: -0.55 to +0.55, Y: -0.85 to 0.55, Z: 2.05 to 2.35)
    add_bevelled_box(bm_chassis, (0.0, -0.15, 2.18), (1.10, 1.40, 0.26), bevel_w=0.06, mat_body=0, mat_bevel=1)

    # Corrugated vent grille on roof
    add_box(bm_chassis, (0.0, 0.0, 2.33), (1.80, 0.85, 0.06), mat_idx=2)

    # Chamber interior rear concave reflector wall (Z: 0.80 to 2.00, Y = 0.52)
    add_box(bm_chassis, (0.0, 0.52, 1.45), (1.06, 0.04, 1.15), mat_idx=2)
    add_box(bm_chassis, (0.0, 0.49, 1.45), (0.80, 0.02, 0.85), mat_idx=3)  # glowing cyan backing

    # Heavy end caps / reinforcement bulkheads on Left and Right ends
    for ex in [-1.35, 1.35]:
        add_bevelled_box(bm_chassis, (ex, 0.0, 1.35), (0.28, 1.75, 1.55), bevel_w=0.12, mat_body=0, mat_bevel=1)
        # End hub / bearing cap
        add_cylinder(bm_chassis, (ex - 0.14 * (ex / abs(ex)), 0.0, 1.35),
                     (ex + 0.14 * (ex / abs(ex)), 0.0, 1.35), radius=0.48, n_sides=12, mat_idx=2)
        add_cylinder(bm_chassis, (ex - 0.18 * (ex / abs(ex)), 0.0, 1.35),
                     (ex + 0.18 * (ex / abs(ex)), 0.0, 1.35), radius=0.28, n_sides=10, mat_idx=1)

    # Front Console Panel & Retrieval Drawer Housing (under front viewport)
    # Console housing block (X: -0.65 to 0.65, Y: -1.05 to -0.92, Z: 0.50 to 0.88)
    add_box(bm_chassis, (0.0, -0.98, 0.68), (1.30, 0.22, 0.40), mat_idx=0)
    # Angled terminal screen & keypad
    add_box(bm_chassis, (-0.28, -1.06, 0.76), (0.42, 0.10, 0.22), mat_idx=2)
    add_box(bm_chassis, (-0.28, -1.09, 0.77), (0.36, 0.04, 0.16), mat_idx=3)  # glowing screen
    # Pressure dials / gauges on the right of console
    for gx in [0.12, 0.32]:
        add_cylinder(bm_chassis, (gx, -1.05, 0.78), (gx, -1.11, 0.78), radius=0.075, n_sides=10, mat_idx=1)
        add_cylinder(bm_chassis, (gx, -1.10, 0.78), (gx, -1.12, 0.78), radius=0.060, n_sides=8, mat_idx=4)  # gauge face

    # Rear maintenance panel & terminal box
    add_box(bm_chassis, (0.0, 0.98, 1.25), (1.10, 0.16, 0.85), mat_idx=2)
    add_box(bm_chassis, (0.0, 1.05, 1.25), (0.90, 0.04, 0.70), mat_idx=1)

    part_chassis = make_part_obj("Synthesizer_Chassis", bm_chassis,
                                 [mat_ivory, mat_steel_light, mat_dark_steel, mat_cyan_glow, mat_amber_glow],
                                 "Machine_Chassis")
    parts.append(part_chassis)

    # 1.3 Front Retrieval Drawer (animated bone `Retrieval_Drawer`)
    bm_drawer = bmesh.new()
    add_bevelled_box(bm_drawer, (0.0, -1.02, 0.52), (0.78, 0.18, 0.18), bevel_w=0.02, mat_body=0, mat_bevel=1)
    # Pull handle
    add_cylinder(bm_drawer, (-0.20, -1.14, 0.52), (0.20, -1.14, 0.52), radius=0.022, n_sides=6, mat_idx=0)
    add_cylinder(bm_drawer, (-0.20, -1.14, 0.52), (-0.20, -1.08, 0.52), radius=0.022, n_sides=6, mat_idx=0)
    add_cylinder(bm_drawer, ( 0.20, -1.14, 0.52), ( 0.20, -1.08, 0.52), radius=0.022, n_sides=6, mat_idx=0)
    # Internal diamond tray cavity
    add_box(bm_drawer, (0.0, -0.92, 0.52), (0.64, 0.20, 0.10), mat_idx=2)

    part_drawer = make_part_obj("Synthesizer_Drawer", bm_drawer, [mat_dark_steel, mat_steel_light, mat_ivory], "Retrieval_Drawer")
    parts.append(part_drawer)

    # 1.4 Synthesis Chamber Viewport Assembly (Front Circular Bezel & Lens Ring)
    bm_view = bmesh.new()
    # Front heavy flange ring (portal opening)
    add_pipe_ring(bm_view, (0.0, -0.86, 1.45), (0.0, -1.04, 1.45), r_inner=0.44, r_outer=0.62, n_sides=16, mat_idx=0)
    add_pipe_ring(bm_view, (0.0, -1.04, 1.45), (0.0, -1.08, 1.45), r_inner=0.44, r_outer=0.55, n_sides=16, mat_idx=1)
    # Glowing cyan lens ring inside viewport
    add_pipe_ring(bm_view, (0.0, -0.96, 1.45), (0.0, -1.02, 1.45), r_inner=0.41, r_outer=0.44, n_sides=16, mat_idx=2)

    # 8 hex bolts around viewport flange
    for bi in range(8):
        ang = math.radians(bi * (360.0 / 8))
        bx = math.cos(ang) * 0.52
        bz = 1.45 + math.sin(ang) * 0.52
        add_cylinder(bm_view, (bx, -1.04, bz), (bx, -1.10, bz), radius=0.026, n_sides=6, mat_idx=1)

    # Top Roof Observation Window Bezel
    add_box(bm_view, (0.0, -0.30, 2.22), (0.75, 0.55, 0.08), mat_idx=0)
    add_box(bm_view, (0.0, -0.30, 2.26), (0.62, 0.42, 0.04), mat_idx=2)  # glowing glass

    part_view = make_part_obj("Synthesizer_Viewport", bm_view, [mat_dark_steel, mat_steel_light, mat_cyan_glow], "Chamber_Shell")
    parts.append(part_view)

    # 1.5 Thick Copper Induction Coils (4 massive coil banks, 2 on left, 2 on right)
    bm_coils = bmesh.new()
    coil_x_positions = [-0.88, -0.58, 0.58, 0.88]
    for cx in coil_x_positions:
        # 4 winding turns per coil bank
        for ring_i in range(4):
            dx = (ring_i - 1.5) * 0.065
            add_torus_ring(bm_coils, (cx + dx, 0.0, 1.45), (1.0, 0.0, 0.0), major_r=0.74, minor_r=0.042,
                           n_major=14, n_minor=6, mat_idx=0)

        # Coil structural support cradle at bottom & top
        add_box(bm_coils, (cx, 0.0, 0.68), (0.28, 1.55, 0.12), mat_idx=1)
        add_box(bm_coils, (cx, 0.0, 2.20), (0.28, 1.35, 0.08), mat_idx=1)

    # Interconnecting copper supply busbars and side conduits
    for side_y in [-0.88, 0.88]:
        add_cylinder(bm_coils, (-1.10, side_y, 1.05), (1.10, side_y, 1.05), radius=0.038, n_sides=8, mat_idx=0)
        for cx in coil_x_positions:
            add_cylinder(bm_coils, (cx, side_y, 1.05), (cx, side_y * 0.82, 1.25), radius=0.030, n_sides=6, mat_idx=0)

    part_coils = make_part_obj("Synthesizer_Coils", bm_coils, [mat_copper, mat_dark_steel], "Machine_Coils")
    parts.append(part_coils)

    # 1.6 Hydraulic Piston & Rod Assemblies (Top & Sides)
    bm_pistons = bmesh.new()
    # Front-to-back hydraulic stabilization rods
    for px in [-0.95, 0.95]:
        for pz in [1.10, 1.80]:
            # Cylinder barrel
            add_cylinder(bm_pistons, (px, -0.92, pz), (px, -0.35, pz), radius=0.052, n_sides=8, mat_idx=0)
            # Chrome piston rod
            add_cylinder(bm_pistons, (px, -0.35, pz), (px, 0.35, pz), radius=0.032, n_sides=8, mat_idx=1)
            # Rear barrel
            add_cylinder(bm_pistons, (px, 0.35, pz), (px, 0.92, pz), radius=0.052, n_sides=8, mat_idx=0)
            # Mounting brackets
            add_box(bm_pistons, (px, -0.90, pz), (0.16, 0.12, 0.18), mat_idx=0)
            add_box(bm_pistons, (px,  0.90, pz), (0.16, 0.12, 0.18), mat_idx=0)

    # Top hydraulic press cylinder (center vertical actuator)
    add_cylinder(bm_pistons, (0.0, 0.0, 2.05), (0.0, 0.0, 2.38), radius=0.18, n_sides=10, mat_idx=0)
    add_cylinder(bm_pistons, (0.0, 0.0, 1.82), (0.0, 0.0, 2.05), radius=0.11, n_sides=8, mat_idx=1)

    part_pistons = make_part_obj("Synthesizer_Pistons", bm_pistons, [mat_dark_steel, mat_steel_light], "Chamber_Pistons")
    parts.append(part_pistons)

    # 1.7 Internal Core: Floating Diamond Crystal, Electrodes & Plasma Arcs
    # 1.7.1 Floating Diamond Crystal (Center at 0, 0, 1.45)
    bm_diamond = bmesh.new()
    add_diamond_gem(bm_diamond, (0.0, 0.0, 1.45), radius=0.32, height=0.48, mat_idx=0)
    part_diamond = make_part_obj("Synthesizer_Diamond", bm_diamond, [mat_cyan_glow], "Diamond_Core")
    parts.append(part_diamond)

    # 1.7.2 Electrode Clamps (4 internal clamps pointing inward from Top, Bottom, Left, Right)
    bm_electrodes = bmesh.new()
    # Upper clamp
    add_cylinder(bm_electrodes, (0.0, 0.0, 2.02), (0.0, 0.0, 1.68), radius=0.045, n_sides=8, mat_idx=0)
    add_box(bm_electrodes, (0.0, 0.0, 1.67), (0.08, 0.08, 0.04), mat_idx=1)
    # Lower clamp
    add_cylinder(bm_electrodes, (0.0, 0.0, 0.88), (0.0, 0.0, 1.22), radius=0.045, n_sides=8, mat_idx=0)
    add_box(bm_electrodes, (0.0, 0.0, 1.23), (0.08, 0.08, 0.04), mat_idx=1)
    # Left clamp
    add_cylinder(bm_electrodes, (-0.55, 0.0, 1.45), (-0.28, 0.0, 1.45), radius=0.045, n_sides=8, mat_idx=0)
    add_box(bm_electrodes, (-0.27, 0.0, 1.45), (0.04, 0.08, 0.08), mat_idx=1)
    # Right clamp
    add_cylinder(bm_electrodes, ( 0.55, 0.0, 1.45), ( 0.28, 0.0, 1.45), radius=0.045, n_sides=8, mat_idx=0)
    add_box(bm_electrodes, ( 0.27, 0.0, 1.45), (0.04, 0.08, 0.08), mat_idx=1)

    part_electrodes = make_part_obj("Synthesizer_Electrodes", bm_electrodes, [mat_dark_steel, mat_copper], "Chamber_Electrodes")
    parts.append(part_electrodes)

    # 1.7.3 Plasma Electrical Arc Plates (Cross planes surrounding diamond)
    bm_plasma = bmesh.new()
    # Multi-angle energy discharge planes connecting electrodes and crystal
    for pa, ang_deg in enumerate([25.0, 70.0, 115.0, 160.0]):
        ang = math.radians(ang_deg)
        dx = math.cos(ang) * 0.28
        dy = math.sin(ang) * 0.28
        dz = 0.24
        v0 = bm_plasma.verts.new((-dx, -dy, 1.45 - dz))
        v1 = bm_plasma.verts.new(( dx,  dy, 1.45 - dz))
        v2 = bm_plasma.verts.new(( dx,  dy, 1.45 + dz))
        v3 = bm_plasma.verts.new((-dx, -dy, 1.45 + dz))
        f1 = bm_plasma.faces.new([v0, v1, v2, v3])
        f1.material_index = 0

    part_plasma = make_part_obj("Synthesizer_PlasmaArcs", bm_plasma, [mat_cyan_glow], "Plasma_Arcs")
    parts.append(part_plasma)

    return parts


# -----------------------------------------------------------------------------
# 2. LABORATORY ROOM & CUTAWAY ARCHITECTURE BUILDER
# -----------------------------------------------------------------------------

def build_laboratory_room(materials):
    """
    Builds the 14m x 10m x 3.6m Laboratory with 90-degree corner cutaway
    (foreground South and West walls cut low for isometric visibility).
    """
    mat_floor = materials["floor_slate"]
    mat_wall = materials["wall_slate"]
    mat_dark_slate = materials["dark_slate"]
    mat_dark_steel = materials["dark_steel"]
    mat_hazard_y = materials["hazard_yellow"]
    mat_hazard_k = materials["hazard_black"]
    mat_amber_window = materials["amber_glow"]

    parts = []

    # 2.1 Laboratory Main Floor Slab & Foundations
    # Lab room footprint: X from -7.0m to +7.0m, Y from -5.0m to +5.0m
    bm_floor = bmesh.new()
    # Base concrete/subfloor plinth (Z: -0.40 to 0.0)
    add_box(bm_floor, (0.0, 0.0, -0.20), (14.60, 10.60, 0.40), mat_idx=0)
    # Tiled interior floor slab (Z: -0.05 to 0.0)
    add_box(bm_floor, (0.0, 0.0, -0.02), (14.00, 10.00, 0.04), mat_idx=1)

    # Central Technical Machine Bay Perimeter (6.0m X x 5.0m Y)
    # Yellow/Black hazard border around machine bay
    add_hazard_stripe_plane(bm_floor, (-3.05, -2.55, 0.0), (3.05, -2.35, 0.0), n_stripes=24, slant_dx=0.10, mat_yellow=2, mat_black=3)
    add_hazard_stripe_plane(bm_floor, (-3.05,  2.35, 0.0), (3.05,  2.55, 0.0), n_stripes=24, slant_dx=0.10, mat_yellow=2, mat_black=3)
    add_hazard_stripe_plane(bm_floor, (-3.05, -2.55, 0.0), (-2.85, 2.55, 0.0), n_stripes=20, slant_dx=0.10, mat_yellow=2, mat_black=3)
    add_hazard_stripe_plane(bm_floor, ( 2.85, -2.55, 0.0), ( 3.05, 2.55, 0.0), n_stripes=20, slant_dx=0.10, mat_yellow=2, mat_black=3)

    # South exterior delivery pad (outside south service door, Y: -5.0 to -6.5, X: 0.8 to 3.2)
    add_box(bm_floor, (2.0, -5.75, -0.08), (2.40, 1.50, 0.16), mat_idx=0)
    # West exterior entrance pad (outside west airlock, X: -7.0 to -8.2, Y: -0.8 to 1.2)
    add_box(bm_floor, (-7.60, 0.2, -0.08), (1.20, 2.00, 0.16), mat_idx=0)

    part_floor = make_part_obj("Lab_FloorSlab", bm_floor, [mat_dark_slate, mat_floor, mat_hazard_y, mat_hazard_k], "Lab_Architecture")
    parts.append(part_floor)

    # 2.2 North & East Full-Height Walls (Z: 0.0 to 3.6m)
    bm_backwalls = bmesh.new()
    wall_thick = 0.45
    wall_h = 3.60

    # North Wall (Y: 4.78 to 5.23, X: -6.8 to +6.8)
    add_box(bm_backwalls, (0.0, 5.0, wall_h * 0.5), (14.0, wall_thick, wall_h), mat_idx=0)
    # North wall lower dark wainscot / base skirting (0.0 to 0.75m)
    add_box(bm_backwalls, (0.0, 4.75, 0.375), (13.6, 0.08, 0.75), mat_idx=1)
    # North illuminated observation window / monitor board (X: -2.8 to 0.2, Z: 1.8 to 2.8)
    add_box(bm_backwalls, (-1.30, 4.74, 2.30), (2.80, 0.08, 1.00), mat_idx=1)
    add_box(bm_backwalls, (-1.30, 4.71, 2.30), (2.60, 0.04, 0.82), mat_idx=2)  # illuminated glass

    # East Wall (X: 6.78 to 7.23, Y: -4.8 to +4.8)
    add_box(bm_backwalls, (7.0, 0.0, wall_h * 0.5), (wall_thick, 10.0, wall_h), mat_idx=0)
    # East wall wainscot skirting
    add_box(bm_backwalls, (6.75, 0.0, 0.375), (0.08, 9.6, 0.75), mat_idx=1)
    # East illuminated wall window (Y: -2.8 to -0.6, Z: 1.8 to 2.8)
    add_box(bm_backwalls, (6.74, -1.70, 2.30), (0.08, 2.20, 1.00), mat_idx=1)
    add_box(bm_backwalls, (6.71, -1.70, 2.30), (0.04, 2.00, 0.82), mat_idx=2)

    # Rounded Corner Column (North-East: X ~ 6.8, Y ~ 4.8)
    add_cylinder(bm_backwalls, (6.65, 4.65, 0.0), (6.65, 4.65, wall_h), radius=0.35, n_sides=10, mat_idx=1)

    part_backwalls = make_part_obj("Lab_BackWalls", bm_backwalls, [mat_wall, mat_dark_slate, mat_amber_window], "Lab_Architecture")
    parts.append(part_backwalls)

    # 2.3 South & West Cutaway Walls (Low profile ~0.85m for isometric camera clearance)
    bm_cutwalls = bmesh.new()
    cut_h = 0.85

    # South Cutaway Wall (Y: -5.0 to -4.55, X: -6.8 to +6.8)
    # Section West of South Door (X: -6.8 to 0.8)
    add_box(bm_cutwalls, (-3.0, -4.78, cut_h * 0.5), (7.60, wall_thick, cut_h), mat_idx=0)
    # Section East of South Door (X: 3.2 to 6.8)
    add_box(bm_cutwalls, (5.0, -4.78, cut_h * 0.5), (3.60, wall_thick, cut_h), mat_idx=0)
    # Top protective rounded coping / handrail trim on cutaway edge
    add_box(bm_cutwalls, (-3.0, -4.78, cut_h), (7.65, wall_thick + 0.06, 0.08), mat_idx=1)
    add_box(bm_cutwalls, (5.0, -4.78, cut_h), (3.65, wall_thick + 0.06, 0.08), mat_idx=1)

    # South Service Doorway Frame (X: 0.8 to 3.2, full opening to 2.4m height)
    add_box(bm_cutwalls, (0.85, -4.78, 1.25), (0.22, wall_thick + 0.04, 2.50), mat_idx=1)
    add_box(bm_cutwalls, (3.15, -4.78, 1.25), (0.22, wall_thick + 0.04, 2.50), mat_idx=1)
    add_box(bm_cutwalls, (2.00, -4.78, 2.50), (2.50, wall_thick + 0.04, 0.22), mat_idx=1)

    # West Cutaway Wall (X: -7.0 to -6.55, Y: -4.8 to +4.8)
    # Section South of West Airlock (Y: -4.8 to -0.9)
    add_box(bm_cutwalls, (-6.78, -2.85, cut_h * 0.5), (wall_thick, 3.90, cut_h), mat_idx=0)
    # Section North of West Airlock (Y: 1.3 to 4.8)
    add_box(bm_cutwalls, (-6.78, 3.05, cut_h * 0.5), (wall_thick, 3.50, cut_h), mat_idx=0)
    # Top coping rail on west cutaway edge
    add_box(bm_cutwalls, (-6.78, -2.85, cut_h), (wall_thick + 0.06, 3.95, 0.08), mat_idx=1)
    add_box(bm_cutwalls, (-6.78, 3.05, cut_h), (wall_thick + 0.06, 3.55, 0.08), mat_idx=1)

    # West Airlock Doorway Frame (Y: -0.9 to 1.3, opening to 2.4m height)
    add_box(bm_cutwalls, (-6.78, -0.85, 1.25), (wall_thick + 0.04, 0.22, 2.50), mat_idx=1)
    add_box(bm_cutwalls, (-6.78,  1.25, 1.25), (wall_thick + 0.04, 0.22, 2.50), mat_idx=1)
    add_box(bm_cutwalls, (-6.78,  0.20, 2.50), (wall_thick + 0.04, 2.30, 0.22), mat_idx=1)

    # South-West Corner Post (rounded corner)
    add_cylinder(bm_cutwalls, (-6.65, -4.65, 0.0), (-6.65, -4.65, cut_h), radius=0.35, n_sides=10, mat_idx=1)

    part_cutwalls = make_part_obj("Lab_CutawayWalls", bm_cutwalls, [mat_wall, mat_dark_slate], "Lab_Architecture")
    parts.append(part_cutwalls)

    # 2.4 Doors (Animated bones `Lab_ServiceDoor` and `Lab_AirlockDoor`)
    # South Service Door (Sliding leaf)
    bm_s_door = bmesh.new()
    add_box(bm_s_door, (2.0, -4.76, 1.20), (2.05, 0.10, 2.35), mat_idx=0)
    add_box(bm_s_door, (2.0, -4.82, 1.20), (1.80, 0.04, 2.10), mat_idx=1)
    part_s_door = make_part_obj("Lab_SouthDoor", bm_s_door, [mat_dark_steel, mat_wall], "Lab_ServiceDoor")
    parts.append(part_s_door)

    # West Airlock Door
    bm_w_door = bmesh.new()
    add_box(bm_w_door, (-6.76, 0.20, 1.20), (0.10, 1.85, 2.35), mat_idx=0)
    add_box(bm_w_door, (-6.82, 0.20, 1.20), (0.04, 1.60, 2.10), mat_idx=1)
    part_w_door = make_part_obj("Lab_WestAirlock", bm_w_door, [mat_dark_steel, mat_wall], "Lab_AirlockDoor")
    parts.append(part_w_door)

    return parts


# -----------------------------------------------------------------------------
# 3. LABORATORY FURNITURE & PROPS BUILDER
# -----------------------------------------------------------------------------

def build_laboratory_props(materials):
    """
    Builds the interior furniture and equipment surrounding the central technical bay:
    - Analysis Workbench along North Wall (computer terminals, scanner, lamps).
    - Reception Workbench along West Wall (work desk, toolboxes, wooden crates).
    - Sample Cabinets (3 tall lockers along East Wall).
    - Activation Console (operator desk with angled monitors along East Wall).
    - Overhead power conduits, pipes, and electrical distribution boxes.
    """
    mat_ivory = materials["ivory"]
    mat_dark_steel = materials["dark_steel"]
    mat_steel_light = materials["steel_light"]
    mat_crate = materials["crate_wood"]
    mat_amber = materials["amber_glow"]
    mat_cyan = materials["cyan_plasma"]

    parts = []
    bm_props = bmesh.new()

    # 3.1 Analysis Workbench (North Wall: X: -3.8 to -1.0, Y: 4.0 to 4.6, Z: 0.0 to 0.85)
    # Desk body
    add_bevelled_box(bm_props, (-2.4, 4.30, 0.425), (2.80, 0.70, 0.85), bevel_w=0.03, mat_body=0, mat_bevel=1)
    # Desk top surface lip
    add_box(bm_props, (-2.4, 4.30, 0.87), (2.90, 0.76, 0.04), mat_idx=1)

    # Equipment on Analysis Desk:
    # Desktop Computer Monitor 1
    add_box(bm_props, (-3.2, 4.35, 1.15), (0.45, 0.08, 0.35), mat_idx=0)
    add_box(bm_props, (-3.2, 4.30, 1.15), (0.40, 0.03, 0.30), mat_idx=4)  # cyan screen
    add_box(bm_props, (-3.2, 4.32, 0.94), (0.16, 0.16, 0.10), mat_idx=0)
    # Keyboard
    add_box(bm_props, (-3.2, 4.12, 0.90), (0.40, 0.16, 0.02), mat_idx=0)

    # Spectrometer / Analysis Scanner unit
    add_bevelled_box(bm_props, (-2.2, 4.32, 1.10), (0.55, 0.40, 0.38), bevel_w=0.03, mat_body=1, mat_bevel=0)
    add_cylinder(bm_props, (-2.2, 4.12, 1.10), (-2.2, 4.05, 1.10), radius=0.09, n_sides=8, mat_idx=4)

    # Sample racks / test equipment
    add_box(bm_props, (-1.3, 4.30, 0.98), (0.50, 0.28, 0.18), mat_idx=0)

    # 3.2 Reception / Sorting Workbench (West Wall: X: -5.8 to -5.2, Y: -3.8 to -1.4)
    # Desk body
    add_bevelled_box(bm_props, (-5.50, -2.60, 0.425), (0.70, 2.40, 0.85), bevel_w=0.03, mat_body=0, mat_bevel=1)
    add_box(bm_props, (-5.50, -2.60, 0.87), (0.76, 2.50, 0.04), mat_idx=1)

    # Toolboxes & monitor on reception desk
    add_box(bm_props, (-5.50, -3.20, 1.12), (0.08, 0.45, 0.32), mat_idx=0)
    add_box(bm_props, (-5.45, -3.20, 1.12), (0.03, 0.40, 0.28), mat_idx=3)  # amber screen
    add_box(bm_props, (-5.50, -2.40, 0.98), (0.35, 0.50, 0.18), mat_idx=0)  # metal toolbox

    # 3.3 Wooden & Metallic Supply Crates (Stacked near Reception & Machine Bay)
    # Crate 1 (Floor level near West bench)
    add_bevelled_box(bm_props, (-4.80, -3.80, 0.25), (0.65, 0.65, 0.50), bevel_w=0.03, mat_body=2, mat_bevel=0)
    # Crate 2 (Beside crate 1)
    add_bevelled_box(bm_props, (-4.80, -3.00, 0.22), (0.55, 0.55, 0.44), bevel_w=0.03, mat_body=2, mat_bevel=0)
    # Crate 3 (Stacked on top of crate 1)
    add_bevelled_box(bm_props, (-4.80, -3.80, 0.68), (0.50, 0.50, 0.36), bevel_w=0.03, mat_body=2, mat_bevel=0)

    # Crates near North Wall
    add_bevelled_box(bm_props, (-0.40, 4.35, 0.28), (0.65, 0.65, 0.56), bevel_w=0.03, mat_body=2, mat_bevel=0)
    add_bevelled_box(bm_props, ( 0.35, 4.35, 0.24), (0.55, 0.55, 0.48), bevel_w=0.03, mat_body=2, mat_bevel=0)

    # 3.4 Sample Cabinets / Storage Lockers (East Wall: X: 6.10, Y: 1.4 to 4.2)
    # 3 tall modular lockers
    for li, ly in enumerate([2.0, 2.9, 3.8]):
        # Locker body (0.60m deep, 0.80m wide, 2.20m high)
        add_bevelled_box(bm_props, (6.25, ly, 1.10), (0.55, 0.80, 2.20), bevel_w=0.03, mat_body=1, mat_bevel=0)
        # Recessed door panel
        add_box(bm_props, (5.96, ly, 1.10), (0.04, 0.72, 2.05), mat_idx=0)
        # Vertical handle
        add_cylinder(bm_props, (5.92, ly - 0.28, 0.90), (5.92, ly - 0.28, 1.30), radius=0.016, n_sides=6, mat_idx=1)
        # Ventilation louvers on locker door
        for v_i in range(3):
            add_box(bm_props, (5.94, ly, 1.85 + v_i * 0.08), (0.02, 0.40, 0.025), mat_idx=1)

    # 3.5 Machine Activation Console (East Wall: X: 5.6 to 6.3, Y: -0.4 to 0.8)
    # Heavy angled operator desk (2m frontal approach to machine)
    add_bevelled_box(bm_props, (5.90, 0.20, 0.55), (0.75, 1.20, 1.10), bevel_w=0.04, mat_body=0, mat_bevel=1)
    # Angled dual monitor turret on activation console
    add_box(bm_props, (5.80, 0.20, 1.32), (0.45, 1.10, 0.45), mat_idx=0)
    add_box(bm_props, (5.56, -0.12, 1.32), (0.04, 0.42, 0.32), mat_idx=3)  # amber display 1
    add_box(bm_props, (5.56,  0.42, 1.32), (0.04, 0.42, 0.32), mat_idx=3)  # amber display 2
    # Console keyboard / dial slope
    add_box(bm_props, (5.62, 0.20, 1.12), (0.28, 1.05, 0.06), mat_idx=1)

    # 3.6 Industrial Power Conduits & Pipe Network along North & East walls
    # Overhead main conduit trunk along North Wall (Z = 3.10m)
    add_cylinder(bm_props, (-6.5, 4.60, 3.10), (6.5, 4.60, 3.10), radius=0.065, n_sides=8, mat_idx=0)
    add_cylinder(bm_props, (-6.5, 4.60, 2.92), (6.5, 4.60, 2.92), radius=0.045, n_sides=8, mat_idx=1)
    # Conduit vertical drops to workbenches
    add_cylinder(bm_props, (-2.4, 4.60, 3.10), (-2.4, 4.60, 0.95), radius=0.040, n_sides=6, mat_idx=0)
    add_cylinder(bm_props, ( 4.8, 4.60, 3.10), ( 4.8, 4.60, 0.50), radius=0.040, n_sides=6, mat_idx=0)

    # Conduit along East Wall (Z = 3.10m)
    add_cylinder(bm_props, (6.60, -4.2, 3.10), (6.60, 4.6, 3.10), radius=0.065, n_sides=8, mat_idx=0)
    # Wall distribution box (North wall)
    add_bevelled_box(bm_props, (4.8, 4.65, 2.10), (0.75, 0.25, 0.90), bevel_w=0.03, mat_body=0, mat_bevel=1)
    add_cylinder(bm_props, (4.8, 4.50, 2.25), (4.8, 4.45, 2.25), radius=0.06, n_sides=8, mat_idx=3)  # status light

    part_props = make_part_obj("Lab_FurnitureProps", bm_props,
                               [mat_dark_steel, mat_steel_light, mat_crate, mat_amber, mat_cyan],
                               "Lab_Props")
    parts.append(part_props)

    return parts


def make_part_obj(name, bm, mats, vgroup_name):
    """Helper to convert bmesh to Blender mesh object and assign vertex group."""
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = False
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for m in mats:
        obj.data.materials.append(m)
    vg = obj.vertex_groups.new(name=vgroup_name)
    vg.add(list(range(len(mesh.vertices))), 1.0, 'REPLACE')
    return obj


# -----------------------------------------------------------------------------
# 4. JOIN, UV UNWRAP & PBR ATLAS BAKING
# -----------------------------------------------------------------------------

def join_and_uv_unwrap(parts):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = "LaboratorySynthesizerMesh"
    obj.data.name = "LaboratorySynthesizerMeshData"

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(64.0), island_margin=0.008, area_weight=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return obj


def bake_pbr_atlas(obj, res=2048):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16

    base_img = bpy.data.images.new("laboratorio_basecolor", width=res, height=res, alpha=False)
    rough_img = bpy.data.images.new("laboratorio_rough", width=res, height=res, alpha=False)
    rough_img.colorspace_settings.name = 'Non-Color'
    emit_img = bpy.data.images.new("laboratorio_emission", width=res, height=res, alpha=False)
    norm_img = bpy.data.images.new("laboratorio_normal", width=res, height=res, alpha=False)
    norm_img.colorspace_settings.name = 'Non-Color'
    met_img = bpy.data.images.new("laboratorio_metal_tmp", width=res, height=res, alpha=False)
    met_img.colorspace_settings.name = 'Non-Color'

    def attach_target(img):
        for mat in obj.data.materials:
            nt = mat.node_tree
            for n in list(nt.nodes):
                if n.name == "BAKE_TARGET":
                    nt.nodes.remove(n)
            tn = nt.nodes.new("ShaderNodeTexImage")
            tn.name = "BAKE_TARGET"
            tn.image = img
            for n in nt.nodes:
                n.select = False
            tn.select = True
            nt.nodes.active = tn

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    scene.render.bake.margin = 8

    # 1. Bake BaseColor via temporary Emission routing
    for mat in obj.data.materials:
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if bsdf and out:
            em = nt.nodes.new("ShaderNodeEmission")
            em.name = "TEMP_ALBEDO_EMIT"
            if bsdf.inputs["Base Color"].is_linked:
                src_sock = bsdf.inputs["Base Color"].links[0].from_socket
                nt.links.new(src_sock, em.inputs["Color"])
            else:
                em.inputs["Color"].default_value = bsdf.inputs["Base Color"].default_value
            nt.links.new(em.outputs["Emission"], out.inputs["Surface"])

    attach_target(base_img)
    bpy.ops.object.bake(type='EMIT')

    for mat in obj.data.materials:
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        em = nt.nodes.get("TEMP_ALBEDO_EMIT")
        if em:
            nt.nodes.remove(em)
        if bsdf and out:
            nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    # 2. Bake Roughness
    attach_target(rough_img)
    bpy.ops.object.bake(type='ROUGHNESS')

    # 3. Bake Emission
    attach_target(emit_img)
    bpy.ops.object.bake(type='EMIT')

    # 4. Bake Normal
    attach_target(norm_img)
    bpy.ops.object.bake(type='NORMAL')

    # 5. Bake Metallic via Emission routing
    for mat in obj.data.materials:
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if bsdf and out:
            em = nt.nodes.new("ShaderNodeEmission")
            em.name = "TEMP_MET_EMIT"
            if bsdf.inputs["Metallic"].is_linked:
                src_sock = bsdf.inputs["Metallic"].links[0].from_socket
                nt.links.new(src_sock, em.inputs["Color"])
            else:
                mv = bsdf.inputs["Metallic"].default_value
                em.inputs["Color"].default_value = (mv, mv, mv, 1.0)
            nt.links.new(em.outputs["Emission"], out.inputs["Surface"])

    attach_target(met_img)
    bpy.ops.object.bake(type='EMIT')

    for mat in obj.data.materials:
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        em = nt.nodes.get("TEMP_MET_EMIT")
        if em:
            nt.nodes.remove(em)
        if bsdf and out:
            nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    # Pack ORM (R=1.0 Ambient Occlusion, G=Roughness, B=Metallic)
    orm_img = bpy.data.images.new("laboratorio_orm", width=res, height=res, alpha=False)
    orm_img.colorspace_settings.name = 'Non-Color'
    r_px = list(rough_img.pixels)
    m_px = list(met_img.pixels)
    orm_px = [1.0] * len(r_px)
    for i in range(0, len(r_px), 4):
        orm_px[i + 0] = 1.0
        orm_px[i + 1] = r_px[i + 1]
        orm_px[i + 2] = m_px[i + 0]
        orm_px[i + 3] = 1.0
    orm_img.pixels[:] = orm_px

    # Save texture files to disk
    base_img.filepath_raw = os.path.join(TEX_DIR, "laboratorio_basecolor.png")
    base_img.file_format = 'PNG'
    base_img.save()

    orm_img.filepath_raw = os.path.join(TEX_DIR, "laboratorio_orm.png")
    orm_img.file_format = 'PNG'
    orm_img.save()

    norm_img.filepath_raw = os.path.join(TEX_DIR, "laboratorio_normal.png")
    norm_img.file_format = 'PNG'
    norm_img.save()

    emit_img.filepath_raw = os.path.join(TEX_DIR, "laboratorio_emission.png")
    emit_img.file_format = 'PNG'
    emit_img.save()

    # Assign final unified Atlas PBR Material to the mesh
    mat_atlas = bpy.data.materials.new("MAT_Laboratorio_Atlas_2K")
    mat_atlas.use_nodes = True
    nt = mat_atlas.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_base = nt.nodes.new("ShaderNodeTexImage")
    tex_base.image = base_img
    nt.links.new(tex_base.outputs["Color"], bsdf.inputs["Base Color"])

    tex_orm = nt.nodes.new("ShaderNodeTexImage")
    tex_orm.image = orm_img
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex_orm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])

    tex_norm = nt.nodes.new("ShaderNodeTexImage")
    tex_norm.image = norm_img
    n_map = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tex_norm.outputs["Color"], n_map.inputs["Color"])
    nt.links.new(n_map.outputs["Normal"], bsdf.inputs["Normal"])

    tex_emit = nt.nodes.new("ShaderNodeTexImage")
    tex_emit.image = emit_img
    if "Emission Color" in bsdf.inputs:
        nt.links.new(tex_emit.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 3.5

    obj.data.materials.clear()
    obj.data.materials.append(mat_atlas)
    for poly in obj.data.polygons:
        poly.material_index = 0


# -----------------------------------------------------------------------------
# 5. ARMATURE RIGGING & 4 NLA ANIMATIONS
# -----------------------------------------------------------------------------

def build_armature_and_animations(mesh_obj):
    """
    Creates Armature with bones for Machine Root, Diamond Core, Plasma Arcs,
    Chamber Pistons, Retrieval Drawer, and Lab Doors, plus 4 NLA tracks:
    1. Idle_Ready
    2. Synthesizing
    3. Drawer_Dispense
    4. Standby_PowerDown
    """
    arm_data = bpy.data.armatures.new("LaboratorySynthesizerArmatureData")
    arm_obj = bpy.data.objects.new("LaboratorySynthesizerArmature", arm_data)
    bpy.context.collection.objects.link(arm_obj)

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')

    eb = arm_data.edit_bones

    b_root = eb.new("Root")
    b_root.head = (0.0, 0.0, 0.0)
    b_root.tail = (0.0, 0.0, 0.35)

    b_mach_base = eb.new("Machine_Base")
    b_mach_base.head = (0.0, 0.0, 0.0)
    b_mach_base.tail = (0.0, 0.0, 0.35)
    b_mach_base.parent = b_root

    b_mach_chassis = eb.new("Machine_Chassis")
    b_mach_chassis.head = (0.0, 0.0, 0.35)
    b_mach_chassis.tail = (0.0, 0.0, 1.35)
    b_mach_chassis.parent = b_mach_base

    b_drawer = eb.new("Retrieval_Drawer")
    b_drawer.head = (0.0, -1.02, 0.52)
    b_drawer.tail = (0.0, -1.22, 0.52)
    b_drawer.parent = b_mach_chassis

    b_diamond = eb.new("Diamond_Core")
    b_diamond.head = (0.0, 0.0, 1.45)
    b_diamond.tail = (0.0, 0.0, 1.75)
    b_diamond.parent = b_mach_chassis

    b_plasma = eb.new("Plasma_Arcs")
    b_plasma.head = (0.0, 0.0, 1.45)
    b_plasma.tail = (0.0, 0.0, 1.65)
    b_plasma.parent = b_diamond

    b_pistons = eb.new("Chamber_Pistons")
    b_pistons.head = (0.0, 0.0, 1.45)
    b_pistons.tail = (0.0, 0.0, 1.85)
    b_pistons.parent = b_mach_chassis

    b_s_door = eb.new("Lab_ServiceDoor")
    b_s_door.head = (2.0, -4.76, 1.20)
    b_s_door.tail = (2.0, -4.76, 2.35)
    b_s_door.parent = b_root

    b_w_door = eb.new("Lab_AirlockDoor")
    b_w_door.head = (-6.76, 0.20, 1.20)
    b_w_door.tail = (-6.76, 0.20, 2.35)
    b_w_door.parent = b_root

    bpy.ops.object.mode_set(mode='OBJECT')

    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm_obj

    for pb in arm_obj.pose.bones:
        pb.rotation_mode = 'XYZ'

    def reset_pose():
        for pb in arm_obj.pose.bones:
            pb.location = (0.0, 0.0, 0.0)
            pb.rotation_euler = (0.0, 0.0, 0.0)
            pb.scale = (1.0, 1.0, 1.0)

    def key_all(frame):
        for pb in arm_obj.pose.bones:
            pb.keyframe_insert(data_path="location", frame=frame)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)
            pb.keyframe_insert(data_path="scale", frame=frame)

    arm_obj.animation_data_create()
    pb_diamond = arm_obj.pose.bones["Diamond_Core"]
    pb_plasma = arm_obj.pose.bones["Plasma_Arcs"]
    pb_pistons = arm_obj.pose.bones["Chamber_Pistons"]
    pb_drawer = arm_obj.pose.bones["Retrieval_Drawer"]
    pb_s_door = arm_obj.pose.bones["Lab_ServiceDoor"]
    pb_w_door = arm_obj.pose.bones["Lab_AirlockDoor"]

    # 1. Idle_Ready (frames 1..60): gentle diamond levitation hover + plasma twinkle + subtle piston pulse
    act_idle = bpy.data.actions.new("Idle_Ready")
    arm_obj.animation_data.action = act_idle
    for f in [1, 16, 31, 46, 60]:
        t = (f - 1) / 59.0
        ang = t * 2.0 * math.pi
        reset_pose()
        # Diamond gentle vertical float and slow spin
        pb_diamond.location = (0.0, 0.018 * math.sin(ang), 0.0)
        pb_diamond.rotation_euler = (0.0, 0.0, ang * 0.5)
        # Subtle energy scaling
        pb_plasma.scale = (1.0 + 0.08 * math.sin(ang * 2.0), 1.0, 1.0 + 0.08 * math.sin(ang * 2.0))
        key_all(f)

    # 2. Synthesizing (frames 1..48): intense high-energy synthesis! Pistons compress, plasma arcs surge, diamond rotates fast
    act_synth = bpy.data.actions.new("Synthesizing")
    arm_obj.animation_data.action = act_synth
    for f in [1, 12, 24, 36, 48]:
        t = (f - 1) / 47.0
        ang = t * 4.0 * math.pi
        reset_pose()
        # Hydraulic compression inward
        pb_pistons.scale = (0.92, 0.92, 0.92)
        # Diamond surges upward and rotates rapidly
        pb_diamond.location = (0.0, 0.045 * math.sin(ang), 0.0)
        pb_diamond.rotation_euler = (0.0, 0.0, ang * 1.5)
        pb_diamond.scale = (1.15, 1.15, 1.15)
        # Plasma electrical discharge expands and contracts
        pulse_s = 1.0 + 0.35 * math.sin(ang * 3.0)
        pb_plasma.scale = (pulse_s, pulse_s, pulse_s)
        key_all(f)

    # 3. Drawer_Dispense (frames 1..36): front retrieval drawer slides out, pauses, then retracts
    act_dispense = bpy.data.actions.new("Drawer_Dispense")
    arm_obj.animation_data.action = act_dispense
    # Frame 1: Closed
    reset_pose()
    key_all(1)
    # Frame 12: Fully extended outward along Y (-0.42m)
    reset_pose()
    pb_drawer.location = (0.0, 0.42, 0.0)  # in local bone space (bone tail points along world -Y)
    pb_diamond.location = (0.0, -0.05, 0.0)
    key_all(12)
    # Frame 24: Paused open
    key_all(24)
    # Frame 36: Retracted closed
    reset_pose()
    key_all(36)

    # 4. Standby_PowerDown (frames 1..30): machine settles into low power standby, doors close, diamond rests
    act_standby = bpy.data.actions.new("Standby_PowerDown")
    arm_obj.animation_data.action = act_standby
    reset_pose()
    key_all(1)

    reset_pose()
    # Settles downward slightly
    pb_diamond.location = (0.0, -0.03, 0.0)
    pb_diamond.scale = (0.85, 0.85, 0.85)
    pb_plasma.scale = (0.20, 0.20, 0.20)
    pb_pistons.scale = (1.05, 1.05, 1.05)
    # Doors closed
    key_all(15)

    reset_pose()
    pb_diamond.location = (0.0, -0.04, 0.0)
    pb_diamond.scale = (0.80, 0.80, 0.80)
    pb_plasma.scale = (0.10, 0.10, 0.10)
    key_all(30)

    # Configure NLA tracks
    for act in [act_idle, act_synth, act_dispense, act_standby]:
        act.use_fake_user = True
        tr = arm_obj.animation_data.nla_tracks.new()
        tr.name = act.name
        st = tr.strips.new(act.name, 1, act)
        st.name = act.name
        tr.mute = (act.name != "Idle_Ready")

    arm_obj.animation_data.action = act_idle
    return arm_obj


# -----------------------------------------------------------------------------
# MAIN BUILD SCRIPT
# -----------------------------------------------------------------------------

def main():
    print("=== BUILDING LABORATORY WITH DIAMOND SYNTHESIZER ===")
    clear_scene()

    # Materials for procedural baking
    materials = {
        "ivory": make_material("src_ivory", (0.86, 0.84, 0.79), metallic=0.10, roughness=0.35),
        "copper": make_material("src_copper", (0.94, 0.48, 0.22), metallic=0.92, roughness=0.20),
        "dark_steel": make_material("src_dark_steel", (0.24, 0.26, 0.29), metallic=0.82, roughness=0.38),
        "steel_light": make_material("src_steel_light", (0.70, 0.72, 0.76), metallic=0.88, roughness=0.24),
        "wall_slate": make_material("src_wall_slate", (0.84, 0.82, 0.78), metallic=0.06, roughness=0.55),
        "dark_slate": make_material("src_dark_slate", (0.32, 0.34, 0.38), metallic=0.25, roughness=0.50),
        "floor_slate": make_material("src_floor_slate", (0.44, 0.46, 0.50), metallic=0.18, roughness=0.60),
        "hazard_yellow": make_material("src_hazard_y", (0.96, 0.72, 0.10), metallic=0.10, roughness=0.40),
        "hazard_black": make_material("src_hazard_k", (0.12, 0.13, 0.15), metallic=0.18, roughness=0.50),
        "crate_wood": make_material("src_crate_wood", (0.60, 0.40, 0.24), metallic=0.05, roughness=0.65),
        "cyan_plasma": make_material("src_cyan_plasma", (0.10, 0.92, 1.00), metallic=0.0, roughness=0.15,
                                     emission=(0.10, 0.95, 1.00), emission_strength=8.0),
        "amber_glow": make_material("src_amber_glow", (1.00, 0.65, 0.15), metallic=0.0, roughness=0.25,
                                    emission=(1.00, 0.62, 0.12), emission_strength=4.5),
    }

    # 1. Build Synthesis Machine
    machine_parts = build_synthesis_machine(materials)

    # 2. Build Laboratory Architecture (Cutaway room)
    room_parts = build_laboratory_room(materials)

    # 3. Build Laboratory Props & Furniture
    prop_parts = build_laboratory_props(materials)

    all_parts = machine_parts + room_parts + prop_parts

    # 4. Join and UV unwrap
    mesh_obj = join_and_uv_unwrap(all_parts)

    # 5. Bake PBR Atlas 2048x2048
    bake_pbr_atlas(mesh_obj, res=2048)

    # 6. Build Armature and 4 NLA Animations
    arm_obj = build_armature_and_animations(mesh_obj)

    # 7. Pack and save .blend file
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

    # 8. Export .glb
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format='GLB',
        export_apply=False,
        export_animations=True,
        export_nla_strips=True,
        export_yup=True,
    )

    # Geometry audit
    deps = bpy.context.evaluated_depsgraph_get()
    eval_obj = mesh_obj.evaluated_get(deps)
    eval_mesh = eval_obj.to_mesh()
    eval_mesh.calc_loop_triangles()
    tris = len(eval_mesh.loop_triangles)
    polys = len(eval_mesh.polygons)
    verts = len(eval_mesh.vertices)
    eval_obj.to_mesh_clear()

    bbox = [mesh_obj.matrix_world @ Vector(c) for c in mesh_obj.bound_box]
    xs = [v.x for v in bbox]
    ys = [v.y for v in bbox]
    zs = [v.z for v in bbox]

    report = {
        "asset": "Laboratory with Diamond Synthesis Machine // Horda Survivor (v001)",
        "triangles": tris,
        "polygons": polys,
        "vertices": verts,
        "budget_max_triangles": 15000,
        "within_budget": tris <= 15000,
        "dimensions_m": {
            "width_x": round(max(xs) - min(xs), 4),
            "length_y": round(max(ys) - min(ys), 4),
            "height_z": round(max(zs) - min(zs), 4),
            "z_min": round(min(zs), 4),
            "z_max": round(max(zs), 4),
        },
        "bones": [b.name for b in arm_obj.data.bones],
        "bone_count": len(arm_obj.data.bones),
        "animations": sorted([a.name for a in bpy.data.actions]),
        "textures_2048": [
            "laboratorio_basecolor.png",
            "laboratorio_orm.png",
            "laboratorio_normal.png",
            "laboratorio_emission.png",
        ],
        "blend_file": BLEND_PATH,
        "glb_file": GLB_PATH,
        "glb_size_bytes": os.path.getsize(GLB_PATH),
    }

    with open(os.path.join(NOTES_DIR, "build_report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("LAB_SYNTHESIZER_BUILD_OK", json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
