# RECO QA Agent — Journey Definitions

This document defines every testable journey in the RECO app. Each journey is a self-contained goal the QA agent should attempt, with clear success criteria and known selectors.

The agent should **hardcode login** (see LOGIN_GUIDE.md), then execute these journeys using Claude vision for navigation decisions.

---

## Architecture: How to structure journeys

Each journey should:
1. **Start from `/home`** (already logged in)
2. **Have a clear goal** (not "explore" — a specific task with a verifiable end state)
3. **Use deterministic selectors** where possible (data-testid, aria-label)
4. **Use Claude vision** only for dynamic decisions (which card to tap, what to type)
5. **Verify the end state** (check URL, check for success text, check element exists)
6. **Not depend on previous journeys** (each should be independent)

---

## Journey 1: Give a Restaurant Reco

**Goal:** Send a restaurant recommendation to a friend.

**Steps:**
1. Navigate to `/reco?mode=give`
2. Tap a category chip (restaurant)
3. Type a restaurant name in the title field — wait for autocomplete suggestions
4. Tap a suggestion from the dropdown (should auto-fill image, location, address)
5. Optionally type a "Why" reason
6. Select at least one friend from the friend picker
7. Tap the send button
8. Verify: success screen appears with "Reco given"

**What to check for bugs:**
- Autocomplete suggestions appear within 2 seconds
- Selecting a suggestion fills in detail pills (location, address visible)
- Image preview appears after selection
- Send button is disabled until friend is selected
- Success screen shows recipient name
- Card appears in recipient's home feed (if testing with 2 accounts)

---

## Journey 2: Give a TV/Film/Podcast/Music/Book Reco

**Goal:** Send a non-venue reco (tests different API: TMDB, Spotify, iTunes, Open Library).

**Steps:**
1. Navigate to `/reco?mode=give`
2. Tap TV (or film, podcast, music, book) category chip
3. Type a title — wait for autocomplete
4. Tap a suggestion (should show poster/artwork image)
5. Type a "Why" reason
6. Select a friend
7. Tap send
8. Verify: success screen appears

**What to check for bugs:**
- TMDB results appear for film/TV
- Spotify/iTunes results appear for music/podcast
- Open Library results appear for books
- Artwork/poster image is shown in preview
- Category-specific constraint fields appear (streaming, genre, mood, etc.)

---

## Journey 3: Give a Custom Category Reco

**Goal:** Send a reco with a user-created custom category.

**Steps:**
1. Navigate to `/reco?mode=give`
2. Tap "Custom" chip (dashed border)
3. Type a custom category name (e.g. "Coffee")
4. Type a title — autocomplete should try Google Places
5. Select a friend
6. Tap send
7. Verify: success screen, custom category name shown

**What to check for bugs:**
- Custom category input appears when Custom chip is tapped
- Autocomplete works for custom categories (tries Google Places)
- Custom category name is preserved through send flow
- Card shows custom category name (not "Custom") in feed

---

## Journey 4: Quick Add a Reco

**Goal:** Add a reco from someone not on the app (Instant Add).

**Steps:**
1. Navigate to `/reco?mode=quick`
2. Type a sender name (e.g. "Alice")
3. Select a category
4. Type a title — wait for autocomplete
5. Tap a suggestion
6. Optionally add a photo (tap "Add a photo")
7. Tap send
8. Verify: success screen shows sender's first name

**What to check for bugs:**
- Sender name field appears first
- Category chips appear after name is filled
- Autocomplete works after category is selected
- Image preview shows when suggestion is selected
- Card appears in home feed with manual sender name
- "Everyone" filter on home page includes the manual sender

---

## Journey 5: Get a Reco (Request)

**Goal:** Request a recommendation from friends.

**Steps:**
1. Navigate to `/reco?mode=get`
2. Select a category
3. Fill in optional constraints (location, budget, etc.)
4. Select friends to ask (or skip for external share)
5. Tap "Request reco" or "Share request externally"
6. Verify: success screen with share link and/or QR code option

**What to check for bugs:**
- Category-specific constraints appear (location for restaurant, genre for film, etc.)
- Friend picker works (search, select, deselect)
- "Share request externally" works without selecting friends
- Share link is copyable
- QR code generates when tapped
- "View your past requests" link navigates to `/get/requests`

---

## Journey 6: Review a Reco (Give Feedback)

**Goal:** Mark a reco as done and submit a review.

**Steps:**
1. Navigate to `/home` (To Do tab)
2. Tap a reco card to expand it
3. Tap the "Done? Give them your review" button (yellow, at bottom of expanded card)
4. Drag the score slider (1–10)
5. Type review text in the textarea
6. Tap "Send feedback"
7. Verify: card disappears from To Do, appears in Done tab

**What to check for bugs:**
- Score slider is draggable and shows current value
- Submit button is disabled until review text is filled
- Success overlay shows correct score emoji (red for 1-4, amber for 5-6, green for 7-10)
- Card moves to Done tab after review
- Sin bin warning appears if score ≤ 3
- Sender receives notification (check notifications page if two accounts)

**Selectors:**
- Done CTA: look for button text "Done? Give them your review" inside expanded card
- Score slider: `input[type="range"]` inside the feedback sheet
- Submit button: look for "Send feedback" button text

---

## Journey 7: Mark a Reco as No Go

**Goal:** Decline a reco and give a reason.

**Steps:**
1. Navigate to `/home` (To Do tab)
2. Tap the three-dot menu (⋯) on a reco card
3. Tap "No go" option
4. Type a reason in the text field
5. Tap submit
6. Verify: card disappears from To Do, appears in No Gos tab

