# The Foundry Site

GitHub Pages deployment of an Obsidian vault using the [obsidian-webpage-export](https://github.com/KosmosisDire/obsidian-webpage-export) plugin.

## Custom Fixes

The exported site required some CSS fixes to render properly. These are applied via custom files in `docs/site-lib/` that persist across exports.

### Files

- `docs/site-lib/html/custom-head-content-content.html` - Loads the custom CSS files
- `docs/site-lib/styles/custom-fixes.css` - Layout and display fixes
- `docs/site-lib/styles/iron-vault-styles.css` - Iron Vault plugin styling

### What the fixes do

**custom-fixes.css:**
- Hides the duplicate page title and horizontal line at the top of each page
- Hides the duplicate first entry in the Table of Contents
- Left-aligns content (was incorrectly centered)
- Fixes text wrapping (text was running off screen)
- Left-aligns code blocks

**iron-vault-styles.css:**
- Full styling for Iron Vault plugin components (character sheets, meters, assets, tracks, clocks, mechanics blocks, etc.)
- Without this, Iron Vault elements render as unstyled lists

## After Re-exporting

If you do a clean export that wipes the `docs/site-lib/` folder, you'll need to restore these three files. Keep backups or re-add them after export.

## Export Plugin Settings

Keep "Custom HTML / JS" enabled in the obsidian-webpage-export plugin settings. This is what loads the `custom-head-content-content.html` file.
