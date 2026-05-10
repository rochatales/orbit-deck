# MCP Office — Icon System

> Implementation-ready icon design guide for all UI surfaces.
> Revision: v1.0 · May 2026

---

## 1. Icon Design Principles

### Grid and sizing

| Size class | Pixel size | Usage |
|---|---|---|
| **XS** | `16 × 16` | Inline text, task list bullets, log item prefixes |
| **SM** | `20 × 20` | Action button inline icons, NPC label badges |
| **MD** | `24 × 24` | Primary UI icons, HUD indicators, dialogue panel headers |
| **LG** | `32 × 32` | NPC role icon in dialogue panel kicker, toast feedback |

All icons are designed on a **24px base grid** and scaled proportionally. The 24px version is the canonical source.

### Stroke rules

| Property | Value |
|---|---|
| Stroke weight | `1.5px` at 24px (scales proportionally) |
| Stroke cap | `round` |
| Stroke join | `round` |
| Corner radius | `2px` on rectangular elements |
| Fill | None by default — stroke-only icons. Filled variants for active/completed states. |

### Design constraints

1. **Maximum 3 shapes per icon.** If it needs more, simplify.
2. **No fine detail.** Every icon must remain legible when rendered at 16px.
3. **Geometric, not illustrative.** Circles, lines, rounded rectangles — no organic curves, no hand-drawn feel.
4. **Consistent optical weight.** All icons should feel the same "heaviness" at the same size.
5. **1px padding** inside the bounding box — no strokes touching the edge.
6. **Monochrome by default.** Color is applied via CSS, not baked into the SVG.

### Compatibility

Icons follow the **Lucide** design language (open-source, MIT, 24px grid, 1.5px stroke, round caps). Any icon available in `lucide-react` should be used directly. Custom SVGs are created only for MCP-specific concepts not covered by the library.

---

## 2. Icon Categories

| Category | Purpose | Count | Examples |
|---|---|---|---|
| **NPC Role** | Identify each MCP agent by function | 5 | Brain, pen-tool, mic, palette, clipboard-check |
| **Action** | Label interactive buttons in dialogue panels | 14 | Generate, validate, send, approve, export |
| **Workflow State** | Communicate task/run status | 7 | Idle, in-progress, waiting, approved, error |
| **Navigation** | UI controls and scene navigation | 6 | Close, menu, settings, help, expand, collapse |
| **System Feedback** | Toasts, alerts, confirmations | 5 | Success, warning, error, info, loading |
| **Object Interaction** | In-world prompts | 3 | Interact, inspect, locked |

**Total: ~40 icons** — a lean, focused system.

---

## 3. MCP NPC Icons

Each MCP agent has a **primary icon** (used in UI) and a **symbol concept** (describes the visual idea).

### Brand Brain MCP

| Attribute | Value |
|---|---|
| **Primary icon** | `brain` |
| **Lucide name** | `Brain` |
| **Symbol concept** | A simplified brain silhouette — two hemispheres with a center divide. Represents institutional memory, brand knowledge, single source of truth. |
| **Accent color** | `#F2C94C` (gold) |
| **Fallback icon** | `Shield` — if brain feels too biological, a shield with a checkmark conveys "brand guardian." |

### Editorial MCP

| Attribute | Value |
|---|---|
| **Primary icon** | `file-text` |
| **Lucide name** | `FileText` |
| **Symbol concept** | A document page with horizontal text lines. Represents briefs, content structures, editorial plans. |
| **Accent color** | `#2F80ED` (blue) |
| **Fallback icon** | `PenTool` — if file-text feels too generic, a pen tool conveys "writing/creation." |

### Narration MCP

| Attribute | Value |
|---|---|
| **Primary icon** | `mic` |
| **Lucide name** | `Mic` |
| **Symbol concept** | A microphone on a stand. Represents voice, narration, audio scripts. |
| **Accent color** | `#9B51E0` (purple) |
| **Fallback icon** | `AudioLines` — waveform bars convey "audio processing." |

