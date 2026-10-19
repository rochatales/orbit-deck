# 🚀 Horda Survivor — UI Design System

> [!IMPORTANT]
> **Decisão de design confirmada:** Dois estilos oficiais, com responsabilidade clara por contexto de jogo.

---

## Estilos oficiais

| Estilo | Contexto | Telas |
|---|---|---|
| **01 · EDEN Holographic** | Menus iniciais, interações com a EDEN, contadores em combate | Menu principal, briefings, HUD de batalha, inventário, game over |
| **02 · Mars Colony Clean** | Gestão de recursos da base em Marte | Colônia, upgrades, produção, construção, relatórios |

---

## Paleta de tokens compartilhada

| Token | Hex | Uso |
|---|---|---|
| `--deep-space` | `#080C14` | Fundo base do Estilo 01 |
| `--mars-white` | `#F0EFEC` | Fundo base do Estilo 02 |
| `--mars-sand` | `#C4845A` | Detalhe terroso, solo marciano |
| `--eden-teal` | `#4DD9C0` | Cor de acento primária (ambos os estilos) |
| `--eden-purple` | `#8B5CF6` | Energia, ações especiais |
| `--danger-amber` | `#FF6B35` | Alerta de combate, dano |
| `--danger-red` | `#E53E3E` | Vida crítica, erros |
| `--text-holo` | `#E2F8F4` | Texto no Estilo 01 |
| `--text-clean` | `#1A1A2E` | Texto no Estilo 02 |

> [!TIP]
> O `--eden-teal` é o fio condutor visual entre os dois estilos — aparece como brilho holográfico no 01 e como acento de interface no 02. Isso garante coerência mesmo com estéticas opostas.

---

## Estilo 01 — EDEN Holographic Interface ✦

**Conceito:** Os menus são projeções holográficas da EDEN. O jogador não está "vendo uma tela de menu" — está interagindo diretamente com a IA. Painéis translúcidos em teal/ciano flutuam sobre o espaço escuro. Scanlines, interferências de sinal e o cursor piscando reforçam que há uma inteligência viva do outro lado.

---

### Onde se aplica

| Tela | Notas |
|---|---|
| **Menu principal** | Logo, opções de início, configurações |
| **Briefing de expedição** | EDEN apresenta a missão, mapa, objetivos |
| **Interações com a EDEN** | Diálogos, alertas de rádio durante missão |
| **HUD de combate — contadores** | Vida, munição, robôs neutralizados, tempo |
| **Inventário** | Lista de itens coletados na expedição |
| **Tela de resultado de missão** | Sucesso ou falha, recursos obtidos |
| **Game Over** | Com variação tonal de alerta (amber/vermelho) |

---

### Especificações visuais

**Fundo**
- Cor base: `--deep-space` (`#080C14`)
- Textura: nebulosa sutil em roxo/azul no canto superior, opacidade 20%
- Scanlines horizontais estáticas, altura 2px, opacidade 8%

**Painéis**
- Fill: `rgba(77, 217, 192, 0.06)` — vidro fosco teal muito sutil
- Borda: `1px solid rgba(77, 217, 192, 0.5)` brilhante
- Cantos: cortados em 45° (estilo sci-fi), não arredondados
- Sombra externa: `0 0 16px rgba(77, 217, 192, 0.2)`

**Tipografia**
- Títulos: **Rajdhani Bold**, all caps, tracking +0.1em, cor `--eden-teal`
- Corpo / dados: **Space Mono Regular**, 13px, cor `--text-holo`
- Labels secundárias: Space Mono, 11px, opacidade 60%

**Botões**
- Estado padrão: outline teal `1px`, fundo transparente, texto teal
- Hover: fill `rgba(77, 217, 192, 0.15)`, texto branco, glow externo
- Ativo: fill teal sólido, texto `--deep-space`

**Efeitos**
- Glitch: micro-deslocamento horizontal (`±2px`) aleatório, 2s de intervalo
- Cursor EDEN: `▌` piscando a 500ms nos campos de diálogo
- Interferência de sinal: linha horizontal de ruído ocasional (a cada ~8s)

