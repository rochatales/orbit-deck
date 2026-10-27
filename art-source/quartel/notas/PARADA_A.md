# S6.12 — Quartel na colônia v007 / Parada A

26/10/2026. **Parar antes de qualquer runtime, aprovação de escala ou mudança de mapa.** O quartel substituirá `design` (Alojamentos); não será adicionado sobre a sala antiga. Essa substituição ainda não foi executada.

## Origem preservada

`git fetch origin claude/zealous-goodall-mo0y2u` resolveu a ponta **`7c6b2cab394b279eee1ccd392f975e94d9802960`**, derivada do antigo `99ab0d7`. Cópia de blobs por `git show`, sem merge ou cherry-pick. Os doze arquivos e seus SHA-256 estão em [origem-sha256.json](origem-sha256.json). Os originais copiados não foram editados.

**Divergência encontrada:** o `.blend` e o GLB remotos disponíveis nessa ponta têm 8.414 triângulos / 23 materiais, mas **nenhum `COL_*` e nenhum `Wall_S/E/N/W`**. O casco é um único `Building_Shell`. A receita também não cria esses contratos. Não se presume uma versão local não enviada pela outra sessão. A v002 acrescenta esses nós por script e deixa o `.blend` de origem intacto.

Copiados do quartel: `barracks.blend`, `build_barracks.py`, `barracks.glb`, quatro previews. Copiados para `art-source/armario-emergencia/`: fonte, script, GLB e dois previews, **guardados, sem runtime**. O helper original do armário é usado pela receita do quartel. Nenhum arquivo ou integração da `supply_crate` foi copiado; a caixa aprovada da S6.13 permanece a única ativa.

## Medidas reais em metros

Eixos da fonte: X leste, Y norte, Z cima. Conversão normal GLB: `(x,y,z)=(X,Z,−Y)`. Proposta de orientação no mapa: **rotação Y = −90°**, de forma que `(jogo.x,jogo.z)=(cx+Y,cz+X)`; a porta Oeste da fonte vira **Norte no jogo**, voltada ao Laboratório. A porta Sul nova vira **Oeste no jogo**, voltada à praça.

| Elemento | Medida / posição local Blender | Observação |
|---|---|---|
| Paredes, faces externas nominais | 12,00 × 10,00 m, espessura 0,25 m | Após orientação: 10 × 12 m no mapa; raio externo dos cantos 1,30 m |
| Parede com rodapé | 12,10 × 10,10 m | Rodapé/cornija decorativos além do núcleo |
| Plinto, projeção máxima | 12,90 × 10,90 m | Cantos arredondados; não confundir com Ground |
| Altura da parede | Z 0,35 → 3,20 m | Altura livre estrutural 2,85 m acima do piso |
| Altura total | 4,685 m | Inclui respiros; cobertura principal até 3,62 m |
| Fonte sem Ground | X [−8,0113; 6,45], Y [−5,52; 5,45] | **14,4613 × 10,97 m**, incluindo rampa e equipamentos |
| v002 sem Ground | X [−8,0113; 6,45], Y [−7,0113; 5,45] | **14,4613 × 12,4613 m**; rotacionado no mapa: 12,4613 × 14,4613 m |
| Ground de origem | 17 × 15 m | Só diorama; omitido na v002 |
| Vão principal | plano X=−6, Y=0; 1,30 × 2,25 m | Z 0,35 → 2,60; soleira chega a 0,38, deixando altura útil 2,22 m |
| Folha principal | X [−6,30; −6,14], Y ±0,71; Z [0,325; 2,625] | 1,42 m de largura física, 0,16 m de profundidade; folha maior que vão |
| Rampa principal, superfície | X −8,00 → −6,40, Y ±0,95 | 1,60 × 1,90 m; subida 0 → 0,35 m, inclinação 21,875% / 12,339° |
| Rampa principal, envelope com trilhos | X [−8,0113; −6,3887] | Altura máxima dos trilhos 0,4257 m |
| Segundo vão (v002) | X=0, plano Y=−5 | Mesmas dimensões úteis e folha da principal; ação independente |
| Rampa secundária (v002) | Y −7,00 → −5,40, X ±0,95 | Mesma subida/run; envelope Y [−7,0113; −5,3887] |
| `Building_Roof` | 12,16 × 10,16 × 1,465 m | Z [3,22; 4,685], 800 triângulos; teto/equipamentos em nó próprio |
| `Building_Interior` | 11,50 × 9,50 × 2,875 m | Z [0,345; 3,22], 4.548 triângulos; piso, seis leitos e mobiliário |

[Medidas completas da origem](medidas-origem.json) · [medidas v002](medidas-v002.json). A altura do apoio do v007 e a transição para o piso de 0,35 m exigirão implementação posterior, como foi feito no Hangar; nenhum apoio ou chão caminhável mudou agora.

## Encaixe medido

