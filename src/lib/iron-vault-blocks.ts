/**
 * Iron Vault Code Block Parser
 * Parses ```iron-vault-mechanics blocks and generates HTML
 *
 * Supports all mechanic types from the Iron Vault plugin:
 * - move, roll, progress-roll
 * - oracle, oracle-group
 * - meter, burn, xp
 * - track, progress
 * - clock
 * - asset, impact
 * - initiative/position
 * - actor
 * - reroll, add, dice-expr
 * - - (detail/comment)
 */

export function parseIronVaultBlock(content: string): string {
  const lines = content.trim().split('\n');
  const results: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('move ')) {
      // Collect all lines until closing brace
      const moveLines = collectBlock(lines, i);
      results.push(parseMoveBlock(moveLines.content));
      i = moveLines.endIndex;
    } else if (line.startsWith('oracle-group ')) {
      const groupLines = collectBlock(lines, i);
      results.push(parseOracleGroupBlock(groupLines.content));
      i = groupLines.endIndex;
    } else if (line.startsWith('oracle ')) {
      // Check if this oracle has nested content (braces)
      if (line.includes('{')) {
        const oracleLines = collectBlock(lines, i);
        results.push(parseOracleWithNested(oracleLines.content));
        i = oracleLines.endIndex;
      } else {
        results.push(parseOracleBlock(line));
      }
    } else if (line.startsWith('roll ')) {
      results.push(parseRollBlock(line));
    } else if (line.startsWith('progress-roll ')) {
      results.push(parseProgressRollBlock(line));
    } else if (line.startsWith('meter ')) {
      results.push(parseMeterBlock(line));
    } else if (line.startsWith('burn ')) {
      results.push(parseBurnBlock(line));
    } else if (line.startsWith('xp ')) {
      results.push(parseXpBlock(line));
    } else if (line.startsWith('track ')) {
      results.push(parseTrackBlock(line));
    } else if (line.startsWith('progress ')) {
      results.push(parseProgressBlock(line));
    } else if (line.startsWith('clock ')) {
      results.push(parseClockBlock(line));
    } else if (line.startsWith('asset ')) {
      results.push(parseAssetBlock(line));
    } else if (line.startsWith('impact ')) {
      results.push(parseImpactBlock(line));
    } else if (line.startsWith('initiative ') || line.startsWith('position ')) {
      results.push(parseInitiativeBlock(line));
    } else if (line.startsWith('actor ')) {
      const actorLines = collectBlock(lines, i);
      results.push(parseActorBlock(actorLines.content));
      i = actorLines.endIndex;
    } else if (line.startsWith('reroll ')) {
      results.push(parseRerollBlock(line));
    } else if (line.startsWith('add ')) {
      results.push(parseAddBlock(line));
    } else if (line.startsWith('dice-expr ')) {
      results.push(parseDiceExprBlock(line));
    } else if (line.startsWith('- ')) {
      // Detail/comment line
      results.push(parseDetailBlock(line));
    }

    i++;
  }

  return `<article class="iron-vault-mechanics">${results.join('')}</article>`;
}

// Helper to collect multi-line blocks with braces
function collectBlock(lines: string[], startIndex: number): { content: string; endIndex: number } {
  const collected = [lines[startIndex]];
  let braceCount =
    (lines[startIndex].match(/{/g) || []).length - (lines[startIndex].match(/}/g) || []).length;
  let i = startIndex;

  while (braceCount > 0 && i + 1 < lines.length) {
    i++;
    collected.push(lines[i]);
    braceCount += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
  }

  return { content: collected.join('\n'), endIndex: i };
}

// Parse key="value" or key=value patterns
function parseProps(line: string): Record<string, string | number> {
  const props: Record<string, string | number> = {};

  // Match key="value" (quoted)
  const quotedMatches = line.matchAll(/(\w+)="([^"]*)"/g);
  for (const match of quotedMatches) {
    props[match[1]] = match[2];
  }

  // Match key=value (unquoted numbers)
  const unquotedMatches = line.matchAll(/(\w+)=(-?\d+(?:\.\d+)?)/g);
  for (const match of unquotedMatches) {
    props[match[1]] = parseFloat(match[2]);
  }

  return props;
}

