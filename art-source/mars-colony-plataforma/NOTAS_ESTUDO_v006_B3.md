# Plataforma de lançamento — v006 ("B3")

Ajuste da v005 (B refinada) antes da exportação, sem integração ao jogo.

**O que ficou igual:**

- pisos;
- os 129 colisores ativos;
- `INTERACT_Nave` (0; 33) e o desembarque (0; 29,5);
- o funcionamento do embarque.

Os colisores novos continuam como propostas separadas. A avaliação visual e
de jogabilidade é do autor.

A v001–v005 foi preservada: os 9 arquivos da lista de somas conferem, e a
v004 e a v005 não mudaram (veja Verificação).

## 1. Como a câmera do jogo gira

Fonte: `src/scene/CameraRig.tsx` e `src/game/simulationGate.ts`.

- **Giro livre, sem encaixe nas 8 orientações:**
  - Q/C somam 1,75 rad/s (≈ 100°/s) ao ângulo-alvo;
  - o ângulo real segue o alvo com amortecimento (fator 8);
  - ao soltar a tecla, a câmera para onde estiver. Os ângulos de 100° a 125°
    também valem como ângulos de repouso.
- **Posição da câmera:** fica a 18,38 m na horizontal e 13,55 m acima do alvo
  (≈ 22,8 m de distância), ortográfica, com near de 0,1.
- **A bordo:** o jogo leva o jogador a `INTERACT_Nave` (0; 33) e muda a fase
  para "aboard". A simulação fica bloqueada e Q/C não giram mais. O ângulo
  fica **congelado no ângulo do momento do embarque**, durante todo o tempo a
  bordo.

## 2. A ocultação na v005, durante o giro

Medição na geometria real, de 1 em 1°, com o corpo em 3 alturas e o raio
contado só até o plano da câmera:

| Ponto | Setor com o jogador oculto pela plataforma (v005) |
|---|---|
| Desembarque (0; 29,5) | 98°–120° (23°) |
| Baia (0; 31–32,5) | 99°–127° |
| Elevador (0; 33) | 101°–128° (28°) |
| Acesso (0; 24–29) | até 14° (por volta de 102°–112°) |

**Duração, simulando as teclas como o jogo** (`notas/giro_v006.json`):

- desembarque, segurando Q de SE (45°) a O (180°) e voltando com C:
  **0,42 s** oculto (≈ 0,2 s por passagem);
- acesso (0; 26), com Q de 45° a 180°: 0,04 s;
- com a câmera parada no setor, a ocultação é **contínua**;
- a bordo com embarque a 105°, 112° ou 120°: o jogador fica **oculto o tempo
  todo**, porque o giro está travado.

## 3. Busca do menor ajuste (`scripts/busca_v006.py`, `notas/busca_v006_*.json`)

Todos os testes usaram a geometria real da v005, transformada em memória.

- **Mexer só nas torres não resolve.**
  - Fechar as torres para ±20° ou ±10° atrás do foguete reduz o pior ponto de
    30° para 20°.
  - Só o foguete, sem torres e braço, já esconde 14°.
- **Mantendo os 14 m, só um afastamento grande resolve.** O conjunto precisa
  sair ≥ 9,6 m: por exemplo (−14; 45) ou (−11; 48), com a base a ≥ 5,5 m do
  deck. E nesses casos a câmera atravessa o foguete (veja §6), ou seja, troca
  ocultação por corte.
- **Altura no lugar atual:** é preciso reduzir para ≈ 7 m.
- **Combinações de posição e altura:**
  - **(−10; 41,5), com o foguete de 9,8 m e a base encostada: 0°**;
  - o mesmo ponto com 10,5 m: 2°;
  - (−7; 44) com 9,8 m: 0°, mas com a base a 2,8 m do deck.

O autor escolheu **(−10; 41,5) com o foguete de 9,8 m**.

## 4. O que mudou na B3

