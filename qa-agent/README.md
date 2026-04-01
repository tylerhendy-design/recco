# Recco QA Agent 🤖

An AI-powered consumer simulator that walks through user journeys on your Vercel preview deployments, finds bugs, and delivers a markdown report — so you don't have to manually test every path after every change.

## How it works

1. You give it a Vercel preview URL
2. It creates a real throwaway user in Supabase
3. It opens a mobile browser (iPhone 14 viewport) and navigates to your app
4. **Claude acts as the "brain"** — it looks at screenshots of each page and decides what to click, type, and do next, just like a real consumer would
5. Anything broken, confusing, or unexpected gets logged as a bug with severity
6. At the end, you get a `reports/qa-report-<timestamp>.md` file
7. The test user is automatically deleted from Supabase

## Setup

### 1. Drop this folder into your Recco repo

```
recco/
  qa-agent/      ← this folder
  src/
  ...
```

### 2. Install dependencies

```bash
cd qa-agent
npm install
npx playwright install chromium
```

### 3. Set environment variables

Create a `.env` file in `qa-agent/` (or export these in your shell):

```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # from Supabase > Settings > API > service_role
```

> ⚠️ The service role key has admin access — never commit it. Add `qa-agent/.env` to your `.gitignore`.

### 4. Run it

```bash
# Against a Vercel preview URL
node index.js --url https://recco-git-my-branch-tylerhendy.vercel.app

# Against localhost
node index.js --url http://localhost:3000

# Using npm script (set QA_URL env var first)
QA_URL=https://recco-abc123.vercel.app npm test
```

## Output

- **`reports/qa-report-<timestamp>.md`** — your bug report, ready to read
- **`screenshots/step-N.png`** — screenshot at each step (useful for debugging what the agent saw)

## Adding more journeys

Create a new file in `journeys/`, follow the same pattern as `signup.js`, then import and call it in `index.js`. Good candidates:

- `journeys/send-recommendation.js`
- `journeys/receive-notification.js`
- `journeys/friend-request.js`

## Running automatically

You can wire this up as a GitHub Action to run on every Vercel preview deployment:

```yaml
# .github/workflows/qa-agent.yml
on:
  deployment_status:
    # fires when Vercel posts a deployment_status event
jobs:
  qa:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd qa-agent && npm install && npx playwright install --with-deps chromium
      - run: cd qa-agent && node index.js --url ${{ github.event.deployment_status.target_url }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: qa-report
          path: qa-agent/reports/
```

This means every time Vercel deploys a preview, the agent automatically runs and uploads the report as a GitHub Actions artifact.
