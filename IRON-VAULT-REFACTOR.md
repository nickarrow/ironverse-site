# Iron Vault Styling Refactor Plan

This document captures all research and context for refactoring the Iron Vault styles on the Ironverse Astro site to achieve 1:1 rendering parity with the Iron Vault Obsidian plugin.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Architecture](#current-architecture)
3. [Iron Vault Plugin Reference](#iron-vault-plugin-reference)
4. [Priority Areas](#priority-areas)
5. [Gap Analysis](#gap-analysis)
6. [Implementation Plan](#implementation-plan)
7. [File Reference](#file-reference)

---

## Project Overview

### Goal
Achieve 1:1 visual rendering parity between the Iron Vault Obsidian plugin and the Ironverse Astro static site.

### What This Site Does
Transforms Obsidian vault content (using Iron Vault plugin) into static HTML:
- Wikilinks → working site links
- Image/content embeds → rendered HTML
- Callouts → styled, collapsible boxes
- Iron Vault inline mechanics (`iv-*`) → styled spans
- Iron Vault code blocks (`iron-vault-mechanics`) → styled HTML blocks
- Progress tracks → SVG-based visualization
- Character sheets → stats, meters, impacts, assets
- Dataview queries → executed at build time

### Tech Stack
- **Astro** - Static site generator
- **TypeScript** - Processing libraries
- **unified/remark/rehype** - Markdown AST transformation
- **Datasworn** - Asset definitions

---

## Current Architecture

### Processing Pipeline

```
Markdown file
    ↓
gray-matter (extract frontmatter)
    ↓
Normalize line endings (CRLF → LF)
    ↓
Process callouts → HTML divs
    ↓
Process image embeds (![[image.png]]) → <img> tags
    ↓
Process content embeds (![[Note]]) → inlined content
    ↓
Convert wikilinks → standard markdown links
    ↓
unified pipeline:
  remark-parse → remark-gfm → remark-breaks → custom remark plugin
    ↓
Custom plugin transforms:
  - iv-* inline code → HTML spans (iron-vault-inline.ts)
  - iron-vault-* blocks → HTML (iron-vault-blocks.ts)
  - dataview blocks → executed queries → HTML tables/lists
    ↓
remark-rehype → rehype-raw → rehype-stringify
    ↓
Character/track placeholders → rendered components
    ↓
HTML string → Astro page template → Static HTML
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/content.ts` | Loads markdown files, builds navigation tree |
| `src/lib/markdown.ts` | Main processing pipeline |
| `src/lib/iron-vault-inline.ts` | Parses `iv-*` inline code → HTML spans |
| `src/lib/iron-vault-blocks.ts` | Parses `iron-vault-mechanics` blocks → HTML |
| `src/lib/dataview.ts` | Parses and executes Dataview queries |
| `src/lib/datasworn-assets.ts` | Asset definitions lookup |
| `src/components/ProgressTrack.astro` | Progress track visualization |
| `src/components/CharacterMeters.astro` | Character stats/meters display |
| `public/styles/iron-vault.css` | Iron Vault component styles |
| `public/styles/main.css` | Core site styles |

---

## Iron Vault Plugin Reference

The complete Iron Vault plugin source is cloned to: `iron-vault-plugin-reference/`

### Plugin CSS Structure

All CSS files are in `iron-vault-plugin-reference/packages/obsidian/src/`

#### Entry Point
`styles.css` imports all component CSS:
```css
@import url("assets/css/assets.css");
@import url("mechanics/css/mechanics.css");
@import url("sidebar/css/sidebar.css");
@import url("oracles/css/oracles.css");
@import url("tracks/css/tracks.css");
@import url("clocks/css/clocks.css");
@import url("characters/css/characters.css");
@import url("truths/css/truths.css");
@import url("moves/css/move-modal.css");
@import url("migrate/css/migrate.css");
@import url("campaigns/css/new-campaign.css");
@import url("datastore/view/css/content-view.css");
@import url("inline/css/inline.css");
```

#### Inline Mechanics CSS (`inline/css/`)
| File | Purpose |
|------|---------|
| `inline.css` | Entry point, base styles, shared icon/name styles |
| `outcomes.css` | Strong-hit/weak-hit/miss outcome icons and colors |
| `moves.css` | Move and progress roll styling |
| `oracles.css` | Oracle result styling |
| `tracks.css` | Track create/advance/complete styling |
| `clocks.css` | Clock create/advance/resolve styling |
| `meters.css` | Meter increase/decrease styling |
| `burn.css` | Burn momentum styling |
| `initiative.css` | Initiative/position styling |
| `entity.css` | Entity creation styling |
| `dice.css` | Dice roll styling |
| `ooc.css` | Out-of-character comment styling |

#### Mechanics Blocks CSS (`mechanics/css/`)
| File | Purpose |
|------|---------|
| `mechanics.css` | Entry point, container styles |
| `move.css` | Move details element styling |
| `summary.css` | Move summary with outcome icons |
| `details.css` | Comment/detail blockquote styling |
| `paragraphs.css` | Paragraph styling with icons |
| `oracle-group.css` | Oracle group container |
| `actor.css` | Actor section styling |
| `dlist-shared.css` | Shared `<dl>` styles, challenge dice colors |
| `dlist-roll.css` | Roll result styling |
| `dlist-oracle.css` | Oracle result styling |
| `dlist-meter.css` | Meter change styling |
| `dlist-burn.css` | Burn momentum styling |
| `dlist-progress.css` | Progress advance styling |
| `dlist-track.css` | Track change styling |
| `dlist-track-status.css` | Track added/completed styling |
| `dlist-clock.css` | Clock change styling |
| `dlist-clock-status.css` | Clock added/resolved styling |
| `dlist-xp.css` | XP change styling |
| `dlist-asset.css` | Asset added/removed styling |
| `dlist-impact.css` | Impact marked/unmarked styling |
| `dlist-initiative.css` | Initiative change styling |
| `dlist-reroll.css` | Reroll styling |
| `dlist-add.css` | Add modifier styling |
| `dlist-dice-expr.css` | Dice expression styling |

#### Characters CSS (`characters/css/`)
| File | Purpose |
|------|---------|
| `characters.css` | Entry point, main character container |
| `stats.css` | Edge/Heart/Iron/Shadow/Wits display |
| `meters.css` | Health/Spirit/Supply/Momentum display |
| `impacts.css` | Impact categories and checkboxes |
| `assets.css` | Asset list container |
| `asset-card.css` | Individual asset card styling |
| `asset-list.css` | Asset list view |
| `special_tracks.css` | Legacy tracks (Quests/Bonds/Discoveries) |
| `character-info.css` | Name, callsign, pronouns, XP grid |

#### Other Priority CSS
| File | Purpose |
|------|---------|
| `tracks/css/tracks.css` | Progress track widget with SVG boxes |
| `clocks/css/clocks.css` | Clock widget with SVG segments |
| `oracles/css/oracles.css` | Oracle table styling |
| `truths/css/truths.css` | Truth selection grid |

### Plugin HTML Generation

The plugin uses **lit-html** templates to generate HTML. Key rendering files:

#### Inline Mechanics (`inline/renderers/`)
| File | Generates |
|------|-----------|
| `shared.ts` | `createContainer()` → `<span class="iv-inline-mechanics {outcomeClass}">` |
| `moves.ts` | Move/progress/no-roll inline elements |
| `oracles.ts` | Oracle inline elements |
| `tracks.ts` | Track create/advance inline elements |
| `clocks.ts` | Clock inline elements |
| `meters.ts` | Meter change inline elements |
| `entities.ts` | Entity creation inline elements |

#### Mechanics Blocks (`mechanics/mechanics-blocks.ts`)
Uses `renderDlist()` helper to generate `<dl>` elements with specific classes:
- Container: `<article class="iron-vault-mechanics">`
- Moves: `<details class="move {outcomeClass}">`
- Rolls: `<dl class="roll {outcomeClass}">`
- Each value: `<dd class="{type}">`

### Plugin SVG Assets

Located in `iron-vault-plugin-reference/packages/obsidian/src/img/`

#### Outcome Icons (`Outcomes/`)
- `outcome-strong-hit.svg` - Two blue hexagons with checkmarks
- `outcome-weak-hit.svg` - Blue hexagon (check) + red hexagon (X)
- `outcome-miss.svg` - Two red hexagons with X marks

#### Progress Boxes (`ProgressBoxes/`)
- `progress-box-0.svg` - Empty box
- `progress-box-1.svg` - One diagonal tick
- `progress-box-2.svg` - Two diagonal ticks (X)
- `progress-box-3.svg` - X with horizontal line
- `progress-box-4.svg` - X with horizontal and vertical lines (full)

---

## Priority Areas

Based on user requirements, these areas need to be prioritized:

### 1. Inline Mechanics (HIGH)
All `iv-*` inline code rendering:
- `iv-move` - Dice rolls with outcomes
- `iv-oracle` - Oracle results
- `iv-meter` - Meter changes
- `iv-initiative` - Position tracking
- `iv-track-create` / `iv-track-advance` - Track operations
- `iv-progress` - Progress rolls
- `iv-noroll` - No-roll moves
- `iv-entity-create` - Entity creation

### 2. Mechanics Blocks (HIGH)
`iron-vault-mechanics` code block rendering:
- Move blocks with roll results
- Oracle groups
- Track status changes
- Meter/burn/XP changes
- All `<dl>` based mechanics

### 3. Characters (HIGH)
Character sheet rendering:
- Stats (Edge, Heart, Iron, Shadow, Wits)
- Meters (Health, Spirit, Supply, Momentum)
- Impacts (checkboxes by category)
- Assets (full card rendering)
- Special/Legacy tracks

### 4. Tracks (HIGH)
Progress track visualization:
- SVG tick boxes (0-4 ticks)
- Rank display
- Track type/name
- Completion status

### 5. Clocks (MEDIUM)
Clock visualization:
- SVG pie segments
- Segment count
- Fill state

### 6. Oracles (MEDIUM)
Oracle table rendering:
- Table styling
- Selected row highlighting

### 7. Truths (LOW)
Truth selection grid styling

---

## Gap Analysis

### HTML Structure Mismatches

#### Inline Mechanics
**Current (`iron-vault-inline.ts`):**
```html
<span class="iv-inline-mechanics strong-hit">
  <span class="iv-inline-move-name iv-inline-link">Face Danger</span>
  <span class="iv-inline-stat">(edge)</span>
  <span class="iv-inline-outcome-icon"></span>
  <span>;</span>
  <span class="iv-inline-score">7</span>
  <span>vs</span>
  <span class="iv-inline-challenge-die vs1">3</span>
  <span>|</span>
  <span class="iv-inline-challenge-die vs2">5</span>
</span>
```

**Plugin generates:**
```html
<span class="iv-inline-mechanics strong-hit">
  <span class="iv-inline-outcome-icon"></span>
  <span class="iv-inline-move-name iv-inline-link">Face Danger</span>
  <span class="iv-inline-stat">(edge)</span>
  <span class="iv-inline-separator">—</span>
  <span class="iv-inline-score">7</span>
  <span> vs </span>
  <span class="iv-inline-challenge-die vs1">3</span>
  <span>|</span>
  <span class="iv-inline-challenge-die vs2">5</span>
</span>
```

**Key differences:**
1. Outcome icon comes FIRST in plugin
2. Plugin uses `iv-inline-separator` with em-dash (—)
3. Plugin has space around "vs"

#### Mechanics Blocks
**Current (`iron-vault-blocks.ts`):**
```html
<details class="move strong-hit" open>
  <summary><span class="move-name">Face Danger</span></summary>
  <dl class="roll strong-hit">
    <dt>Roll</dt>
    <dd class="action-die">4</dd>
    <dd class="stat">3</dd>
    <dd class="stat-name">edge</dd>
    <dd class="adds">0</dd>
    <dd class="score">7</dd>
    <dd class="challenge-die vs1">3</dd>
    <dd class="challenge-die vs2">5</dd>
  </dl>
</details>
```

**Plugin generates (similar structure)** - The HTML structure is close, but CSS selectors may differ.

### Missing Mechanic Types

Current `iron-vault-blocks.ts` only handles:
- `move`
- `oracle`
- `oracle-group`
- `track`

Plugin handles many more:
- `roll` / `progress-roll`
- `meter`
- `burn`
- `progress`
- `xp`
- `clock`
- `asset`
- `impact`
- `initiative` / `position`
- `actor`
- `reroll`
- `add`
- `dice-expr`
- `-` (detail/comment)

### CSS Gaps

1. **Missing emoji icons** - Plugin uses emoji in `::before` pseudo-elements
2. **Missing container queries** - Plugin uses `@container` for responsive tracks
3. **SVG data URIs** - Need to embed progress box SVGs as data URIs
4. **CSS nesting** - Plugin uses native CSS nesting (`& .child`)

---

## Implementation Plan

### Phase 1: CSS Foundation (Day 1)

1. **Create consolidated CSS file** from plugin source
   - Copy all priority CSS files
   - Convert relative `url()` paths to data URIs for SVGs
   - Ensure CSS variable mappings are complete
   - Test CSS nesting browser support (or flatten if needed)

2. **Files to create/update:**
   - `public/styles/iron-vault.css` - Complete rewrite from plugin source

### Phase 2: Inline Mechanics (Day 2)

1. **Update `src/lib/iron-vault-inline.ts`:**
   - Reorder elements (outcome icon first)
   - Add `iv-inline-separator` element
   - Fix spacing around "vs"
   - Add missing inline types (burn, clock, dice, ooc)

2. **Test all inline mechanic types:**
   - `iv-move` with all outcomes
   - `iv-oracle` with cursed die
   - `iv-meter` increase/decrease
   - `iv-track-create` / `iv-track-advance`
   - `iv-progress` rolls
   - `iv-initiative` changes

### Phase 3: Mechanics Blocks (Day 3)

1. **Update `src/lib/iron-vault-blocks.ts`:**
   - Add missing mechanic type parsers
   - Ensure HTML structure matches plugin
   - Add proper `data-value` attributes for CSS selectors

2. **Add parsers for:**
   - `meter` - Meter changes
   - `burn` - Momentum burn
   - `progress` - Progress advance
   - `xp` - XP changes
   - `clock` - Clock changes
   - `asset` - Asset operations
   - `impact` - Impact changes
   - `initiative` / `position` - Initiative changes
   - `actor` - Actor sections
   - `reroll` - Reroll results
   - `add` - Add modifiers
   - `-` (detail/comment)

### Phase 4: Characters (Day 4)

1. **Update `src/components/CharacterMeters.astro`:**
   - Match plugin HTML structure
   - Add proper class names

2. **Create/update character components:**
   - Stats display
   - Meters display (with buttons removed for static)
   - Impacts display
   - Asset cards
   - Special tracks

3. **Update character page rendering in `src/pages/[...slug].astro`**

### Phase 5: Tracks & Clocks (Day 5)

1. **Update `src/components/ProgressTrack.astro`:**
   - Use SVG data URIs for tick boxes
   - Match plugin HTML structure
   - Add container query support

2. **Create clock component if needed**

### Phase 6: Testing & Polish (Day 6)

1. **Visual comparison testing:**
   - Compare rendered output with Obsidian screenshots
   - Fix any remaining styling issues

2. **Cross-browser testing:**
   - Verify CSS nesting support
   - Test container queries
   - Verify SVG rendering

---

## File Reference

### Files to Modify

| File | Changes |
|------|---------|
| `public/styles/iron-vault.css` | Complete rewrite from plugin CSS |
| `src/lib/iron-vault-inline.ts` | Reorder elements, add missing types |
| `src/lib/iron-vault-blocks.ts` | Add missing mechanic parsers |
| `src/components/CharacterMeters.astro` | Match plugin HTML structure |
| `src/components/ProgressTrack.astro` | Use SVG data URIs |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/CharacterStats.astro` | Stats display component |
| `src/components/CharacterImpacts.astro` | Impacts display component |
| `src/components/AssetCard.astro` | Asset card component |
| `src/components/Clock.astro` | Clock widget component |

### Reference Files (Read-Only)

All files in `iron-vault-plugin-reference/packages/obsidian/src/`:
- `inline/css/*.css` - Inline mechanics styles
- `inline/renderers/*.ts` - Inline HTML generation
- `mechanics/css/*.css` - Block mechanics styles
- `mechanics/mechanics-blocks.ts` - Block HTML generation
- `characters/css/*.css` - Character styles
- `tracks/css/tracks.css` - Track styles
- `clocks/css/clocks.css` - Clock styles
- `img/Outcomes/*.svg` - Outcome icons
- `img/ProgressBoxes/*.svg` - Progress tick boxes

---

## CSS Variable Reference

Map Obsidian variables to site variables:

```css
:root {
  /* Background colors */
  --background-primary: #1e1e1e;
  --background-primary-alt: #252525;
  --background-secondary: #252525;
  --background-secondary-alt: #2d2d2d;
  --background-modifier-border: #404040;
  --background-modifier-hover: rgba(255, 255, 255, 0.075);
  
  /* Text colors */
  --text-normal: #dcddde;
  --text-muted: #888;
  --text-faint: #666;
  --text-accent: #a78bfa;
  --text-success: #22c55e;
  --text-warning: #f59e0b;
  --text-error: #ef4444;
  
  /* Challenge dice */
  --vs1-color: #28aae1;
  --vs2-color: #ce242b;
  
  /* Font weights */
  --font-bold: 700;
  --font-semibold: 600;
  --font-extrabold: 800;
  
  /* Interactive */
  --interactive-normal: #363636;
  --interactive-hover: #4a4a4a;
  --interactive-accent: #7c3aed;
  
  /* Links */
  --link-color: #a78bfa;
  --link-color-hover: #c4b5fd;
  
  /* Blockquote */
  --blockquote-border-thickness: 3px;
  --blockquote-border-color: #7c3aed;
  
  /* Sizing */
  --size-4-6: 1.5rem;
  --color-base-30: #404040;
  --color-base-50: #666;
}
```

---

## SVG Data URIs

### Outcome Icons

**Strong Hit:**
```
data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ...>[full SVG]</svg>
```

**Weak Hit:**
```
data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ...>[full SVG]</svg>
```

**Miss:**
```
data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ...>[full SVG]</svg>
```

### Progress Boxes

**Box 0 (empty):**
```
data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ...>[full SVG]</svg>
```

**Box 1-4:** Similar pattern with tick marks

(Full SVG content is in `iron-vault-plugin-reference/packages/obsidian/src/img/`)

---

## Testing Checklist

After implementation, verify:

- [ ] Inline moves render with correct outcome icons
- [ ] Inline oracles show crystal ball icon and italic result
- [ ] Inline meters show increase (green) / decrease (red)
- [ ] Inline tracks show appropriate icons and colors
- [ ] Mechanics blocks render with emoji icons
- [ ] Move blocks show outcome icons in summary
- [ ] Roll results show colored scores
- [ ] Challenge dice show vs1 (blue) and vs2 (red)
- [ ] Character stats display in bordered boxes
- [ ] Character meters display with values
- [ ] Impacts show as checkboxes by category
- [ ] Asset cards render with abilities and controls
- [ ] Progress tracks show SVG tick boxes
- [ ] Track rank and type display correctly
- [ ] Clocks render as pie charts (if implemented)
- [ ] Match indicator shows for doubles
- [ ] All colors match plugin (success/warning/error)
