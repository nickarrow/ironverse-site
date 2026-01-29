/**
 * Iron Vault Inline Mechanics Parser
 * Parses `iv-*` inline code and generates HTML matching the Iron Vault plugin CSS structure
 *
 * IMPORTANT: The outcome icon comes FIRST in the plugin's HTML structure
 */

// Type for file lookup
interface FileInfo {
  slug: string;
  title: string;
  path: string;
}

export function parseInlineMechanic(
  code: string,
  filesByName?: Map<string, FileInfo>
): string | null {
  if (!code.startsWith('iv-')) return null;

  const colonIndex = code.indexOf(':');
  if (colonIndex === -1) return null;

  const type = code.substring(0, colonIndex);
  const content = code.substring(colonIndex + 1);

  switch (type) {
    case 'iv-move':
      return renderMove(content);
    case 'iv-oracle':
      return renderOracle(content);
    case 'iv-meter':
      return renderMeter(content);
    case 'iv-burn':
      return renderBurn(content);
    case 'iv-initiative':
      return renderInitiative(content);
    case 'iv-track-create':
      return renderTrackCreate(content, filesByName);
    case 'iv-track-advance':
      return renderTrackAdvance(content, filesByName);
    case 'iv-track-complete':
      return renderTrackComplete(content, filesByName);
    case 'iv-progress':
      return renderProgressRoll(content, filesByName);
    case 'iv-noroll':
      return renderNoRoll(content);
    case 'iv-entity-create':
      return renderEntityCreate(content, filesByName);
    case 'iv-clock-create':
      return renderClockCreate(content, filesByName);
    case 'iv-clock-advance':
      return renderClockAdvance(content, filesByName);
    case 'iv-clock-resolve':
      return renderClockResolve(content, filesByName);
    case 'iv-dice':
      return renderDice(content);
    case 'iv-ooc':
      return renderOOC(content);
    default:
      return null;
  }
}

function getOutcome(score: number, vs1: number, vs2: number): 'strong-hit' | 'weak-hit' | 'miss' {
  if (score > vs1 && score > vs2) return 'strong-hit';
  if (score > vs1 || score > vs2) return 'weak-hit';
  return 'miss';
}

function isMatch(vs1: number, vs2: number): boolean {
  return vs1 === vs2;
}

// Lucide icons as inline SVGs - matching the Iron Vault plugin icons
const ICONS = {
  // Oracle: sparkles (plugin uses "sparkles")
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path><path d="M20 3v4"></path><path d="M22 5h-4"></path><path d="M4 17v2"></path><path d="M5 18H3"></path></svg>`,
  // Track create: square-stack (plugin uses "square-stack")
  squareStack: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><rect x="14" y="14" width="8" height="8" rx="2"></rect></svg>`,
  // Track advance: copy-check (plugin uses "copy-check")
  copyCheck: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 15 2 2 4-4"></path><rect x="8" y="8" width="14" height="14" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
  // Track complete: square-check-big (plugin uses "square-check-big")
  squareCheckBig: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
  // Track reopen: rotate-ccw (plugin uses "rotate-ccw")
  rotateCcw: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`,
  // Entity create: file-plus (plugin uses "file-plus")
  filePlus: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M9 15h6"></path><path d="M12 18v-6"></path></svg>`,
  // No-roll move: file-pen-line (plugin uses "file-pen-line")
  filePenLine: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"></path><path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path><path d="M8 18h1"></path></svg>`,
  // Clock: clock (plugin uses "clock")
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  // Clock advance: clock-arrow-up (plugin uses "clock-arrow-up")
  clockArrowUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.228 21.925A10 10 0 1 1 21.994 12.338"></path><path d="M12 6v6l1.562.781"></path><path d="m17 22 5-5"></path><path d="m17 17 5 5"></path></svg>`,
  // Clock resolve: circle-check-big (plugin uses "circle-check-big")
  circleCheckBig: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"></path><path d="m9 11 3 3L22 4"></path></svg>`,
  // Meter: trending-up / trending-down (plugin uses these)
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`,
  trendingDown: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>`,
  // Burn: flame (plugin uses "flame")
  flame: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
  // Initiative: footprints (plugin uses "footprints")
  footprints: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"></path><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"></path><path d="M16 17h4"></path><path d="M4 13h4"></path></svg>`,
  // Dice: dices (plugin uses "dices" for dice rolls)
  dices: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="12" x="2" y="10" rx="2" ry="2"></rect><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"></path><path d="M6 18h.01"></path><path d="M10 14h.01"></path><path d="M15 6h.01"></path><path d="M18 9h.01"></path></svg>`,
  // OOC: message-circle (plugin uses "message-circle")
  messageCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>`,
  // Cursed: skull (plugin uses "skull")
  skull: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle><path d="M8 20v2h8v-2"></path><path d="m12.5 17-.5-1-.5 1h1z"></path><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"></path></svg>`,
};

