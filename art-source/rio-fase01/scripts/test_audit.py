"""Regressão por falhas injetadas em memória; nunca salva a cena alterada."""
import bpy
import sys
import io
import json
import math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from contextlib import redirect_stdout
from pathlib import Path

ART=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ART/'scripts'))
from audit_view import audit
bpy.ops.wm.open_mainfile(filepath=str(ART/'blend/rio_fase01_v002.blend'))
source=bpy.data.collections['01_KIT_LAYOUT_EDITAVEL']
results=[]

def check(name,expected=None):
    with redirect_stdout(io.StringIO()):
        try:
            report=audit(write_report=False)
        except RuntimeError as error:
            assert expected and 'planta falhou' in str(error), str(error)
        else:
            assert not expected, 'A auditoria deixou passar: '+name
            assert report['erros']==[]
    results.append(dict(caso=name,resultado='passou'))

check('Fonte e GLBs finais válidos')
# Compara pontos no chão com a projeção da prancha SVG, em pixels.
scene=bpy.context.scene
camera=bpy.data.objects['CAM_Jogo']
c=math.cos(math.pi/4);s=math.sin(math.atan2(13,18.38))
corners=[((x-z)*c,(x+z)*c*s) for x in [-67,51] for z in [-70,70]]
min_x=min(p[0] for p in corners);min_y=min(p[1] for p in corners)
for x,z in [(-51,-54),(51,-54),(-51,54),(51,54),(25,47),(0,0)]:
    uv=world_to_camera_view(scene,camera,Vector((x,-z,0)))
    expected=(((x-z)*c-min_x+6)*7,((x+z)*c*s-min_y+6)*7+30)
    delta=max(abs(uv.x*1361-expected[0]),abs((1-uv.y)*851-expected[1]))
    assert delta<1, ('Enquadramento',x,z,delta)
results.append(dict(caso='Câmera coincide com a planta SVG no chão, tolerância de 1 px',resultado='passou'))
obj=next(o for o in source.objects if o.name.startswith('Cornija') and o.get('familia')=='Predio_F0')
old=obj.location.copy()
obj.location.x+=.25
check('Desvio de 25 cm de um prédio é rejeitado',True)
obj.location=old
# Um poste copiado simula invasão de áreas reservadas sem alterar fontes em disco.
template=next(o for o in source.objects if o.name=='Poste')
probe=template.copy();probe.data=template.data
probe['familia']='Teste_invasao';source.objects.link(probe)
for name,x,z in [('Reserva de pouso',25,47),('Pista da praia',7,0),('Linha da água',37,0)]:
    probe.location=(x,-z,2)
    check(name+' rejeita geometria invasora',True)
bpy.data.objects.remove(probe,do_unlink=True)
check('Restauração em memória preserva a cena válida')
(ART/'notas/testes-auditoria-v002.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('REGRESSAO_AUDITORIA',len(results),'casos passaram')