**Variação de alerta em combate**

```
NORMAL (Marte / neutro)      PERIGO (vida baixa / Terra hostil)
────────────────────          ──────────────────────────────────
Accent: --eden-teal           Accent: --danger-amber (#FF6B35)
Glow:   teal 0.2 opacity      Glow:   amber 0.35 opacity pulsante
Borda:  teal 0.5              Borda:  amber 0.8, animada
```

---

### Anatomia do HUD de combate (Estilo 01)

```
┌─────────────────────────────────────────────────────────┐
│  TERRA · SHANGHAI          [EDEN / RÁDIO ▌]    ⏸ PAUSAR │
├──────────────────┬──────────────────────────────────────┤
│ ROTA DE          │                                       │
│ EXPLORAÇÃO       │         [ÁREA DE JOGO]                │
│ ──────────────── │                                       │
│ Combate em       │                                       │
│ Shanghai         │                                       │
│                  │                                       │
│ Sprint 2 · info  │                                       │
├──────────────────┴──────────────────┬───────────────────┤
│ ▌ EDEN / RÁDIO                      │ VIDA ██████░░ 74% │
│ Mensagem da IA aqui. Texto          │ ──────────────── │
│ monitorando a missão em tempo real. │ RIFLE · 18 / 30  │
│                                     │ ROBÔS: 2 / 5     │
└─────────────────────────────────────┴───────────────────┘
```

---

### 🎨 Prompt — Menu Principal

```
Game UI main menu screen for a sci-fi survival game called "Horda Survivor".
EDEN holographic AI interface. Dark deep-space background (#080C14) with
subtle purple-blue nebula texture at 20% opacity. Translucent frosted glass
panels with sharp 45-degree corner cuts (no rounded corners) and glowing
teal (#4DD9C0) borders. Subtle horizontal scanlines overlay at 8% opacity.

Left panel: minimalist EDEN AI geometric avatar (wireframe concentric circles
and lines, no face) glowing teal. Below it a blinking cursor "▌" and text
"EDEN v4.7 · SOL 847 · COLÔNIA ATIVA" in Space Mono font.

Center: game title "HORDA SURVIVOR" in Rajdhani Bold, teal color, all-caps,
wide tracking. Below: menu items as outlined teal buttons with sci-fi corner
cuts: "INICIAR MISSÃO", "COLÔNIA", "ARQUIVOS", "CONFIGURAÇÕES".

Right panel: small holographic Mars globe with orbit lines.
Occasional glitch micro-artifact on random elements.
Bottom status bar full-width in teal at 30% opacity.
Atmospheric, cinematic. 4K game UI concept art, flat vector clean design.
```

---

### 🎨 Prompt — HUD de Combate

```
In-game combat HUD for sci-fi survival game "Horda Survivor", EDEN holographic
style. Dark deep-space panels (#080C14) overlaid transparently on the game scene
(isometric post-apocalyptic ruins of Shanghai). All panels have sharp sci-fi
45-degree corner cuts and teal (#4DD9C0) glowing borders.

Top bar: breadcrumb "TERRA · SHANGHAI" left-aligned, center shows "EDEN / RÁDIO ▌"
with blinking cursor, right has "CONTROLES" and "PAUSAR" outline buttons.

Left panel: mission title "COMBATE EM SHANGHAI" in Rajdhani Bold teal.
Mission description text in Space Mono 13px light teal. Sprint info below.

Bottom-left panel: EDEN radio dialogue with blinking cursor, monospace font,
text scrolling like a terminal.

Right panel: "VIDA 74/100" with segmented health bar in teal (danger turns amber
when low). "RIFLE · 18/30" ammo count. "ROBÔS NEUTRALIZADOS: 2/5" counter.

Subtle scanlines. Amber glow variant on low-health bar. 4K game UI concept art.
```

---

## Estilo 02 — Mars Colony Clean UI ✦

**Conceito:** A interface da base é o oposto do caos das missões. Limpa, branca, modular — como um tablet de gestão de engenharia espacial. Você está em segurança. A colônia precisa de cuidado, não de adrenalina. O design comunica calma, controle e progresso.

