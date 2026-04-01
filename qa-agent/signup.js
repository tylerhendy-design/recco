/**
 * Signup Journey
 * Walks through the full new-user signup flow using Claude as the decision-making brain.
 * Claude sees screenshots and decides what to do next — just like a real consumer.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const client = new Anthropic();
const MAX_STEPS = 25;

// Absolute path relative to this file — safe regardless of where you invoke node from
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

/**
 * Ask Claude what to do next given a screenshot of the current page.
 * Returns a structured action or a terminal state.
 */
async function askClaude(screenshotBase64, pageUrl, stepHistory, userCredentials) {
  const historyText =
    stepHistory.length > 0
      ? `Steps taken so far:\n${stepHistory.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : 'No steps taken yet — this is the starting state.';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are a QA agent testing the Recco app — a recommendation-sharing app. You are already logged in. You will land directly inside the app, past the login screen.

Your goal is to explore the post-login experience as a new user would: complete any onboarding steps, explore the home screen, check notifications, view recommendations, and flag anything broken, confusing, or missing.

You will be shown a screenshot of the current page. Decide what to do next.

Respond ONLY with a valid JSON object (no markdown, no explanation) in one of these formats:

{ "action": "navigate", "url": "<full url>" }
{ "action": "click", "selector": "<css selector>", "description": "<what you're clicking and why>" }
{ "action": "type", "selector": "<css selector>", "text": "<text to type>", "description": "<what you're filling in>" }
{ "action": "wait", "ms": 1500, "description": "<what you're waiting for>" }
{ "action": "done", "description": "<summary of the journey>" }
{ "action": "bug", "severity": "low|medium|high|critical", "description": "<bug description>", "then": { ...next action } }

Rules:
- You are ALREADY LOGGED IN — never navigate to /login or attempt any sign-in flow
- If you see a login screen, that itself is a critical bug — report it, then stop
- Use "${name}" and "${email}" if asked to fill in profile details
- Explore at least: home screen, notifications, any onboarding prompts
- Flag anything broken, confusing, or that a real user would find frustrating
- Never loop — if something fails twice, emit a bug and stop`,

    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBase64,
            },
          },
          {
            type: 'text',
            text: `Current URL: ${pageUrl}\n\n${historyText}\n\nWhat should I do next?`,
          },
        ],
      },
    ],
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return {
      action: 'bug',
      severity: 'high',
      description: `Claude returned unparseable response: ${raw.slice(0, 200)}`,
      then: { action: 'done', description: 'Agent aborted due to internal error' },
    };
  }
}

/**
 * Execute a Playwright action based on Claude's decision.
 */
async function executeAction(page, action) {
  switch (action.action) {
    case 'navigate':
      await page.goto(action.url, { waitUntil: 'networkidle', timeout: 15000 });
      break;

    case 'click':
      try {
        // If selector looks like a CSS selector, use locator directly.
        // Otherwise treat it as an accessible name and try getByRole + getByText.
        const looksLikeCss = /^[.#\[a-z]/i.test(action.selector.trim());

        if (looksLikeCss) {
          await page.locator(action.selector).first().click({ timeout: 5000 });
        } else {
          // Try button by name, then any role, then plain text match
          const byButton = page.getByRole('button', { name: action.selector, exact: false });
          const byText = page.getByText(action.selector, { exact: false });
          const target = (await byButton.count()) > 0 ? byButton.first() : byText.first();
          await target.click({ timeout: 5000 });
        }
      } catch {
        throw new Error(`Could not click "${action.selector}"`);
      }
      await page.waitForTimeout(800);
      break;

    case 'type':
      await page.fill(action.selector, action.text, { timeout: 5000 });
      await page.waitForTimeout(400);
      break;

    case 'wait':
      await page.waitForTimeout(action.ms || 1500);
      break;

    case 'done':
    case 'bug':
      break; // handled by the loop

    default:
      throw new Error(`Unknown action: ${action.action}`);
  }
}

export async function signupJourney(context, { baseUrl, startUrl, email, password, name, session }) {
  const page = await context.newPage();
  const bugs = [];
  const steps = [];
  let stepCount = 0;

  console.log('🧪 Journey: Post-Login Onboarding & Core Flow');

  if (session) {
    const projectRef = process.env.SUPABASE_URL.replace('https://', '').split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const sessionValue = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: 'bearer',
      user: session.user,
    });

    // Must be added to the PAGE (not context) before goto, so it runs before app scripts
    await page.addInitScript(({ key, value }) => {
      localStorage.setItem(key, value);
    }, { key: storageKey, value: sessionValue });

    console.log('  🔑 Session will be injected on page load');
  }

  // Go directly to /home — skip the login page entirely
  await page.goto(`${baseUrl}/home`, { waitUntil: 'networkidle', timeout: 20000 });
  console.log(`  📍 Landed at: ${page.url()}`);

  while (stepCount < MAX_STEPS) {
    stepCount++;

    // Capture screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `step-${stepCount}.png`);
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    await fs.writeFile(screenshotPath, screenshotBuffer);
    const screenshotBase64 = screenshotBuffer.toString('base64');

    const currentUrl = page.url();
    console.log(`  Step ${stepCount}: ${currentUrl}`);

    // Ask Claude what to do
    let decision;
    try {
      decision = await askClaude(screenshotBase64, currentUrl, steps, { email, password, name });
    } catch (err) {
      bugs.push({ severity: 'critical', description: `Claude API error at step ${stepCount}: ${err.message}` });
      break;
    }

    // Handle bug reports embedded in the decision
    if (decision.action === 'bug') {
      console.log(`  🐛 Bug found [${decision.severity}]: ${decision.description}`);
      bugs.push({ severity: decision.severity, description: decision.description, step: stepCount, url: currentUrl });
      steps.push(`BUG [${decision.severity}]: ${decision.description}`);

      if (!decision.then) break;
      decision = decision.then;
    }

    if (decision.action === 'done') {
      steps.push(`✓ Done: ${decision.description}`);
      console.log(`  ✓ Journey complete`);
      break;
    }

    // Execute the action
    try {
      steps.push(`${decision.action}: ${decision.description || decision.selector || decision.url || ''}`);
      await executeAction(page, decision);
    } catch (err) {
      const msg = `Failed to execute "${decision.action}" — ${err.message}`;
      console.log(`  ⚠️  ${msg}`);
      bugs.push({ severity: 'high', description: msg, step: stepCount, url: currentUrl });
      steps.push(`ERROR: ${msg}`);
      break;
    }
  }

  if (stepCount >= MAX_STEPS) {
    bugs.push({
      severity: 'medium',
      description: `Journey hit the ${MAX_STEPS}-step limit without completing — may be stuck in a loop.`,
    });
  }

  await page.close();

  return {
    journey: 'Post-Login Exploration',
    status: bugs.some((b) => b.severity === 'critical') ? 'critical' : bugs.length > 0 ? 'bugs-found' : 'pass',
    steps,
    bugs,
    screenshotDir: SCREENSHOT_DIR,
  };
}