function renderMove(content: string): string {
  // Format: Name|Stat|action|statValue|adds|vs1|vs2|moveRef|extras...
  const parts = content.split('|');
  const name = parts[0] || '';
  const stat = parts[1] || '';
  const action = parseInt(parts[2]) || 0;
  const statValue = parseInt(parts[3]) || 0;
  const adds = parseInt(parts[4]) || 0;
  const vs1 = parseInt(parts[5]) || 0;
  const vs2 = parseInt(parts[6]) || 0;

  const score = Math.min(10, action + statValue + adds);
  const outcome = getOutcome(score, vs1, vs2);
  const match = isMatch(vs1, vs2);

  const classes = ['iv-inline-mechanics', outcome];
  if (match) classes.push('match');

  // Plugin structure: outcome icon FIRST, then name, stat, separator, score, vs, dice
  return (
    `<span class="${classes.join(' ')}">` +
    `<span class="iv-inline-outcome-icon"></span>` +
    `<span class="iv-inline-move-name iv-inline-link">${escapeHtml(name)}</span>` +
    `<span class="iv-inline-stat">(${escapeHtml(stat)})</span>` +
    `<span class="iv-inline-separator">—</span>` +
    `<span class="iv-inline-score">${score}</span>` +
    `<span> vs </span>` +
    `<span class="iv-inline-challenge-die vs1">${vs1}</span>` +
    `<span>|</span>` +
    `<span class="iv-inline-challenge-die vs2">${vs2}</span>` +
    `${match ? '<span class="iv-inline-match">match</span>' : ''}` +
    `</span>`
  );
}

function renderOracle(content: string): string {
  // Format: Name|roll|result|oracleRef
  const parts = content.split('|');
  const name = parts[0] || '';
  const roll = parts[1] || '';
  const result = parts[2] || '';

  return (
    `<span class="iv-inline-mechanics oracle">` +
    `<span class="iv-inline-oracle-icon">${ICONS.sparkles}</span>` +
    `<span class="iv-inline-oracle-name iv-inline-link">${escapeHtml(name)}</span>` +
    `<span>(${roll})</span>` +
    `<span class="iv-inline-oracle-result">${escapeHtml(result)}</span>` +
    `</span>`
  );
}

function renderMeter(content: string): string {
  // Format: Name|from|to
  const parts = content.split('|');
  const name = parts[0] || '';
  const fromVal = parseInt(parts[1]) || 0;
  const to = parseInt(parts[2]) || 0;
  const delta = to - fromVal;
  const meterClass = delta > 0 ? 'meter-increase' : delta < 0 ? 'meter-decrease' : '';
  const icon = delta >= 0 ? ICONS.trendingUp : ICONS.trendingDown;

  return (
    `<span class="iv-inline-mechanics ${meterClass}">` +
    `<span class="iv-inline-meter-icon">${icon}</span>` +
    `<span class="iv-inline-meter-name">${escapeHtml(name)}:</span>` +
    `<span class="iv-inline-meter-change">${fromVal} → ${to}</span>` +
    `</span>`
  );
}

