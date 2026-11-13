# Level 02 · Rio de Janeiro · brief de desenvolvimento

Aberto em 13/11/2026 a pedido do autor. Este documento é a referência do level
enquanto ele não entra no plano oficial. **Tudo aqui é proposta até o aceite do
autor**, exceto o que está marcado como decisão do autor.

## 1. Decisões do autor

- O Level 02 é o **Rio de Janeiro**, com estética e inspiração nas duas imagens
  de referência: orla em ruínas, tomada pela areia e pela vegetação.
- O mapa segue o **croqui do autor** de 13/11.
- O mapa tem a **mesma dimensão do mapa de Shanghai**.
- O contorno cinza do croqui são os **limitantes**: escombros ou cadeia de montanhas.

Referências guardadas em `art-source/rio-fase01/referencias/`:

| Arquivo | Conteúdo |
|---|---|
| `ref-01-orla-quiosques.jpg` | Orla com quiosques circulares, calçadão e prédios |
| `ref-02-orla-avenida.jpg` | Avenida com canteiro de palmeiras, ônibus e morros ao fundo |
| `croqui-autor-2026-11-13.webp` | Croqui da composição do mapa |

## 2. Leitura das referências

- **Prédios:** residenciais dos anos 1940–60, brancos e bege, de 8 a 12 pavimentos,
  com varandas, cobogós, marquises e térreo comercial com toldos. Fachadas
  manchadas de ferrugem e vegetação nas lajes.
- **Avenida:** duas pistas rachadas com canteiro central de palmeiras. Dunas de
  areia invadem o asfalto. Ônibus e carros enferrujados parados na pista.
- **Calçadão:** pedras portuguesas em ondas pretas e brancas, com trechos
  quebrados e cobertos de areia. É a assinatura visual do level.
- **Praia:** quiosques circulares com escada em espiral, postos de salva-vidas
  de madeira, destroços na areia e linha d'água com espuma.
- **Fundo:** morros de granito com mata, um deles fechando a ponta da praia.
- **Luz:** fim de tarde quente e névoa clara no horizonte, em contraste com a
  madrugada fria de Shanghai.

## 3. Planta v0

Gerada por `art-source/rio-fase01/scripts/layout.py`, no mesmo contrato de dados
de Shanghai (`export/layout.json`). Pranchas para comparar com o croqui:

- `art-source/rio-fase01/notas/planta-v0-camera.svg`: no ângulo da câmera do jogo;
- `art-source/rio-fase01/notas/planta-v0-topo.svg`: vista de cima.

**Dimensão:** 102 × 108 m (X de −51 a 51, Z de −54 a 54), igual a Shanghai.

**Orientação.** O mar fica a leste (+X) e a orla corre ao longo de Z. Com a
câmera padrão de Shanghai, o mar aparece embaixo à direita e o deck embaixo à
esquerda, como no croqui.

**Faixas, do morro ao mar:**

| Faixa | X (m) | Largura |
|---|---|---:|
| Quadra de fundo, cortada pelo morro | −51 a −40 | 11 |
| Calçada | −40 a −38 | 2 |
| Rua de trás | −38 a −31 | 7 |
| Calçada | −31 a −29 | 2 |
| Quadra da orla | −29 a −11 | 18 |
| Calçada dos prédios | −11 a −9 | 2 |
| Pista da avenida, lado dos prédios | −9 a −3 | 6 |
| Praças do canteiro central | −3 a 4 | 7 |
| Pista da avenida, lado da praia | 4 a 10 | 6 |
| Calçadão | 10 a 15 | 5 |
| Areia | 15 a 36 | 21 |
| Mar (limite) | 36 a 51 | 15 |

**Ao longo da orla (Z):**

- **Quatro quadras por fileira**, um prédio por quadra, como no croqui. As duas
  das pontas são cortadas pelos limites. Três ruas transversais de 12 m (com as
  calçadas) ligam a avenida à rua de trás.
- **Três praças no canteiro:** Praça Sul, Praça Central (35 m) e Praça Norte.
  A Praça Central fica de frente para a rua entre as quadras 1 e 2. As duas
  travessias do canteiro ficam de frente para o meio dessas quadras.