### Design MCP

| Attribute | Value |
|---|---|
| **Primary icon** | `palette` |
| **Lucide name** | `Palette` |
| **Symbol concept** | A painter's palette with two dots (color wells). Represents visual direction, design systems, aesthetics. |
| **Accent color** | `#27AE60` (green) |
| **Fallback icon** | `Layers` — stacked planes convey "layout/composition." |

### Output / Review Station

| Attribute | Value |
|---|---|
| **Primary icon** | `clipboard-check` |
| **Lucide name** | `ClipboardCheck` |
| **Symbol concept** | A clipboard with a checkmark. Represents quality control, approval, final review. |
| **Accent color** | `#F5F5F5` applied as `#8A929E` on light backgrounds (silver) |
| **Fallback icon** | `PackageCheck` — a box with a checkmark conveys "ready to ship." |

### NPC icon usage map

| Surface | Size | Behavior |
|---|---|---|
| Dialogue panel kicker (above NPC name) | `32px` | Colored with MCP accent |
| NPC floating label (optional badge) | `16px` | Monochrome, left of name |
| Task panel (prefix per task) | `16px` | Monochrome until completed |
| Status log (prefix per log entry) | `16px` | Monochrome |

---

## 4. Action Icons

These icons appear inside **dialogue panel action buttons** and future contextual menus.

| Action | Lucide icon name | Symbol concept | Used by |
|---|---|---|---|
| **Talk** | `MessageCircle` | Speech bubble | All NPCs (initial interaction) |
| **Generate** | `Sparkles` | Three small stars/sparks | Editorial, Narration, Design |
| **Validate** | `ShieldCheck` | Shield + checkmark | Brand Brain |
| **Send** | `Send` | Paper plane | Editorial → Design, Editorial → Narration |
| **Review** | `Eye` | Open eye | Output Station |
| **Approve** | `CircleCheck` | Circle + checkmark | Output Station |
| **Export** | `Download` | Downward arrow into tray | Output Station |
| **Edit** | `PenLine` | Pen with line | Editorial (future inline editing) |
| **Open** | `ExternalLink` | Box with arrow pointing out | Any panel link |
| **Close** | `X` | Simple X cross | Dialogue close, panel dismiss |
| **Sync** | `RefreshCw` | Two circular arrows | Brand Brain → Editorial data sync |
| **Warning** | `AlertTriangle` | Triangle + exclamation | Validation errors |
| **Success** | `Check` | Single checkmark | Action confirmation |
| **Locked** | `Lock` | Padlock | Unavailable actions, gated features |

### Action icon sizing in buttons

```
┌─────────────────────────────┐
│ [icon 20px]  Action Label   │   ← dialog-action button
└─────────────────────────────┘
```

- Icon sits left-aligned, `20 × 20`, `opacity: 0.85`.
- `4px` gap between icon and label text.
- Icon inherits button text color (`#f9fbff`).

---

## 5. Workflow State Icons

These represent the status of a task, a run, or an NPC's current operational state.

| State | Lucide icon | Symbol | Color | Animation |
|---|---|---|---|---|
| **Idle** | `Circle` | Empty circle (unfilled) | `#d8c7aa` | None |
| **In Progress** | `Loader` | Circle with gap (spinner) | `#2F80ED` | CSS `rotate` animation, `1.2s` linear infinite |
| **Waiting Review** | `Clock` | Clock face | `#F2C94C` | Gentle `pulse` opacity animation |
| **Approved** | `CircleCheck` | Circle + checkmark (filled) | `#27AE60` | None (static) |
| **Error** | `CircleX` | Circle + X | `#E74C3C` | Brief `shake` animation on appearance |
| **Completed** | `CheckCheck` | Double checkmark | `#1f7a52` | None (static) |
| **Needs Human Input** | `UserCheck` | Person + checkmark | `#9B51E0` | Gentle `pulse` opacity animation |

