"""
bake_npc_glb.py
Parameterized bake script for any rigged NPC. Same logic as bake_player_glb
but takes a config object so it can be reused across all 5 NPCs.

Each NPC config maps:
  - npc_id           -> identifies which NPC (used for output filename)
  - master_fbx       -> rigged T-pose with full skin (any Mixamo download
                        with skin works)
  - clips: list of (clean_label, anim_fbx_filename)
  - output_glb       -> path to overwrite in src/assets/characters/npcs/

Per-clip behavior matches the player bake:
  - Action renamed to clean_label
  - Horizontal hips translation zeroed (Rapier handles world translation)
  - Each action gets its own NLA strip so the glTF exporter preserves them
  - Idle is set as the active action

Usage from Blender Scripting tab or via Blender MCP:
    import bake_npc_glb
    bake_npc_glb.bake('narration')
    # or for all defined NPCs at once:
    bake_npc_glb.bake_all()
"""
import bpy
import os

PROJECT_ROOT = "/Users/rochatales/Automations/game-workplace"
RIGGED_DIR   = os.path.join(PROJECT_ROOT, "blender/rigged")


# Per-NPC anim manifest. Each entry maps the clean label we'll use at runtime
# to the filename Mixamo gave us. Add NPCs here as their files arrive.
NPC_CONFIGS = {
    "narration": {
        "master_fbx": "narration-rigged-idle.fbx",  # any with-skin file works
        "clips": [
            ("Idle",      "narration-rigged-idle.fbx"),
            ("Talk",      "narration-rigged-Talking.fbx"),
            ("Walk",      "narration-rigged-walking.fbx"),
            ("Sit",       "narration-rigged-sitting.fbx"),
            ("WalkStart", "narration-rigged-startwalking.fbx"),
            ("WalkStop",  "narration-rigged-stopwalking.fbx"),
        ],
        "output_glb": "src/assets/characters/npcs/narration.glb",
    },
    # NPCs below get filled in as you upload their rigged FBXs.
    # The pattern (filename -> clip label) is identical, only the prefix changes.
    "brand-brain": {
        "master_fbx": "brand-brain-rigged-Breathing-Idle.fbx",
        "clips": [
            ("Idle", "brand-brain-rigged-Breathing-Idle.fbx"),
            ("Talk", "brand-brain-rigged-talking.fbx"),
        ],
        "output_glb": "src/assets/characters/npcs/brand-brain.glb",
    },
    "designer": {
        "master_fbx": "designer-rigged-Breathing-Idle.fbx",
        "clips": [
            ("Idle", "designer-rigged-Breathing-Idle.fbx"),
            ("Talk", "designer-rigged-talking.fbx"),
        ],
        "output_glb": "src/assets/characters/npcs/designer.glb",
    },
    "editorial": {
        "master_fbx": "editorial-rigged-Breathing-Idle.fbx",
        "clips": [
            ("Idle", "editorial-rigged-Breathing-Idle.fbx"),
            ("Talk", "editorial-rigged-talking.fbx"),
        ],
        "output_glb": "src/assets/characters/npcs/editorial.glb",
    },
    "social-media": {
        "master_fbx": "social-media-rigged-Breathing-Idle.fbx",
        "clips": [
            ("Idle", "social-media-rigged-Breathing-Idle.fbx"),
            ("Talk", "social-media-rigged-talking.fbx"),
        ],
        "output_glb": "src/assets/characters/npcs/social-media.glb",
    },
}


def clear_scene():
    if bpy.context.scene.objects:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
    # Hard-purge actions: even fake-user'd ones from previous runs must go.
    for action in list(bpy.data.actions):
        action.use_fake_user = False
        bpy.data.actions.remove(action, do_unlink=True)
    for blk in (bpy.data.armatures, bpy.data.meshes, bpy.data.materials,
                bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for item in list(blk):
            if item.users == 0:
                blk.remove(item)


def find_armature():
    return next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)


def find_mesh():
    return next((o for o in bpy.context.scene.objects if o.type == "MESH"), None)


def iter_action_fcurves(action):
    """Walk the slotted-action tree (Blender 4.4+/5.x) to yield every fcurve."""
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    yield fc


def strip_horizontal_hips_translation(action):
    """Zero X and Y components of mixamorig:Hips location keyframes."""
    target_path = 'pose.bones["mixamorig:Hips"].location'
    for fc in list(iter_action_fcurves(action)):
        if fc.data_path == target_path and fc.array_index in (0, 1):
            for kp in fc.keyframe_points:
                kp.co[1] = 0.0
                kp.handle_left[1] = 0.0
                kp.handle_right[1] = 0.0