- **Dois quiosques** na areia, encostados no calçadão: deck de 13 × 7,5 m com
  núcleo circular de 2,6 m de raio.
- **Deck de pouso** na ponta sul da areia (16 × 14 m), com a mesma reserva de
  10 × 13 m de Shanghai e saída a 3,5 m da nave.

**Limites:**

| Lado | Limite |
|---|---|
| Leste | Mar. A linha d'água é irregular no visual e reta na colisão (X = 36) |
| Oeste | Cadeia de morros de granito com mata, atrás das quadras de fundo |
| Norte | Morro que avança até o mar e fecha a praia, com escombros na avenida |
| Sul | Prédios desabados e avenida destruída, atrás do deck de pouso |

**Números:** 11.016 m² no total, 1.620 m² de mar e cerca de 7.630 m²
caminháveis. Shanghai é toda caminhável; aqui o mar ocupa 15% do mapa.

## 4. Propostas de jogo (a validar)

- **Inimigos.** A arte do Rio já está em andamento fora do runtime:
  - Mutante Rio (macaco-prego), GLB v002 com seis clipes, só o `Idle` aprovado;
  - Patrol Rio, com `running_Rio_patrol` e `gunshot_hit_patrol_rio` na pasta
    do autor.
- **Entradas dos inimigos.** Mutantes Rio descem do morro pelas três ruas
  transversais. Patrol Rio chegam pela ponta norte da avenida e pela rua de trás.
  Nenhuma entrada fica a menos de 14 m do desembarque, como em Shanghai.
- **Suprimentos.** Os dois quiosques funcionam como depósitos.
- **Rotas de patrulha.** Volta na avenida em torno da Praça Central, voltas nas
  quadras 1 e 2 pela rua de trás e um circuito pelo calçadão e pela areia.
- **Leitura do combate.** A câmera olha do mar para a cidade. A praia, o
  calçadão e a avenida ficam sempre visíveis; os prédios da orla só escondem a
  rua de trás, onde entra o esmaecimento que Shanghai já usa.

## 5. Decisões em aberto

1. **Leitura do croqui.** Li o croqui como a vista da câmera do jogo, com o
   mundo alinhado aos eixos, igual a Shanghai. A outra leitura é a de uma planta
   vista de cima, com as ruas em diagonal dentro do retângulo do mapa. Essa
   segunda exigiria colisores inclinados, que o jogo hoje não tem.
2. **Altura dos prédios.** A planta usa de 6 a 8 pavimentos na orla e 9 ou 10
   no fundo (até 33 m). Shanghai vai até 5 pavimentos (16,5 m).
3. **Mar.** O mar tira 15 m de largura do mapa. Dá para reduzir a faixa de mar
   e aumentar a areia ou as quadras de fundo.
4. **Um prédio por quadra** segue o croqui. Shanghai usa dois por quadra, com
   becos que dão rotas e esconderijos.
5. **Térreos.** Pilotis e galerias caminháveis sob os prédios da orla, como nas
   referências, ou volumes fechados.
6. **Encontros.** Composição das hordas, objetivo e recursos do Rio.
7. **Numeração no plano oficial.** O level não tem tarefa. Os itens mais
   próximos são a S9.4 (escolha de destino na Control Room) e o item 5 do
   backlog (outras cidades).

## 6. Próximos passos sugeridos

1. Autor confere as duas pranchas contra o croqui e responde às decisões 1 a 5.
2. Blockout jogável: terreno, colisores, deck e limites em volumes simples,
   reaproveitando o carregamento de Shanghai. Exige um terceiro mapa no jogo
   (hoje só existem `mars` e `shanghai`).
3. Kit de arte: calçadão em ondas, prédio modular da orla, quiosque, posto de
   salva-vidas, palmeira, ônibus e duna.
4. Limites: morros, mar com espuma e escombros.
5. Inimigos do Rio no runtime, depois do aceite das animações.
6. Luz de fim de tarde, névoa e trilha.
