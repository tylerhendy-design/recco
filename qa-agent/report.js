/**
 * Report generator — produces a timestamped markdown file summarising the QA run.
 */

import fs from 'fs/promises';
import path from 'path';

const SEVERITY_EMOJI = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
};

const STATUS_EMOJI = {
  pass: '✅',
  'bugs-found': '⚠️',
  critical: '🔴',
  error: '💥',
};

export async function generateReport(baseUrl, results) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportsDir = './reports';
  await fs.mkdir(reportsDir, { recursive: true });

  const reportPath = path.join(reportsDir, `qa-report-${timestamp}.md`);

  const totalBugs = results.flatMap((r) => r.bugs);
  const criticalCount = totalBugs.filter((b) => b.severity === 'critical').length;
  const highCount = totalBugs.filter((b) => b.severity === 'high').length;
  const mediumCount = totalBugs.filter((b) => b.severity === 'medium').length;
  const lowCount = totalBugs.filter((b) => b.severity === 'low').length;
  const allPassed = results.every((r) => r.status === 'pass');

  let md = `# Recco QA Agent Report
**Run:** ${now.toUTCString()}
**Target:** ${baseUrl}
**Overall:** ${allPassed ? '✅ All journeys passed' : `⚠️ Issues found — ${totalBugs.length} bug(s) across ${results.length} journey(s)`}

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${criticalCount} |
| 🟠 High | ${highCount} |
| 🟡 Medium | ${mediumCount} |
| 🔵 Low | ${lowCount} |
| **Total** | **${totalBugs.length}** |

---

`;

  for (const result of results) {
    md += `## ${STATUS_EMOJI[result.status] || '❓'} Journey: ${result.journey}\n\n`;
    md += `**Status:** ${result.status}\n\n`;

    if (result.bugs.length > 0) {
      md += `### 🐛 Bugs Found\n\n`;
      for (const bug of result.bugs) {
        const emoji = SEVERITY_EMOJI[bug.severity] || '❓';
        md += `- ${emoji} **[${bug.severity.toUpperCase()}]** ${bug.description}`;
        if (bug.url) md += ` _(at ${bug.url})_`;
        if (bug.step) md += ` _(step ${bug.step})_`;
        md += '\n';
      }
      md += '\n';
    } else {
      md += `_No bugs found in this journey._\n\n`;
    }

    md += `### 📋 Steps Taken\n\n`;
    if (result.steps.length > 0) {
      result.steps.forEach((step, i) => {
        md += `${i + 1}. ${step}\n`;
      });
    } else {
      md += `_No steps recorded._\n`;
    }

    md += '\n---\n\n';
  }

  md += `## Notes\n\n`;
  md += `- Screenshots saved to \`qa-agent/screenshots/\`\n`;
  md += `- Test user was automatically created and deleted from Supabase\n`;
  md += `- Re-run with: \`node qa-agent/index.js --url ${baseUrl}\`\n`;

  await fs.writeFile(reportPath, md);
  return reportPath;
}