A sala antiga tem centro (10,5; 0), 6,5 × 6,5 m e portas oeste/norte. O Laboratório real do layout atual tem **8 × 5 m** em (10,5; −10,5); a Oficina tem **6 × 5,5 m** em (10,5; 8,5). A análise usa os envelopes reais do manifest v007 (incluindo beirais), além das áreas nominais.

| Vizinho / área atual | Envelope X/Z usado |
|---|---|
| Laboratório | X [6,39; 14,61], Z [−13,11; −7,89] |
| Oficina | X [7,39; 13,61], Z [5,64; 11,36] |
| Conector Lab–Alojamentos | X [9,20; 11,80], Z [−8,00; −3,25] |
| Conector leste da praça | X [4,00; 7,25], Z [−1,30; 1,30] |
| Zona de construção A | X [15,50; 20,50], Z [−10,50; 14,50], 125 m² |

A planta mede **interferência em projeção**, não colisão de triângulos ou ensaio Rapier. Um AABB inteiro pode conter espaço vazio: por isso o JSON discrimina plinto e cada rampa. Nos acessos do Lab/praça, a interferência de rampa pode coincidir com o vão da porta; ainda demanda redesenho de soleira/piso. A interferência com a Oficina impede a opção A mesmo que esses acessos sejam ajustados.

| Caso A — centro antigo, escala 1× | Resultado |
|---|---|
| Laboratório | Plinto distante 1,44 m do envelope do Lab; rampa norte avança **0,1213 m**, 0,2304 m² em projeção no envelope do acesso |
| Oficina ao sul | Plinto avança **0,810 m**, sobrepondo **5,038 m²**; a parede sul nova também entra no espaço da sala vizinha |
| Conector Lab–Alojamentos | **8,320 m²** sob projeção do plinto; 3,061 m² sob envelope da rampa norte (há interseção entre esses contornos) |
| Conector leste | **5,720 m²** sob o plinto; rampa oeste ocupa 2,111 m² do conector |
| Praça / hub, verificação adicional | Rampa oeste nova avança **0,6213 m** no envelope da praça (1,1804 m² em projeção) |
| Zona A | Plinto ocupa **4,918 m²**, 3,93% da zona, até X=15,95 |

**Só mover os conectores não resolve a Oficina.** Não foi aplicada redução automática para forçar o encaixe.

## Opções para o autor

| Opção | Proposta | Consequência |
|---|---|---|
| A — centro antigo / 1× | (10,5; 0), Y=−90° | **Não cabe**; interferências acima |
| B — manter escala e expandir a implantação | (19,5; 0,6), Y=−90°, 1× | Sem sobreposição de componentes com Lab, Oficina ou praça. Plinto usa **64,486 m² / 51,59% da zona A** e o conjunto vai até X=24,95: **4,45 m além da borda leste**. Exige ampliar a área da colônia e refazer/alongar conectores |
| C — considerar escala 0,75× | (10,5; 0), Y=−90° | Paredes 7,50 × 9,00 m, envelope 9,346 × 10,846 m. Sem sobreposição com vizinhos e sem ocupar a zona A. Folga ao envelope da Oficina **0,8025 m**. Vão fica **0,975 × 1,665 m** acima da soleira; altura total 3,5138 m. Requer aprovação da proporção do prédio, camas, móveis e acessos |

**B e C são apenas alternativas na planta.** A v002 exportada permanece 1×, sem posição/rotação de encaixe. C não cabe no quadrado antigo de 6,5 m: ainda substitui a sala por uma pegada maior. Reduzir tudo para o quadrado antigo exigiria escala ≤0,5417, com vão ≈0,704 m, menor que a referência de passagem do jogador (2 × (raio 0,32 + offset 0,06) = 0,76 m); não é uma opção adequada sem remodelar as portas.

B conserva o tamanho do modelo, mas consome espaço previsto para crescimento. C conserva melhor a organização da colônia, mas altera a escala artística. Se ambas forem rejeitadas, a alternativa é uma nova revisão de arquitetura/mobiliário com casco compacto e portas em tamanho próprio; isso seria uma nova decisão, não uma transformação silenciosa desta variante.

### Rotas obrigatórias

**Praça → quartel:** preserva o acesso pela fachada oeste do jogo, usando a segunda porta. B alonga o piso do conector até o pé da rampa em (12,4887; 0,6), 5,2387 m além do fim atual X=7,25, e ajusta o desvio Z. C termina o piso no pé da rampa em (5,2415; 0), encurtando o conector em 2,0085 m; a rampa assume o trecho até a soleira. Portas não são substituídas por teleporte.

