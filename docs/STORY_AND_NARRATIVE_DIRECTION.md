# MCP Office — Story and Narrative Direction

> Implementation-ready narrative design document for the first playable prototype.
> Revision: v1.0 · May 2026

---

## 1. High Concept

**One-liner:**
*MCP Office is a low-poly interactive workplace where business owners walk through a living AI office, talk to specialist NPCs, and orchestrate real creative operations — turning workflow management into spatial, playful, and premium gameplay.*

**Elevator pitch (30 seconds):**
Imagine you're the new Creative Director at a futuristic operations studio. Instead of opening tabs and dashboards, you walk into an office. Every AI agent is a colleague sitting at their desk. You approach them, start a conversation, give directions, review deliverables, and move work forward — all inside a navigable 3D space. The office *is* the interface. The NPCs *are* your tools. The workflow *is* the game.

**Genre classification:**
Non-combat operational adventure · Diegetic management sim · AI workplace game

**Reference DNA:**

| Inspiration | What we borrow |
|---|---|
| Pokémon towns | Exploration, NPC conversations, spatial discovery |
| Stardew Valley | Calm, purposeful routine; non-combat daily loop |
| Animal Crossing | Ambient world, gentle progression, satisfying tasks |
| Notion / Linear | Operational clarity, status tracking, workflow logic |
| A real creative agency | Roles, handoffs, approvals, output pressure |

We combine the **clarity of a SaaS dashboard** with the **warmth and spatial memory of a game world**.

---

## 2. Player Fantasy

The player fantasy is:

> **"I am the Creative Director of a futuristic AI-powered studio. My office is alive. My team never sleeps. I walk through the space, coordinate specialists, and ship premium content — all by being present and making decisions."**

### What the player should feel

| Moment | Feeling |
|---|---|
| Entering the office | Calm authority — "This is my workspace." |
| Walking to an NPC | Purpose — "I know who to talk to." |
| Opening a dialogue panel | Competence — "I understand the system." |
| Triggering an action | Momentum — "Work is moving forward." |
| Completing a quest chain | Satisfaction — "I shipped something real." |

### What the player should never feel

- Lost in lore they didn't ask for.
- Confused about what to do next.
- Like they are playing a children's game.
- Like they are reading a technical manual.

The tone is **professional but warm, spatial but efficient, playful but never silly**.

---

## 3. Worldbuilding

### The world in one paragraph

The MCP Office exists in a near-future where AI operations have become spatial. Instead of managing agents through text interfaces, operators enter a **Workplace** — a purpose-built digital environment where every AI capability has a physical presence, a desk, a zone, and a personality. The office is not a metaphor. It is the interface. Walking to a desk *is* opening a tool. Talking to an NPC *is* issuing a command. The space itself communicates status, priority, and flow.

### World rules

1. **The office is the dashboard.** Every piece of information the player needs is embedded in the environment — NPC labels, zone names, ambient status cues. No external menus break the spatial illusion.
2. **NPCs are operational, not fictional.** They don't have backstories, quests for magical swords, or personal drama. They have *roles, capabilities, and deliverables.* Their personality comes from how they describe their work.
3. **Movement is navigation.** Walking to the Editorial Bay is the equivalent of clicking the "Editorial" tab. Physical proximity replaces menu hierarchies.
4. **Actions are real (or will be).** Every button in a dialogue panel maps to a future MCP command. Even in prototype form, the actions should feel operational, not decorative.
5. **Time is workflow time.** The world doesn't have day/night or seasons. It has *runs* — a run is a complete cycle of content production from brief to published post.

### The five zones

These map directly to the existing `zoneName` values in `mcpData.ts`:

| Zone | Purpose | Spatial feel |
|---|---|---|
| **Strategy Deck** | Brand rules, constraints, identity tokens | Clean, authoritative, central — the "brain" of the office |
| **Editorial Bay** | Content ideation, briefs, text structures | Energetic, paper-heavy, idea-dense — the "writer's room" |
| **Narration Booth** | Voice scripts, audio prep, voice IDs | Quiet, focused, slightly isolated — a recording-studio vibe |
| **Design Studio** | Visual direction, layout systems, image prompts | Colorful, tool-rich, creative chaos — the "art department" |
| **Review Console** | Approval, export, publishing readiness | Precise, final, authoritative — the "quality gate" |

