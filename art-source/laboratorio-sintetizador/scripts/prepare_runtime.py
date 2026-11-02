"""Manifesto de implantação e caixas simples; fonte v001 permanece byte a byte.
Executar com Blender --background --python este arquivo, na worktree da tarefa.
Coordenadas das caixas reproduzem os sólidos de build_laboratorio.py (X,Y,Z Blender).
"""
import bpy, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
PROJECT=ROOT.parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blend/laboratorio_sintetizador_v001.blend'))
obj=bpy.data.objects['LaboratorySynthesizerMesh']
obj.data.calc_loop_triangles()
placement={'x':13.5,'y':0,'z':-12.5,'rotationY':0,'scale':1}
boxes=[]
def box(name, center, size):
 x,y,z=center; w,d,h=size
 p={'x':13.5+x,'y':z,'z':-12.5-y}
 bounds={'minX':p['x']-w/2,'maxX':p['x']+w/2,'minY':z-h/2,'maxY':z+h/2,'minZ':p['z']-d/2,'maxZ':p['z']+d/2}
 result={'id':'LAB_COL_'+name,'position':p,'halfExtents':[w/2,h/2,d/2],'rotation':{'x':0,'y':0,'z':0,'w':1},'bounds':bounds}
 boxes.append(result); return result
box('NorthWall',(0,5,1.8),(14,.45,3.6))
box('EastWall',(7,0,1.8),(.45,10,3.6))
box('SouthWestWall',(-3,-4.78,.445),(7.65,.51,.89))
box('SouthEastWall',(5,-4.78,.445),(3.65,.51,.89))
box('WestSouthWall',(-6.78,-2.85,.445),(.51,3.95,.89))
box('WestNorthWall',(-6.78,3.05,.445),(.51,3.55,.89))
for name,c,s in [('SouthFrameW',(.85,-4.78,1.25),(.22,.49,2.5)),('SouthFrameE',(3.15,-4.78,1.25),(.22,.49,2.5)),('SouthLintel',(2,-4.78,2.5),(2.5,.49,.22)),('WestFrameS',(-6.78,-.85,1.25),(.49,.22,2.5)),('WestFrameN',(-6.78,1.25,1.25),(.49,.22,2.5)),('WestLintel',(-6.78,.2,2.5),(.49,2.3,.22))]: box(name,c,s)
box('CornerNE',(6.65,4.65,1.8),(.70,.70,3.6))
box('CornerSW',(-6.65,-4.65,.425),(.70,.70,.85))
box('Machine',(0,0,1.23),(3.45,2.65,2.46))
box('AnalysisBench',(-2.4,4.3,.445),(2.9,.76,.89))
box('ReceptionBench',(-5.5,-2.6,.445),(.76,2.5,.89))
for i,(c,s) in enumerate([((-4.8,-3.8,.43),(.65,.65,.86)),((-4.8,-3,.22),(.55,.55,.44)),((-.4,4.35,.28),(.65,.65,.56)),((.35,4.35,.24),(.55,.55,.48))]):box('Crate'+str(i),c,s)
for i,y in enumerate([2,2.9,3.8]):box('Locker'+str(i),(6.21,y,1.1),(.63,.8,2.2))
box('Console',(5.9,.2,.55),(.75,1.2,1.1))
static=boxes[:]
# Folhas e revestimentos são um único colisor por porta, deslocado junto ao osso.
south=box('ServiceDoor',(2,-4.775,1.2),(2.05,.13,2.35))
west=box('AirlockDoor',(-6.775,.2,1.2),(.13,1.85,2.35))
manifest=json.loads((PROJECT/'src/assets/colony-v007.manifest.json').read_text())
parts=[p['id'] for p in manifest['parts'] if p['ambiente']=='smart-lab']
# Demarcação provisória da zona A dentro da nova pegada não é um edifício.
for p in manifest['parts']:
 b=p['bounds']
 if ((p['id'].startswith('Demarcacao_build-zone-a') and b['minZ'] < -6)
     or p['id'].startswith('Suprimentos_A_') or p['id'].startswith('Cerca_') or p['id']=='Grade_build-zone-a'): parts.append(p['id'])
areas=[{'id':'smart-lab','minX':6.2,'maxX':20.8,'minZ':-17.8,'maxZ':-7.2}, {'id':'lab-west-pad','minX':5.3,'maxX':6.5,'minZ':-13.7,'maxZ':-11.7}, {'id':'lab-south-pad','minX':14.3,'maxX':16.7,'minZ':-7.5,'maxZ':-6}]
connectors=[{'id':'lab-quarters-connector','minX':9.8,'maxX':16.2,'minZ':-7,'maxZ':-5.8}, {'id':'eden-lab-connector','minX':3.5,'maxX':6.2,'minZ':-11.2,'maxZ':-9.8}, {'id':'lab-west-elbow','minX':4.8,'maxX':6.2,'minZ':-13.4,'maxZ':-11.2}]
result={'placement':placement,'dimensions':{'width':14,'depth':10},'triangles':len(obj.data.loop_triangles),'materials':len(obj.data.materials),'staticCuboids':static,'dynamicCuboids':[south,west], 'doors':[{'bone':'Lab_ServiceDoor','collider':south['id'],'x':15.5,'z':-7.74,'slide':[2.3,0,0]},{'bone':'Lab_AirlockDoor','collider':west['id'],'x':6.74,'z':-12.7,'slide':[0,0,-2.1]}], 'console':{'x':18.4,'z':-12.7,'radius':1.7},'areas':areas,'connectors':connectors,'removedParts':parts,'removedColliders':[c['id'] for c in manifest['colliders'] if c['id'] in ['interior-37','interior-38'] or 'smart-lab' in c['id'] or c['id'].startswith('caixa-a-') or c['id'].startswith('cerca-')], 'removedAreas':['smart-lab','lab-quarters-connector','eden-lab-connector','open-eden-lab-circulation'],'floorCutAreas':[{'minX':6.15,'maxX':20.85,'minZ':-17.85,'maxZ':-7.15},{'minX':9.2,'maxX':11.8,'minZ':-8,'maxZ':-6.00846386}], 'sourceSha256':hashlib.sha256((ROOT/'export/laboratorio_sintetizador_v001.glb').read_bytes()).hexdigest()}
(PROJECT/'src/assets/laboratorio/laboratorio-v001.manifest.json').write_text(json.dumps(result,indent=2)+'\n')
groups={g.name:[] for g in obj.vertex_groups}
for v in obj.data.vertices:
 for g in v.groups:
  if g.weight>.99:groups[obj.vertex_groups[g.group].name].append(tuple(v.co))
report={'triangles':result['triangles'],'polygons':len(obj.data.polygons),'vertices':len(obj.data.vertices),'materials':len(obj.data.materials),'groups':{k:{'vertices':len(v),'min':[min(p[a] for p in v) for a in range(3)],'max':[max(p[a] for p in v) for a in range(3)]} for k,v in groups.items() if v},'clips':[a.name for a in bpy.data.actions], 'staticBoxes':len(static),'movingBoxes':2,'roof':'Ausente por decisão da arte: corte 90 graus permanente; não há teto a ocultar.'}
(ROOT/'notas/validacao-runtime.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='groups'}))
