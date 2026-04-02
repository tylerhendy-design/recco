#!/usr/bin/env node
/**
 * Recco Icon Audit
 * Scans the entire source tree for back arrow and chevron icon usage.
 * Flags any that aren't using the same canonical component/import.
 *
 * Run from the repo root:
 *   node qa-agent/icon-audit.js
 *
 * Or from qa-agent/:
 *   node icon-audit.js --root ../
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const ROOT = rootFlag !== -1
  ? path.resolve(args[rootFlag + 1])
  : path.resolve(__dirname, '..');

// Extensions to scan
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// Directories to skip
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'qa-agent']);

// ── What we're looking for ───────────────────────────────────────────────────

// Patterns that suggest a back arrow or chevron icon
const ICON_PATTERNS = [
  // Lucide icons
  { pattern: /\bChevronLeft\b/g,    label: 'ChevronLeft (lucide)' },
  { pattern: /\bChevronRight\b/g,   label: 'ChevronRight (lucide)' },
  { pattern: /\bChevronDown\b/g,    label: 'ChevronDown (lucide)' },
  { pattern: /\bChevronUp\b/g,      label: 'ChevronUp (lucide)' },
  { pattern: /\bArrowLeft\b/g,      label: 'ArrowLeft (lucide)' },
  { pattern: /\bArrowRight\b/g,     label: 'ArrowRight (lucide)' },
  { pattern: /\bArrowBack\b/g,      label: 'ArrowBack' },

  // Heroicons
  { pattern: /\bChevronLeftIcon\b/g,  label: 'ChevronLeftIcon (heroicons)' },
  { pattern: /\bArrowLeftIcon\b/g,    label: 'ArrowLeftIcon (heroicons)' },
  { pattern: /\bBackspaceIcon\b/g,    label: 'BackspaceIcon (heroicons)' },

  // SVG inline patterns (common hand-rolled arrows)
  { pattern: /M\s*10\s*19\s*l-7-7\s*7-7/g,   label: 'Inline SVG — M10 19 l-7-7 7-7 (common back arrow path)' },
  { pattern: /chevron/gi,              label: 'String "chevron" (may be classname or aria-label)' },
  { pattern: /back[-_]?arrow/gi,       label: 'String "back-arrow" or "back_arrow"' },
  { pattern: /←|‹|❮/g,               label: 'Unicode arrow character' },

  // Custom component names
  { pattern: /\bBackButton\b/g,       label: 'BackButton component' },
  { pattern: /\bBackArrow\b/g,        label: 'BackArrow component' },
  { pattern: /\bBackIcon\b/g,         label: 'BackIcon component' },
  { pattern: /\bNavBack\b/g,          label: 'NavBack component' },
  { pattern: /\bGoBack\b/g,           label: 'GoBack component' },
];

// ── File walker ──────────────────────────────────────────────────────────────

async function* walkDir(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walkDir(fullPath);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n🔍 Recco Icon Audit`);
console.log(`📁 Scanning: ${ROOT}\n`);

const findings = {}; // label → [{ file, line, snippet }]

let fileCount = 0;
for await (const filePath of walkDir(ROOT)) {
  fileCount++;
  const relative = path.relative(ROOT, filePath);
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');

  for (const { pattern, label } of ICON_PATTERNS) {
    pattern.lastIndex = 0; // reset regex state
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Find which line this is on
      const upToMatch = content.slice(0, match.index);
      const lineNumber = upToMatch.split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() ?? '';

      if (!findings[label]) findings[label] = [];
      findings[label].push({
        file: relative,
        line: lineNumber,
        snippet: lineContent.slice(0, 120),
      });
    }
  }
}

console.log(`Scanned ${fileCount} files.\n`);

// ── Report ───────────────────────────────────────────────────────────────────

const iconTypes = Object.keys(findings);

if (iconTypes.length === 0) {
  console.log('✅ No back arrow or chevron icon usage found.\n');
} else {
  // Summary table
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ICON USAGE SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const label of iconTypes) {
    console.log(`  ${findings[label].length}x  ${label}`);
  }
  console.log('');

  // Consistency check
  const backArrowTypes = iconTypes.filter(l =>
    l.includes('Arrow') || l.includes('arrow') || l.includes('Back') || l.includes('Chevron')
  );

  if (backArrowTypes.length > 1) {
    console.log('⚠️  INCONSISTENCY DETECTED — multiple different icon types in use:');
    backArrowTypes.forEach(t => console.log(`   - ${t} (${findings[t].length} uses)`));
    console.log('\n   Recommendation: standardise on ONE. Based on your stack,');
    console.log('   ChevronLeft from lucide-react is the correct geometric/square style.\n');
  } else if (backArrowTypes.length === 1) {
    console.log(`✅ Consistent — all back/chevron icons use: ${backArrowTypes[0]}\n`);
  }

  // Detailed findings
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DETAILED FINDINGS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const label of iconTypes) {
    console.log(`▸ ${label}`);
    for (const { file, line, snippet } of findings[label]) {
      console.log(`  ${file}:${line}`);
      console.log(`    ${snippet}`);
    }
    console.log('');
  }

  // Write markdown report
  const reportDir = path.join(__dirname, 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = path.join(reportDir, `icon-audit-${timestamp}.md`);

  let md = `# Recco Icon Audit Report\n**Run:** ${new Date().toUTCString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| Icon Type | Count |\n|-----------|-------|\n`;
  for (const label of iconTypes) {
    md += `| ${label} | ${findings[label].length} |\n`;
  }
  md += '\n';

  if (backArrowTypes.length > 1) {
    md += `## ⚠️ Inconsistency Found\n\nMultiple back arrow/chevron types in use:\n`;
    backArrowTypes.forEach(t => { md += `- **${t}** (${findings[t].length} uses)\n`; });
    md += `\n**Fix:** Standardise on \`ChevronLeft\` from \`lucide-react\` — geometric, square corners, consistent stroke weight.\n\n`;
  } else {
    md += `## ✅ Consistent\nAll back/chevron icons use: **${backArrowTypes[0] ?? 'none found'}**\n\n`;
  }

  md += `## Detailed Findings\n\n`;
  for (const label of iconTypes) {
    md += `### ${label}\n\n`;
    for (const { file, line, snippet } of findings[label]) {
      md += `- \`${file}:${line}\`\n  \`${snippet}\`\n`;
    }
    md += '\n';
  }

  await fs.writeFile(reportPath, md);
  console.log(`📄 Report saved to: ${path.relative(process.cwd(), reportPath)}\n`);
}