| | v005 (B2) | v006 (B3) |
|---|---|---|
| Foguete | topo a 14,0 m, centro (−4; 41,5) | **topo a 10,1 m**, centro **(−10; 41,5)**, 6 m a oeste; mesmo desenho, um pouco mais robusto (escala XY 0,75) |
| Orientação | aceleradores no eixo baia → foguete | escotilha voltada para a torre (oeste); aceleradores norte-sul |
| Torres | 2 torres de 11,7 m atrás do foguete (±35°) | **torre de serviço de 8,1 m a oeste** (braço da tripulação) e **mastro de 5,4 m a leste**, no eixo leste-oeste, a 3,8 m do foguete |
| Braço da tripulação | cabine branca solta perto da coifa | **treliça** (banzos, montantes e diagonais) articulada na torre por mancais e pino; **mão-francesa** até o meio do vão; **cabine** com quadro verde, encostada no casco, com colar de acoplamento |
| Base | 5,2 × 3,7 m, borda a 0,36 m do deck | 4,6 × 3,3 m, a 1,2 m do deck, junto ao canto sudoeste |
| Embarque na baia | anel âmbar luminoso | **anel de segurança rente**, com segmentos alternados claros e escuros, junta da plataforma móvel e chevrons; coluna de chamada com tela e uma lâmpada de estado, no padrão das portas da colônia |
| Ligação baia → foguete | rampa subterrânea + tampas com pontos ciano | **sem rota no cenário**: nem túnel, nem tampas. A base tem uma **casa de chegada do elevador** com o mesmo desenho (anel de segurança, porta, placa "ELEVADOR"), voltada para a baia |
| Âmbar e ciano explicativos | também no cenário (anel, tampas) | **só na imagem de análise** |

**Silhueta na vista sul.** Torre e mastro ficam nas laterais do foguete. Na
vista S, as três silhuetas aparecem separadas; na v005, as torres cobriam o
foguete. Em SE também ficam separadas. Em SO, a torre fica à frente da metade
inferior do foguete, mas a coifa e o topo seguem destacados. Em L e O, por
construção, elas se alinham.

**Ressalva.** O grande anel âmbar ao redor da baia é marcação do piso do
piloto (`ARQ_Deck_Marcacoes`). Os pisos não podiam mudar, então ele continua.
Se ele também deve deixar de ser âmbar, é decisão do autor, junto com os pisos.

## 5. Medições da B3

**Giro livre: acesso, baia e elevador** (`notas/rotacao_v006_B3.json`)

- 360° de 1 em 1°, nos 29 pontos de x = 0, de z 19 a 33: **nenhum ângulo**
  esconde o jogador pela plataforma.
- **A bordo:** nenhum ângulo de embarque deixa o jogador oculto.
- **Sequência de giro** (`notas/giro_v006.json`, 224 quadros): **0 s** oculto
  nos 3 trechos. Na v005 foram 0,42 s, 0,04 s e o tempo todo a bordo.

**8 orientações paradas no desembarque** (`notas/analise_v006.json`)

| % oculto (pior / padrão SE) | v005 | v006 |
|---|---|---|
| Jogador no desembarque | 0 / 0 | 0 / 0 |
| Jogador no elevador | 0 / 0 | 0 / 0 |
| Baia até INTERACT_Nave | 0 / 0 | 0 / 0 |
| Passagem z 25–31 | 0 / 0 | 0 / 0 |
| Deck livre | 50 / 5 | **15 / 0** |
| Faixa sul do deck | 50 (S) / 8 | **42 (SO) / 0**; S: 17 |

**A faixa sul (z 35–38)** é piso livre atrás da baia e é alcançável.

- Lá não há destino, interação nem passagem obrigatória.
- Medição na grade de 0,5 m de todo o deck alcançável (684 pontos, r 0,36 m).
  O raio para no plano da câmera, como antes. A tabela conta os pontos com o
  corpo majoritariamente oculto pelo conjunto alto em algum ângulo:

| | v005 | v006 |
|---|---|---|
| Pontos alcançáveis com o corpo majoritariamente oculto em algum ângulo | 620 de 684 | **172 de 684** |
| Faixa sul | 185 de 185 (até 78° de giro) | **99 de 185 (até 54°)** |
| Mobiliário baixo da baia | só pés ou parcial; nunca a maior parte do corpo | igual |

- **Elementos importantes:**
  - o anel do elevador nunca fica majoritariamente oculto (v005: 24° de
    giro);
  - a placa da coluna, vista de frente, nunca é escondida.
- O que resta na faixa sul é ocultação de piso livre e de posições sem
  função. O pior ponto é o canto sudoeste do deck, junto à base.

**Passagem, raio 0,36 m** (propostas `COL_NOVO_PLAT_B3_*`: base, torre e
mastro, todos fora do deck)

- Perda de área alcançável: **0 m²**.
- Todos os alvos seguem alcançáveis.
- Geometria visível sem colisor na faixa de 0,26–1,55 m: **0 m²**.