def import_action_from_fbx(anim_fbx_path):
    """Import an animation FBX, pull out its action, delete the imported
    objects, return the orphan-but-fake-user'd action."""
    pre = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=anim_fbx_path)
    new_objs = [o for o in bpy.context.scene.objects if o not in pre]

    src_arm = next((o for o in new_objs if o.type == "ARMATURE"), None)
    action = None
    if src_arm and src_arm.animation_data and src_arm.animation_data.action:
        action = src_arm.animation_data.action
        src_arm.animation_data.action = None
        action.use_fake_user = True

    bpy.ops.object.select_all(action="DESELECT")
    for o in new_objs:
        o.select_set(True)
    bpy.ops.object.delete(use_global=False)

    return action


def push_action_to_nla(arm_obj, label, action):
    track = arm_obj.animation_data.nla_tracks.new()
    track.name = label
    track.strips.new(name=label,
                     start=int(action.frame_range[0]),
                     action=action)


def bake(npc_id: str):
    if npc_id not in NPC_CONFIGS:
        return {"status": "error", "msg": f"unknown npc: {npc_id}"}
    cfg = NPC_CONFIGS[npc_id]

    master_path = os.path.join(RIGGED_DIR, cfg["master_fbx"])
    if not os.path.exists(master_path):
        return {"status": "error", "msg": f"master FBX missing: {master_path}"}

    clip_paths = [(label, os.path.join(RIGGED_DIR, fname))
                  for label, fname in cfg["clips"]]
    missing = [p for _, p in clip_paths if not os.path.exists(p)]
    if missing:
        return {"status": "error", "msg": f"clip FBX missing: {missing[0]}"}

    output_path = os.path.join(PROJECT_ROOT, cfg["output_glb"])
    backup_path = output_path + ".bak"

    clear_scene()
    bpy.ops.import_scene.fbx(filepath=master_path)
    master_arm = find_armature()
    master_mesh = find_mesh()
    if not master_arm or not master_mesh:
        return {"status": "error", "msg": "master rig has no armature or mesh"}

    master_arm.name = f"{npc_id}-Armature"
    master_mesh.name = f"{npc_id}-Mesh"

    if not master_arm.animation_data:
        master_arm.animation_data_create()
    master_arm.animation_data.action = None

    baked = []
    for label, path in clip_paths:
        action = import_action_from_fbx(path)
        if not action:
            baked.append({"label": label, "status": "no_action"})
            continue
        action.name = label
        strip_horizontal_hips_translation(action)
        push_action_to_nla(master_arm, label, action)
        baked.append({
            "label": label,
            "status": "ok",
            "frames": int(action.frame_range[1] - action.frame_range[0]) + 1,
            "duration_s": round((int(action.frame_range[1] - action.frame_range[0]) + 1) / 30.0, 2),
        })

    idle = bpy.data.actions.get("Idle")
    if idle:
        master_arm.animation_data.action = idle

    keep = {label for label, _ in cfg["clips"]}
    for action in list(bpy.data.actions):
        if action.name not in keep:
            action.use_fake_user = False
            try:
                bpy.data.actions.remove(action, do_unlink=True)
            except RuntimeError:
                pass

    if os.path.exists(output_path):
        os.replace(output_path, backup_path)

    bpy.ops.object.select_all(action="DESELECT")
    master_arm.select_set(True)
    master_mesh.select_set(True)
    bpy.context.view_layer.objects.active = master_arm

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_apply=False,
        export_yup=True,
    )

    return {
        "status": "ok",
        "npc_id": npc_id,
        "output": output_path,
        "output_size_mb": round(os.path.getsize(output_path) / 1024 / 1024, 2),
        "backup_kept": os.path.exists(backup_path),
        "clips": baked,
    }


def bake_all():
    """Runs bake() on every NPC whose required FBXs exist on disk."""
    out = {}
    for npc_id in NPC_CONFIGS:
        cfg = NPC_CONFIGS[npc_id]
        master = os.path.join(RIGGED_DIR, cfg["master_fbx"])
        if not os.path.exists(master):
            out[npc_id] = {"status": "skipped", "reason": "no master fbx yet"}
            continue
        out[npc_id] = bake(npc_id)
    return out


if __name__ == "__main__":
    print(bake_all())