### Spatial layout principle

The zones are arranged so the player's natural movement traces the editorial pipeline:

```
                  Strategy Deck (Brand Brain)
                         ↑ brand tokens flow down
                         |
     Editorial Bay ←—————+————————→ Design Studio
     (Editorial MCP)     |          (Design MCP)
                         |
     Narration Booth ←———+
     (Narration MCP)     |
                         |
                  Review Console (Output Station)
```

The player starts near the center. The workflow radiates outward, then converges at the Review Console. This creates a spatial metaphor for the production pipeline: **diverge, create, converge, ship.**

---

## 4. Player Role

**Title:** Creative Director (or simply "Director")

**In-world description:**
You are the human operator of this AI workplace. You don't write content, design assets, or record voiceovers yourself — your agents do. Your job is to **coordinate, decide, and approve**. You set things in motion, review what comes back, and give the green light.

**Narrative function:**

| Aspect | Definition |
|---|---|
| Agency type | Decision-maker, not executor |
| Core verb | *Coordinate* (not fight, not build, not collect) |
| Relationship to NPCs | Professional peer, not master/servant |
| Movement metaphor | Walking = navigating your business |
| Interaction metaphor | Talking = issuing operational commands |

**What the Director does NOT do:**
- Write the content themselves (the Editorial MCP does that)
- Design the visuals (the Design MCP does that)
- Record narration (the Narration MCP does that)
- The Director *orchestrates*. That is the core player fantasy.

---

## 5. Narrative Premise

### The setup (delivered through environment + first interaction, not cutscene)

> It's your first day as Creative Director of an AI-powered content studio. The office is ready. Five specialist agents are at their desks, waiting for direction. Your first assignment: produce one complete Instagram editorial package — from brand alignment to publish-ready output.
>
> No one will tell you exactly what to do. But every agent knows their job. Walk up to them. Ask questions. Start the workflow. The office will guide you.

### Why this works for a prototype

- **No lore dump.** The premise is self-evident from the environment.
- **Immediate goal clarity.** Produce one content package.
- **Player agency from second one.** No forced tutorials — the player chooses where to walk first.
- **Scalable.** The same premise supports a 2-minute demo and a 20-minute session.

### The narrative contract with the player

The game makes an implicit promise:

> "If you explore this office and talk to these agents, you will understand how this editorial system works — and you will produce something real."

Every design decision in the prototype should honor this contract.

---

## 6. MCP NPC Narrative Roles

Each NPC is designed as an **operational character** — they have personality expressed through professional competence, not through backstory or emotion.

---

### Brand Brain MCP

| Attribute | Value |
|---|---|
| **Zone** | Strategy Deck |
| **Narrative role** | The Institutional Memory |
| **Personality archetype** | Precise librarian, brand guardian |
| **Core phrase** | *"Everything starts with the brand. Let me show you the rules."* |
| **What they represent** | Consistency, constraints, identity |
| **Dialogue tone** | Assured, structured, slightly formal |

**Player relationship:** Brand Brain is the first NPC the player should visit. They ground the workflow. Meeting them first teaches the player that every piece of content must respect brand rules. This is narratively important: it establishes that this is a *professional system*, not free-form creativity.

**Implementation note:** The existing task `talk-brand-brain` in `InteractionManager.ts` already tracks this as the first quest step. The narrative validates this design.

---

### Editorial MCP

| Attribute | Value |
|---|---|
| **Zone** | Editorial Bay |
| **Narrative role** | The Ideas Engine |
| **Personality archetype** | Fast-thinking creative strategist |
| **Core phrase** | *"Give me a direction and I'll build the brief. Hooks, structures, captions — I've got it."* |
| **What they represent** | Ideation, structure, editorial strategy |
| **Dialogue tone** | Energetic, confident, slightly informal |

**Player relationship:** The Editorial MCP is the workhorse. Most player time in a run will involve triggering briefs, reviewing text structures, and routing deliverables from here. The player should feel like they're giving creative direction, not filling out forms.

**Key interaction pattern:** The player visits Editorial after Brand Brain. The narrative logic is: *first absorb the rules, then generate ideas within those rules.*

---

### Narration MCP