function getOutcome(score: number, vs1: number, vs2: number): 'strong-hit' | 'weak-hit' | 'miss' {
  if (score > vs1 && score > vs2) return 'strong-hit';
  if (score > vs1 || score > vs2) return 'weak-hit';
  return 'miss';
}

function parseMoveBlock(content: string): string {
  // move "[Name](datasworn:...)" { roll "Stat" action=X adds=X stat=X vs1=X vs2=X }
  const nameMatch = content.match(/move\s+"([^"]+)"/);
  const rollMatch = content.match(
    /roll\s+"([^"]+)"\s+action=(\d+)\s+adds=(\d+)\s+stat=(\d+)\s+vs1=(\d+)\s+vs2=(\d+)/
  );

  if (!nameMatch)
    return `<p class="error">Could not parse move: ${escapeHtml(content.substring(0, 50))}</p>`;

  // Extract just the name from the markdown link
  const fullName = nameMatch[1];
  const name = fullName.replace(/\[([^\]]+)\]\([^)]+\)/, '$1');

  // If no roll, it's a no-roll move
  if (!rollMatch) {
    return `<details class="move" open>
      <summary><span class="move-name">${escapeHtml(name)}</span></summary>
    </details>`;
  }

  const stat = rollMatch[1];
  const action = parseInt(rollMatch[2]);
  const adds = parseInt(rollMatch[3]);
  const statValue = parseInt(rollMatch[4]);
  const vs1 = parseInt(rollMatch[5]);
  const vs2 = parseInt(rollMatch[6]);

  const score = Math.min(10, action + statValue + adds);
  const outcome = getOutcome(score, vs1, vs2);
  const match = vs1 === vs2;

  return `<details class="move ${outcome}${match ? ' match' : ''}" open>
    <summary><span class="move-name">${escapeHtml(name)}</span></summary>
    <dl class="roll ${outcome}${match ? ' match' : ''}">
      <dt>Roll</dt>
      <dd class="action-die">${action}</dd>
      <dd class="stat">${statValue}</dd>
      <dd class="stat-name">${escapeHtml(stat)}</dd>
      <dd class="adds">${adds}</dd>
      <dd class="score">${score}</dd>
      <dd class="challenge-die vs1">${vs1}</dd>
      <dd class="challenge-die vs2">${vs2}</dd>
      <dd class="outcome">${outcome}</dd>
    </dl>
  </details>`;
}

function parseRollBlock(line: string): string {
  const props = parseProps(line);
  const statName = (props['stat-name'] || props['stat_name'] || '') as string;
  const action = (props['action'] || 0) as number;
  const stat = (props['stat'] || 0) as number;
  const adds = (props['adds'] || 0) as number;
  const vs1 = (props['vs1'] || 0) as number;
  const vs2 = (props['vs2'] || 0) as number;

  const score = Math.min(10, action + stat + adds);
  const outcome = getOutcome(score, vs1, vs2);
  const match = vs1 === vs2;

  return `<dl class="roll ${outcome}${match ? ' match' : ''}">
    <dt>Roll</dt>
    <dd class="action-die">${action}</dd>
    <dd class="stat">${stat}</dd>
    ${statName ? `<dd class="stat-name">${escapeHtml(statName)}</dd>` : ''}
    <dd class="adds">${adds}</dd>
    <dd class="score">${score}</dd>
    <dd class="challenge-die vs1">${vs1}</dd>
    <dd class="challenge-die vs2">${vs2}</dd>
    <dd class="outcome">${outcome}</dd>
  </dl>`;
}

function parseProgressRollBlock(line: string): string {
  const props = parseProps(line);
  const trackName = (props['name'] || '') as string;
  const score = (props['score'] || 0) as number;
  const vs1 = (props['vs1'] || 0) as number;
  const vs2 = (props['vs2'] || 0) as number;

  const outcome = getOutcome(score, vs1, vs2);
  const match = vs1 === vs2;

  return `<dl class="roll progress ${outcome}${match ? ' match' : ''}">
    <dt>Progress Roll</dt>
    <dd class="track-name">${escapeHtml(trackName)}</dd>
    <dd class="progress-score">${score}</dd>
    <dd class="challenge-die vs1">${vs1}</dd>
    <dd class="challenge-die vs2">${vs2}</dd>
    <dd class="outcome">${outcome}</dd>
  </dl>`;
}

