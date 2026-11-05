# MCP Office — Story and Narrative

> Narrative design aligned with the implemented journey: login, orbital map,
> deck activation in-world, EDEN wizard, Smart Lab, and the editorial mission.
> Replaces `STORY_AND_NARRATIVE_DIRECTION.md`.
>
> Revision: v2.0 · May 2026

---

## 1. One-liner

> *MCP Office is a low-poly sci-fi workplace where you log into your Creative
> Command Center, light up specialist stations by meeting their agents, and
> ship real content packages by routing missions through Eden, Mister, Max,
> Nara, and Astra.*

**Genre:** Non-combat operational adventure · Diegetic management sim · AI
workplace game.

---

## 2. Player fantasy

The player is the **Director** of an AI studio operating five specialist
agents. They don't write content, design assets, or record narration — the
agents do. The Director **coordinates, decides, and approves**.

### What the Director does

| Verb | Meaning in MCP Office |
|---|---|
| Coordinate | Move work between agents |
| Decide | Approve drafts, pick formats, set the campaign |
| Activate | Light up a station by meeting its agent |
| Direct | Give EDEN the brand rules; give Mister a theme |

The Director never executes the craft directly — that's the point.

---

## 3. World premise

A near-future where AI operations are spatial. Instead of managing agents
through tabs and chat, the operator enters a Creative Command Center — a
purpose-built digital HQ where every AI capability has a desk, a station,
and a role.

The office is **not a metaphor for the dashboard**. It *is* the dashboard.

### Entry flow

The journey is implemented as four screens before the world:

1. **Login** (`LoginScreen.tsx`) — name + color preset + welcome:
   *"Bem-vindo ao seu Creative Command Center. Escolha um deck para começar."*
2. **Orbital map** (`DeckSelectionScreen.tsx`) — five stations float around
   a pulsing core. All stations start **discovered but inactive** (grey).
   Single CTA: `Entrar na estação`.
3. **Workspace** (`OfficeScene` + `OfficeMap`) — player spawns in the office.
   First objective seeded: "Find Eden in the Strategy Deck (north of the map)."
4. **Activation in-world** — pressing `E` near a main agent for the first
   time triggers the activation balloon, which lights up that deck on the
   orbital map and brings the agent online.

The orbital map can be reopened at any time via the HUD `Orbit` button or
the `M` shortcut — it becomes a live reference rather than a one-time gate.

---

## 4. The five agents

Each MCP NPC is an **operational character**. Personality emerges through
professional competence, not backstory. Names in code: `brand-brain`,
`editorial`, `narration`, `design`, `output-review`.

### Eden · Brand Brain MCP

| Attribute | Value |
|---|---|
| Zone | Strategy Deck (north) |
| Archetype | Scientist strategist, brand librarian |
| Accent | `#F2C94C` (gold) |
| Core phrase | *"Everything starts with the brand. Let me show you the rules."* |
| Tone | Assured, structured, slightly formal |

Eden is **the entry point**. The first time the player walks up, she opens
the `ClientSetupWizard` — 7 steps that produce a complete `rules.md` for the
client (brand name, segment, audience, tone, pillars, CTA, palette, logo).
Subsequent visits offer two actions: *Cadastrar novo cliente* and *Ativar
Brand Brain MCP para [cliente]*.

### Mister · Editorial MCP

| Attribute | Value |
|---|---|
| Zone | Editorial Deck (west) |
| Archetype | Fast-thinking creative strategist |
| Accent | `#2F80ED` (blue) |
| Core phrase | *"Give me a direction and I'll build the brief. Hooks, structures, captions — I've got it."* |
| Tone | Energetic, confident, slightly informal |

Mister is **the game's start signal**. Activating Editorial for a client
seeds the four-step mission: gerar briefing → enviar para Design → aprovar
com Astra → exportar pacote. The mission state lives on the client itself
(`idle → briefing → designing → narrating → reviewing → published`).

### Max · Design MCP

| Attribute | Value |
|---|---|
| Zone | Design Studio (east) |
| Archetype | Visual technologist, aesthetic perfectionist |
| Accent | `#27AE60` (green) |
| Core phrase | *"Show me the brief and I'll turn it into visuals."* |
| Tone | Creative, precise, visual-thinking |

Max receives handoffs from Mister and produces design prompts, layouts, and
image preparation. The player is the **art director reviewing work**, not
the designer doing it.

### Nara · Narration MCP

| Attribute | Value |
|---|---|
| Zone | Narration Booth (south-west) |
| Archetype | Calm audio specialist, precision-focused |
| Accent | `#9B51E0` (purple) |
| Core phrase | *"I'll shape the script for the voice. Clean, timed, ready to record."* |
| Tone | Measured, technical, quietly confident |

Nara is a **specialist branch**, not the main trunk. Some missions skip her;
when used, she handles voice scripts, voice IDs, and audio-ready prompts.

### Astra · Output / Review (Social Media operator)

