/**
 * Recco QA Agent — App Explorer
 * Coordinate-based clicking only. Claude sees screenshots and responds
 * with pixel coordinates — no CSS selector guessing ever.
 *
 * Goals Claude must attempt to complete:
 * 1. Open notifications and view all unread items
 * 2. Open the Padella reco, view the message thread, mark it as done
 * 3. Write a review for the Tate Modern reco (already marked done)
 * 4. Open the Conan O'Brien podcast reco and mark it as done
 * 5. Accept the pending friend request from Sam Stranger
 * 6. Find a friend's profile and send them a reco for Padella (restaurant)
 * 7. Send a reco for a podcast
 * 8. Send a reco for something cultural
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const client = new Anthropic();
const MAX_STEPS = 40;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };

async function askClaude(screenshotBase64, pageUrl, stepHistory, { name, email, strangerUsername }) {
  const historyText = stepHistory.length > 0
    ? `Steps completed so far:\n${stepHistory.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : 'No steps taken yet — you are starting on /home.';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are a QA agent testing the Recco app — a social recommendation-sharing app. You are logged in as a real user with a fully loaded account.

The viewport is ${VIEWPORT.width}x${VIEWPORT.height}px. You interact ONLY by specifying pixel coordinates — never CSS selectors.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOALS — work through these in order:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NOTIFICATIONS — Open the notifications screen. View all unread items. Note anything missing or broken.
2. PADELLA RECO — Find the Padella (restaurant) reco from Alex Friend. Open it. View the message thread. Mark it as done.
3. WRITE A REVIEW — Find the Tate Modern reco (already marked done). Write a short review for it.
4. PODCAST RECO — Find the Conan O'Brien podcast reco. Mark it as done.
5. FRIEND REQUEST — Accept the pending friend request from Sam Stranger (username: ${strangerUsername}).
6. SEND A RECO (restaurant) — Go to Alex Friend's profile and send them a reco for Padella, a London restaurant in Borough Market. The place name field is a TYPEAHEAD — type "Pade" and wait for results, then tap the correct result.
7. SEND A RECO (podcast) — Send a reco for any podcast you choose.
8. SEND A RECO (culture) — Send a reco for a cultural experience, show, or exhibition.

After completing all goals (or attempting them), call "done" with a summary.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APP LAYOUT:
- Bottom nav: Home | Reco (send) | Places | Friends | Sin Bin
- Notifications are usually accessible via a bell icon or notification tab
- Recommendation cards on home feed are tappable
- Friend profiles are accessible via the Friends tab

INTERACTION FORMAT — respond with ONE of these JSON objects only:

{ "action": "click", "x": 195, "y": 420, "description": "what and why" }
{ "action": "type", "x": 195, "y": 300, "text": "text to type", "description": "what field" }
{ "action": "scroll", "direction": "down", "amount": 300, "description": "why" }
{ "action": "wait", "ms": 1500, "description": "what you are waiting for" }
{ "action": "navigate", "url": "https://givemeareco.com/...", "description": "why" }
{ "action": "done", "description": "full summary of goals completed and bugs found" }
{ "action": "bug", "severity": "low|medium|high|critical", "description": "describe the bug clearly", "then": { ...next action } }

RULES:
- Use "${name}" and "${email}" for any profile fields if asked
- If a goal fails after 2 attempts, log a bug and move to the next goal
- If you see a login screen at any point, that is a critical bug — report it and stop
- Never navigate to /login
- Be methodical — complete each goal fully before moving to the next`,

    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 },
        },
        {
          type: 'text',
          text: `Current URL: ${pageUrl}\n\n${historyText}\n\nWhat is the next action? Respond with pixel coordinates.`,
        },
      ],
    }],
  });

  const raw = response.content[0].text.trim();
  // Strip any preamble before the JSON — Claude sometimes adds a sentence first
  const jsonStart = raw.indexOf('{');
  const clean = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
  try {
    return JSON.parse(clean);
  } catch {
    return {
      action: 'bug',
      severity: 'high',
      description: `Claude returned unparseable response: ${raw.slice(0, 300)}`,
      then: { action: 'done', description: 'Aborted due to parse error' },
    };
  }
}

async function executeAction(page, action) {
  switch (action.action) {
    case 'click':
      await page.mouse.click(action.x, action.y);
      await page.waitForTimeout(900);
      break;

    case 'type':
      await page.mouse.click(action.x, action.y);
      await page.waitForTimeout(300);
      await page.keyboard.type(action.text, { delay: 80 });
      await page.waitForTimeout(800);
      break;

    case 'scroll':
      await page.mouse.wheel(0, action.direction === 'down' ? action.amount : -action.amount);
      await page.waitForTimeout(500);
      break;

    case 'wait':
      await page.waitForTimeout(action.ms || 1500);
      break;

    case 'navigate':
      await page.goto(action.url, { waitUntil: 'networkidle', timeout: 15000 });
      break;

    case 'done':
    case 'bug':
      break;

    default:
      throw new Error(`Unknown action: ${action.action}`);
  }
}

export async function exploreJourney(context, { baseUrl, email, password, name, strangerUsername }) {
  const page = await context.newPage();
  const bugs = [];
  const steps = [];
  let stepCount = 0;

  console.log('🧪 Journey: App Exploration');

  // ── Deterministic login — no Claude involved ─────────────────
  try {
    console.log('  🔐 Logging in...');
    await page.goto(`${baseUrl}/login?method=email`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="email-submit"]');
    await page.waitForURL('**/home**', { timeout: 15000 });
    console.log('  ✓ Logged in, on /home');
  } catch (err) {
    bugs.push({ severity: 'critical', description: `Login failed: ${err.message}` });
    await page.close();
    return {
      journey: 'App Exploration',
      status: 'critical',
      steps: ['Login attempted and failed'],
      bugs,
      screenshotDir: SCREENSHOT_DIR,
    };
  }

  // ── Claude explores by coordinates ───────────────────────────
  while (stepCount < MAX_STEPS) {
    stepCount++;

    const screenshotPath = path.join(SCREENSHOT_DIR, `step-${stepCount}.png`);
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    await fs.writeFile(screenshotPath, screenshotBuffer);
    const screenshotBase64 = screenshotBuffer.toString('base64');

    const currentUrl = page.url();
    console.log(`  Step ${stepCount}: ${currentUrl}`);

    let decision;
    try {
      decision = await askClaude(screenshotBase64, currentUrl, steps, { name, email, strangerUsername });
    } catch (err) {
      bugs.push({ severity: 'critical', description: `Claude API error at step ${stepCount}: ${err.message}` });
      break;
    }

    if (decision.action === 'bug') {
      console.log(`  🐛 Bug [${decision.severity}]: ${decision.description}`);
      bugs.push({ severity: decision.severity, description: decision.description, step: stepCount, url: currentUrl });
      steps.push(`BUG [${decision.severity}]: ${decision.description}`);
      if (!decision.then) break;
      decision = decision.then;
    }

    if (decision.action === 'done') {
      steps.push(`✓ Done: ${decision.description}`);
      console.log('  ✓ Exploration complete');
      break;
    }

    try {
      const label = decision.description || `${decision.action} at (${decision.x ?? ''},${decision.y ?? ''})`;
      steps.push(`${decision.action}: ${label}`);
      await executeAction(page, decision);
    } catch (err) {
      const msg = `Failed "${decision.action}" — ${err.message}`;
      console.log(`  ⚠️  ${msg}`);
      bugs.push({ severity: 'high', description: msg, step: stepCount, url: currentUrl });
      steps.push(`ERROR: ${msg}`);
      break;
    }
  }

  if (stepCount >= MAX_STEPS) {
    bugs.push({ severity: 'medium', description: `Hit ${MAX_STEPS}-step limit — not all goals may have been completed.` });
  }

  await page.close();

  return {
    journey: 'App Exploration',
    status: bugs.some((b) => b.severity === 'critical') ? 'critical' : bugs.length > 0 ? 'bugs-found' : 'pass',
    steps,
    bugs,
    screenshotDir: SCREENSHOT_DIR,
  };
}