function parseOracleBlock(line: string): string {
  const props = parseProps(line);
  const name = ((props['name'] || '') as string).replace(/\[([^\]]+)\]\([^)]+\)/, '$1');
  const result = (props['result'] || '') as string;
  const roll = (props['roll'] || '') as string | number;
  const cursed = props['cursed'] as number | undefined;
  const replaced = props['replaced'] as string | undefined;

  return `<div class="oracle-container">
    <dl class="oracle">
      <dt>Oracle</dt>
      <dd class="name">${escapeHtml(name)}</dd>
      <dd class="roll">${roll}</dd>
      <dd class="result">${escapeHtml(String(result))}</dd>
      ${cursed !== undefined ? `<dd class="cursed" data-value="${cursed}">${cursed}</dd>` : ''}
      ${replaced !== undefined ? `<dd class="replaced" data-value="${replaced}">${replaced}</dd>` : ''}
    </dl>
  </div>`;
}

function parseOracleWithNested(content: string): string {
  // Parse the main oracle line
  const firstLine = content.split('\n')[0];
  const props = parseProps(firstLine);
  const name = ((props['name'] || '') as string).replace(/\[([^\]]+)\]\([^)]+\)/, '$1');
  const result = (props['result'] || '') as string;
  const roll = (props['roll'] || '') as string | number;

  // Extract nested oracles from within braces
  const braceStart = content.indexOf('{');
  const braceEnd = content.lastIndexOf('}');
  let nestedHtml = '';

  if (braceStart !== -1 && braceEnd !== -1) {
    const inner = content.substring(braceStart + 1, braceEnd).trim();
    if (inner) {
      // Parse nested oracles
      const nestedLines = inner.split('\n');
      const nestedResults: string[] = [];

      for (const nestedLine of nestedLines) {
        const trimmed = nestedLine.trim();
        if (trimmed.startsWith('oracle ')) {
          nestedResults.push(parseOracleBlock(trimmed));
        }
      }

      if (nestedResults.length > 0) {
        nestedHtml = `<blockquote>${nestedResults.join('')}</blockquote>`;
      }
    }
  }

  return `<div class="oracle-container">
    <dl class="oracle">
      <dt>Oracle</dt>
      <dd class="name">${escapeHtml(name)}</dd>
      <dd class="roll">${roll}</dd>
      <dd class="result">${escapeHtml(String(result))}</dd>
    </dl>
    ${nestedHtml}
  </div>`;
}

function parseOracleGroupBlock(content: string): string {
  const nameMatch = content.match(/oracle-group\s+name="([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : 'Oracle Group';

  // Extract individual oracles
  const oracleMatches = content.matchAll(
    /oracle\s+name="([^"]+)"\s+result="([^"]+)"\s+roll=(\d+)/g
  );
  const oracles: string[] = [];

  for (const match of oracleMatches) {
    const oracleName = match[1].replace(/\[([^\]]+)\]\([^)]+\)/, '$1');
    const result = match[2];
    const roll = match[3];

    oracles.push(`<div class="oracle-container">
      <dl class="oracle">
        <dt>Oracle</dt>
        <dd class="name">${escapeHtml(oracleName)}</dd>
        <dd class="roll">${roll}</dd>
        <dd class="result">${escapeHtml(result)}</dd>
      </dl>
    </div>`);
  }

  return `<article class="oracle-group">
    <span class="group-name">${escapeHtml(name)}</span>
    <blockquote>${oracles.join('')}</blockquote>
  </article>`;
}

