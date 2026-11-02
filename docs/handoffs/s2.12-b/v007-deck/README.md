# S2.12 B — mapa v007, estufa e entorno do deck (25/10/2026)

Worktree `rochatales/s2.12-b`, base inicial `5cb749d`. Merge autorizado `42ac773`,
anel `e0eef58`; commit dos props é a ponta que contém este relatório. Revisão do
commit dos props: `e0eef58...HEAD`; revisão completa deste pedido: `5cb749d...HEAD`.

Aceites comunicados pelo autor: recursos `5cb749d`, exceto anel sob calçada;
masterplan v007, exceto entorno do deck; estufa OFFLINE/ONLINE aprovada.
A correção do anel e a recomposição do deck ficam para validação do autor.
Etapa 2 da S2.12 B e animal mutante não iniciados. Sem push/merge na integração.

## Capturas

Mesma CameraRig do jogo, sem substituição de câmera/GLB. Ângulos, zooms e recortes
são os do roteiro das imagens aprovadas de `3e04ac8` (sudoeste e noroeste).
"Antes" = v007/estufa já mesclados, ainda sem os props do deck; "depois" = props
v006 recompostos nas posições aprovadas, sem inventar novo posicionamento.
Reposição inicial assistida apenas para enquadramento; movimento/embarque testados
por W/E reais. JSONs registram câmera e limites dos objetos. Não é aceite visual.

| Vista | Antes | Depois |
|---|---|---|
| Sudoeste | [antes.png](./antes.png) | [depois.png](./depois.png) |
| Noroeste | [noroeste-antes.png](./noroeste-antes.png) | [noroeste-depois.png](./noroeste-depois.png) |

Outras capturas: [visão geral v007](./v007-vista-geral.png),
[estufa OFFLINE](./greenhouse-offline.png), [ONLINE](./greenhouse-online.png),
[anel rua](./anel-rua.png), [calçada](./anel-calcada.png), [canteiro](./anel-canteiro.png).

## Prop, piso e circulação

- O runtime clona **somente seis conjuntos** do GLB v006 já preservado: dois
  consoles, rack, tanques/tubo (inclui `PROP_Tanques_2`) e dois carrinhos.
  Geometria e materiais do cache são compartilhados. A fonte não recebe mudanças.
  Nenhum GLB novo e nenhum Blender editado/reexportado.
- Oeste **(−3;25,9)**, tela para −Z/colônia, com o único colisor adicional de prop;
  Leste **(6,85;31,8)**; rack **(−6,75;31,6)**; tanques/tubo/carrinhos com os
  transforms em mundo da v006. Diferença numérica da recomposição de quaternions
  dos carrinhos menor que 10⁻¹², sem deslocamento geométrico.
- **Zero conflitos** com colisores v007/estufa, módulos, paredes/mobiliário e
  rotas `road/path`. Oeste fica na zona B, fora da estrada/passarela X −2…2.
  Piso sob Oeste em Y=0. Os demais props continuam fora da área caminhável,
  como na referência aprovada; a depressão visual do terreno sob eles
  (aproximadamente −0,12 a −0,30 m nos centros) é **idêntica à v006 visível**.
  Não houve correção inventada de Y, piso, terreno ou área caminhável.
- Folgas: **0,530 m** do console à borda da passarela; **0,070 m** entre rack e
  deck. Ponta original do tubo **(−7,25;31,6)** dentro do primeiro cilindro real,
  verificada por raycast nos testes estáticos (nenhum colisor de malha no jogo).
- Passarela X −2…2 / Z 25…27,4, embarque (0;29,5) e caminho colônia → deck
  livres com raio humano 0,36 m. Navegador: W desde (0;20) chegou a
  **(−0,046;28,897)**; E embarcou e desembarcou em **(0;29,5)**. Aproximação do
  Oeste parou antes do console, Z **25,158**. Zero erros de página.

[Medidas](./props-medidas.json) incluem bounds por prop, conflitos, piso de
referência/atual e hashes completos dos GLBs intactos. [Alcance atual](./alcancabilidade-atual.json):
**16/16 destinos**, área conservadora alcançável **814,9125 m²**, raio 0,36 m e
grade 5 cm. A diferença de área para a evidência original da estufa vem do
colisor Oeste herdado do fechamento; nenhum destino perdeu alcance.

O reaproveitamento carrega também o GLB v006 existente (**6,7 MiB**) para retirar
os conjuntos, além do v007. Não é export de subset/otimização global. Só os
conjuntos selecionados entram na cena; custo de download/cache preservado para
revisão futura se necessário.

## Apoio dos coletáveis

277 superfícies dos dados do layout exportado; 0,12 m calçada, 0,148 canteiro,
0,25 grama, rua zero e pintura conforme export (~0,02). Altura por item cacheada
só no nascimento; anel +6 mm e flutuação +0,35±0,06 m. Sem consulta/raycast por
frame ou uso de GLB. [JSON do navegador](./aneis-browser.json) registra os três
pisos; teste adicional verifica ferro/cobre em lados diferentes de uma borda.

## Reprodução e verificações

Na raiz desta worktree:

```sh
npm test
npm run build
git diff --check
node docs/handoffs/s2.12-b/v007-deck/medir-props.mjs
npm run dev -- --host 127.0.0.1 --port 5193 --strictPort
```

- **168/168** testes, incluindo v007/estufa, consoles, props, navegação e recursos.
- Build verde (aviso preexistente de chunk grande); diff-check verde.
- Teste histórico dos consoles reescrito para os manifestos v007+estufa:
  **119 + 8 + 6 ARES + 1 Oeste = 134**, conferindo também a identidade dos
  colisores e as rotas, sem só trocar um número fixo.
- Validadores v007 aceitam caminho de saída; testes escrevem relatórios em pasta
  temporária, sem sobrescrever as evidências históricas em art-source.
- QA da estufa usa o script existente adaptado só para salvar o relatório aqui
  e capturar imagens. OFFLINE/ONLINE, entrada W/saída S, corte de cobertura,
  oito giros, EDEN, viagem/retorno, reset OFFLINE e pausa.

Para os scripts de navegador, definir `HORDA_QA_PACKAGE` para o
`playwright-core/package.json` local e `HORDA_QA_CHROMIUM` para o executável:

```sh
node docs/handoffs/s2.12-b/v007-deck/capturar-deck.mjs antes sudoeste
node docs/handoffs/s2.12-b/v007-deck/capturar-deck.mjs depois sudoeste
node docs/handoffs/s2.12-b/v007-deck/capturar-deck.mjs antes noroeste
node docs/handoffs/s2.12-b/v007-deck/capturar-deck.mjs depois noroeste
node docs/handoffs/s2.12-b/v007-deck/qa-aneis.mjs
node docs/handoffs/s2.12-b/v007-deck/qa-greenhouse.mjs http://127.0.0.1:5193/
```

Capturas "antes" devem ser reproduzidas no commit `e0eef58` sem os props;
"depois" na ponta deste ajuste. Não sobrescrever a referência histórica ao
rodar ambos na mesma revisão. Scripts técnicos não concedem aceite visual ou
benchmark. Não há alteração de progressão/save para ativar a estufa.

## Roteiro do autor / parada

Conferir anéis e flutuação na rua, calçada e canteiro; observar um drop na borda.
Em Marte, comparar sudoeste/noroeste, consoles/rack/tubo/tanques/carrinhos,
entrar/sair da estufa nos dois estados, caminhar pela estrada/passarela e embarcar.
Autor valida o entorno recomposto e a correção do anel. Claude revisa os três
commits antes de novo avanço. **Não começar etapa 2 nem animal mutante.**
