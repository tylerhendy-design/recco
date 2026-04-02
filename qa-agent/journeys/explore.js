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
 *   J_POPUP_OBSTRUCTION  Every modal/sheet checked for nav bar obstruction
 *   J_ICON_CONSISTENCY   Back arrows and chevrons checked for style consistency
 *   J_EMPTY_STATES       Every empty state checked for illustration, text, CTA
 *   J_LOADING_STATES     Skeletons and spinners checked for consistency
 *   J_PERFORMANCE        Page load speed rated on every main screen
 *   J_VISUAL_CONSISTENCY Typography and colour checked across all screens
 *   J_TOUCH_TARGETS      Touch target sizes and tap accuracy
 *   J_FORM_VALIDATION    Empty submission, long text, special characters
 *   J_OUTBOX             Sent recos and feedback received
 *   J_STRANGER_PROFILE   Non-friend profile — what is visible vs hidden
 *   J_DEEP_LINKS         Direct URL navigation and 404 handling
 *   J_STATE_PERSISTENCE  Tab state, scroll position, form state across nav
 *   J_REQUEST_RECEIVED   Fulfilling a received reco request
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

    // ── Popup Obstruction ──────────────────────────────────────
    {
      id: 'J_POPUP_OBSTRUCTION',
      name: 'Popup/Sheet Obstruction — Nav & Header Coverage',
      startUrl: `${baseUrl}/home`,
      goal: `Test every popup, sheet, and overlay in the app for obstruction by nav bars.
For each popup you trigger, take note of:
  A) Is the CLOSE BUTTON (X or Cancel) fully visible and tappable?
  B) Is the TOP EDGE of the sheet visible or hidden behind the header?
  C) Is the BOTTOM EDGE of the sheet visible or hidden behind the bottom nav bar?
  D) Can you actually close the sheet by tapping the close button?

Trigger these popups in order:
1. HOME: Expand a reco card → feedback sheet ("Done? Give them your review")
   - Check: is the sheet's close/cancel visible? Does the bottom of the sheet sit above the nav?
2. HOME: Tap three-dot menu on a card → dropdown menu
   - Check: is the dropdown fully visible? Not clipped by bottom nav?
3. RECO FLOW (/reco?mode=give): Open the friend picker
   - Check: can you see all friends? Is the bottom of the picker above the nav?
4. RECO FLOW: After typing in the name field, open the autocomplete dropdown
   - Check: is the dropdown clipped by any element?
5. PROFILE (/profile): If any modal opens (e.g. share profile link), check the same
6. NOTIFICATIONS: If any action sheet appears, check it

For each one, report:
- PASS: fully visible, close button accessible
- BUG [high]: close button hidden behind nav or header
- BUG [high]: sheet content clipped — cannot see top/bottom of overlay
- BUG [medium]: sheet partially overlapping nav but still usable`,
      successCriteria: 'You tested every popup you could find and reported obstruction status for each. Call done with a summary.',
      antiPatterns: [
        'Do not submit reviews or send recos in this journey — just open the sheets and check visibility',
        'Close each sheet before moving to the next one',
        'If a sheet has no visible close button at all, that is always HIGH severity',
        'The bottom nav is approximately 60-80px tall at the bottom of the screen',
        'The header/status bar is approximately 50-60px tall at the top',
      ],
    },

    // ── Back Arrow & Chevron Icon Consistency ──────────────────
    {
      id: 'J_ICON_CONSISTENCY',
      name: 'Back Arrow & Chevron Icon Consistency',
      startUrl: `${baseUrl}/home`,
      goal: `Check every screen in the app for back arrows and chevron icons.
The correct back arrow should be SQUARE/GEOMETRIC — clean right angles, not curved or rounded.

Visit each of these screens and note the back arrow / chevron style:
1. /home → tap a reco card → note the back arrow inside the expanded card
2. /notifications → note any back arrow at top left
3. /reco?mode=give → go through the flow → note any back/chevron icons
4. /friends → tap a friend profile → note the back arrow
5. /profile → note any chevrons on settings or picks sections
6. /lists → tap a city → note the back arrow
7. /sinbin → note any back arrows

For each screen, describe:
- Shape of the back arrow: IS IT geometric/square? Or is it rounded/curved/thin?
- Size: does it look the same size as on other screens?
- Position: is it in the same position (top left) on every screen?
- Style: is it filled, outlined, or a thin line?

If ANY screen has a different style back arrow/chevron from the others, report it as:
BUG [medium]: Icon inconsistency — describe exactly what looks different

The correct style is: square, geometric, consistent stroke weight, same size everywhere.`,
      successCriteria: 'You visited every screen, checked all back arrows and chevrons, and reported any inconsistencies. Call done with a full summary.',
      antiPatterns: [
        'Do not just check one screen — visit ALL screens listed above',
        'Even a slightly different size or weight is worth noting',
        'Rounded vs square corners on the arrow tip is the key thing to spot',
        'If a screen has NO back arrow when it should (e.g. a detail page), that is a medium bug',
      ],
    },

    // ── Empty States ───────────────────────────────────────────
    {
      id: 'J_EMPTY_STATES',
      name: 'Empty State Visual Consistency',
      startUrl: `${baseUrl}/home`,
      goal: `Check that every screen has a well-designed, consistent empty state when there is no data.
Visit each tab/screen and look for empty state treatment:
1. /home → No Gos tab — should be empty for a new user. Is there an illustration, helpful text, and a CTA?
2. /lists — if no place-based recos exist, what does the screen show?
3. /sinbin → "Your sin bin" tab — should be empty. Is the empty state well-designed?
4. /sinbin → "Bins you're in" tab — same check
5. /friends — after clearing interactions, check the empty friends state (if accessible)
6. /notifications — if all notifications are read/cleared, what shows?

For each empty state, check:
- Is there an illustration or icon? (should be present)
- Is there helpful explanatory text? (should explain what this section is for)
- Is there a CTA button pointing the user to an action? (preferred)
- Does the empty state look visually consistent with other empty states in the app?
- Is the text centred and the spacing reasonable?

Report BUG [medium] for any empty state that is: completely blank, shows raw "null" or "undefined", has no text at all, or looks visually broken.
Report BUG [low] for empty states that are functional but lack an illustration or CTA.`,
      successCriteria: 'You checked all empty states and noted their quality. Call done with a summary.',
      antiPatterns: [
        'If a screen has data, skip to the next — only check screens with no content',
        'A plain "No items" text alone is a low severity bug — note it but do not stop',
      ],
    },

    // ── Loading States ─────────────────────────────────────────
    {
      id: 'J_LOADING_STATES',
      name: 'Loading State & Skeleton Consistency',
      startUrl: `${baseUrl}/home`,
      goal: `Check that loading states and skeletons are shown consistently across the app.
Navigate to each page quickly (before content loads) and note what appears:
1. Navigate to /home — does a skeleton or spinner appear before cards load?
2. Navigate to /notifications — is there a loading indicator?
3. Navigate to /friends — loading state before friends list appears?
4. Navigate to /lists — loading state before city groups appear?
5. Navigate to /profile — loading state before stats appear?
6. Navigate to /reco?mode=give and select a category, then type in the name field — is there a loading indicator while autocomplete fetches?

For each:
- Is there a skeleton UI (preferred) or a spinner?
- Does the page flash/jump when content loads (layout shift)?
- Is the loading indicator consistent in style across screens?
- Does anything appear broken or blank before the data arrives?

Report BUG [medium] for: no loading state at all (content appears from nothing), major layout shift when data loads, or inconsistent spinner styles.
Report BUG [high] for: page shows error state during normal loading.`,
      successCriteria: 'You checked loading states on all main screens. Call done with summary.',
      antiPatterns: [
        'Load each page fresh — use navigate action to each URL',
        'Take a screenshot immediately after navigation, before waiting',
        'If the page loads instantly with no loading state (from cache), note it but do not report as a bug',
      ],
    },

    // ── Page Load Timing ───────────────────────────────────────
    {
      id: 'J_PERFORMANCE',
      name: 'Page Load Performance — Slow Screens',
      startUrl: `${baseUrl}/home`,
      goal: `Identify which screens feel slow or take a long time to show content.
Navigate to each key screen and note how long it takes for content to appear (approximate):
1. /home — how long before reco cards appear?
2. /notifications — how long before notifications list appears?
3. /reco?mode=give — how long before the category chips appear?
4. /lists — how long before city groups appear?
5. /profile — how long before stats and picks appear?
6. /friends — how long before the friends list appears?

For each screen estimate:
- FAST: content appears almost immediately (under 1 second)
- MEDIUM: content appears after a noticeable wait (1-3 seconds)
- SLOW: content takes a long time or shows a spinner for more than 3 seconds

Also note:
- Does any screen show a blank white flash before content?
- Does any image take noticeably longer to load than the surrounding content?
- Are there any screens where you can see individual elements pop in one by one?

Report BUG [high] for any screen that takes more than 3 seconds to show content.
Report BUG [medium] for noticeable layout shift or blank flash.`,
      successCriteria: 'You rated the performance of every main screen. Call done with a full performance summary.',
      antiPatterns: [
        'Use navigate action to each URL to do a fresh load',
        'Wait 3 seconds after navigation before reporting slow — do not report immediately',
        'Do not report fast screens as bugs',
      ],
    },

    // ── Typography & Colour Consistency ────────────────────────
    {
      id: 'J_VISUAL_CONSISTENCY',
      name: 'Typography & Colour Consistency',
      startUrl: `${baseUrl}/home`,
      goal: `Check that typography and colours are visually consistent across screens.
Visit each screen and look for visual inconsistencies:

TYPOGRAPHY — check on each screen:
1. Are heading sizes consistent? (page titles should all be the same size)
2. Are body text sizes consistent?
3. Is the font the same everywhere? (no screen should use a noticeably different typeface)
4. Are button labels the same font size and weight across screens?

COLOUR — check on each screen:
5. Is the primary/accent colour (yellow) used consistently for CTAs?
6. Are there any buttons that use a different colour from the rest?
7. Is the background colour consistent (dark theme or light theme throughout)?
8. Are error messages always red? Are success states always green?

Screens to check:
- /home (cards, tabs, header)
- /reco?mode=give (chips, buttons, form fields)
- /notifications (notification items)
- /profile (stats, section headers)
- /friends (friend cards)
- /sinbin (tabs, content)

Report BUG [medium] for any screen where typography or colour deviates noticeably from the rest.
Report BUG [low] for minor spacing inconsistencies.`,
      successCriteria: 'You checked typography and colour on all main screens. Call done with a summary of any inconsistencies.',
      antiPatterns: [
        'Be specific when reporting — say which screen and what element looks different',
        'Minor pixel differences are not bugs — only report clearly noticeable deviations',
      ],
    },

    // ── Touch Target Size ──────────────────────────────────────
    {
      id: 'J_TOUCH_TARGETS',
      name: 'Touch Target Size & Tap Accuracy',
      startUrl: `${baseUrl}/home`,
      goal: `Check that interactive elements have large enough touch targets.
Minimum touch target size on mobile should be 44x44px (Apple HIG standard).
Small targets cause missed taps and are a common mobile UX problem.

Check these specific elements for tap accuracy and target size:
1. Bottom nav bar icons — are they easy to tap, or do you sometimes miss?
2. Three-dot menu (⋯) on reco cards — is it large enough to tap accurately?
3. Back arrows on detail screens — is the tap area large enough?
4. Notification action buttons (Accept/Decline) — are they large enough?
5. Score slider on the feedback sheet — can you accurately set a specific score?
6. Category chips on the reco form — are they easy to tap?
7. Close (X) buttons on any modals or sheets

For each element:
- Try tapping it and note if it responds correctly first time
- If you miss it or have to tap multiple times, report BUG [medium]: small touch target

Also check:
- Are any two interactive elements so close together that tapping one risks tapping the other?
Report BUG [medium] for any element that is clearly too small or too close to its neighbours.`,
      successCriteria: 'You tested all small interactive elements for tap accuracy. Call done with summary.',
      antiPatterns: [
        'Do not report standard-sized buttons as too small',
        'Focus on small icons, close buttons, and narrow elements',
      ],
    },

    // ── Form Validation & Edge Cases ───────────────────────────
    {
      id: 'J_FORM_VALIDATION',
      name: 'Form Validation & Edge Cases',
      startUrl: `${baseUrl}/reco?mode=give`,
      goal: `Test form validation and edge cases across key forms.

TEST 1 — Empty form submission on /reco?mode=give:
1. Select a category chip (restaurant)
2. Do NOT fill in the title field
3. Try to tap Send — verify it is disabled or shows an error
4. Note whether any helpful error message appears

TEST 2 — Long text input:
5. Fill in the title field with a very long string: "This is a very long restaurant name that goes on and on and should test the character limit handling"
6. Note: does the field truncate? Does it overflow the UI? Does a character counter appear?
7. Fill in the Why field with a very long review (150+ characters)
8. Note the same things

TEST 3 — Special characters:
9. Type special characters in the Why field: "Great! 🍝 £20/head — worth every penny & more"
10. Verify the text appears correctly with no encoding errors

TEST 4 — Review form (/home):
11. Navigate to /home, expand a card, open the feedback sheet
12. Try to tap Send feedback with an EMPTY text field — verify button is disabled
13. Type a single character and verify the button enables

Report BUG [high] for: form submits with empty required fields, or crashes on special characters.
Report BUG [medium] for: no character limits shown, text overflows the UI, or no error messages on invalid submission.`,
      successCriteria: 'You tested empty submission, long text, and special characters. Call done with findings.',
      antiPatterns: [
        'Do not send these recos — just test the validation, then cancel or navigate away',
        'If a field has no character limit and accepts 200+ characters without warning, report as low',
      ],
    },

    // ── Outbox — Sent Recos ────────────────────────────────────
    {
      id: 'J_OUTBOX',
      name: 'Sent Recos — Outbox & Feedback Received',
      startUrl: `${baseUrl}/profile`,
      goal: `Check that recos you have sent are visible and feedback on them is shown.
1. Navigate to /profile
2. Look for a "Sent" or "Given" section, or a way to view recos you have sent
3. If it exists: verify reco cards show the recipient name, title, and send date
4. Tap one sent reco — verify a detail view opens
5. Check: is any feedback the recipient left shown on the sent reco?
6. Navigate to /notifications — look for feedback_received notifications
7. Tap one — verify it shows the score and review text from the recipient
8. Check that the score badge colour is correct (green for 7-10, amber for 5-6, red for 1-4)

Report BUG [high] for: no way to view sent recos, feedback not shown on sent recos, wrong badge colour.
Report BUG [medium] for: sent recos visible but no feedback shown even when feedback exists.`,
      successCriteria: 'You found and reviewed the sent recos section and feedback notifications. Call done.',
      antiPatterns: [
        'The sent recos section may be on the profile page or accessed via a separate tab',
        'If you cannot find sent recos anywhere, report as HIGH bug',
      ],
    },

    // ── Stranger Profile ───────────────────────────────────────
    {
      id: 'J_STRANGER_PROFILE',
      name: 'Non-Friend Profile View',
      startUrl: `${baseUrl}/friends`,
      goal: `Test what a profile looks like for someone you are NOT friends with.
1. Find Dana Discover in the friends section (may need to search)
   OR navigate to their profile via search
2. Open Dana's profile
3. Note what is visible to a non-friend:
   - Can you see their recos? Or are they hidden?
   - Can you see their TOP 03 picks?
   - Is there an "Add friend" button?
   - Is there a "Give reco" button? (Should there be — you're not friends yet)
4. Check: is it clear from the UI that this person is not yet a friend?
5. Verify the "Add friend" button is visible and prominent

Report BUG [high] for: private content visible to non-friends, no Add Friend button, page crashes.
Report BUG [medium] for: unclear relationship status, no visual indicator that you're not friends.`,
      successCriteria: 'You viewed a non-friend profile and noted what is visible. Call done.',
      antiPatterns: [
        'Do not tap Add Friend here — that was done in J_FRIEND_SEND',
        'Focus on what content is shown vs hidden for a non-friend viewer',
      ],
    },

    // ── Deep Link & Direct Navigation ─────────────────────────
    {
      id: 'J_DEEP_LINKS',
      name: 'Direct URL Navigation & Deep Links',
      startUrl: `${baseUrl}/home`,
      goal: `Verify that direct URL navigation works correctly for all main routes.
Navigate directly to each URL and check the page loads correctly:
1. Navigate to /home — verify home feed loads
2. Navigate to /notifications — verify notifications load
3. Navigate to /friends — verify friends list loads
4. Navigate to /lists — verify places/cities load
5. Navigate to /profile — verify profile loads
6. Navigate to /sinbin — verify sin bin loads
7. Navigate to /reco?mode=give — verify reco form loads
8. Navigate to /reco?mode=quick — verify quick add loads
9. Navigate to /reco?mode=get — verify request form loads
10. Navigate to a non-existent route: /this-does-not-exist — verify a proper 404 page appears

For each:
- Does the page load without error?
- Is the correct content shown?
- Is the bottom nav still visible and correct tab highlighted?

Report BUG [high] for: any valid route that returns a 404 or blank page.
Report BUG [medium] for: correct page loads but wrong nav tab is highlighted.
Report BUG [low] for: valid routes that redirect unnecessarily.`,
      successCriteria: 'You tested all direct routes and noted any failures. Call done.',
      antiPatterns: [
        'Use the navigate action for each URL',
        'Wait for networkidle before assessing each page',
      ],
    },

    // ── Tab State Persistence ──────────────────────────────────
    {
      id: 'J_STATE_PERSISTENCE',
      name: 'Tab State & Navigation Persistence',
      startUrl: `${baseUrl}/home`,
      goal: `Check that state persists correctly when switching between tabs and navigating back.

TEST 1 — Tab state persistence:
1. On /home, switch to the "Done" tab
2. Navigate to /notifications via the bottom nav
3. Navigate back to /home via the bottom nav
4. Check: is the "Done" tab still selected? (it should be — state should persist)
5. If it reset to "To Do", report as BUG [medium]: tab state not preserved

TEST 2 — Scroll position:
6. On /home, scroll down past 3 reco cards
7. Tap the bottom nav to go to /friends
8. Tap the bottom nav to return to /home
9. Check: is the scroll position preserved? Or did it reset to the top?
10. Report as BUG [low] if scroll resets (preferred behaviour is to preserve position)

TEST 3 — Form state:
11. Navigate to /reco?mode=give
12. Select a category chip and type a partial title
13. Navigate away using the bottom nav
14. Navigate back to /reco?mode=give
15. Check: was form state preserved or cleared?
16. Report as BUG [low] if not cleared (form should reset) OR BUG [medium] if it preserved partial state inconsistently`,
      successCriteria: 'You tested tab state, scroll position, and form state persistence. Call done.',
      antiPatterns: [
        'Be precise about what state was or was not preserved',
        'These are UX quality checks — all have workarounds, so severity is usually low/medium',
      ],
    },

    // ── Reco Request Received ──────────────────────────────────
    {
      id: 'J_REQUEST_RECEIVED',
      name: 'Reco Request Received — Fulfil Flow',
      startUrl: `${baseUrl}/notifications`,
      goal: `Check the flow for fulfilling a reco request that someone sent you.
Note: the seed data includes a reco request from Alex Friend to QA Agent.
1. Look in notifications for a "request_received" type notification
2. If present: tap it — verify it navigates to a page where you can fulfil the request
3. Verify: the request shows who asked, what category they want, and any context they provided
4. Look for a "Give reco" or "Fulfil request" button
5. Tap it — verify it navigates to the reco form with the requester pre-filled
6. Check: is the category pre-selected from the request?
7. Navigate back

If no request_received notification exists:
- Navigate to /profile and look for "Your requests" section
- Check what a received request looks like from the other side

Report BUG [high] for: no way to fulfil a received request, request notification missing, form does not pre-fill.`,
      successCriteria: 'You found the received request and checked the fulfilment flow. Call done.',
      antiPatterns: [
        'Do not actually send the reco — just verify the navigation and pre-fill',
        'If request_received is not in notifications, look in profile or a dedicated requests page',
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
