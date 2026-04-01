/**
 * Recco QA Agent — Structured Journey Runner
 *
 * Runs independent journeys from QA_JOURNEYS.md in sequence.
 * Each journey has a clear goal, success criteria, and a step limit.
 * Loop detection prevents the agent getting stuck on one screen.
 *
 * Journeys run:
 *   J6  — Review a reco (mark done + write review)
 *   J11 — Notifications (view, filter, interact)
 *   J12 — Friends page (view friend profile, give reco)
 *   J1  — Give a restaurant reco
 *   J2  — Give a podcast reco
 *   J14 — Expanded reco card (full detail check)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const client = new Anthropic();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };
const MAX_STEPS_PER_JOURNEY = 15;
const MAX_SAME_URL_STEPS = 3; // loop detection threshold

// ── Journey definitions ─────────────────────────────────────────────────────

function buildJourneys({ baseUrl, friendId }) {
  return [
    {
      id: 'J11',
      name: 'Notifications',
      startUrl: `${baseUrl}/notifications`,
      goal: `Open the notifications screen. You should see several unread notifications (reco received, feedback received).
Verify notifications render with correct text and icons.
Tap one notification to confirm it navigates or expands correctly.
Try at least one filter tab if visible.`,
      successCriteria: 'You have viewed at least one notification and tapped it. Call done.',
      antiPatterns: [
        'Do not tap the same notification twice',
        'If a filter tab does not respond after one tap, move on',
      ],
    },
    {
      id: 'J14',
      name: 'Expanded Reco Card — Full Detail Check',
      startUrl: `${baseUrl}/home`,
      goal: `Tap any reco card on the home feed to expand it.
Once expanded, verify these are present: title, category, sender name, a Why section.
Check if a location pill, CTA button, or three-dot menu is visible.
Tap "Add links, notes, or images" if present — verify a form opens — then tap cancel.
Tap Back to close the card.`,
      successCriteria: 'You have opened a card, checked its elements, and closed it. Call done.',
      antiPatterns: [
        'Do not tap the CTA (Done? Give review) — that is Journey 6',
        'Do not tap the three-dot menu more than once',
        'If the card toggles open/closed on each tap, that is a bug — report it and stop',
      ],
    },
    {
      id: 'J6',
      name: 'Review a Reco',
      startUrl: `${baseUrl}/home`,
      goal: `Find a reco card in the To Do tab. Tap it to expand.
Tap the "Done? Give them your review" button (yellow, bottom of expanded card).
A feedback sheet should appear with a score slider and text field.
Drag the score slider to around 8.
Type a short review in the text field.
Tap "Send feedback".
Verify the card disappears from To Do or a success state appears.`,
      successCriteria: 'You have submitted a review and seen a success state or the card moved. Call done.',
      antiPatterns: [
        'Do not tap the card repeatedly — tap once to expand, then interact with the expanded content',
        'If the card collapses when you tap the CTA area, that is a bug — report it',
        'The score slider uses input[type="range"] — interact at its coordinates',
        'If the submit button appears disabled, type something in the review text field first',
      ],
    },
    {
      id: 'J1',
      name: 'Give a Restaurant Reco',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Send a restaurant recommendation to a friend.
1. Tap the "restaurant" category chip
2. Tap the title/name field and type "Pade" — wait 2 seconds for autocomplete dropdown
3. Tap "Padella" from the dropdown suggestions
4. Optionally type a short reason in the Why field
5. Tap at least one friend from the friend picker
6. Tap the Send button
7. Verify a success screen appears`,
      successCriteria: 'You see a success screen saying the reco was sent. Call done.',
      antiPatterns: [
        'The title field is a TYPEAHEAD — you must type letters and wait before tapping a result',
        'Do not tap Send before selecting a friend — it will be disabled',
        'If no autocomplete results appear after typing "Pade", try "Padella" in full',
      ],
    },
    {
      id: 'J2',
      name: 'Give a Podcast Reco',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Send a podcast recommendation to a friend.
1. Tap the "podcast" category chip
2. Type a podcast name — wait for autocomplete results (Spotify/iTunes)
3. Tap a result from the dropdown
4. Type a short reason in the Why field
5. Select a friend
6. Tap Send
7. Verify success screen`,
      successCriteria: 'You see a success screen. Call done.',
      antiPatterns: [
        'The name field is a TYPEAHEAD — type and wait before selecting',
        'If Spotify results do not appear, try typing a popular podcast name like "Serial"',
      ],
    },
    {
      id: 'J12',
      name: 'Friends Page',
      startUrl: `${baseUrl}/friends`,
      goal: `View the friends list. Tap a friend to open their profile.
On the friend profile: check their name and any picks are shown.
Look for "Give reco" and "Get reco" buttons.
Tap "Give reco" — verify it navigates to the reco flow with the friend pre-selected.
Go back.`,
      successCriteria: 'You have viewed a friend profile and tapped Give Reco. Call done.',
      antiPatterns: [
        'If the friends list is empty, that is a bug — report it',
        'Do not complete the full reco send flow here — just verify the navigation works',
      ],
    },
  ];
}

// ── Claude vision call ──────────────────────────────────────────────────────

async function askClaude(screenshotBase64, pageUrl, stepHistory, journey, { name, email }) {
  const historyText = stepHistory.length > 0
    ? stepHistory.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : 'No steps taken yet for this journey.';

  const antiPatternText = journey.antiPatterns
    .map(p => `- ${p}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are a QA agent testing the Recco app (a recommendation-sharing app). You are logged in.

The viewport is ${VIEWPORT.width}x${VIEWPORT.height}px. Interact ONLY by specifying pixel coordinates.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT JOURNEY: ${journey.id} — ${journey.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOAL:
${journey.goal}

SUCCESS CRITERIA:
${journey.successCriteria}

ANTI-PATTERNS (do not do these):
${antiPatternText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use "${name}" and "${email}" for any profile fields.
If you see a login screen, that is a critical bug — report it and stop.

Respond with ONE JSON object only — no explanation, no preamble:

{ "action": "click", "x": 195, "y": 420, "description": "what and why" }
{ "action": "type", "x": 195, "y": 300, "text": "text", "description": "what field" }
{ "action": "scroll", "direction": "down", "amount": 300, "description": "why" }
{ "action": "wait", "ms": 1500, "description": "what you are waiting for" }
{ "action": "navigate", "url": "https://...", "description": "why" }
{ "action": "done", "description": "summary of what was completed and any bugs noticed" }
{ "action": "bug", "severity": "low|medium|high|critical", "description": "clear bug description", "then": { ...next action } }`,

    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 },
        },
        {
          type: 'text',
          text: `Current URL: ${pageUrl}\n\nSteps so far:\n${historyText}\n\nWhat is the next action?`,
        },
      ],
    }],
  });

  const raw = response.content[0].text.trim();
  const jsonStart = raw.indexOf('{');
  const clean = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
  try {
    return JSON.parse(clean);
  } catch {
    return {
      action: 'bug',
      severity: 'high',
      description: `Unparseable Claude response: ${raw.slice(0, 200)}`,
      then: { action: 'done', description: 'Aborted due to parse error' },
    };
  }
}

// ── Execute a single action ─────────────────────────────────────────────────

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

// ── Run a single journey ────────────────────────────────────────────────────

async function runJourney(page, journey, credentials, screenshotOffset) {
  const bugs = [];
  const steps = [];
  let stepCount = 0;
  const urlHistory = [];

  console.log(`\n  📋 ${journey.id}: ${journey.name}`);
  await page.goto(journey.startUrl, { waitUntil: 'networkidle', timeout: 15000 });

  while (stepCount < MAX_STEPS_PER_JOURNEY) {
    stepCount++;
    const globalStep = screenshotOffset + stepCount;

    const screenshotPath = path.join(SCREENSHOT_DIR, `step-${globalStep}.png`);
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    await fs.writeFile(screenshotPath, screenshotBuffer);
    const screenshotBase64 = screenshotBuffer.toString('base64');

    const currentUrl = page.url();
    console.log(`    Step ${stepCount}: ${currentUrl}`);

    // ── Loop detection ───────────────────────────────────────
    urlHistory.push(currentUrl);
    const recentUrls = urlHistory.slice(-MAX_SAME_URL_STEPS);
    if (
      recentUrls.length === MAX_SAME_URL_STEPS &&
      recentUrls.every(u => u === currentUrl)
    ) {
      const msg = `Stuck on ${currentUrl} for ${MAX_SAME_URL_STEPS} consecutive steps — possible loop or unresponsive UI`;
      console.log(`    ⚠️  Loop detected: ${msg}`);
      bugs.push({ severity: 'medium', description: msg, step: stepCount, url: currentUrl });
      break;
    }

    let decision;
    try {
      decision = await askClaude(screenshotBase64, currentUrl, steps, journey, credentials);
    } catch (err) {
      bugs.push({ severity: 'critical', description: `Claude API error: ${err.message}` });
      break;
    }

    if (decision.action === 'bug') {
      console.log(`    🐛 Bug [${decision.severity}]: ${decision.description}`);
      bugs.push({ severity: decision.severity, description: decision.description, step: stepCount, url: currentUrl });
      steps.push(`BUG [${decision.severity}]: ${decision.description}`);
      if (!decision.then) break;
      decision = decision.then;
    }

    if (decision.action === 'done') {
      steps.push(`✓ ${decision.description}`);
      console.log(`    ✓ Journey complete`);
      break;
    }

    try {
      const label = decision.description || `${decision.action} (${decision.x ?? ''},${decision.y ?? ''})`;
      steps.push(`${decision.action}: ${label}`);
      await executeAction(page, decision);
    } catch (err) {
      const msg = `Failed "${decision.action}" — ${err.message}`;
      console.log(`    ⚠️  ${msg}`);
      bugs.push({ severity: 'high', description: msg, step: stepCount, url: currentUrl });
      steps.push(`ERROR: ${msg}`);
      break;
    }
  }

  if (stepCount >= MAX_STEPS_PER_JOURNEY) {
    bugs.push({ severity: 'medium', description: `Hit ${MAX_STEPS_PER_JOURNEY}-step limit for this journey` });
  }

  return {
    journey: `${journey.id} — ${journey.name}`,
    status: bugs.some(b => b.severity === 'critical') ? 'critical'
          : bugs.some(b => b.severity === 'high') ? 'bugs-found'
          : bugs.length > 0 ? 'bugs-found' : 'pass',
    steps,
    bugs,
  };
}

// ── Main export ─────────────────────────────────────────────────────────────

export async function exploreJourney(context, { baseUrl, email, password, name, friendId }) {
  const page = await context.newPage();
  const allResults = [];

  console.log('🧪 Starting QA journeys...');

  // ── Deterministic login ───────────────────────────────────────
  try {
    console.log('  🔐 Logging in...');
    await page.goto(`${baseUrl}/login?method=email`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="email-submit"]');
    await page.waitForURL('**/home**', { timeout: 15000 });
    console.log('  ✓ Logged in');
  } catch (err) {
    await page.close();
    return [{
      journey: 'Login',
      status: 'critical',
      steps: [],
      bugs: [{ severity: 'critical', description: `Login failed: ${err.message}` }],
    }];
  }

  // ── Run each journey in sequence ─────────────────────────────
  const journeys = buildJourneys({ baseUrl, friendId });
  let screenshotOffset = 0;

  for (const journey of journeys) {
    const result = await runJourney(page, journey, { name, email }, screenshotOffset);
    allResults.push(result);
    screenshotOffset += MAX_STEPS_PER_JOURNEY;

    const icon = result.status === 'pass' ? '✅' : result.status === 'critical' ? '🔴' : '⚠️';
    console.log(`  ${icon} ${result.journey}: ${result.status} (${result.bugs.length} bugs)`);
  }

  await page.close();
  return allResults;
}
