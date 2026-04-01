#!/usr/bin/env node

/**
 * Recco QA Agent
 * Seeds a test user, logs in, and explores the app as a real consumer.
 * Usage: node index.js --url https://givemeareco.com
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import { exploreJourney } from './journeys/explore.js';
import { generateReport } from './report.js';
import { seedTestAccounts, cleanupSeedAccounts } from './seed.js';

// Fail fast with a clear message if required env vars are missing
const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n❌ Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join('\n')}`);
  console.error('\nCreate a .env file in qa-agent/ — see README for details.\n');
  process.exit(1);
}

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');

if (urlFlag === -1 || !args[urlFlag + 1]) {
  console.error('Usage: node index.js --url <vercel-preview-url>');
  process.exit(1);
}

const BASE_URL = args[urlFlag + 1].replace(/\/$/, '');

// Seed fully set-up test accounts before running any journeys
const seed = await seedTestAccounts();

const TEST_EMAIL = seed.email;
const TEST_PASSWORD = seed.password;
const TEST_NAME = 'QA Agent';

console.log(`🤖 Recco QA Agent starting...`);
console.log(`📍 Target: ${BASE_URL}`);
console.log(`👤 Test user: ${TEST_EMAIL}\n`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14 — mobile-first
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

// Append bypass token to the start URL if set — Vercel sets the cookie on first load
const bypassToken = process.env.VERCEL_BYPASS_TOKEN;
const START_URL = bypassToken
  ? `${BASE_URL}/?x-vercel-protection-bypass=${bypassToken}`
  : BASE_URL;

if (bypassToken) console.log('🔓 Vercel bypass token will be applied on first load.\n');

const results = [];

try {
  const journeyResults = await exploreJourney(context, {
    baseUrl: BASE_URL,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: TEST_NAME,
    friendId: seed.friendId,
  });
  results.push(...journeyResults);
} catch (err) {
  results.push({
    journey: 'Post-Login Exploration',
    status: 'error',
    steps: [],
    bugs: [{ severity: 'critical', description: `Agent crashed: ${err.message}` }],
  });
} finally {
  await browser.close();
  await cleanupSeedAccounts(seed.userAId, seed.userBId);
}

const reportPath = await generateReport(BASE_URL, results);
console.log(`\n✅ Done. Report saved to: ${reportPath}\n`);
