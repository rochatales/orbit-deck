# Cabine ARES-I — primeira versão para teste do autor

Pedido de 04/11/2026; S1.8a / S6.16 parcial. A referência do autor é copiada
intacta em `referencias/cabine-janelas-brancas.jpg`, também usada em runtime.
As janelas são vazadas por máscara SVG escrita em código; nenhum JPG original
foi editado. O terceiro anexo só orienta o estilo holográfico, sem radar/sonar.

O autor autorizou **loops provisórios locais**. Os dois MP4 são panoramas
renderizados dos GLBs existentes, com uma camada de poeira/névoa em movimento:
Marte avermelhado, Shanghai cinza. Não são uma segunda câmera ao vivo, nem
cinematográficas finais; os detalhes de implantação, portas e luzes do runtime
não são reproduzidos integralmente nesses cenários auxiliares.

- 1280 × 720, H.264 / yuv420p, 24 fps, 6 segundos, sem trilha de áudio.
- `+faststart`; um único vídeo ativo de cada vez. Posters PNG de cada local.
- Hashes, tamanhos e metadados de ffprobe: `manifesto.json`.
- As fontes dos mapas e os anexos do autor ficam intactos.

Regerar com Blender 5.1 e ffmpeg/ffprobe instalados:

```bash
node art-source/ui/cockpit/scripts/build_videos.mjs --render
```

`BLENDER=/caminho/para/blender` permite trocar o executável. Sem `--render`,
reutiliza os posters existentes e só gera os vídeos/manifesto. A animação da
névoa é periódica para fechar o loop. O jogo não executa esses geradores.

A arte da cabine é ilustrativa: comandos reais estão nos painéis React sobre
ela. Não há medidores fictícios de combustível/escudo nem mapa sonar. O aceite
visual e a eventual troca por vídeos finais permanecem com o autor.