### State icon usage in task panel

```
Current Run
────────────────────────
● Talk to Brand Brain MCP       ← Circle (idle) or CircleCheck (done)
◌ Generate Editorial Brief      ← Circle (idle)
◌ Send to Design MCP            ← Circle (idle)
◌ Review at Output Station      ← Circle (idle)
```

The task bullet (`::before` pseudo-element) is replaced with the appropriate state icon. This is already structurally supported by the `.task-item::before` CSS.

---

## 6. Color Rules

### Default state: monochrome

All icons render in a **single neutral color** by default:

| Context | Icon color |
|---|---|
| Light panel (frosted glass) | `#49576d` (text secondary) |
| Dark button (action buttons) | `#f9fbff` (button text) |
| Floating label | `#31445e` (task text) |

### When to apply MCP accent color

| Scenario | Apply accent? | How |
|---|---|---|
| NPC role icon in dialogue header | **Yes** | `color: var(--accent)` or `stroke: {accentHex}` |
| NPC label badge | **Yes** | Same as NPC accent |
| Action button icon | **No** | Inherits button text color (white) |
| Task list bullet (completed) | **Yes** | `#27ae60` (green = done) |
| Workflow state indicator | **Yes** | Per state color (see §5) |
| System toast icon | **Yes** | Matches toast type (success/warning/error) |

### Color application rules

1. **One accent color per icon instance.** Never apply two colors to one icon.
2. **Accent = stroke color**, not fill. Fill is reserved for completed/active states.
3. **Disabled icons** use `opacity: 0.35` on the default monochrome color.
4. **Never use accent colors for navigation icons** (close, menu, settings). These stay neutral.

---

## 7. Interaction States

### State definitions

| State | Visual treatment | CSS |
|---|---|---|
| **Default** | Monochrome stroke, full opacity | `opacity: 1; stroke: #49576d;` |
| **Hover** | Slight scale + color shift | `transform: scale(1.1); opacity: 0.9;` |
| **Active** (pressed) | Scale down + filled variant | `transform: scale(0.95); fill: currentColor; fill-opacity: 0.15;` |
| **Disabled** | Faded, no pointer | `opacity: 0.35; pointer-events: none;` |
| **Completed** | Accent color + filled | `stroke: #27ae60; fill: #27ae60; fill-opacity: 0.12;` |
| **Error** | Red stroke + shake | `stroke: #E74C3C; animation: icon-shake 300ms;` |

### Transition

```css
.icon {
  transition: transform 140ms ease, opacity 140ms ease, stroke 140ms ease;
}
```

All state transitions use `140ms ease` — matching the existing `dialog-action` button transition timing from `styles.css`.

### CSS keyframes

```css
@keyframes icon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes icon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes icon-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
```

---

## 8. Suggested Icon Library

### Primary: Lucide

| Property | Value |
|---|---|
| Package | `lucide-react` (React) or `lucide` (vanilla JS/TS) |
| Version | Latest stable |
| License | MIT |
| Icon count | 1,400+ icons |
| Grid | 24 × 24 |
| Stroke | 1.5px, round cap, round join |

**Why Lucide:** Its design language (geometric, minimal, round stroke) matches the MCP Office aesthetic perfectly. It's the open-source continuation of Feather Icons with a much larger library.

### Installation

```bash
npm install lucide
```

### Vanilla TypeScript usage (no React needed)

```typescript
import { createElement } from "lucide";
import { Brain, FileText, Mic, Palette, ClipboardCheck } from "lucide";

// Create an SVG element
const icon = createElement(Brain);
icon.setAttribute("width", "24");
icon.setAttribute("height", "24");
icon.setAttribute("stroke", "#F2C94C");
container.appendChild(icon);
```

### Alternative: inline SVG strings

