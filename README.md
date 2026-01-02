# The Foundry Site

A static website that publishes [The Foundry](https://github.com/nickarrow/the-foundry) — a collaborative Obsidian vault for Ironsworn/Starforged tabletop RPG players — as a read-only web experience.

**Live Site:** [nickarrow.github.io/the-foundry-site](https://nickarrow.github.io/the-foundry-site/)

## What This Does

The Foundry vault uses [Iron Vault](https://github.com/iron-vault-plugin/iron-vault), an Obsidian plugin for tracking game mechanics. This site transforms all that Obsidian-specific content into pure static HTML:

- **Wikilinks** (`[[Page Name]]`) → working site links
- **Image embeds** (`![[image.png]]`) → rendered images with size/alignment options
- **Content embeds** (`![[Note Name]]`) → inlined content with styled containers
- **Callouts** (`> [!type]`) → styled, collapsible callout boxes (supports standard Obsidian + Iron Vault types)
- **Iron Vault inline mechanics** (`` `iv-move:...` ``) → dice rolls, oracles, meters, initiative, progress
- **Iron Vault code blocks** (` ```iron-vault-mechanics `) → move blocks, oracle groups, track status
- **Progress tracks** → SVG-based track visualization with tick marks
- **Character sheets** → stats, meters, impacts, legacy tracks, full asset cards
- **Dataview queries** → executed at build time, rendered as tables/lists
- **Auto-generated changelog** → tracks recent file changes from git history

The result is a "read-only Obsidian" where visitors can browse campaigns, read journals, and view character sheets without needing Obsidian installed.

## Tech Stack

- **[Astro](https://astro.build/)** — Static site generator with View Transitions
- **TypeScript** — Processing libraries
- **[unified](https://unifiedjs.com/)** (remark/rehype) — Markdown AST transformation
- **[Datasworn](https://github.com/rsek/datasworn)** — Asset definitions for Ironsworn, Starforged, and Sundered Isles
- **[Pagefind](https://pagefind.app/)** — Client-side search
- **GitHub Actions** — Automated builds and deployment (every 15 minutes)

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Clone the content repository
git clone https://github.com/nickarrow/the-foundry.git content

# Build the site
npm run build

# Preview locally
npm run preview
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (runs prebuild + astro build + pagefind) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint and Stylelint |
| `npm run format` | Format code with Prettier |

The build process:
1. **prebuild**: Generates changelog from git history, copies attachments from content folders
2. **build**: Astro compiles all pages to static HTML
3. **postbuild**: Pagefind indexes the site for search

## Deployment

The site deploys automatically via GitHub Actions:

- **Trigger**: Every 15 minutes, manual dispatch, or push to `main`
- **Process**: Clones the-foundry repo → builds site → deploys to GitHub Pages
- **URL**: `https://nickarrow.github.io/the-foundry-site/`

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for details.

## Project Structure

```
├── src/
│   ├── components/        # Astro components
│   │   ├── Sidebar.astro        # Navigation sidebar with search
│   │   ├── Breadcrumbs.astro    # Desktop breadcrumb navigation
│   │   ├── MobileHeader.astro   # Mobile header with collapsed breadcrumbs
│   │   ├── CharacterMeters.astro # Character stat/meter display
│   │   └── ProgressTrack.astro  # Progress track visualization
│   ├── layouts/
│   │   └── Layout.astro         # Main page layout with View Transitions
│   ├── lib/               # Core processing libraries
│   │   ├── content.ts           # File loading, navigation tree, slug resolution
│   │   ├── markdown.ts          # Markdown pipeline (callouts, embeds, wikilinks)
│   │   ├── iron-vault-inline.ts # Inline mechanics parser (iv-* codes)
│   │   ├── iron-vault-blocks.ts # Code block mechanics parser
│   │   ├── dataview.ts          # Dataview query engine
│   │   └── datasworn-assets.ts  # Asset card data lookup from Datasworn
│   └── pages/
│       ├── index.astro          # Homepage
│       ├── [...slug].astro      # Dynamic content pages
│       └── 404.astro            # Not found page
├── public/
│   ├── styles/
│   │   ├── main.css             # Core site styles, callouts, Pagefind
│   │   └── iron-vault.css       # Iron Vault component styles
│   └── attachments/             # Copied images (generated at build)
├── scripts/
│   ├── copy-attachments.js      # Copies images from content folders
│   └── generate-changelog.js    # Generates changelog from git history
├── obsidian-plugin-reference-styles/  # Reference CSS from Obsidian plugins
├── content/               # Cloned vault content (gitignored)
└── dist/                  # Build output (gitignored)
```

## How It Works

### Content Processing Pipeline

```
Markdown file
    ↓
gray-matter (extract frontmatter)
    ↓
Normalize line endings (CRLF → LF)
    ↓
Process callouts → HTML divs with icons
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
  - iv-* inline code → HTML spans
  - iron-vault-* blocks → HTML
  - dataview blocks → executed queries → HTML tables/lists
    ↓
remark-rehype → rehype-raw → rehype-stringify
    ↓
Character/track placeholders → rendered components
    ↓
HTML string → Astro page template → Static HTML
```

### Iron Vault Syntax Support

**Inline mechanics** (rendered inline with narrative text):
- `iv-move` — Dice rolls with outcome indicators (strong hit/weak hit/miss)
- `iv-oracle` — Oracle rolls with results
- `iv-meter` — Meter changes (momentum, health, etc.)
- `iv-initiative` — Position tracking (in control/in a bad spot)
- `iv-track-create` — Progress track creation links
- `iv-track-advance` — Progress track advancement
- `iv-progress` — Progress rolls against challenge dice
- `iv-noroll` — Moves without rolls
- `iv-entity-create` — Entity creation links

**Code blocks**:
- `iron-vault-mechanics` — Move blocks, oracle groups, track status
- `iron-vault-track` — Progress track visualization
- `iron-vault-character-info` — Character name, callsign, XP
- `iron-vault-character-stats` — Edge, heart, iron, shadow, wits
- `iron-vault-character-meters` — Health, spirit, supply, momentum
- `iron-vault-character-assets` — Full asset cards from Datasworn
- `iron-vault-character-impacts` — Impact checkboxes
- `iron-vault-character-special-tracks` — Legacy tracks (Quests, Bonds, Discoveries)

**Dataview queries**:
- `TABLE` / `TABLE WITHOUT ID` / `LIST`
- `FROM #tag` or `FROM "folder/path"`
- `WHERE field = value` / `WHERE field != value`
- `SORT field ASC/DESC`

### Supported Callout Types

Standard Obsidian callouts: `note`, `info`, `tip`, `warning`, `danger`, `example`, `quote`, `abstract`, `todo`, `success`, `question`, `failure`, `bug`

Iron Vault custom callouts: `assets`, `gear`, `in-progress`, `bonds`, `impacts`, `legacies`, `complete`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

This project is for publishing The Foundry vault content. The vault itself follows the licensing in [The Foundry repository](https://github.com/nickarrow/the-foundry).