**What to check for bugs:**
- Three-dot menu appears on actionable cards
- "No go" option is in the menu
- Reason field is required (error shown if empty)
- Card moves to No Gos tab

**Selectors:**
- Three-dot menu: 3 dots (circles) in top-right of card
- No go button: text "No go" in the dropdown menu

---

## Journey 8: Mark as Been There

**Goal:** Indicate you've already done this reco.

**Steps:**
1. Navigate to `/home` (To Do tab)
2. Tap the three-dot menu on a reco card
3. Tap "Been there, done that"
4. Either rate it or request a new reco
5. Verify: card handled appropriately

**What to check for bugs:**
- "Been there, done that" option exists in menu
- Two sub-options appear (rate / request new)

---

## Journey 9: Browse Places Page

**Goal:** View location-based recos grouped by city.

**Steps:**
1. Navigate to `/lists` (Places tab in bottom nav)
2. Verify city groups are shown (e.g. "London", "Amsterdam")
3. Tap a city → verify slide-across animation shows recos for that city
4. Tap "Share" button → verify share action fires
5. Tap "Back" → verify returns to city list
6. Try category filter chips at the top
7. Try search field

**What to check for bugs:**
- Cities show correct reco counts
- Category filter works
- Search filters by city name
- Share button works (native share or clipboard)
- Back navigation works
- Reco cards display within city view

---

## Journey 10: View and Manage Profile

**Goal:** Check profile stats, TOP 03 picks, and profile link.

**Steps:**
1. Navigate to `/profile`
2. Verify: display name, username, stats are shown
3. Check profile link is visible and copyable
4. Tap "Your requests" → verify navigates to past requests
5. Tap a TOP 03 category to expand picks
6. Navigate to `/profile/top3` to add a new pick
7. Select category, type title, select from autocomplete
8. Tap send → verify success

**What to check for bugs:**
- Stats are accurate (recos sent, completed, etc.)
- Profile link copies to clipboard
- TOP 03 picks show correctly
- Adding a pick works end-to-end
- Max 3 picks per category enforced

---

## Journey 11: Notifications

**Goal:** View and interact with notifications.

**Steps:**
1. Navigate to `/notifications`
2. Check notification types are present (recos received, reviews, friend requests)
3. Tap a notification → verify it navigates/expands correctly
4. Try filter tabs (All, Recos, Reviews, Friends, etc.)
5. If friend request exists: tap Accept → verify friend added

**What to check for bugs:**
- Notifications render with correct icons and text
- Score badges show correct colours (red/amber/green)
- Filter tabs work
- Accept/Decline buttons work for friend requests
- Handled notifications don't show action buttons again

---

## Journey 12: Friends Page

**Goal:** View friends list and friend profiles.

**Steps:**
1. Navigate to `/friends`
2. Verify friends list is shown
3. Tap a friend → verify friend profile loads
4. On friend profile: check "Give reco" and "Get reco" buttons
5. Tap "Give reco" → verify navigates to `/reco?mode=give&to={id}`
6. Go back, tap "Get reco" → verify navigates to `/reco?mode=get&from={id}`

**What to check for bugs:**
- Friends list loads
- Friend profile shows name, avatar, TOP 03 picks
- Give/Get reco buttons navigate correctly with friend pre-selected

---

## Journey 13: Sin Bin

**Goal:** Check sin bin functionality.

**Steps:**
1. Navigate to `/sinbin`
2. Verify two tabs exist: "Your sin bin" / "Bins you're in"
3. If entries exist: verify offences list, release/plead buttons
4. If empty: verify empty state text

**What to check for bugs:**
- Both tabs render
- Release button works (if entries exist)
- Plead button opens plea form (if in someone's bin)

---

## Journey 14: Expanded Reco Card — Full Detail Check

**Goal:** Verify every element on an expanded reco card renders correctly.

**Steps:**
1. Navigate to `/home`
2. Tap any reco card to expand
3. Verify these elements are present:
   - Category dot + sender name + date (header line)
   - Title (large text)
   - Location pill (if venue) — links to Google Maps
   - Data lozenges (address, price, etc.)
   - "Why?" section with detail pills + text
   - "Add links, notes, or images" button
   - "Done? Give them your review" CTA (if actionable)
   - Three-dot menu (if actionable)
   - Back button
   - Photo/Map toggle (if has image + location)
4. Tap "Add links, notes, or images" → verify edit form opens
5. Tap Cancel → verify form closes
6. Tap Back → verify card closes

**What to check for bugs:**
- All data fields render when present
- Location pill shows city (not street address)
- Maps link opens correctly
- Photo/Map toggle works (if Maps Embed API is enabled)
- Three-dot menu opens/closes
- Edit form opens/closes without losing data

---

## Data Setup (Seeding)

For thorough testing, the seed script should create:
- **User A** (the test user) with a profile
- **User B** (a friend) with a profile
- **Friend connection** between A and B (accepted)
- **Recos from B to A:** at least one per major category (restaurant with location, TV show with image, podcast, custom category)
- **A quick-add reco** from A to themselves (manual_sender_name set)
- **A reco request** from A
- **A notification** of each major type (reco_received, feedback_received with score, friend_request)

This ensures every journey has data to work with.

---

## Anti-patterns to avoid

1. **Don't loop on the same page** — if you've taken the same action twice with no state change, it's a bug or you're stuck. Move on.
2. **Don't try to interact with the three-dot menu on expanded cards** — use the one on the dormant card OR the expanded card's three-dot, not both.
3. **Don't swipe** — the app uses tap interactions, not swipe gestures.
4. **Don't try OAuth buttons** — only use email/password login.
5. **Don't explore aimlessly** — each journey has a specific goal. Complete it or report the blocker, then move to the next journey.