function parseMeterBlock(line: string): string {
  const props = parseProps(line);
  const name = (props['name'] || '') as string;
  const from = (props['from'] || 0) as number;
  const to = (props['to'] || 0) as number;
  const delta = to - from;
  const deltaClass = delta < 0 ? 'negative' : 'positive';

  return `<dl class="meter">
    <dt>Meter</dt>
    <dd class="meter-name">${escapeHtml(name)}</dd>
    <dd class="delta ${deltaClass}">${Math.abs(delta)}</dd>
    <dd class="from">${from}</dd>
    <dd class="to">${to}</dd>
  </dl>`;
}

function parseBurnBlock(line: string): string {
  const props = parseProps(line);
  const from = (props['from'] || 0) as number;
  const to = (props['to'] || 0) as number;

  return `<dl class="burn">
    <dt>Burn</dt>
    <dd class="from">${from}</dd>
    <dd class="to">${to}</dd>
  </dl>`;
}

function parseXpBlock(line: string): string {
  const props = parseProps(line);
  const from = (props['from'] || 0) as number;
  const to = (props['to'] || 0) as number;
  const delta = to - from;
  const deltaClass = delta < 0 ? 'negative' : 'positive';

  return `<dl class="xp">
    <dt>XP</dt>
    <dd class="delta ${deltaClass}">${Math.abs(delta)}</dd>
    <dd class="from">${from}</dd>
    <dd class="to">${to}</dd>
  </dl>`;
}

function parseTrackBlock(line: string): string {
  const props = parseProps(line);
  const nameMatch = line.match(/name="\[\[([^|]+)\|([^\]]+)\]\]"/);
  const statusMatch = line.match(/status="([^"]+)"/);

  const path = nameMatch ? nameMatch[1] : '';
  const displayName = nameMatch ? nameMatch[2] : ((props['name'] || '') as string);
  const status = statusMatch ? statusMatch[1] : (props['status'] as string | undefined);
  const slug = pathToSlug(path);

  // If status is provided, render as track-status
  if (status) {
    return `<dl class="track-status">
      <dt>Track</dt>
      <dd class="track-name"><a href="${slug}">${escapeHtml(displayName)}</a></dd>
      <dd class="track-status" data-value="${status}">${status}</dd>
    </dl>`;
  }

  // Otherwise render as track change
  const fromBoxes = (props['from-boxes'] || 0) as number;
  const fromTicks = (props['from-ticks'] || 0) as number;
  const toBoxes = (props['to-boxes'] || 0) as number;
  const toTicks = (props['to-ticks'] || 0) as number;

  return `<dl class="track">
    <dt>Track</dt>
    <dd class="track-name"><a href="${slug}">${escapeHtml(displayName)}</a></dd>
    <dd class="from-boxes">${fromBoxes}</dd>
    <dd class="from-ticks">${fromTicks}</dd>
    <dd class="to-boxes">${toBoxes}</dd>
    <dd class="to-ticks">${toTicks}</dd>
  </dl>`;
}

function parseProgressBlock(line: string): string {
  const props = parseProps(line);

  // Handle name with markdown link format: name="[[path|display]]"
  const nameMatch = line.match(/name="\[\[([^|]+)\|([^\]]+)\]\]"/);
  let trackName = '';
  let slug = '#';

  if (nameMatch) {
    slug = pathToSlug(nameMatch[1]);
    trackName = nameMatch[2];
  } else {
    trackName = (props['name'] || '') as string;
  }

  const steps = (props['steps'] || 1) as number;
  const rank = (props['rank'] || props['level'] || '') as string;
  const from = (props['from'] || 0) as number;

  // Calculate boxes and ticks from the 'from' value
  // Each box = 4 ticks, progress is stored as total ticks
  const fromBoxes = Math.floor(from / 4);
  const fromTicks = from % 4;

  // Calculate new progress based on rank and steps
  const ticksPerStep: Record<string, number> = {
    troublesome: 12,
    dangerous: 8,
    formidable: 4,
    extreme: 2,
    epic: 1,
  };
  const ticksToAdd = (ticksPerStep[rank.toLowerCase()] || 4) * steps;
  const newProgress = from + ticksToAdd;
  const toBoxes = Math.floor(newProgress / 4);
  const toTicks = newProgress % 4;

  const stepsClass = steps < 0 ? 'negative' : 'positive';

  return `<dl class="progress">
    <dt>Progress</dt>
    <dd class="track-name"><a href="${slug}">${escapeHtml(trackName)}</a></dd>
    <dd class="steps ${stepsClass}">${Math.abs(steps)}</dd>
    <dd class="rank">${escapeHtml(String(rank))}</dd>
    <dd class="from-boxes">${fromBoxes}</dd>
    <dd class="from-ticks">${fromTicks}</dd>
    <dd class="to-boxes">${toBoxes}</dd>
    <dd class="to-ticks">${toTicks}</dd>
  </dl>`;
}