For the current `UIManager.ts` pattern (building DOM via `innerHTML`), icons can be embedded as raw SVG strings:

```typescript
// In a dedicated icons module
export const ICONS = {
  brain: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">...</svg>`,
  // ...
} as const;
```

This avoids React dependencies and works with the existing `innerHTML`-based UI construction.

### Custom SVGs (when needed)

If a concept isn't covered by Lucide, create a custom SVG following these constraints:

- `viewBox="0 0 24 24"`
- `fill="none"`
- `stroke="currentColor"`
- `stroke-width="1.5"`
- `stroke-linecap="round"`
- `stroke-linejoin="round"`
- Maximum 3 path elements

---

## 9. Implementation Notes

### File structure

```
src/
  ui/
    icons/
      index.ts            ← Re-exports all icon modules
      mcpIcons.ts          ← NPC role icons (5 icons)
      actionIcons.ts       ← Dialogue action icons (14 icons)
      stateIcons.ts        ← Workflow state icons (7 icons)
      navIcons.ts          ← Navigation/system icons (6 icons)
      iconUtils.ts         ← Helper: create icon element, apply size/color
```

### `mcpIcons.ts` — Example structure

```typescript
import { Brain, FileText, Mic, Palette, ClipboardCheck } from "lucide";
import type { IconNode } from "lucide";

export interface MCPIcon {
  id: string;
  icon: IconNode;
  label: string;
  accentColor: string;
}

export const MCP_ICONS: MCPIcon[] = [
  { id: "brand-brain",   icon: Brain,          label: "Brand Brain",     accentColor: "#F2C94C" },
  { id: "editorial",     icon: FileText,       label: "Editorial",       accentColor: "#2F80ED" },
  { id: "narration",     icon: Mic,            label: "Narration",       accentColor: "#9B51E0" },
  { id: "design",        icon: Palette,        label: "Design",          accentColor: "#27AE60" },
  { id: "output-review", icon: ClipboardCheck, label: "Output / Review", accentColor: "#8A929E" },
];
```

### `actionIcons.ts` — Example structure

```typescript
import {
  MessageCircle, Sparkles, ShieldCheck, Send,
  Eye, CircleCheck, Download, PenLine,
  ExternalLink, X, RefreshCw, AlertTriangle,
  Check, Lock
} from "lucide";

export const ACTION_ICONS = {
  talk:     MessageCircle,
  generate: Sparkles,
  validate: ShieldCheck,
  send:     Send,
  review:   Eye,
  approve:  CircleCheck,
  export:   Download,
  edit:     PenLine,
  open:     ExternalLink,
  close:    X,
  sync:     RefreshCw,
  warning:  AlertTriangle,
  success:  Check,
  locked:   Lock,
} as const;
```

### `stateIcons.ts` — Example structure

```typescript
import {
  Circle, Loader, Clock, CircleCheck,
  CircleX, CheckCheck, UserCheck
} from "lucide";

export const STATE_ICONS = {
  idle:            { icon: Circle,      color: "#d8c7aa", animation: null },
  inProgress:      { icon: Loader,      color: "#2F80ED", animation: "icon-spin" },
  waitingReview:   { icon: Clock,       color: "#F2C94C", animation: "icon-pulse" },
  approved:        { icon: CircleCheck, color: "#27AE60", animation: null },
  error:           { icon: CircleX,     color: "#E74C3C", animation: "icon-shake" },
  completed:       { icon: CheckCheck,  color: "#1f7a52", animation: null },
  needsHumanInput: { icon: UserCheck,   color: "#9B51E0", animation: "icon-pulse" },
} as const;
```

### `iconUtils.ts` — Helper

```typescript
import { createElement, type IconNode } from "lucide";

export interface IconOptions {
  size?: number;
  color?: string;
  className?: string;
  animation?: string | null;
}

