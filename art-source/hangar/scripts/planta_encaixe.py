"""Planta vetorial de estudo a partir do v007 e das medidas da v002; sem runtime."""
import json,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];H=ROOT/'art-source/hangar';OUT=H/'renders/v002'
m=json.loads((ROOT/'src/assets/colony-v007.manifest.json').read_text());b=json.loads((H/'notas/build_report_v002.json').read_text());fit=json.loads((H/'notas/encaixe_v002.json').read_text())
S=34;X0=440;Z0=280
X=lambda x:X0+x*S
Y=lambda z:Z0+z*S
els=['<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1450" viewBox="0 0 1320 1450"><defs><pattern id="ramp" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0L10 10" stroke="#7bb4c4" stroke-opacity=".25"/></pattern><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#92f5b4"/></marker></defs><rect width="1320" height="1450" fill="#0b171e"/><g font-family="Arial,sans-serif">']
def text(x,y,s,size=18,color='#ddeaf0',anchor='start',bold=False):els.append(f'<text x="{x:.1f}" y="{y:.1f}" fill="{color}" font-size="{size}" text-anchor="{anchor}" font-weight="{700 if bold else 400}">{html.escape(s)}</text>')
def rect(a,c,d,e,fill,stroke='#537887',dash=None,opacity=1):els.append(f'<rect x="{X(a):.2f}" y="{Y(c):.2f}" width="{(d-a)*S:.2f}" height="{(e-c)*S:.2f}" fill="{fill}" fill-opacity="{opacity}" stroke="{stroke}" stroke-width="2"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def line(a,c,d,e,color='#95c7d6',width=2,dash=None):els.append(f'<path d="M{X(a):.2f} {Y(c):.2f}L{X(d):.2f} {Y(e):.2f}" stroke="{color}" stroke-width="{width}" fill="none"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def area(id):return next(a for a in m['walkableAreas'] if a['id']==id)
def boxarea(a,fill,stroke='#537887',dash=None):rect(a['minX'],a['minZ'],a['maxX'],a['maxZ'],fill,stroke,dash)
text(62,55,'HANGAR · IMPLANTAÇÃO v002',34,bold=True);text(62,91,'Parada A · proposta medida sobre a colônia v007 · sem alteração de runtime',20,'#9db5c3')
for z in range(-4,32,2):line(-10.5,z,11.5,z,'#19313b',1);text(64,Y(z)+6,f'{z} m',14,'#89a5b3')
for x in range(-10,12,2):line(x,-4,x,31,'#19313b',1);text(X(x),Y(-4)-12,str(x),14,'#89a5b3','middle')
rect(-4,-4,4,4,'#26443e','#75aa8c');text(X(0),Y(-1),'PRAÇA / HUB v007',19,anchor='middle',bold=True);text(X(0),Y(.1),'sala central',16,'#a8cabc','middle')
boxarea(area('south-connector-meeting'),'#234a54');text(X(0),Y(7),'NORTE',16,'#b5d9e6','middle');text(X(0),Y(8),'praça → Hangar',16,'#b5d9e6','middle')
boxarea(area('exterior-south-path'),'#203c36','#5a8e76')
ref=area('coffee-nook');boxarea(ref,'#2c4c3d','#83ba91');text(X(7.2),Y(14.8),'REFEITÓRIO',17,anchor='middle',bold=True);text(X(7.2),Y(15.55),'preservado',15,'#a6d6b1','middle')
# Proposta do piso de ligação: 5cm sobrepostos ao piso do Hangar.
rect(4,13.9,5.3,16.1,'#235a6e','#84cfe4');line(4.5,13.9,4.5,16.1,'#f5b95f',2,'5 4')
rect(-4.025,fit['placement']['z']-3.22,4.025,fit['placement']['z']+3.22,'#284955','#7eb7c9')
for a,c,d,e in [(-4.2,11.5,-1.1,11.5),(1.1,11.5,4.2,11.5),(-4.05,11.5,-4.05,17.8),(4.05,11.5,4.05,13.9),(4.05,16.1,4.05,17.8),(-4.2,17.8,-2.45,17.8),(2.45,17.8,4.2,17.8)]:line(a,c,d,e,'#b9d1dc',5)
for p in b['components']:
 if p['name'].startswith(('Side_Cooler','Telemetry_U')):
  mn,mx=p['min'],p['max'];rect(mn[0],b['placement']['z']-mx[1],mx[0],b['placement']['z']-mn[1],'#44616b','#8ba3a9')
# Equipamentos internos em projeção, não colisores instalados.
rect(1.0,12.125,2.81,14.725,'#725a35','#dbb36a');text(X(1.9),Y(13.5),'carga',13,'#ffe3b1','middle')
rect(-1.54,15.245,-.94,15.705,'#725a35','#dbb36a')
rect(-2.45,b['ramp']['thresholdZ'],2.45,b['ramp']['endZ'],'#345460','#91c8d8');rect(-2.45,b['ramp']['thresholdZ'],2.45,b['ramp']['endZ'],'url(#ramp)','#91c8d8')
text(X(0),Y(19),'RAMPA +Z',16,anchor='middle',bold=True)
# Contornos removidos somente na futura integração: fonte continua intacta.
boxarea(area('meeting-suite'),'none','#efb468','8 5');boxarea(area('meeting-exterior-airlock'),'none','#efb468','6 5')
line(-1.1,11.5,1.1,11.5,'#74f3b4',6);line(4.05,13.9,4.05,16.1,'#74f3b4',6)
text(X(-2.0),Y(12.4),'HANGAR',18,anchor='middle',bold=True)
rect(-2,25,2,27.4,'#34664e','#98efb8');text(X(0),Y(26.1),'PASSARELA',15,'#dcffe7','middle');text(X(0),Y(26.8),'X ±2',13,'#dcffe7','middle')
c=fit['consoleWest'];boxarea(c,'#955d31','#ffc476');text(X(-3),Y(24.9),'Console Oeste',15,'#ffd393','middle')
# Caminhos de estudo; ainda não são validação Rapier.
route=[(0,2),(0,11.5),(0,15.5),(0,20.15),(0,24.3)]
els.append('<polyline points="'+' '.join(f'{X(x):.1f},{Y(z):.1f}' for x,z in route)+'" fill="none" stroke="#92f5b4" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#arrow)"/>')
r=[(7.2,15),(5,15),(4.05,15.5),(0,15.5)];els.append('<polyline points="'+' '.join(f'{X(x):.1f},{Y(z):.1f}' for x,z in r)+'" fill="none" stroke="#92f5b4" stroke-width="3" marker-end="url(#arrow)"/>')
line(0,27.6,0,29.5,'#92f5b4',3);els.append(f'<circle cx="{X(0)}" cy="{Y(29.5)}" r="7" fill="#92f5b4"/>');text(X(0)+18,Y(29.5)+6,'Embarque (0; 29,5)',17,'#b8f5ce')
# Cotas e notas laterais.
line(-6.2,20.15,-6.2,25,'#81c4d7',2);line(-6.4,20.15,-6,20.15);line(-6.4,25,-6,25);text(X(-6.2)-12,Y(22.7),'4,85 m',18,'#a8ddec','end',True)
text(X(-9.9),Y(11.4),'Z = 11,50',17,'#bbd9e6',bold=True);line(-9.8,11.6,-4.3,11.5,'#6b93a2',1)
text(X(-9.9),Y(14.7),'Doca antiga',16,'#efb468');text(X(-9.9),Y(15.4),'9 × 6 m',15,'#efb468');line(-7,15,-4.55,14.5,'#efb468',1)
text(X(-9.9),Y(18.9),'Antecâmara',16,'#efb468');text(X(-9.9),Y(19.6),'a remover no runtime',14,'#efb468');line(-5.8,19,-1.35,18.5,'#efb468',1)
text(X(-9.9),Y(30.6),'N ↑  −Z    |    Sul / deck ↓  +Z',15,'#9db9c7')
# Cards de leitura rápida.
def card(y,title,lines):
 els.append(f'<rect x="905" y="{y}" width="360" height="{60+len(lines)*27}" rx="8" fill="#122a35" stroke="#315565"/>');text(928,y+32,title,20,'#b9e2ef',bold=True)
 for i,line_ in enumerate(lines):text(928,y+65+i*27,line_,17,'#d5e5eb')
card(146,'POSIÇÃO MEDIDA',['Eixo X = 0; rotação Y = 0','Centro do asset: Z = 14,575','Parede norte: Z = 11,50','Rampa voltada para +Z'])
card(332,'PORTAS E LIGAÇÃO LESTE',['Largura v007: 2,20 m','Vão vertical: 2,40 m','Parede leste: X = 4,05','Não encurta: alonga 0,45 m','Piso novo desde X = 4,00','até o Refeitório: X = 5,30'])
card(572,'RAMPA / DECK',['Rampa original: Z = 19,995','v002: ponta em Z = 20,150','Extensão proposta: 0,155 m','Topo: 0,16 → 0,02 m','Inclinação: 5,94% (3,40°)','Folga até passarela: 4,85 m','Folga Z ao console: 5,388 m'])
card(839,'LER OS CONTORNOS',['Dourado tracejado: removidos','Azul: Hangar / ligação nova','Verde: preservado / caminho','Areia: equipamentos internos','Telhado em TETO_Hangar','Folhas de porta independentes'])
card(1079,'NESTA PARADA A',['GLB v001 e .blend intactos','Renders reais da variante v002','Sem código/asset em src/','Sem remover salas no jogo','Rotas de estudo, sem física','Aprovação do autor pendente'])
text(62,1418,'Fonte: marsMasterplan.json + colony-v007.manifest.json + encaixe_v002.json · medidas em metros',15,'#89a5b3')
els.append('</g></svg>');(OUT/'planta_encaixe.svg').write_text('\n'.join(els))