---

### Onde se aplica

| Tela | Notas |
|---|---|
| **Visão geral da colônia** | Status de todos os módulos da base |
| **Gestão de recursos** | Energia, alimento, materiais, população |
| **Construção de estruturas** | Selecionar e posicionar novos módulos |
| **Upgrade de estruturas** | Melhorar módulos existentes |
| **Laboratório / Pesquisa** | Árvore de tecnologia |
| **Relatório pós-expedição** | Itens trazidos, distribuição de recursos |

---

### Especificações visuais

**Fundo**
- Cor base: `--mars-white` (`#F0EFEC`) — branco quente, não puro
- Textura: granulado sutil (noise 3%), como papel de qualidade
- Barra lateral esquerda: `#E5E3DF` (um tom mais escuro), navegação

**Painéis / Cards**
- Fill: `#FFFFFF` branco puro
- Borda: `1px solid #DDD9D4` (cinza muito suave)
- Cantos: `border-radius: 8px` — levemente arredondados
- Sombra: `0 2px 8px rgba(0,0,0,0.08)` — elevação suave

**Acentos**
- Principal: `--eden-teal` (`#4DD9C0`) — barras de progresso, ícones ativos, CTAs
- Secundário: `--eden-purple` (`#8B5CF6`) — pesquisa, upgrade especial
- Alerta: `--danger-amber` (`#FF6B35`) — recurso baixo, atenção necessária
- Crítico: `--danger-red` (`#E53E3E`) — estrutura danificada, falha

**Tipografia**
- Títulos de seção: **Nunito ExtraBold**, 18px, `--text-clean` (`#1A1A2E`)
- Labels de card: **Inter SemiBold**, 14px, `#3D3B4A`
- Valores / dados: **Inter Regular**, 13px, `#6B6877`
- Legenda / dica: **Inter Regular**, 11px, `#9B98A8`

**Botões**
- CTA principal: fill `--eden-teal`, texto branco, radius 6px
- Secundário: outline `--eden-teal`, fundo transparente
- Destrutivo: fill `--danger-red`
- Disabled: fundo `#E5E3DF`, texto `#9B98A8`

**Ícones**
- Estilo: outlined, stroke 1.5px, tamanho 20×20px
- Módulos da base: ícones isométricos pequenos (estufa, pod, gerador, laboratório)
- Recursos: ícones flat simples (gota de água, raio, grão, engrenagem)

---

### Anatomia da tela de gestão (Estilo 02)

```
┌──────────┬──────────────────────────────────────────────────┐
│          │  COLÔNIA · SOL 847          [🔔] [👤] [⚙]        │
│  NAV     ├──────────────────────────────────────────────────┤
│          │  STATUS GERAL                                     │
│ 🏠 Base  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│ 🔬 Lab   │  │ENERGIA  │ │ALIMENTO │ │ÁGUA     │ │POPUL.  │ │
│ 🔧 Build │  │ ██░ 87% │ │ ████ 64%│ │ ██░ 51% │ │ 23/30  │ │
│ 📦 Itens │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
│ 📊 Relat.│  ──────────────────────────────────────────────  │
│          │  ESTRUTURAS ATIVAS                      [+ NOVA] │
│          │  ┌──────────────────┐ ┌──────────────────────┐   │
│          │  │ 🌿 Estufa A      │ │ ⚡ Gerador Solar     │   │
│          │  │ Produção: 12/dia │ │ Capacidade: 450 kWh  │   │
│          │  │ [UPGRADE]        │ │ [UPGRADE]            │   │
│          │  └──────────────────┘ └──────────────────────┘   │
└──────────┴──────────────────────────────────────────────────┘
```

---

### 🎨 Prompt — Visão Geral da Colônia