| Attribute | Value |
|---|---|
| **Zone** | Narration Booth |
| **Narrative role** | The Voice |
| **Personality archetype** | Calm audio specialist, precision-focused |
| **Core phrase** | *"I'll shape the script for the voice. Clean, timed, ready to record."* |
| **What they represent** | Voice, audio, spoken-word content |
| **Dialogue tone** | Measured, technical, quietly confident |

**Player relationship:** The Narration MCP is a specialist the player visits only when the editorial brief requires audio (e.g., Reels). This NPC feels slightly apart — their zone (Narration Booth) should feel quieter, more isolated. This spatial distinction reinforces that narration is a *specialized branch* of the pipeline, not the main trunk.

---

### Design MCP

| Attribute | Value |
|---|---|
| **Zone** | Design Studio |
| **Narrative role** | The Visual Mind |
| **Personality archetype** | Visually-driven art director, aesthetic perfectionist |
| **Core phrase** | *"Show me the brief and I'll turn it into visuals. Layouts, prompts, style — all of it."* |
| **What they represent** | Visual execution, design systems, image generation |
| **Dialogue tone** | Creative, precise, visual-thinking |

**Player relationship:** The Design MCP receives work from Editorial (via `Send Brief to Design MCP`). The player visits Design to review visual direction, trigger design prompts, and validate layouts. The narrative emphasis: the player is an *art director reviewing work*, not a designer doing the work.

---

### Output / Review Station

| Attribute | Value |
|---|---|
| **Zone** | Review Console |
| **Narrative role** | The Quality Gate |
| **Personality archetype** | Meticulous quality controller, final authority |
| **Core phrase** | *"Nothing leaves this office without passing through me. Let's review."* |
| **What they represent** | Approval, quality, shipping |
| **Dialogue tone** | Precise, authoritative, final |

**Player relationship:** This is the *destination* of every run. The entire workflow flows toward this NPC. Reaching the Review Console and approving content is the narrative climax of each production cycle. The player should feel a satisfying sense of completion here — *"I moved work through the entire pipeline and it's ready."*

**Implementation note:** The existing task `review-output` tracks this as the final quest step. The narrative confirms: Review Console is always the endpoint.

---

## 7. First-Time User Onboarding

The onboarding is designed as a **three-beat environmental tutorial** — no modal popups, no forced paths, no walls of text.

### Beat 1 — Arrival (0–15 seconds)

**What happens:**
The player spawns at the center of the office. The HUD fades in. A toast message appears:

> `"Welcome to MCP Office. Walk around and meet your team."`

The task panel appears on the left with the first objective:

> ☐ Talk to Brand Brain MCP

**Design intent:** The player immediately sees NPCs at their desks with floating labels. Curiosity drives exploration. The first objective gives direction without forcing a path.

**What the player learns:**
- WASD movement
- The office has zones and NPCs
- The task panel tracks progress

### Beat 2 — First Conversation (15–45 seconds)

**What happens:**
The player walks to Brand Brain. An interaction hint appears:

> `"Press E to interact with Brand Brain MCP"`

The player presses E. The dialogue panel opens. Brand Brain speaks:

> *"I keep the brand rules, tone of voice, hashtags, visual style, slogans and locked elements aligned for every client."*

The player sees action buttons. They can explore them. The task completes:

> ☑ Talk to Brand Brain MCP

**What the player learns:**
- E opens dialogue
- ESC closes dialogue
- NPCs have roles, descriptions, and actions
- Actions trigger operations (even if placeholder)

### Beat 3 — Pipeline Discovery (45–120 seconds)

**What happens:**
New tasks appear after Brand Brain is complete:

> ☐ Generate Editorial Brief
> ☐ Send to Design MCP
> ☐ Review at Output Station

The player now has a clear chain to follow. They walk to Editorial Bay, generate a brief, send it to Design, then visit the Review Console. Each step completes a task. When all four tasks are done, a toast appears:

> `"First run complete. You're ready to operate."`

**What the player learns:**
- The editorial pipeline has a sequence
- Work flows between agents
- The Review Console is the endpoint
- Completing a run feels satisfying

### Onboarding principles

| Principle | Implementation |
|---|---|
| **Show, don't tell** | No tutorial screens. The environment teaches. |
| **Lore-light** | Zero backstory in onboarding. Only operational info. |
| **Player-paced** | No timers, no pressure. Walk at your own speed. |
| **Tutorialization through objectives** | The task panel *is* the tutorial. |
| **Diegetic interface** | HUD, labels, and hints are part of the world's UI language. |

