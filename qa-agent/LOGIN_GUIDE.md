# RECO Login Page — QA Agent Guide

## How the login page works

The login page is at `/login`. By default it shows OAuth buttons (Google, Apple). The email/password form is hidden behind a toggle.

**To skip the toggle and get the email form immediately**, navigate to:

```
/login?method=email
```

This auto-expands the email/password form on page load.

## Page structure when email form is visible

```
/login?method=email
├── "Continue with Google" button (ignore this)
├── "Continue with Apple" button (disabled, ignore this)
├── <form>
│   ├── <input type="email" name="email" data-testid="email-input" placeholder="Email">
│   ├── <input type="password" name="password" data-testid="password-input" placeholder="Password">
│   └── <button type="submit" data-testid="email-submit">Continue</button>
│       (disabled when fields are empty, yellow/accent background when active)
└── Error message (only visible if login fails)
```

## Exact selectors to use

| Action | Selector | Method |
|--------|----------|--------|
| Email field | `[data-testid="email-input"]` | `page.fill(selector, email)` |
| Password field | `[data-testid="password-input"]` | `page.fill(selector, password)` |
| Submit button | `[data-testid="email-submit"]` | `page.click(selector)` |
| Alternative submit | `button[type="submit"]` | `page.click(selector)` |
| Alternative submit | `form` | `page.locator('form').first().evaluate(f => f.requestSubmit())` |

## Login flow (deterministic, no screenshot needed)

```javascript
// 1. Navigate to login with email form pre-expanded
await page.goto(`${baseUrl}/login?method=email`, { waitUntil: 'networkidle' });

// 2. Fill email
await page.fill('[data-testid="email-input"]', email);

// 3. Fill password
await page.fill('[data-testid="password-input"]', password);

// 4. Click submit
await page.click('[data-testid="email-submit"]');

// 5. Wait for redirect to /home (or /setup-profile for new users)
await page.waitForURL('**/home**', { timeout: 15000 });
```

## Important notes

- The submit button is **disabled** until both email and password are non-empty. If `page.fill()` doesn't trigger React's onChange, the button stays disabled. Use `page.fill()` (not `page.type()`) — Playwright's `fill` dispatches input events correctly.
- After successful login, the page redirects to `/home` via `window.location.href = '/home'`.
- If the account doesn't exist, the form auto-creates it (signUp fallback).
- If login fails, a red error message appears below the form.
- The login page redirects authenticated users to `/home` automatically (middleware).

## What NOT to do

- Don't try to click "Continue with Google" — it opens an OAuth popup that can't be automated.
- Don't try to find a `.continue-btn` or `.continue` class — they don't exist.
- Don't rely on button text matching — use `data-testid` selectors instead.
- Don't use `page.type()` for filling fields — use `page.fill()` which properly triggers React state updates.

## Recommended signup.js approach

Instead of using Claude vision to decide each step on the login page, **hardcode the login steps** since the page structure is known and stable. Use Claude vision only for post-login exploration where the UI is dynamic.

```javascript
// Deterministic login — no screenshots needed
await page.goto(`${baseUrl}/login?method=email`, { waitUntil: 'networkidle' });
await page.fill('[data-testid="email-input"]', email);
await page.fill('[data-testid="password-input"]', password);
await page.click('[data-testid="email-submit"]');
await page.waitForURL('**/home**', { timeout: 15000 });

// NOW start the Claude-driven exploration on the logged-in app
```
