# Contributing to The Foundry Site

This guide covers contributing to the site generator itself — the Astro project that transforms Obsidian vault content into a static website.

> **Adding campaign content?** That happens in [The Foundry](https://github.com/nickarrow/the-foundry) repository, not here.

## Development Setup

```bash
# Clone this repo
git clone https://github.com/nickarrow/the-foundry-site.git
cd the-foundry-site

# Install dependencies
npm install

# Clone content for local development
git clone https://github.com/nickarrow/the-foundry.git content

# Build and preview
npm run build
npm run preview
```

## Architecture Overview

### Core Libraries (`src/lib/`)

| File | Purpose |
|------|---------|
| `content.ts` | Loads markdown files, builds navigation tree, resolves file lookups by slug/name |
| `markdown.ts` | Main processing pipeline — callouts, embeds, wikilinks, unified/remark plugins |
| `iron-vault-inline.ts` | Parses `` `iv-*` `` inline code into HTML spans with outcome styling |
| `iron-vault-blocks.ts` | Parses ` ```iron-vault-mechanics ` blocks into HTML (moves, oracles, tracks) |
| `dataview.ts` | Parses and executes Dataview queries against frontmatter |
| `datasworn-assets.ts` | Looks up asset definitions from Datasworn packages (Starforged, Sundered Isles, Ironsworn) |

### Components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `Sidebar.astro` | Navigation sidebar with folder tree, search, expand/collapse controls |
| `Breadcrumbs.astro` | Desktop breadcrumb navigation (sticky, with scroll detection) |
| `MobileHeader.astro` | Mobile header with hamburger menu and collapsed breadcrumbs |
| `CharacterMeters.astro` | Character stats and meters display |
| `ProgressTrack.astro` | Progress track visualization with SVG tick boxes |

### Pages (`src/pages/`)

| Page | Purpose |
|------|---------|
| `index.astro` | Homepage (renders "Welcome to The Foundry") |
| `[...slug].astro` | Dynamic catch-all route for all content pages |
| `404.astro` | Not found page |

### Processing Flow

1. **`content.ts`** loads all `.md` files from `content/`, extracts frontmatter with gray-matter
2. **`markdown.ts`** orchestrates transformation:
   - Normalizes line endings (CRLF → LF)
   - Pre-processes callouts, image embeds, content embeds, wikilinks
   - Runs unified pipeline with custom remark plugin
   - The remark plugin transforms `iv-*` code and `iron-vault-*` blocks
3. **`[...slug].astro`** receives processed HTML and:
   - Replaces character/track placeholders with rendered components
   - Merges asset data from Datasworn for full asset card rendering
   - Renders with Layout, Sidebar, Breadcrumbs components

### Styling

- `public/styles/main.css` — Core site styles (layout, typography, colors, callouts, Pagefind, Dataview)
- `public/styles/iron-vault.css` — Iron Vault component styles (mechanics, assets, tracks, character sheets)
- `obsidian-plugin-reference-styles/` — Reference CSS extracted from Obsidian plugins (not used directly, for reference)

## Common Tasks

### Adding a New Inline Mechanic Type

1. Add the case in `src/lib/iron-vault-inline.ts`:
   ```typescript
   case 'iv-newtype':
     return renderNewType(content, baseUrl, filesByName);
   ```

2. Create the render function:
   ```typescript
   function renderNewType(content: string, baseUrl: string, filesByName?: Map<string, FileInfo>): string {
     const parts = content.split('|');
     // Parse parts and return HTML
     return `<span class="iv-inline-mechanics newtype">...</span>`;
   }
   ```

3. Add CSS in `public/styles/iron-vault.css`

### Adding a New Code Block Type

1. Add handling in `src/lib/markdown.ts` (in the `remarkIronVault` plugin):
   ```typescript
   } else if (node.lang === 'iron-vault-newblock') {
     node.type = 'html';
     node.value = parseNewBlock(node.value, options.baseUrl);
   }
   ```

2. Create parser in `src/lib/iron-vault-blocks.ts` or a new file

3. If it needs placeholder replacement (like character blocks), add handling in `src/pages/[...slug].astro`

### Adding a New Callout Type

1. Add the icon SVG in `src/lib/markdown.ts` in the `getCalloutIconSvg()` function:
   ```typescript
   'newtype': '<svg>...</svg>',
   ```

2. Add CSS for the callout color in `public/styles/main.css`:
   ```css
   .callout[data-callout="newtype"] {
     --callout-color: 123, 45, 67; /* RGB values */
   }
   ```

### Modifying the Navigation Tree

The sidebar navigation is built in `src/lib/content.ts` → `buildNavigationTree()`. It:
- Groups files by directory
- Sorts directories first, then alphabetically
- Excludes hidden folders, `.excalidraw.md`, `.base` files, and root README

### Adding Dataview Features

The query engine in `src/lib/dataview.ts` supports:
- `TABLE` / `TABLE WITHOUT ID` / `LIST`
- `FROM #tag` or `FROM "folder/path"`
- `WHERE field = value` / `WHERE field != value`
- `SORT field ASC/DESC`