function parseClockBlock(line: string): string {
  const props = parseProps(line);
  const name = (props['name'] || '') as string;
  const status = props['status'] as string | undefined;

  // If status is provided, render as clock-status
  if (status) {
    return `<dl class="clock-status">
      <dt>Clock</dt>
      <dd class="clock-name">${escapeHtml(name)}</dd>
      <dd class="clock-status" data-value="${status}">${status}</dd>
    </dl>`;
  }

  // Otherwise render as clock change
  const from = (props['from'] || 0) as number;
  const to = (props['to'] || 0) as number;
  const outOf = (props['out-of'] || props['segments'] || 0) as number;

  return `<dl class="clock">
    <dt>Clock</dt>
    <dd class="clock-name">${escapeHtml(name)}</dd>
    <dd class="from">${from}</dd>
    <dd class="out-of">${outOf}</dd>
    <dd class="to">${to}</dd>
    <dd class="out-of">${outOf}</dd>
  </dl>`;
}

function parseAssetBlock(line: string): string {
  const props = parseProps(line);
  const name = (props['name'] || '') as string;
  const status = (props['status'] || '') as string;
  const ability = props['ability'] as number | undefined;

  return `<dl class="asset">
    <dt>Asset</dt>
    <dd class="asset-name">${escapeHtml(name)}</dd>
    <dd class="asset-status" data-value="${status}">${status}</dd>
    ${ability !== undefined ? `<dd class="asset-ability">${ability}</dd>` : ''}
  </dl>`;
}

function parseImpactBlock(line: string): string {
  const props = parseProps(line);
  const name = (props['name'] || '') as string;
  const marked = props['marked'] as string | boolean;
  const markedStr = String(marked).toLowerCase();

  return `<dl class="impact">
    <dt>Impact</dt>
    <dd class="impact-name">${escapeHtml(name)}</dd>
    <dd class="impact-marked" data-value="${markedStr}">${markedStr}</dd>
  </dl>`;
}

function parseInitiativeBlock(line: string): string {
  const props = parseProps(line);
  const from = (props['from'] || 'out-of-combat') as string;
  const to = (props['to'] || 'out-of-combat') as string;

  const getInitClass = (init: string): string => {
    if (/bad.spot|no.initiative/i.test(init)) return 'no-initiative';
    if (/in.control|initiative/i.test(init)) return 'has-initiative';
    return 'out-of-combat';
  };

  const getInitText = (init: string): string => {
    if (/bad.spot/i.test(init)) return 'In a bad spot';
    if (/no.initiative/i.test(init)) return 'No initiative';
    if (/in.control/i.test(init)) return 'In control';
    if (/initiative/i.test(init)) return 'Has initiative';
    return 'Out of combat';
  };

  return `<dl class="initiative">
    <dt>Initiative</dt>
    <dd class="from ${getInitClass(from)}">${getInitText(from)}</dd>
    <dd class="to ${getInitClass(to)}">${getInitText(to)}</dd>
  </dl>`;
}