```
Game UI screen for Mars colony management in "Horda Survivor".
Clean futuristic engineering tablet interface.

Background: warm off-white (#F0EFEC) with very subtle paper grain texture.
Left sidebar: slightly darker (#E5E3DF) navigation panel with minimalist
outlined icons for Base, Lab, Build, Items, Reports. Active item highlighted
with teal (#4DD9C0) left border accent.

Main area: section title "STATUS GERAL · SOL 847" in Nunito ExtraBold dark.
Four stat cards in a row (white, 8px radius, soft shadow): ENERGIA 87%,
ALIMENTO 64%, ÁGUA 51%, POPULAÇÃO 23/30. Each card has a teal progress bar,
a simple outlined icon, and the value in Inter SemiBold.

Below: "ESTRUTURAS ATIVAS" section with module cards showing isometric micro
illustrations of: greenhouse, solar generator, housing pod, research station.
Each card has name, production stat, and a teal "UPGRADE" CTA button.

Top bar: breadcrumb "COLÔNIA · MARTE", notification bell, settings icon.
Mars horizon photo strip at the very top (orange dunes, pink sky).
Minimal, functional, SpaceX mission control tablet aesthetic. 4K UI concept art.
```

---

### 🎨 Prompt — Tela de Upgrade de Estrutura

```
Game UI upgrade screen for a Mars base structure in "Horda Survivor".
Clean colony management interface, warm white background (#F0EFEC).

Center modal card (white, 12px radius, prominent soft shadow):
- Header: small isometric illustration of a greenhouse structure
- Title: "ESTUFA HIDROPÔNICA — NÍVEL 2" in Nunito ExtraBold
- Current stats vs upgraded stats in two-column comparison table:
  Produção diária: 12 → 20 unidades
  Consumo de água: 8 → 10 L/dia
  Espaço ocupado: 2×2 tiles
- Cost panel: resource icons with amounts (water drop, gear, energy bolt)
  "MATERIAIS: 45 | ENERGIA: 20 | TEMPO: 3 SOLs"
- Purple (#8B5CF6) "INICIAR UPGRADE" primary button, full-width
- "CANCELAR" secondary outline button below

Background blurred colony overview behind modal.
Teal accent on stat improvement values. Amber warning if resources are low.
Clean Inter typography throughout. 4K game UI concept art.
```

---

## 📋 Mapeamento completo de telas

| Tela | Estilo | Variação |
|---|---|---|
| Menu principal | **01 · EDEN** | Padrão (teal) |
| Briefing de expedição | **01 · EDEN** | Padrão (teal) |
| HUD de combate — vida, munição | **01 · EDEN** | Alerta (amber) quando vida < 30% |
| Diálogo / rádio da EDEN | **01 · EDEN** | Padrão (teal) |
| Inventário de expedição | **01 · EDEN** | Padrão (teal) |
| Resultado de missão (sucesso) | **01 · EDEN** | Padrão (teal) |
| Resultado de missão (falha) | **01 · EDEN** | Crítico (vermelho) |
| Game Over | **01 · EDEN** | Crítico (vermelho) |
| Configurações | **01 · EDEN** | Padrão (teal) |
| Visão geral da colônia | **02 · MARS** | Padrão |
| Gestão de recursos | **02 · MARS** | Alerta (amber) se recurso < 20% |
| Construção de estrutura | **02 · MARS** | Padrão |
| Upgrade de estrutura | **02 · MARS** | Padrão / Purple para ações especiais |
| Laboratório / Pesquisa | **02 · MARS** | Purple accent |
| Relatório pós-expedição | **02 · MARS** | Teal para itens positivos |

---

## 🔤 Fontes (Google Fonts — gratuitas)

| Estilo | Títulos | Dados / Corpo |
|---|---|---|
| **01 · EDEN Holographic** | [Rajdhani Bold](https://fonts.google.com/specimen/Rajdhani) | [Space Mono](https://fonts.google.com/specimen/Space+Mono) |
| **02 · Mars Colony Clean** | [Nunito ExtraBold](https://fonts.google.com/specimen/Nunito) | [Inter](https://fonts.google.com/specimen/Inter) |

> [!NOTE]
> O `--eden-teal` presente em ambos os estilos garante que a transição entre combate e base não sinta como dois jogos diferentes — é o mesmo universo, mas em estados emocionais opostos: tensão vs. controle.