To add new features (e.g., `GROUP BY`), extend `parseDataviewQuery()` and `executeDataviewQuery()`.

### Adding Character Sheet Features

Character rendering happens in `src/pages/[...slug].astro`. The page:
1. Detects character pages via `frontmatter['iron-vault-kind'] === 'character'`
2. Extracts stats, meters, impacts, assets from frontmatter
3. Replaces placeholder divs with rendered HTML
4. Uses `datasworn-assets.ts` to merge asset state with full definitions

## Code Style

- TypeScript for all processing code
- Astro components for UI
- CSS custom properties for theming
- HTML output should match Iron Vault's Obsidian structure for CSS compatibility
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code

## Testing Changes

```bash
# Full build (includes prebuild scripts)
npm run build

# Preview the built site
npm run preview

# Development server (hot reload, but some features may differ from production)
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

### Checklist After Changes

- [ ] Wikilinks resolve correctly
- [ ] Iron Vault inline mechanics render with proper styling
- [ ] Code blocks (moves, oracles) display correctly
- [ ] Character pages show stats, meters, impacts, assets
- [ ] Asset cards render with abilities, controls, options
- [ ] Progress tracks render with SVG tick boxes
- [ ] Legacy tracks (Quests, Bonds, Discoveries) display on character pages
- [ ] Callouts are styled and collapsible
- [ ] Content embeds inline correctly
- [ ] Image embeds with size/alignment options work
- [ ] Dataview queries execute and render
- [ ] Search works (requires full build)
- [ ] Mobile layout is responsive
- [ ] View Transitions work smoothly between pages
- [ ] Sidebar state persists across navigation

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run format`
5. Test with a full build
6. Submit a PR with a clear description

## Project Dependencies

### Runtime Dependencies
- `astro` — Static site generator
- `@astrojs/mdx` — MDX support
- `gray-matter` — Frontmatter parsing
- `unified`, `remark-*`, `rehype-*` — Markdown processing
- `@datasworn/*` — Asset definitions for Ironsworn/Starforged/Sundered Isles
- `pagefind` — Client-side search

### Dev Dependencies
- `typescript` — Type checking
- `eslint`, `eslint-plugin-astro` — Linting
- `stylelint` — CSS linting
- `prettier`, `prettier-plugin-astro` — Code formatting

## Known Limitations / Future Work

- Excalidraw files (`.excalidraw.md`) are excluded from processing
- Some advanced Dataview features not yet implemented (GROUP BY, complex WHERE expressions)
- Asset card controls are read-only (no interactive meters)
- Clock visualization not yet implemented

## Questions?

Open an issue or reach out on the [Ironsworn Discord](https://discord.gg/8bRuZwK).