function renderBurn(content: string): string {
  // Format: from|to
  const parts = content.split('|');
  const fromVal = parseInt(parts[0]) || 0;
  const to = parseInt(parts[1]) || 0;

  return (
    `<span class="iv-inline-mechanics burn">` +
    `<span class="iv-inline-burn-icon">${ICONS.flame}</span>` +
    `<span class="iv-inline-burn-label">Burn:</span>` +
    `<span class="iv-inline-burn-change">${fromVal} → ${to}</span>` +
    `</span>`
  );
}

function renderInitiative(content: string): string {
  // Format: from|to
  const parts = content.split('|');
  const from = parts[0] || '';
  const to = parts[1] || parts[0] || '';

  // Determine initiative class
  let initClass = 'initiative';
  const toLower = to.toLowerCase();
  if (toLower.includes('control') || toLower.includes('initiative')) {
    initClass = 'initiative-in-control';
  } else if (toLower.includes('bad') || toLower.includes('no')) {
    initClass = 'initiative-bad-spot';
  } else if (toLower.includes('out')) {
    initClass = 'initiative-out-of-combat';
  }

  return (
    `<span class="iv-inline-mechanics ${initClass}">` +
    `<span class="iv-inline-initiative-icon">${ICONS.footprints}</span>` +
    `<span class="iv-inline-initiative-label">Position:</span>` +
    `<span class="iv-inline-initiative-change">${escapeHtml(from)} → ${escapeHtml(to)}</span>` +
    `</span>`
  );
}

function renderTrackCreate(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Name|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics track-create">` +
    `<span class="iv-inline-track-icon">${ICONS.squareStack}</span>` +
    `<a href="/${slug}" class="iv-inline-track-name iv-inline-link">${escapeHtml(name)}</a>` +
    `</span>`
  );
}

function renderTrackAdvance(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Name|path|from|to|rank|steps
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  const to = parseInt(parts[3]) || 0;
  const steps = parseInt(parts[5]) || 1;
  const slug = resolvePathToSlug(path, filesByName);
  const boxes = Math.floor(to / 4);

  return (
    `<span class="iv-inline-mechanics track-advance">` +
    `<span class="iv-inline-track-icon">${ICONS.copyCheck}</span>` +
    `<a href="/${slug}" class="iv-inline-track-name iv-inline-link">${escapeHtml(name)}</a>` +
    `<span class="iv-inline-track-progress"> +${steps} (${boxes}/10)</span>` +
    `</span>`
  );
}

function renderTrackComplete(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Name|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics track-complete">` +
    `<span class="iv-inline-track-icon">${ICONS.squareCheckBig}</span>` +
    `<a href="/${slug}" class="iv-inline-track-name iv-inline-link">${escapeHtml(name)}</a>` +
    `<span class="iv-inline-track-status">completed</span>` +
    `</span>`
  );
}

function renderProgressRoll(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Name|progress|vs1|vs2|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const progress = parseInt(parts[1]) || 0;
  const vs1 = parseInt(parts[2]) || 0;
  const vs2 = parseInt(parts[3]) || 0;
  const path = parts[4] || '';

  const outcome = getOutcome(progress, vs1, vs2);
  const match = isMatch(vs1, vs2);
  const slug = path ? resolvePathToSlug(path, filesByName) : '';

  const classes = ['iv-inline-mechanics', outcome];
  if (match) classes.push('match');

  // Plugin structure: outcome icon FIRST
  return (
    `<span class="${classes.join(' ')}">` +
    `<span class="iv-inline-outcome-icon"></span>` +
    `<span class="iv-inline-progress-name iv-inline-link">${escapeHtml(name)}</span>` +
    (slug ? `<a href="/${slug}" class="iv-inline-progress-track iv-inline-link">(track)</a>` : '') +
    `<span class="iv-inline-separator">—</span>` +
    `<span class="iv-inline-score">${progress}</span>` +
    `<span> vs </span>` +
    `<span class="iv-inline-challenge-die vs1">${vs1}</span>` +
    `<span>|</span>` +
    `<span class="iv-inline-challenge-die vs2">${vs2}</span>` +
    `${match ? '<span class="iv-inline-match">match</span>' : ''}` +
    `</span>`
  );
}

