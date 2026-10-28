"""Mapa vetorial das caixas reais do runtime, com a rota de entrada no banheiro."""
import json,html
from pathlib import Path
OUT=Path(__file__).resolve().parents[1];q=json.loads((OUT/'notas/runtime-v006.json').read_text())
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900"><rect width="1280" height="900" fill="#10232b"/><g font-family="Arial,sans-serif">']
def text(x,y,s,size=20,color='#e5f0f1'):svg.append(f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}">{html.escape(s)}</text>')
def P(x,z):return (60+(x-6)*65,160+(z+5)*65)
def rectangle(b,color,opacity=.35,dash=False):
 x,y=P(b['minX'],b['minZ']);w=(b['maxX']-b['minX'])*65;h=(b['maxZ']-b['minZ'])*65
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" fill-opacity="{opacity}" stroke="{color}" stroke-width="2"'+(' stroke-dasharray="6 4"' if dash else '')+'/>')
text(50,55,'QUARTEL v006 · COLISORES INTERNOS',32);text(50,94,'Caixas simples medidas da arte · X → leste, Z → sul · porta do banheiro 1,20 × 2,00 m',20,'#a9c8ce')
rectangle(q['wallArea'],'#d6e0dd',.05)
for c in q['staticCuboids']:
 if not c['id'].startswith(('COL_Interior_','COL_Bathroom_')):continue
 color='#eeb475' if 'Toilet' in c['id'] else '#cadbdc' if c['kind']=='interior-wall' else '#6ea5e5' if c['kind']=='support' else '#73c79d'
 rectangle(c['bounds'],color)
for c in q['dynamicCuboids']:
 if c['side']=='bathroom':
  rectangle(c['bounds'],'#efdb70',.45)
  moved={**c['bounds'],'minX':c['bounds']['minX']+c['slide']['x'],'maxX':c['bounds']['maxX']+c['slide']['x'],'minZ':c['bounds']['minZ']+c['slide']['z'],'maxZ':c['bounds']['maxZ']+c['slide']['z']}
  rectangle(moved,'#efdb70',.05,True)
route=[(12,0),(12,2.9),(13.8,2.9),(15.5,2.9),(15.5,3.15),(16.1,3.15)]
svg.append('<polyline points="'+' '.join(f'{P(x,z)[0]},{P(x,z)[1]}' for x,z in route)+'" fill="none" stroke="#96e4f5" stroke-width="4"/>')
x,y=P(13.125,2.9);svg.append(f'<circle cx="{x}" cy="{y}" r="{.32*65}" fill="none" stroke="#ffffff" stroke-width="2"/>')
text(875,215,'LEGENDA',25)
for i,(label,color) in enumerate([('Paredes do banheiro','#cadbdc'),('Móveis / armários / pia','#73c79d'),('Privada','#eeb475'),('Apoio do chuveiro','#6ea5e5'),('Porta: fechada / recolhida','#efdb70'),('Rota verificada no Rapier','#96e4f5')]):text(875,265+i*42,label,20,color)
for i,s in enumerate(['3 beliches · 6 armários','Mesa e bancos separados','4 caixas nas divisórias','77 caixas estáticas no total','10 caixas de folhas móveis','Círculo: raio real de 0,32 m']):text(875,570+i*34,s,19)
text(50,850,'Paredes e móveis bloqueiam. Rota praça → quartel → Laboratório preservada. Aceite do autor pendente.',20)
svg.append('</g></svg>');(OUT/'renders/planta-colisores-v006.svg').write_text('\n'.join(svg))