| Attribute | Value |
|---|---|
| Zone | Review Console (south-east) |
| Archetype | Publishing operator with sunglasses + headphones |
| Accent | `#00C2FF` (cyan) |
| Core phrase | *"Nothing leaves this office without passing through me."* |
| Tone | Precise, authoritative, final |

Astra is **the destination**. The internal slot id is still `output-review`,
but the visual archetype is Social Media — phone-in-hand, headphones, ready
to publish. Approving a package here moves the client's mission to
`published`.

---

## 5. Smart Lab (the second tier)

Between Eden's strategy work and Max's visual production sits the **Smart Lab** —
a glass-walled diagnostics room. The player doesn't activate it like a deck;
it opens as a console (`SmartLabConsole` inside `DialogueModal`) when the
player walks up to its monitor.

Function:

- **Monitor view** — overview of all of the player's clients with usage bars
  (one bar per client, ordered by recent activity).
- **Brand rules view** — second screen, shows only the active client's
  generated `rules.md`.
- **Chat** — dock under the monitor. Talks to `/api/smart-lab/chat`, a local
  endpoint that mediates assistant conversations grounded in the active
  client's rules.

Narratively, the Smart Lab is the **diagnostic floor** between strategy and
production — where the Director validates that brand intelligence is in
order before pushing into design.

---

## 6. First-time onboarding (three beats)

### Beat 1 — Arrival (0–15s)

Player completes login + the orbital intro. Workspace spawns them near
center. Toast: *"Encontre Eden no Deck de Estratégia (norte do mapa)."* Task
panel seeds `find-eden`.

### Beat 2 — First activation (15–60s)

Player approaches Eden. Activation balloon: *"Ativar Brand Brain MCP?"*
Confirming triggers two things at once:

1. The Brand Brain station lights up on the orbital map.
2. The `ClientSetupWizard` opens directly inside the dialogue bubble.

The 7-step wizard ends with a generated `rules.md`, a registered client, and
the task `Cadastre seu primeiro cliente` marked complete.

### Beat 3 — Editorial gate (60s+)

Player walks to Mister. Without an active client, Mister says: *"Editorial
precisa de pelo menos um cliente ativo no Brand Brain."* After Eden has
activated one, Mister offers *Ativar Editorial MCP para [cliente]*. Once
activated, the four-step mission appears in the task panel and the full
action set unlocks: gerar briefing, montar calendário, escrever copy,
roteirizar carrossel, encaminhar para Design ou Narração.

---

## 7. Mission archetypes (Phase 3 target)

Once the natural-language mission composer exists, the system should support:

1. **Editorial calendar generation** — *"Crie calendário editorial de 10 posts
   para o Hospital Samer com base nos arquivos do Brand Brain."*
2. **Asset selection from a folder** — *"Selecione as melhores fotos da pasta
   Verdiplan para o carrossel de manutenção de outono."*
3. **Brand-based ideation** — *"Gere 5 ganchos novos para a Iron House
   alinhados ao tom premium."*
4. **Review and export** — *"Aprove e exporte o pacote do Hospital Samer
   para publicação no Instagram."*

Each archetype routes work across one or more agents and ends at Astra.

---

## 8. Environmental storytelling

The architecture itself communicates state.

| Cue | Meaning |
|---|---|
| Station discovered but inactive on orbital map | Agent exists, but the Director hasn't met them yet |
| NPC billboard `demo` | No clients linked to this agent |
| NPC billboard `active` | Agent is online for at least one client |
| NPC billboard `busy` | Agent is currently processing a mission action |
| Wide central monitor in Smart Lab | Diagnostic room is open for inspection |
| Orbit Garden lights at dusk | A finished mission can be projected there (Phase 4) |

Diegetic UI framing:

- Floating nameplates are **holographic** — they belong to the world.
- Task panel is a **work order clipboard**, not a quest log.
- Status log is an **operations feed**, not a chat window.
- Dialogue panel is the **MCP console**, not an RPG dialogue box.

---

## 9. What the narrative deliberately avoids

- Lore dumps. Beat 1 has no story modal; the office is the tutorial.
- Personal drama. Agents are professional peers, not sidekicks.
- Fantasy quests. There is no "magical token" or "hidden artifact."
- Linear gates that block exploration. The orbital map shows everything from
  the first second; activations are optional checkpoints, not walls.
- Combat metaphors. No "defeating," no "boss agent." Missions complete; they
  don't get won.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Director** | The player. |
| **Station** | An activatable area of the office tied to one agent. |
| **Deck** | The strategic/UI bundle representing a station outside the world (orbital map, journey store). |
| **Run / Mission** | One complete content production cycle, ending at Astra. |
| **Brand rules / `rules.md`** | The artifact Eden produces from the wizard. |
| **Handoff** | When one agent's output becomes another agent's input. |
| **Package** | A complete approved deliverable, ready to publish. |
| **Activation balloon** | The first-contact UI that confirms turning on a station. |
| **Smart Lab** | The diagnostics console between Brand Brain and Design. |