function renderNoRoll(content: string): string {
  // Format: Name|moveRef
  const parts = content.split('|');
  const name = parts[0] || '';

  return (
    `<span class="iv-inline-mechanics no-roll">` +
    `<span class="iv-inline-noroll-icon">${ICONS.filePenLine}</span>` +
    `<span class="iv-inline-move-name iv-inline-link">${escapeHtml(name)}</span>` +
    `</span>`
  );
}

function renderEntityCreate(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Type|Name|path
  const parts = content.split('|');
  const type = parts[0] || '';
  const name = parts[1] || '';
  const path = parts[2] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics entity-create">` +
    `<span class="iv-inline-entity-icon">${ICONS.filePlus}</span>` +
    `<span class="iv-inline-entity-type">${escapeHtml(type)}:</span>` +
    `<a href="/${slug}" class="iv-inline-entity-name iv-inline-link">${escapeHtml(name)}</a>` +
    `</span>`
  );
}

function renderClockCreate(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Name|segments|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const segments = parts[1] || '';
  const path = parts[2] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics clock-create">` +
    `<span class="iv-inline-clock-icon">${ICONS.clock}</span>` +
    `<a href="/${slug}" class="iv-inline-clock-name iv-inline-link">${escapeHtml(name)}</a>` +
    `<span class="iv-inline-clock-progress">(0/${segments})</span>` +
    `</span>`
  );
}

function renderClockAdvance(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Name|from|to|segments|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const from = parts[1] || '0';
  const to = parts[2] || '0';
  const segments = parts[3] || '';
  const path = parts[4] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics clock-advance">` +
    `<span class="iv-inline-clock-icon">${ICONS.clockArrowUp}</span>` +
    `<a href="/${slug}" class="iv-inline-clock-name iv-inline-link">${escapeHtml(name)}</a>` +
    `<span class="iv-inline-clock-progress">${from} → ${to}/${segments}</span>` +
    `</span>`
  );
}

function renderClockResolve(content: string, filesByName?: Map<string, FileInfo>): string {
  // Format: Name|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics clock-resolve">` +
    `<span class="iv-inline-clock-icon">${ICONS.circleCheckBig}</span>` +
    `<a href="/${slug}" class="iv-inline-clock-name iv-inline-link">${escapeHtml(name)}</a>` +
    `<span class="iv-inline-clock-status">resolved</span>` +
    `</span>`
  );
}

function renderDice(content: string): string {
  // Format: expression|result
  const parts = content.split('|');
  const expression = parts[0] || '';
  const result = parts[1] || '';

  return (
    `<span class="iv-inline-mechanics dice-roll">` +
    `<span class="iv-inline-dice-icon">${ICONS.dices}</span>` +
    `<span class="iv-inline-dice-expression">${escapeHtml(expression)}</span>` +
    `<span class="iv-inline-dice-arrow">→</span>` +
    `<span class="iv-inline-dice-result">${escapeHtml(result)}</span>` +
    `</span>`
  );
}

function renderOOC(content: string): string {
  // Format: text
  return (
    `<span class="iv-inline-mechanics ooc">` +
    `<span class="iv-inline-ooc-icon">${ICONS.messageCircle}</span>` +
    `<span class="iv-inline-ooc-text">${escapeHtml(content)}</span>` +
    `</span>`
  );
}

// Resolve a path (which might be just a filename) to a full slug
function resolvePathToSlug(path: string, filesByName?: Map<string, FileInfo>): string {
  if (!path) return '#';

  // Extract just the filename without extension for lookup
  const filename = path.replace(/\.md$/, '').split(/[/\\]/).pop() || '';
  const lookupKey = filename.toLowerCase();

  // Try to find the file in the lookup map
  if (filesByName) {
    const file = filesByName.get(lookupKey);
    if (file) {
      return file.slug;
    }
  }

  // Fallback to simple slug conversion
  return pathToSlug(path);
}

export function pathToSlug(path: string): string {
  if (!path) return '#';
  // Convert Obsidian path to site URL
  return path
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/'/g, '');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