export function createIcon(icon: IconNode, options: IconOptions = {}): SVGElement {
  const { size = 24, color = "currentColor", className = "", animation } = options;

  const el = createElement(icon) as unknown as SVGElement;
  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  el.setAttribute("stroke", color);
  el.classList.add("icon");

  if (className) el.classList.add(className);
  if (animation) el.style.animation = `${animation} 1.2s linear infinite`;

  return el;
}
```

### Integration with existing `UIManager.ts`

The icon system plugs into the existing UI via two touch points:

**1. Dialogue panel — NPC role icon before kicker text:**

```typescript
// Inside openDialog()
const iconEl = createIcon(MCP_ICONS.find(i => i.id === npc.id)!.icon, {
  size: 32,
  color: npc.color,
});
this.dialogKicker.prepend(iconEl);
```

**2. Action buttons — icon before label:**

```typescript
// Inside the action button creation loop
const iconEl = createIcon(ACTION_ICONS[actionKey], { size: 20 });
button.prepend(iconEl);
```

No changes to the 3D scene are required. Icons live entirely in the HTML/CSS UI layer.

---

## 10. Icon Usage Checklist

### Before adding a new icon

- [ ] Does Lucide already have an icon that works? Check [lucide.dev/icons](https://lucide.dev/icons) first.
- [ ] Is the concept expressible in ≤ 3 shapes?
- [ ] Is it readable at 16px?

### Visual consistency

- [ ] Stroke weight is `1.5px` at 24px base size
- [ ] Stroke caps and joins are `round`
- [ ] No fills in default state (stroke-only)
- [ ] `viewBox` is `0 0 24 24`
- [ ] Icon sits within 1px padding of bounding box

### Color consistency

- [ ] Default color is `currentColor` (inherits from parent)
- [ ] MCP accent applied only where §6 rules permit
- [ ] Only one color per icon instance
- [ ] Disabled state uses `opacity: 0.35`, not a gray color

### State consistency

- [ ] All 6 interaction states defined (default, hover, active, disabled, completed, error)
- [ ] Transitions use `140ms ease`
- [ ] Animations use the 3 defined keyframes only (`spin`, `pulse`, `shake`)

### Code consistency

- [ ] Icon imported from `lucide` or defined as custom SVG in `icons/` directory
- [ ] Created via `createIcon()` helper, not raw `innerHTML`
- [ ] Size class matches the surface (16/20/24/32)
- [ ] Registered in the appropriate module (`mcpIcons`, `actionIcons`, `stateIcons`, `navIcons`)

---

## Appendix: Complete Icon Map

Quick reference — every icon in the system at a glance.

```
NPC ROLES                        ACTIONS
─────────────────────────        ─────────────────────────
Brain         Brand Brain        MessageCircle    Talk
FileText      Editorial          Sparkles         Generate
Mic           Narration          ShieldCheck      Validate
Palette       Design             Send             Send
ClipboardCheck Output/Review     Eye              Review
                                 CircleCheck      Approve
WORKFLOW STATES                  Download         Export
─────────────────────────        PenLine          Edit
Circle        Idle               ExternalLink     Open
Loader ↻      In Progress        X                Close
Clock ⏳       Waiting Review     RefreshCw        Sync
CircleCheck ✓ Approved           AlertTriangle    Warning
CircleX ✗     Error              Check            Success
CheckCheck ✓✓ Completed          Lock             Locked
UserCheck     Needs Human
                                 NAVIGATION
COLOR KEY                        ─────────────────────────
─────────────────────────        X                Close
#F2C94C       Gold (Brand)       Menu             Menu
#2F80ED       Blue (Editorial)   Settings         Settings
#9B51E0       Purple (Narration) HelpCircle       Help
#27AE60       Green (Design)     ChevronDown      Expand
#8A929E       Silver (Output)    ChevronUp        Collapse
#E74C3C       Red (Error)
#d8c7aa       Sand (Idle)
#1f7a52       Deep green (Done)
```
