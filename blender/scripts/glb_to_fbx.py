"""
glb_to_fbx.py
Convert every character GLB in src/assets/characters/* into Mixamo-ready FBX.

Why: Mixamo's web auto-rigger refuses GLB. We export FBX with textures embedded
so the upload preview shows correctly, normalize the character to ~1.75m tall
(Mixamo's auto-rigger expects roughly human scale to place markers cleanly),
and re-center so feet are on the world floor at the origin.

How to run:
  - From Blender's Scripting tab: open this file -> Run Script.
  - Or from Cowork: invoked automatically through the Blender MCP.

Output: blender/fbx_for_mixamo/{player,brand-brain,designer,editorial,narration,social-media}.fbx
"""
import bpy
import os
import math
from mathutils import Vector

PROJECT_ROOT = "/Users/rochatales/Automations/game-workplace"
SRC_DIR = os.path.join(PROJECT_ROOT, "src/assets/characters")
OUT_DIR = os.path.join(PROJECT_ROOT, "blender/fbx_for_mixamo")
TARGET_HEIGHT_M = 1.75

CHARACTERS = [
    ("player",       "player/player-main.glb"),
    ("brand-brain",  "npcs/brand-brain.glb"),
    ("designer",     "npcs/designer.glb"),
    ("editorial",    "npcs/editorial.glb"),
    ("narration",    "npcs/narration.glb"),
    ("social-media", "npcs/social-media.glb"),
]


def clear_scene():
    """Remove every object + orphaned data block so each conversion starts fresh."""
    if bpy.context.scene.objects:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                  bpy.data.armatures, bpy.data.actions, bpy.data.textures):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def world_bbox():
    """Return (min, max) world-space bounding box across all mesh objects."""
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not objs:
        return None
    mins = Vector((math.inf, math.inf, math.inf))
    maxs = Vector((-math.inf, -math.inf, -math.inf))
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mins.x = min(mins.x, w.x); mins.y = min(mins.y, w.y); mins.z = min(mins.z, w.z)
            maxs.x = max(maxs.x, w.x); maxs.y = max(maxs.y, w.y); maxs.z = max(maxs.z, w.z)
    return mins, maxs


def join_meshes():
    """Join every mesh into a single object so Mixamo treats the character as one body."""
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def convert_one(name: str, rel_glb: str):
    src = os.path.join(SRC_DIR, rel_glb)
    dst = os.path.join(OUT_DIR, f"{name}.fbx")
    if not os.path.exists(src):
        return {"name": name, "status": "missing_input", "src": src}

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=src)

    # Apply existing rotation/scale on the imported objects so further math works in world space.
    bpy.ops.object.select_all(action="SELECT")
    try:
        bpy.ops.object.make_single_user(object=False, obdata=True, material=False, animation=False)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    except RuntimeError:
        pass  # multi-user data on something we don't care about; ignore

    obj = join_meshes()
    if obj is None:
        return {"name": name, "status": "no_mesh"}

    # Normalize size so character is ~1.75m tall (Z up in Blender).
    bb = world_bbox()
    if not bb:
        return {"name": name, "status": "no_bbox"}
    height = bb[1].z - bb[0].z
    if height > 0:
        s = TARGET_HEIGHT_M / height
        obj.scale = (s, s, s)
        bpy.context.view_layer.update()
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Re-center on origin and plant feet on Z=0 floor.
    bb = world_bbox()
    if bb:
        cx = (bb[0].x + bb[1].x) / 2.0
        cy = (bb[0].y + bb[1].y) / 2.0
        obj.location.x -= cx
        obj.location.y -= cy
        obj.location.z -= bb[0].z
        bpy.context.view_layer.update()
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.export_scene.fbx(
        filepath=dst,
        use_selection=True,
        path_mode="COPY",
        embed_textures=True,
        bake_space_transform=False,
        apply_scale_options="FBX_SCALE_NONE",
        object_types={"MESH"},
        mesh_smooth_type="FACE",
        add_leaf_bones=False,
    )

    final_bb = world_bbox()
    final_h = (final_bb[1].z - final_bb[0].z) if final_bb else 0.0
    return {
        "name": name,
        "status": "ok",
        "out": dst,
        "final_height_m": round(final_h, 3),
        "size_mb": round(os.path.getsize(dst) / 1024 / 1024, 2),
        "tris_estimate": len(obj.data.polygons),
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []
    for name, rel in CHARACTERS:
        results.append(convert_one(name, rel))
    return {"target_height_m": TARGET_HEIGHT_M, "results": results}


if __name__ == "__main__":
    summary = main()
    print(summary)