function parseActorBlock(content: string): string {
  const nameMatch = content.match(/actor\s+name="([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : 'Actor';

  // Handle markdown link format: [[path|display]]
  const linkMatch = name.match(/\[\[([^|]+)\|([^\]]+)\]\]/);
  let displayName = name;
  let slug = '';

  if (linkMatch) {
    slug = pathToSlug(linkMatch[1]);
    displayName = linkMatch[2];
  }

  // Extract content between braces
  const braceStart = content.indexOf('{');
  const braceEnd = content.lastIndexOf('}');
  let innerContent = '';

  if (braceStart !== -1 && braceEnd !== -1) {
    const inner = content.substring(braceStart + 1, braceEnd).trim();
    // Recursively parse inner content
    if (inner) {
      innerContent = parseIronVaultBlock(inner);
      // Remove the outer article wrapper since we're nesting
      innerContent = innerContent
        .replace(/^<article class="iron-vault-mechanics">/, '')
        .replace(/<\/article>$/, '');
    }
  }

  const nameHtml = slug
    ? `<a href="${slug}">${escapeHtml(displayName)}</a>`
    : escapeHtml(displayName);

  return `<section class="actor">
    <header><span>${nameHtml}</span></header>
    <div>${innerContent}</div>
  </section>`;
}

function parseRerollBlock(line: string): string {
  const props = parseProps(line);
  const action = props['action'] as number | undefined;
  const vs1 = props['vs1'] as number | undefined;
  const vs2 = props['vs2'] as number | undefined;

  let html = `<dl class="reroll"><dt>Reroll</dt>`;

  if (action !== undefined) {
    html += `<dd class="action-die from">${props['old-action'] || '?'}</dd>`;
    html += `<dd class="action-die to">${action}</dd>`;
  }

  if (vs1 !== undefined) {
    html += `<dd class="challenge-die from vs1">${props['old-vs1'] || '?'}</dd>`;
    html += `<dd class="challenge-die to vs1">${vs1}</dd>`;
  }

  if (vs2 !== undefined) {
    html += `<dd class="challenge-die from vs2">${props['old-vs2'] || '?'}</dd>`;
    html += `<dd class="challenge-die to vs2">${vs2}</dd>`;
  }

  html += `</dl>`;
  return html;
}

function parseAddBlock(line: string): string {
  // Handle both formats:
  // add amount=1 from="reason"
  // add 1 "reason"
  const props = parseProps(line);

  let amount = (props['amount'] || 0) as number;
  let from = (props['from'] || '') as string;

  // Try simpler format: add 1 "reason"
  if (amount === 0) {
    const simpleMatch = line.match(/add\s+(-?\d+)(?:\s+"([^"]+)")?/);
    if (simpleMatch) {
      amount = parseInt(simpleMatch[1]) || 0;
      from = simpleMatch[2] || '';
    }
  }

  const amountClass = amount < 0 ? 'negative' : 'positive';

  return `<dl class="add">
    <dt>Add</dt>
    <dd class="amount ${amountClass}">${Math.abs(amount)}</dd>
    ${from ? `<dd class="from">${escapeHtml(from)}</dd>` : ''}
  </dl>`;
}

function parseDiceExprBlock(line: string): string {
  const props = parseProps(line);
  const expr = (props['expr'] || '') as string;
  const result = (props['result'] || '') as string | number;

  return `<dl class="dice-expr">
    <dt>Dice</dt>
    <dd class="expr">${escapeHtml(expr)}</dd>
    <dd class="value">${result}</dd>
  </dl>`;
}

function parseDetailBlock(line: string): string {
  // Remove the leading "- " and render as a detail/comment
  const text = line.substring(2).trim();

  return `<aside class="detail">
    <p>${escapeHtml(text)}</p>
  </aside>`;
}

function pathToSlug(path: string): string {
  if (!path) return '#';

  // First unescape the escaped forward slashes from Iron Vault syntax
  let cleanPath = path.replace(/\\\//g, '/');

  // Remove .md extension
  cleanPath = cleanPath.replace(/\.md$/, '');

  // Convert to lowercase and replace spaces with hyphens
  cleanPath = cleanPath.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '').replace(/'/g, '');

  // Ensure single leading slash (remove any existing leading slashes first)
  cleanPath = cleanPath.replace(/^\/+/, '');

  return '/' + cleanPath;
}

function escapeHtml(text: string): string {
  return (
    text
      // First unescape escaped forward slashes from Iron Vault syntax
      .replace(/\\\//g, '/')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  );
}