**Medidas**

- Foguete: x −11,31..−8,69, z 39,81..43,19, altura 0,93..10,10.
- Torre: 8,06 m. Mastro: 5,41 m.
- Braço da tripulação: 4,0–7,1 m.
- Base: z 39,2..43,8.
- Coluna de chamada (totem): z 34,75–35,25, dentro do colisor do fundo.

**Contagens.** B3: 17 objetos, 11.402 triângulos (malha base), 13
materiais. Nenhum material novo.

## 6. Achado do runtime: corte pelo plano near da câmera

A câmera do jogo fica a apenas 22,8 m do alvo, com near de 0,1. Peças altas
que ficam atrás dela, dentro do quadro, aparecem **cortadas ou somem**. Os
renders dos estudos até a v005 recuavam a câmera e escondiam isso.

- **Comparação:** `renders/v006/diagnostico_corte_near_camera.png`, com
  câmera real × recuada na mesma direção.
- **Medição** (`scripts/corte_near_v006.py`, grade de 2 m do mapa caminhável,
  giro de 5°):

| Pares ponto × ângulo com peça alta cortada | v005 | v006 |
|---|---|---|
| Mapa caminhável | 11,5% (115 de 197 pontos) | **5,0% (66 de 197)** |
| Acesso x = 0, z 19–33 | 14 de 29 pontos | 11 de 29 pontos (até 75° de giro em z 19) |

- **Natureza do problema:** é do runtime, não do modelo. Qualquer peça acima
  de ~6 m é cortada com o jogador a cerca de 18–37 m dela.
- **Correção:** recuar a câmera na mesma direção (enquadramento ortográfico
  idêntico) ou usar near negativo. Mudança em `CameraRig.tsx`, fora do escopo
  desta tarefa.
- **Todas as vistas "jogo" da v006 usam a câmera na posição real.**

## 7. Arquivos

| O quê | Caminho (em `art-source/mars-colony-plataforma/`) |
|---|---|
| `.blend` v006 (novo) | `blend/mars_colony_estudo_v006_plataforma_B3.blend` · camadas `Plataforma_B3`, `Planta_Plataforma_B3` |
| Construção | `scripts/build_plataforma_v006.py` (a partir da v005, com `-- criar`) |
| Busca, rotação, análise, corte e giro | `scripts/busca_v006.py`, `rotacao_v006.py`, `analise_v006.py`, `corte_near_v006.py`, `giro_v006.py` |
| Comparação v005 × v006 (geral, SE, SO, S, 112°) | `renders/v006/comparacao_v005_x_v006.png` |
| A bordo, 45°–128° | `renders/v006/elevador_a_bordo_v005_x_v006.png` |
| Giro de 360° por ponto | `renders/v006/rotacao_360_ocultacao_v005_x_v006.png` |
| Sequência de giro (vídeo) | `renders/v006/giro_camera_v005_x_v006.mp4` |
| Deck alcançável e faixa sul | `renders/v006/deck_alcancavel_ocultacao_v005_x_v006.png` |
| Silhuetas S, SO e SE | `renders/v006/silhuetas_v005_x_v006.png` |
| Braço da tripulação | `renders/v006/braco_tripulacao_v005_x_v006.png` |
| 8 orientações da B3 | `renders/v006/jogo_8_rotacoes_B3_desembarque.png` |
| Imagem de análise (âmbar e ciano só aqui) | `renders/v006/conexao_baia_elevador_foguete_B3_analise.png` |
| Corte pelo plano near | `renders/v006/diagnostico_corte_near_camera.png` |
| GLB de prévia e prova de reimportação | `export/previa_v006_B3/` (veja `NOTA_PROVA_EXPORTACAO_v006.md`) |

## 8. Pendências para o autor

- **Aprovação:** visual e de jogabilidade, ambas pendentes.
- **Altura:** a redução para 10,1 m foi escolhida para zerar a ocultação. A
  presença visual ainda precisa ser avaliada nas imagens.
- **Faixa sul:** o canto sudoeste segue oculto em até 54° de giro. É piso
  livre, sem função.
- **Anel âmbar do piso do piloto** em volta da baia: ficou como estava (§4).
- **Corte pelo plano near:** depende da correção da câmera no runtime (§6).
- **Propostas `COL_NOVO_PLAT_B3_*`:** não integradas.
