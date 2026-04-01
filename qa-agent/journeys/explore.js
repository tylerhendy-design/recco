/**
 * Recco QA Agent — Comprehensive Journey Runner
 *
 * Journeys:
 *   J11          Notifications — all types, filter tabs, badge colours
 *   J_NOTIF_CROSS  After J6 review: verify sender got feedback_received notification
 *   J14          Expanded card — every element checked
 *   J6           Review a reco — slider, text, submit, success state
 *   J_SIN_BIN_TRIGGER  Submit low score (≤3) — verify sin bin warning appears
 *   J7           Mark as No Go — three-dot menu, reason, submit
 *   J8           Mark as Been There
 *   J_HOME_TABS  Verify To Do / Done / No Gos tabs all show correct cards
 *   J_MESSAGES   View message thread on a reco, type and send a reply
 *   J1           Give a restaurant reco — autocomplete, images, send
 *   J_AUTOFILL   TV show autocomplete — verify images in suggestions AND after selection
 *   J2           Give a podcast reco — Spotify/iTunes results
 *   J3           Give a custom category reco
 *   J4           Quick add (manual sender name)
 *   J5           Request a reco — share link, QR code
 *   J_MULTI_SEND Send one reco to multiple friends simultaneously
 *   J_FRIEND_SEND  Search for a user and send them a friend request
 *   J_FRIEND_ACCEPT Accept pending friend request → cross-account check requester notified
 *   J12          Friends page — profile, Give reco / Get reco buttons
 *   J9           Places page — city groups, filters, search
 *   J10          Profile — stats, TOP 03, profile link
 *   J13          Sin Bin — both tabs
 *
 * Loop detection: fires when the last 3 actions were identical
 * (same action + same x/y) — NOT URL-based.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyCrossAccountNotification } from '../seed.js';

const client = new Anthropic();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };
const MAX_STEPS_PER_JOURNEY = 20;
const LOOP_WINDOW = 3;

// ── Journey definitions ──────────────────────────────────────────────────────

function buildJourneys({ baseUrl, requesterUsername, strangerUsername }) {
  return [

    // ── Notifications ──────────────────────────────────────────
    {
      id: 'J11',
      name: 'Notifications — All Types & Badge Colours',
      startUrl: `${baseUrl}/notifications`,
      goal: `You are on the notifications screen. Multiple unread notifications exist.
1. Scan the list — verify ALL of these notification types are visible and correctly labelled:
   - reco_received (from Alex Friend, multiple)
   - feedback_received (with a score — should show a coloured badge: green for score 7-10)
   - friend_request (from Sam Sender)
2. Verify: the feedback_received notification shows a GREEN score badge (score was 8)
3. Tap the feedback_received notification — verify it navigates to the reco detail
4. Go back to notifications
5. Tap a filter tab (Recos, Reviews, or Friends) — verify the list filters
6. Return to All tab`,
      successCriteria: 'You verified all notification types, badge colour, and filter tabs. Call done.',
      antiPatterns: [
        'If the feedback_received notification has no score badge, that is a HIGH bug',
        'If the score badge is the wrong colour (should be green for score 8), report it',
        'If friend_request notification has no Accept/Decline buttons, report as medium bug',
        'Do not accept the friend request here — that is Journey J_FRIEND_ACCEPT',
      ],
    },

    // ── Expanded Card ──────────────────────────────────────────
    {
      id: 'J14',
      name: 'Expanded Reco Card — Full Detail Check',
      startUrl: `${baseUrl}/home`,
      goal: `Tap a reco card on the home feed to expand it. URL stays on /home — this is correct.
Once expanded, verify ALL of these are present:
- Title (large text)
- Sender name (Alex Friend) and category label
- "Why?" section with text
- Location pill showing city name (for Padella: should say "Borough Market, London")
- Data pills (address, price level)
- "Done? Give them your review" CTA button (yellow)
- Three-dot menu icon (⋯)
If "Add links, notes, or images" button is visible: tap it, verify a form opens, tap Cancel.
Tap Back or outside the card to close it.
Check: does the location pill link to Google Maps when tapped?`,
      successCriteria: 'You checked all card elements and noted any missing ones. Call done.',
      antiPatterns: [
        'URL stays on /home — correct, not a loop',
        'Do NOT tap the "Done? Give them your review" CTA here — that is J6',
        'Tap the card ONCE — if it toggles open/closed on repeated taps, that is a HIGH bug',
        'If location pill is missing for the Padella (restaurant) card, report as HIGH bug',
      ],
    },

    // ── Review a Reco ──────────────────────────────────────────
    {
      id: 'J6',
      name: 'Review a Reco — Score, Text, Submit',
      startUrl: `${baseUrl}/home`,
      goal: `Find a reco card in the To Do tab. Tap it to expand.
Find the "Done? Give them your review" yellow button inside the expanded card — tap it.
A feedback sheet should slide up with:
- A score slider (1–10)
- A text field for the review
- A "Send feedback" button (disabled until text is entered)
1. Drag/tap the slider to a score of 8 (right side of the range)
2. Tap the text field and type: "Great recommendation, really enjoyed it!"
3. Verify the Send button becomes enabled
4. Tap "Send feedback"
5. Verify a SUCCESS overlay or state appears — note the emoji colour (should be green for score 8)
6. Verify the card is removed from the To Do tab`,
      successCriteria: 'Review submitted, success state seen, card moved out of To Do. Call done.',
      crossCheck: null, // set dynamically after run
      antiPatterns: [
        'Tap the card ONCE to expand — do not tap again or it collapses',
        'The CTA button is INSIDE the expanded card — scroll down inside the card if not visible',
        'If the card collapses when tapping the CTA area, report as HIGH bug',
        'Do NOT tap Send before typing review text — it should be disabled',
        'Score 8 should produce a GREEN success emoji — if red/amber, report as bug',
      ],
    },

    // ── Sin Bin Trigger ─────────────────────────────────────────
    {
      id: 'J_SIN_BIN_TRIGGER',
      name: 'Low Score → Sin Bin Warning',
      startUrl: `${baseUrl}/home`,
      goal: `Test that a low score triggers a sin bin warning.
Find a reco card in To Do. Expand it. Tap "Done? Give them your review".
1. Set the score slider to a LOW value — 2 or 3 (far left of the range)
2. Type a review: "Not really for me"
3. Tap "Send feedback"
4. VERIFY: a sin bin warning appears before or after submission
   (something like "This sender is in your sin bin" or "Low scores affect sin bin")
5. Note exactly what text/UI appears`,
      successCriteria: 'You submitted a low score and noted whether a sin bin warning appeared. Call done.',
      antiPatterns: [
        'If no sin bin warning appears for a score of 2 or 3, that is a HIGH bug — report it',
        'The warning might appear as an overlay, a toast, or inline text — look carefully',
      ],
    },

    // ── No Go ──────────────────────────────────────────────────
    {
      id: 'J7',
      name: 'Mark a Reco as No Go',
      startUrl: `${baseUrl}/home`,
      goal: `Find a reco card in the To Do tab (collapsed state).
Look for a three-dot menu icon (⋯) on the COLLAPSED card (not inside the expanded card).
1. Tap the three-dot menu on a collapsed card
2. Verify a dropdown appears with options including "No go"
3. Tap "No go"
4. A reason/text field should appear — type: "Not really my thing"
5. Tap submit/confirm
6. Verify the card disappears from To Do`,
      successCriteria: 'Card was marked No Go and removed from To Do. Call done.',
      antiPatterns: [
        'The three-dot menu is on the COLLAPSED card — do not expand the card first',
        'If the three-dot is not visible on collapsed cards, that is a HIGH bug',
        'Do not submit without typing a reason — verify error shown if empty',
      ],
    },

    // ── Been There ─────────────────────────────────────────────
    {
      id: 'J8',
      name: 'Mark as Been There',
      startUrl: `${baseUrl}/home`,
      goal: `Find a reco card in the To Do tab (collapsed).
1. Tap the three-dot menu on the card
2. Look for a "Been there, done that" option in the dropdown
3. Tap it
4. Two sub-options should appear — either rate the experience or request a new reco
5. Note which sub-options appear and whether they are functional`,
      successCriteria: 'You tapped Been There and noted the sub-options. Call done.',
      antiPatterns: [
        'If "Been there, done that" is not in the three-dot menu, report as medium bug',
        'If no sub-options appear after tapping, report as high bug',
      ],
    },

    // ── Home Feed Tabs ─────────────────────────────────────────
    {
      id: 'J_HOME_TABS',
      name: 'Home Feed — All Tabs Verified',
      startUrl: `${baseUrl}/home`,
      goal: `Verify all home feed tabs work correctly.
1. Check the "To Do" tab (default) — verify at least 1 card is shown
2. Tap the "Done" tab — verify it shows the Tate Modern / culture reco (already reviewed)
3. Verify the Done card shows a score badge with the correct colour
4. Tap the "No Gos" tab — may be empty, but verify it renders without error
5. Return to To Do tab
6. Verify card states look correct (unseen cards vs seen cards have different visual treatment)`,
      successCriteria: 'All three tabs rendered correctly with expected content. Call done.',
      antiPatterns: [
        'If the Done tab is empty when it should have a card, that is a HIGH bug',
        'If any tab crashes or shows an error, that is critical',
        'If To Do cards have no visual difference between unseen and seen, report as medium',
      ],
    },

    // ── Messages ───────────────────────────────────────────────
    {
      id: 'J_MESSAGES',
      name: 'Message Thread — View and Reply',
      startUrl: `${baseUrl}/home`,
      goal: `Find the Padella reco card and open it. There is a message thread on this reco.
1. Look for a messages/chat icon or "View messages" button inside the expanded card
2. Tap it to open the message thread
3. Verify: Alex Friend's message "Let me know what you think of the pici!" is shown
4. Find the reply input field
5. Type: "Just tried it — absolutely incredible!"
6. Send the message
7. Verify your reply appears in the thread`,
      successCriteria: 'You viewed the thread, saw the existing message, sent a reply, and confirmed it appeared. Call done.',
      antiPatterns: [
        'If there is no messages button on the reco card, that is a HIGH bug',
        'If the thread is empty (Alex\'s message is missing), report as HIGH bug',
        'If the reply field is missing, report as HIGH bug',
      ],
    },

    // ── Give Restaurant Reco ───────────────────────────────────
    {
      id: 'J1',
      name: 'Give a Restaurant Reco',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Send a restaurant recommendation. URL stays on /reco?mode=give throughout.
1. Tap the "Restaurant" category chip
2. Tap the name/title input field
3. Type "Pade" — wait 2 seconds for autocomplete dropdown
4. Verify: suggestions appear AND each has a thumbnail image
5. Tap "Padella" from the dropdown
6. Verify after selection: image preview appears, location pill shows, address fills in
7. Tap Why field, type: "Best pasta in London, the pici is incredible"
8. Scroll down to friend picker — select Alex Friend
9. Tap Send
10. Verify success screen appears`,
      successCriteria: 'Success screen appeared. Call done.',
      antiPatterns: [
        'URL stays on /reco?mode=give — correct, not a loop',
        'You MUST type and wait before tapping — autocomplete is async',
        'If suggestions appear WITHOUT images, report as HIGH bug',
        'If selection does NOT fill in image/location/address, report as HIGH bug',
        'Send is disabled until a friend is selected',
      ],
    },

    // ── Autocomplete & Image Consistency ───────────────────────
    {
      id: 'J_AUTOFILL',
      name: 'Autocomplete Image Test — TV Show',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Specifically test that TV show autocomplete loads images correctly.
1. Tap "TV" category chip
2. Type "The Bear" — wait 2 seconds for TMDB results
3. VERIFY: autocomplete suggestions appear
4. VERIFY: each suggestion has a poster/artwork image (not a broken image or placeholder)
5. Tap "The Bear" from suggestions
6. VERIFY after selection:
   - A poster image preview appears on the form
   - Genre/platform detail pill appears
   - Title field shows "The Bear"
7. Scroll down and verify any image preview looks correct (not broken)
8. DO NOT send — just verify autofill quality, then call done`,
      successCriteria: 'Autocomplete appeared with images, selection filled details. Note anything missing. Call done.',
      antiPatterns: [
        'Do NOT send this reco — just verify the autofill state',
        'If images are broken/missing in suggestions, HIGH bug',
        'If poster does not appear after selection, HIGH bug',
        'URL stays on /reco?mode=give — correct',
      ],
    },

    // ── Give Podcast Reco ──────────────────────────────────────
    {
      id: 'J2',
      name: 'Give a Podcast Reco',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Send a podcast recommendation.
1. Tap "Podcast" chip
2. Type "Serial" — wait 2 seconds for Spotify/iTunes results
3. Verify suggestions appear with artwork
4. Tap a result — verify artwork and platform fill in
5. Type: "Essential listening, start from episode 1"
6. Select Alex Friend
7. Tap Send — verify success screen`,
      successCriteria: 'Success screen appeared. Call done.',
      antiPatterns: [
        'If no Spotify/iTunes results appear, report HIGH bug and try "Conan O\'Brien"',
        'URL stays on /reco?mode=give — correct',
      ],
    },

    // ── Custom Category Reco ───────────────────────────────────
    {
      id: 'J3',
      name: 'Give a Custom Category Reco',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Send a reco with a custom category.
1. Find a "Custom" or "+" chip (may have dashed border)
2. Tap it — a custom category input should appear
3. Type "Coffee" as the category name
4. Tap the title field and type "Monmouth" — wait for Google Places results
5. Tap a result
6. Select Alex Friend
7. Tap Send
8. Verify success screen shows custom category name "Coffee" (not "Custom")`,
      successCriteria: 'Success screen showed custom category name. Call done.',
      antiPatterns: [
        'If custom chip is not visible, scroll the chips row horizontally',
        'If success screen shows "Custom" instead of "Coffee", report as HIGH bug',
      ],
    },

    // ── Quick Add ──────────────────────────────────────────────
    {
      id: 'J4',
      name: 'Quick Add — Manual Sender Name',
      startUrl: `${baseUrl}/reco?mode=quick`,
      goal: `Add a reco from someone not on the app.
1. A sender name field should appear first — type "Jamie"
2. Select a category chip (restaurant)
3. Type a name in the title field — wait for autocomplete
4. Tap a result
5. Tap Send
6. Verify success screen shows "Jamie" as the sender`,
      successCriteria: 'Success screen appeared with "Jamie" as sender. Call done.',
      antiPatterns: [
        'If sender name field is not the first field shown, report as medium bug',
        'If sender name is missing from success screen, report as HIGH bug',
      ],
    },

    // ── Request a Reco ─────────────────────────────────────────
    {
      id: 'J5',
      name: 'Request a Reco',
      startUrl: `${baseUrl}/reco?mode=get`,
      goal: `Request a recommendation from a friend.
1. Select "Restaurant" category
2. Fill in location if shown: "Shoreditch"
3. Select Alex Friend from friend picker
4. Tap "Request reco" or equivalent
5. Verify success screen with a share link
6. Tap the share link area — verify it is copyable or share sheet opens
7. Look for QR code option — tap it and verify a QR generates`,
      successCriteria: 'Success screen with share link appeared. Call done.',
      antiPatterns: [
        'If share link field is empty or broken, report as HIGH bug',
        'If QR code does not generate, report as medium bug',
      ],
    },

    // ── Multi-Recipient Send ────────────────────────────────────
    {
      id: 'J_MULTI_SEND',
      name: 'Send a Reco to Multiple Friends',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Verify that a reco can be sent to more than one friend at the same time.
Note: this requires at least 2 friends. Currently only Alex Friend is available — if friend picker only shows one, note it.
1. Tap "Restaurant" chip
2. Type "Pade" — select Padella from autocomplete
3. In the friend picker, attempt to select MORE than one friend
4. If multiple selection is possible: select both available friends
5. Tap Send
6. Verify success screen mentions multiple recipients OR shows both names`,
      successCriteria: 'You attempted multi-select and noted the result. Call done.',
      antiPatterns: [
        'If the friend picker only allows selecting one friend at a time, report as medium bug',
        'If success screen only names one recipient when two were selected, report as HIGH bug',
      ],
    },

    // ── Send a Friend Request ──────────────────────────────────
    {
      id: 'J_FRIEND_SEND',
      name: 'Send a Friend Request',
      startUrl: `${baseUrl}/friends`,
      goal: `Find and send a friend request to a new user.
1. Look for a search or "Add friends" button on the friends page
2. Search for username: "${strangerUsername}" (Dana Discover)
3. Tap their profile
4. Tap "Add friend" or "Send request"
5. Verify the button state changes to "Pending" or "Request sent"
6. Note whether any confirmation UI appears`,
      successCriteria: 'Friend request was sent and button changed to pending state. Call done.',
      antiPatterns: [
        'If search does not find the user by username, report as HIGH bug',
        'If there is no Add Friend button on their profile, report as HIGH bug',
        'If tapping Add Friend does nothing, report as critical',
      ],
    },

    // ── Accept Friend Request + Cross-Account Check ────────────
    {
      id: 'J_FRIEND_ACCEPT',
      name: 'Accept Friend Request → Verify Requester Notified',
      startUrl: `${baseUrl}/notifications`,
      goal: `Accept the pending friend request from Sam Sender.
1. Find the friend_request notification from Sam Sender (username: ${requesterUsername})
2. Tap "Accept" on the notification
3. Verify the notification changes state — Accept/Decline buttons should disappear
4. Navigate to /friends — verify Sam Sender now appears in your friends list
5. IMPORTANT: After accepting, the app SHOULD send Sam a friend_accepted notification.
   Note whether any UI confirms this (e.g. "Sam will be notified").
   The cross-account check will verify Sam's notification was created in the database.`,
      successCriteria: 'Friend request accepted, Sam appears in friends list. Call done.',
      crossAccountCheck: true, // runner will query Supabase after this journey
      antiPatterns: [
        'If Accept/Decline buttons are missing on the friend_request notification, report as HIGH bug',
        'If tapping Accept does not change the notification state, report as HIGH bug',
        'If the friend does not appear in /friends after accepting, report as critical',
      ],
    },

    // ── Friends Page & Profile ─────────────────────────────────
    {
      id: 'J12',
      name: 'Friends Page — Profile & Give/Get Reco',
      startUrl: `${baseUrl}/friends`,
      goal: `View the friends list and interact with a friend's profile.
1. Verify friends list is shown with at least Alex Friend
2. Tap Alex Friend to open their profile
3. Verify: display name, username, and any picks shown
4. Look for "Give reco" AND "Get reco" buttons
5. Tap "Give reco" — verify it navigates to /reco?mode=give with Alex pre-selected
   (URL should include ?to= or header should say "Giving a reco to Alex")
6. Go back
7. Tap "Get reco" on Alex's profile — verify it navigates to /reco?mode=get with Alex pre-filled`,
      successCriteria: 'Viewed profile, both Give/Get reco buttons worked correctly. Call done.',
      antiPatterns: [
        'If friends list is empty, that is a critical bug — seed created an accepted friendship',
        'If Get reco button is missing, report as HIGH bug',
        'If Give reco does NOT pre-select Alex, report as HIGH bug',
      ],
    },

    // ── Places Page ────────────────────────────────────────────
    {
      id: 'J9',
      name: 'Browse Places Page',
      startUrl: `${baseUrl}/lists`,
      goal: `Browse the Places tab.
1. Verify city groups are shown with reco counts (e.g. "London" with at least 2 recos)
2. Tap a city — verify a slide animation shows recos for that city
3. Verify reco cards display correctly inside the city view
4. Tap a category filter chip — verify the list updates
5. Try the search field — type "London" and verify filtering
6. Tap Back to return to city list`,
      successCriteria: 'Browsed cities, opened one, tested filter and search. Call done.',
      antiPatterns: [
        'If no cities appear, report as HIGH bug — seed includes London recos',
        'If reco count is wrong, report as medium bug',
        'If category filter does nothing, report as medium bug',
      ],
    },

    // ── Profile Page ───────────────────────────────────────────
    {
      id: 'J10',
      name: 'Profile — Stats, TOP 03, Profile Link',
      startUrl: `${baseUrl}/profile`,
      goal: `Check the profile page thoroughly.
1. Verify: display name "QA Agent" and username are shown
2. Verify stats are visible (recos sent, completed etc.) — check they are non-zero where expected
3. Find the profile link — verify it is shown and looks like a valid URL
4. Tap the profile link to copy it — verify a "Copied" toast or confirmation appears
5. Look for "Your requests" — tap it and verify it navigates to past requests
6. Find the TOP 03 picks section
7. Navigate to /profile/top3 to add a pick:
   - Select a category
   - Type a title in the search field, wait for autocomplete
   - Select a result
   - Tap send — verify success`,
      successCriteria: 'Checked stats, profile link, and attempted TOP 03 pick. Call done.',
      antiPatterns: [
        'If stats all show 0 when they should have values, report as HIGH bug',
        'If profile link is missing, report as HIGH bug',
        'If copying the link shows no confirmation, report as medium bug',
        'If TOP 03 section is missing entirely, report as medium bug',
      ],
    },

    // ── Sin Bin ────────────────────────────────────────────────
    {
      id: 'J13',
      name: 'Sin Bin — Both Tabs',
      startUrl: `${baseUrl}/sinbin`,
      goal: `Check the Sin Bin page.
1. Verify two tabs exist: "Your sin bin" and "Bins you\'re in"
2. Tap "Your sin bin" tab — verify it renders (may be empty)
3. Tap "Bins you\'re in" tab — verify it renders (may be empty)
4. If any entries exist: verify offences list, release button, plead button
5. Verify empty state text is sensible if no entries`,
      successCriteria: 'Both tabs rendered. You noted their state. Call done.',
      antiPatterns: [
        'If the page fails to load, that is critical',
        'If only one tab exists, report as medium bug',
        'If tabs exist but content area crashes, report as critical',
      ],
    },

  ]; // end journeys array
}

// ── Claude API call ──────────────────────────────────────────────────────────

async function askClaude(screenshotBase64, pageUrl, stepHistory, journey, { name, email }) {
  const historyText = stepHistory.length > 0
    ? stepHistory.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : 'No steps taken yet.';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are a QA agent testing the Recco app. You are logged in. Viewport: ${VIEWPORT.width}x${VIEWPORT.height}px.
Interact ONLY by pixel coordinates — never CSS selectors.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JOURNEY: ${journey.id} — ${journey.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOAL:
${journey.goal}

SUCCESS CRITERIA:
${journey.successCriteria}

DO NOT DO THESE:
${journey.antiPatterns.map(p => `• ${p}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use "${name}" / "${email}" for any profile fields.
If login screen appears, that is critical — report and stop.

ONE JSON object only — no preamble, no explanation:

{ "action": "click",    "x": 195, "y": 420, "description": "what/why" }
{ "action": "type",     "x": 195, "y": 300, "text": "...", "description": "what field" }
{ "action": "scroll",   "direction": "down", "amount": 300, "description": "why" }
{ "action": "wait",     "ms": 1500, "description": "what you await" }
{ "action": "navigate", "url": "https://givemeareco.com/...", "description": "why" }
{ "action": "done",     "description": "full summary: goals completed, elements verified, bugs noted" }
{ "action": "bug",      "severity": "low|medium|high|critical", "description": "specific description", "then": {...} }`,

    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } },
        { type: 'text', text: `URL: ${pageUrl}\n\nSteps:\n${historyText}\n\nNext action (JSON only):` },
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
      action: 'bug', severity: 'high',
      description: `Unparseable response: ${raw.slice(0, 200)}`,
      then: { action: 'done', description: 'Aborted — parse error' },
    };
  }
}

// ── Execute action ───────────────────────────────────────────────────────────

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

// ── Run one journey ──────────────────────────────────────────────────────────

async function runJourney(page, journey, credentials, screenshotOffset, seedData) {
  const bugs = [];
  const steps = [];
  let stepCount = 0;
  const recentActions = [];

  console.log(`\n  📋 ${journey.id}: ${journey.name}`);
  await page.goto(journey.startUrl, { waitUntil: 'networkidle', timeout: 15000 });

  while (stepCount < MAX_STEPS_PER_JOURNEY) {
    stepCount++;
    const globalStep = screenshotOffset + stepCount;

    const screenshotPath = path.join(SCREENSHOT_DIR, `step-${String(globalStep).padStart(3, '0')}.png`);
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    await fs.writeFile(screenshotPath, screenshotBuffer);
    const screenshotBase64 = screenshotBuffer.toString('base64');
    const currentUrl = page.url();
    console.log(`    Step ${stepCount}: ${currentUrl}`);

    // ── Loop detection: identical action + coords ────────────
    if (recentActions.length >= LOOP_WINDOW) {
      const last = recentActions.slice(-LOOP_WINDOW);
      const allSame = last.every(a =>
        a.action === last[0].action &&
        a.x === last[0].x &&
        a.y === last[0].y
      );
      if (allSame) {
        const msg = `Identical action "${last[0].action}" at (${last[0].x},${last[0].y}) repeated ${LOOP_WINDOW}x — UI not responding`;
        console.log(`    ⚠️  Loop: ${msg}`);
        bugs.push({ severity: 'medium', description: msg, step: stepCount, url: currentUrl });
        break;
      }
    }

    let decision;
    try {
      decision = await askClaude(screenshotBase64, currentUrl, steps, journey, credentials);
    } catch (err) {
      bugs.push({ severity: 'critical', description: `Claude API error: ${err.message}` });
      break;
    }

    if (decision.action === 'bug') {
      console.log(`    🐛 [${decision.severity}]: ${decision.description}`);
      bugs.push({ severity: decision.severity, description: decision.description, step: stepCount, url: currentUrl });
      steps.push(`BUG [${decision.severity}]: ${decision.description}`);
      if (!decision.then) break;
      decision = decision.then;
    }

    if (decision.action === 'done') {
      steps.push(`✓ ${decision.description}`);
      console.log(`    ✓ Complete`);
      break;
    }

    recentActions.push({ action: decision.action, x: decision.x, y: decision.y });

    try {
      const label = decision.description || `${decision.action} (${decision.x ?? ''},${decision.y ?? ''})`;
      steps.push(`${decision.action}: ${label}`);
      await executeAction(page, decision);
    } catch (err) {
      const msg = `Failed "${decision.action}": ${err.message}`;
      console.log(`    ⚠️  ${msg}`);
      bugs.push({ severity: 'high', description: msg, step: stepCount, url: currentUrl });
      steps.push(`ERROR: ${msg}`);
      break;
    }
  }

  if (stepCount >= MAX_STEPS_PER_JOURNEY) {
    bugs.push({ severity: 'medium', description: `Hit ${MAX_STEPS_PER_JOURNEY}-step limit` });
  }

  // ── Cross-account check for J_FRIEND_ACCEPT ──────────────────
  if (journey.crossAccountCheck && seedData) {
    console.log(`    🔍 Cross-account check: did Sam Sender receive friend_accepted notification?`);
    const notified = await verifyCrossAccountNotification(
      seedData.userCId, 'friend_accepted', 'Sam Sender notified after A accepted request'
    );
    if (!notified) {
      bugs.push({
        severity: 'high',
        description: 'Sam Sender did NOT receive a friend_accepted notification after User A accepted their request — bidirectional notification is broken',
      });
    }
  }

  return {
    journey: `${journey.id} — ${journey.name}`,
    status: bugs.some(b => b.severity === 'critical') ? 'critical'
          : bugs.length > 0 ? 'bugs-found' : 'pass',
    steps,
    bugs,
    screenshotDir: SCREENSHOT_DIR,
  };
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function exploreJourney(context, { baseUrl, email, password, name, seedData }) {
  const page = await context.newPage();
  const allResults = [];

  console.log('🧪 Starting QA journeys...\n');

  // Deterministic login
  try {
    console.log('  🔐 Logging in...');
    await page.goto(`${baseUrl}/login?method=email`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="email-submit"]');
    await page.waitForURL('**/home**', { timeout: 15000 });
    console.log('  ✓ Logged in\n');
  } catch (err) {
    await page.close();
    return [{ journey: 'Login', status: 'critical', steps: [],
      bugs: [{ severity: 'critical', description: `Login failed: ${err.message}` }] }];
  }

  const journeys = buildJourneys({
    baseUrl,
    requesterUsername: seedData.requesterUsername,
    strangerUsername: seedData.strangerUsername,
  });

  let screenshotOffset = 0;
  for (const journey of journeys) {
    const result = await runJourney(page, journey, { name, email }, screenshotOffset, seedData);
    allResults.push(result);
    screenshotOffset += MAX_STEPS_PER_JOURNEY;

    const icon = result.status === 'pass' ? '✅' : result.status === 'critical' ? '🔴' : '⚠️';
    console.log(`  ${icon} ${result.journey}: ${result.status} (${result.bugs.length} bug(s))`);
  }

  await page.close();
  return allResults;
}