---

## 8. First Prototype Quest Flow

The prototype contains **three quests** (called "Runs" in the game's language). Each run is a complete editorial production cycle.

---

### Run 1 — "First Contact"

**Objective:** Complete your first editorial workflow from Brand Brain to Output.

**Steps (mapped to existing task IDs in code):**

| Step | Task ID | Action |
|---|---|---|
| 1. Talk to Brand Brain | `talk-brand-brain` | Walk to Strategy Deck, press E, read Brand Brain's role |
| 2. Generate a brief | `generate-brief` | Walk to Editorial Bay, press "Generate Editorial Brief" |
| 3. Route to Design | `send-to-design` | In Editorial dialogue, press "Send Brief to Design MCP" |
| 4. Final review | `review-output` | Walk to Review Console, press "Review Current Post" or "Approve Content" |

**Completion reward:** Toast message: *"Run 1 complete — First Contact."* Status log entry.

**Narrative purpose:** Teach the full pipeline. Establish spatial memory of the office.

---

### Run 2 — "Voice and Vision" (future implementation)

**Objective:** Produce a content package that includes both visual assets and narration audio.

**New steps:**

| Step | Action |
|---|---|
| 1. Visit Brand Brain | Refresh brand tokens for new client or campaign |
| 2. Generate Editorial Brief | Include narration flag in brief |
| 3. Route script to Narration MCP | Walk to Narration Booth, generate narration text, select voice ID |
| 4. Route brief to Design MCP | Walk to Design Studio, generate design prompt |
| 5. Review at Output Station | Review combined package: text + visuals + audio |

**Narrative purpose:** Introduce the Narration MCP. Show that the pipeline branches — not everything goes through the same linear path. The player learns that **Narration and Design can work in parallel**, which mirrors real editorial production.

---

### Run 3 — "Full Production" (future implementation)

**Objective:** Produce a complete multi-asset Instagram post package: carousel text, caption, design prompt, narration, and export-ready bundle.

**New elements:**
- Use all five actions in Editorial (brief, carousel, caption, route to Design, route to Narration)
- Use all four actions in Design (prompt, style, layout, image prep)
- Full review at Output Station with explicit "Approve" + "Export" + "Mark Ready"

**Narrative purpose:** The player now understands the *full operational depth* of the system. Every NPC is used. Every action is meaningful. The run feels substantial and complete.

---

### Quest flow summary

```
Run 1: Linear pipeline      (Brand → Editorial → Design → Review)
Run 2: Branching pipeline    (Brand → Editorial → Design + Narration → Review)
Run 3: Full production       (All NPCs, all actions, complete package)
```

Each run increases complexity gradually. The player never reads a manual — they learn by doing.

---

## 9. Environmental Storytelling Details

Environmental storytelling in MCP Office is **functional, not decorative**. Every visual detail should communicate something about the operational state of the workspace.

### Zone-level storytelling

| Zone | Visual cues | What they communicate |
|---|---|---|
| **Strategy Deck** | Clean desk, organized tokens, brand-colored accents | Order, authority, single source of truth |
| **Editorial Bay** | Papers on desk, sticky notes, slight creative clutter | Ideation energy, work in progress |
| **Narration Booth** | Minimal furniture, slightly isolated position | Focus, specialization, audio precision |
| **Design Studio** | Color swatches, visual references, layout grids | Visual creativity, aesthetic richness |
| **Review Console** | Monitor-heavy desk, checklist visuals, green/red indicators | Quality control, finality, shipping |

### Ambient state cues (future implementation)

As the system matures, environmental storytelling can convey real-time operational status:

| Cue | Meaning |
|---|---|
| NPC idle animation (subtle bob) | Agent is available and ready |
| NPC active glow | Agent is currently processing a task |
| Papers appearing on a desk | New deliverables have been generated |
| Green indicator light at Review Console | A package is approved and ready to ship |
| Subtle ambient sound changes per zone | Spatial awareness without looking at HUD |

### Diegetic interface elements

All UI should feel like it belongs in the world:

- **Floating NPC labels** are holographic nameplates, not game UI bubbles.
- **The task panel** is a work order clipboard, not a game quest log.
- **The status log** is an operations feed, not a chat window.
- **The dialogue panel** is an MCP console terminal, not an RPG dialogue box.

This framing keeps the experience premium and professional rather than gamified.

---

## 10. Future Narrative Expansion Ideas

The narrative architecture is designed to scale without reworking the core. Each phase adds narrative depth while keeping the same foundational metaphor: **the office is the interface, the NPCs are the agents, the player is the director.**

### Phase 1 — Multi-client office (near-term)

- The office supports multiple "clients" (brands) with different Brand Brain configurations.
- Switching clients changes the Brand Brain's dialogue and tokens.
- The player learns to navigate multiple operational contexts within the same space.
- **Narrative impact:** The office feels like a real agency, not a single-purpose tool.

### Phase 2 — Rooms and floors (mid-term)

- New rooms for new operational areas: Social Media Room, Video Production Suite, Analytics Corner.
- Each room has its own NPCs and workflow logic.
- Doors or corridors connect rooms — spatial navigation scales.
- **Narrative impact:** The "office" becomes a "building." The player's spatial map grows.

### Phase 3 — Agent state and personality evolution (mid-term)

- NPCs develop conversational memory: they reference past runs, common mistakes, preferred styles.
- Dialogue becomes context-aware: *"Last time you ran the Iron House brief, the narration was too long. Want me to keep it tighter?"*
- NPCs gain subtle personality traits that emerge through repeated interaction.
- **Narrative impact:** The workplace feels alive, responsive, and personal.

### Phase 4 — Urgency and priority systems (future)

- Deadlines create spatial urgency: a glowing desk means that agent needs attention.
- Bottlenecks are visible: if Design MCP hasn't received a brief, their zone looks dormant.
- The player develops operational intuition by reading the room.
- **Narrative impact:** The game develops a genuine "management" feel — not through stress, but through readable spatial signals.

### Phase 5 — Multiplayer workplace (long-term)

- Multiple human operators share the same office.
- Each operator has a distinct avatar and role.
- NPCs can serve multiple operators, creating visible workflow queues.
- **Narrative impact:** The workplace becomes a collaborative space, mirroring real team operations.

### Phase 6 — Narrative events and milestones (long-term)

- Monthly narrative events: *"New client onboarding"*, *"Campaign launch week"*, *"End-of-month review."*
- NPCs acknowledge milestones: *"We've produced 50 packages together. The system is running smoothly."*
- The office evolves visually as the player ships more work (new furniture, upgraded equipment, expanded zones).
- **Narrative impact:** Long-term engagement through progression and recognition.

---

## Appendix A: Emotional Tone Guide

| Dimension | Target | Avoid |
|---|---|---|
| **Overall mood** | Calm confidence | Stress, urgency, chaos |
| **Visual tone** | Clean, premium, modern | Cluttered, retro, pixel-art |
| **NPC personality** | Competent professionals | Quirky sidekicks, comedic relief |
| **Language register** | Clear, concise, operational | Jargon-heavy, overly casual, fantasy |
| **Player empowerment** | "I understand and direct" | "I'm confused but clicking things" |
| **Humor** | Dry wit, subtle warmth | Slapstick, memes, breaking fourth wall |
| **Sound design** (future) | Ambient office hum, soft tones | Music-heavy, action sounds, alerts |
| **Progression feeling** | Earned mastery | Grinding, unlocking, collecting |

### The emotional North Star

> *MCP Office should feel like walking into the most beautifully designed, intelligently organized creative studio you've ever seen — and realizing you're the one running it.*

---

## Appendix B: Glossary of Narrative Terms Used

| Term | Meaning in this project |
|---|---|
| **Run** | One complete editorial production cycle (brief → review → ship) |
| **Director** | The player's role — human operator of the AI workplace |
| **Zone** | A named area of the office associated with one MCP NPC |
| **Workspace** | The overall MCP Office environment |
| **Agent** | An AI capability represented as an NPC |
| **Handoff** | When one NPC's output becomes another NPC's input |
| **Package** | A complete set of deliverables ready for publishing |
| **Diegetic interface** | UI elements that feel like they exist inside the game world |
| **Environmental storytelling** | Using visual cues in the 3D space to communicate information |
