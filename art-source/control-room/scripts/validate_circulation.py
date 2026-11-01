"""Proposed AABB + circle clearance, 5 cm grid; not a runtime gameplay approval."""
from pathlib import Path
import json,math,collections
ROOT=Path(__file__).resolve().parents[1];m=json.loads((ROOT/'export/manifesto_control_room_v001.json').read_text());cols=[c for c in m['colliders_proposed'] if c['id']!='COL_CR_Piso']
def local(c):return(c['center']['x'],-c['center']['z']-10.5,c['halfExtents']['x'],c['halfExtents']['z'])
boxes=[local(c) for c in cols];report={}
for radius in [.32,.36]:
 def free(node):
  x=node[0]*.05;y=node[1]*.05
  if abs(x)>3.8 or abs(y)>3.55:return False
  # Outside access strips only at entrances; forbid an outside shortcut around the building.
  if abs(x)>3.3 and not (x>0 and abs(y)<.65):return False
  if abs(y)>3.05 and not (y<0 and abs(x)<.65):return False
  return all(math.hypot(max(abs(x-cx)-hx,0),max(abs(y-cy)-hy,0))>=radius-1e-8 for cx,cy,hx,hy in boxes)
 start=(0,-70);targets={'console':(0,-32),'east_door':(74,0),'rack_front':(-50,34),'north_console':(24,30)}
 assert free(start);q=collections.deque([start]);prev={start:None}
 while q:
  a=q.popleft()
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
   b=(a[0]+dx,a[1]+dy)
   if b not in prev and free(b):prev[b]=a;q.append(b)
 paths={}
 for name,target in targets.items():
  assert target in prev,(radius,name)
  path=[];n=target
  while n is not None:path.append([n[0]*.05,n[1]*.05]);n=prev[n]
  paths[name]=path[::-1]
 report[str(radius)]={'reachable_targets':list(targets),'grid_step_m':.05,'paths_local_blender_xy':paths}
# Existing EDEN interaction is centered at (0,-10.5), radius 2.7.
p=m['interaction']['position'];d=math.hypot(p['x'],p['z']+10.5);assert d<=2.7
report['interaction_distance_m']=d;report['doors_assumed_open']=True
(ROOT/'notas/circulacao.json').write_text(json.dumps(report,indent=2));print('4 destinos alcançados com raios .32/.36; interação a',d,'m')