**Quartel → Laboratório:** preserva a porta norte do jogo e a porta sul do Lab em (10,5; −8). B usa piso em desvio pelo norte do quartel, conforme linha verde da planta; há 2,04 m entre plinto e envelope do Lab. O envelope inteiro de B cruza o AABB da Oficina apenas em espaço vazio entre peças: plinto/rampas/componentes não a sobrepõem. A folga lateral do plinto à Oficina é só 0,44 m, inadequada como passagem: a rota obrigatória passa ao norte. C mantém o eixo X=10,5 e liga Lab até o pé da rampa em Z=−6,0085 (trecho plano ≈1,9915 m).

No interior, o percurso conecta as duas entradas pelo centro. A mesa foi deslocada +2,5 m em X local para sair da nova abertura. Amostragem de 72 raios ao redor da rota, com raio de referência 0,38 m e três alturas, não encontra geometria estática. Isso é conferência geométrica; não aprova controller, navegação ou jogabilidade. A opção C terá que repetir a verificação após eventual aceite de escala; os testes Blender da variante são em 1×.

## Variante v002 e materiais

Mudanças pelo wrapper [build_barracks_v002.py](../scripts/build_barracks_v002.py): mantém casco, proporções e seis leitos; cria segundo vão/folha/rampa; retira só a janela central sul; move a mesa; separa paredes e rampa oeste; cria referências COL; converte a paleta. Ground fica omitido. Nada é importado em `src/`.

| Arte | Triângulos | Materiais usados | Malhas / primitivas GLB |
|---|---:|---:|---:|
| Origem completa, com Ground | 8.414 | 23 | 5 / 42 |
| Origem sem Ground | 8.010 | 21 | 4 / 40 |
| v002, antes do atlas, já com duas portas | 8.278 | 21 | Mesma geometria da linha seguinte |
| v002 exportada, sem Ground | **8.278** | **1** | **13 / 13** |

O saldo −136 em relação à origem completa vem da remoção do Ground e das mudanças geométricas; **o atlas não reduz triângulos**. Contra a origem sem Ground, a v002 acrescenta 268 triângulos. Um material não significa um draw call: os 13 nós de malha continuam separados para corte/portas e terão pelo menos suas primitivas por passe.

O GLB passa de 495.832 para 611.448 bytes, com UVs, novos nós e metadados: a redução de materiais não representa compactação de arquivo ou medição de FPS.

Atlas de paleta de **128 × 128 px**, com três mapas (basecolor, ORM e emissivo), embutidos no GLB e preservados em `export/texturas-v002/`. UVs por face no centro de cada célula, sem variação de textura sobre o low poly. Mantém cores, roughness e metalness por célula, emissão ciano/quente/tela com força global 4 e fator por célula (tela original 2,5). Quantização dos mapas em 8 bits é a única aproximação de valores PBR. O vidro original já era opaco e assim continua. Não há atlas de sujeira novo, remodelagem estética ou transparência adicional.

## Nós e COL

`Building_Roof` e `Building_Interior` são malhas irmãs sob `Barracks`, com identidade própria no `.blend` e no GLB. Esconder o teto inclui HVAC, respiros e hatch; interior/paredes permanecem. Há `Wall_S/E/N/W`, `Wall_Corners`, duas folhas e duas rampas separadas. As duas ações de porta são preservadas/exportadas independentemente; nenhuma animação roda no jogo nesta entrega.

**33 referências `COL_*` em empties com caixas/metadados**, zero triângulos e zero material adicional: 28 caixas de parede (incluindo cantos/lintéis), duas folhas, um piso arredondado e duas rampas analíticas. Futuro runtime deve instanciar colliders simples e mover o collider da folha com a porta; nunca usar a malha visual como trimesh. COL de folha representa a posição fechada e não é collider ativo agora.

[Validação](validacao-v002.json), vinculada ao SHA-256 do `.blend`: 680 amostras em paredes/vãos; 40 raios de vãos livres; 1.092 pontos nos cantos; erro máximo dos AABBs de folhas **0,000000477 m**. Caixas de cantos têm excesso conservador radial de até 25 mm; rodapés/molduras decorativos ficam fora do núcleo de 0,25 m. Janelas continuam bloqueadas fisicamente nas referências. Piso/rampa são metadados de apoio; não modificam o chão do jogo.

[Planta Wall/COL](../renders/planta-colliders-v002.png) mostra corte local a Z=1,40 m, com folhas fechadas e lintéis acima do corte. [Frente](../renders/v002-frente.png), [3/4](../renders/v002-tres-quartos.png) e [topo sem teto](../renders/v002-superior-sem-teto.png) são renders reais do Blender da variante, em escala original.

## Parada

Entregar o estudo e parar. Claude revisa a proveniência, os nós/material/contagens, as folgas e a proposta de rotas; autor escolhe B/C ou pede casco compacto e aprova a arte. Só depois haverá escopo de runtime para substituir `design`, integrar piso/colisores/portas/teto e combinar visibilidade com Sandwind. Sem Builder, residentes, novos NPCs, LODs, streaming, push ou merge nesta entrega.
