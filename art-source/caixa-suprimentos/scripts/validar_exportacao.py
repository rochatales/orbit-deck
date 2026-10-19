"""Prova de escala, pivôs e animação na reimportação, sem salvar a fonte."""
import bpy,json,hashlib
from pathlib import Path
ART=Path(__file__).resolve().parents[1];ROOT=ART.parents[1];SRC=ART/'blend/caixa-suprimentos-v001.blend';GLB=ROOT/'src/assets/props/caixa-suprimentos/caixa-suprimentos-v001.glb'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=sha(SRC);bpy.ops.wm.open_mainfile(filepath=str(SRC));names=['LID_Pivot','LOCK_Left','LOCK_Right','VFX_Reveal'];frames=[1,7,16,23,32,39,60,73]
samples={};bounds=[]
for f in frames:
 bpy.context.scene.frame_set(f);bpy.context.view_layer.update();samples[f]={n:[list(row) for row in bpy.data.objects[n].matrix_world] for n in names}
# Bounds at frame 1 with visual effect excluded.
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
from mathutils import Vector
for o in bpy.data.collections['02_ASSET_EXPORTAVEL'].objects:
 if o.type=='MESH' and o.get('papel')=='visual':bounds.extend([tuple(o.matrix_world@Vector(v)) for v in o.bound_box])
mins=[min(p[i] for p in bounds) for i in range(3)];maxs=[max(p[i] for p in bounds) for i in range(3)]
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(GLB))
errors=[]
for f in frames:
 # glTF começa em t=0; na fonte Blender t=0 corresponde ao quadro 1.
 bpy.context.scene.frame_set(f-1);bpy.context.view_layer.update()
 for n in names:
  m=bpy.data.objects[n].matrix_world;delta=max(abs(m[i][j]-samples[f][n][i][j]) for i in range(4) for j in range(4));errors.append(dict(frame=f,node=n,maxMatrixDelta=delta))
result=dict(sourceSHA256=before,sourceUnchanged=sha(SRC)==before,glbSHA256=sha(GLB),boundsBlender=dict(min=mins,max=maxs),maximumMatrixDelta=max(x['maxMatrixDelta'] for x in errors),samples=errors)
(ART/'notas/exportacao.json').write_text(json.dumps(result,indent=2)+'\n')
print('RESULTADO',result['maximumMatrixDelta'], 'fonte preservada:',result['sourceUnchanged'])
assert result['sourceUnchanged'];assert result['maximumMatrixDelta']<.00001
