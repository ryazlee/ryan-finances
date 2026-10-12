# Purchase Tracker

Personal spend dashboard. Transactions sync from Plaid into a private Google Sheet, and this site charts them. Built to run on free tiers with your own keys.

The UI follows the shared gray web-tool setup (Vite, React 19, TypeScript, semantic CSS, light/dark). The API is a Cloudflare Worker on the same origin so Plaid keys and the Google service account never ship to the browser.

## Local

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Open the site Vite prints. With no keys, use **Preview with sample data**. The API is the Worker from `worker/`, started by the Vite plugin.

| Script | What it does |
|---|---|
| `npm run dev` | Site + Worker |
| `npm test` | Category rules and spend totals |
| `npm run lint` | oxlint |
| `npm run build` | Typecheck and production build |
| `npm run deploy` | Build and `wrangler deploy` |

## Keys

1. **Plaid.** Create a key at the Plaid dashboard. Sandbox is fake data (`user_good` / `pass_good` at the sandbox bank). Production is real accounts. `PLAID_ENV=development` will not work.
2. **Google.** Enable the Sheets API, create a service account, and download its JSON key. Put that JSON on one line in `GOOGLE_SERVICE_ACCOUNT_JSON`.
3. **Sheet.** Create an empty spreadsheet. Put its id in `GOOGLE_SHEET_ID`. Share it with the service account email as an Editor.

The first sync creates `Transactions`, `Rules`, and `Accounts` and seeds starter rules. Edit `Rules` for auto-categories. Edit `category_override` when a single purchase should win. See `PLAN.md`.

## Deploy

Create a KV namespace and replace the placeholder id in `wrangler.jsonc`:

```bash
npx wrangler kv namespace create TOKENS
```

Pushes to `main` deploy through `.github/workflows/deploy.yaml`. Pull requests run tests and the build only. In the GitHub repo, add two Actions secrets:

- `CLOUDFLARE_API_TOKEN` — a token with Workers Scripts edit on this account
- `CLOUDFLARE_ACCOUNT_ID` — the account id from the Cloudflare dashboard

App secrets stay on the Worker, not in GitHub. Set them once:

```bash
npx wrangler secret put PLAID_CLIENT_ID
npx wrangler secret put PLAID_SECRET
npx wrangler secret put PLAID_ENV
npx wrangler secret put GOOGLE_SHEET_ID
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```

`npm run deploy` still deploys from this machine.

The cron is `0 13 * * *` (13:00 UTC).

### Cloudflare Access (Google login)

The site has no login of its own. Cloudflare Access sits in front of the hostname and requires your Google account before any page or `/api` response loads. Do this before you link a real bank. The daily cron is not a browser request, so it still runs.

1. Zero Trust → Settings → Authentication → Add Google. Cloudflare shows a redirect URL. In Google Cloud, create an OAuth client (Web application) with that redirect URL, and paste the client id and secret back into Cloudflare.
2. Access → Applications → Self-hosted. Domain is the Worker hostname (`something.workers.dev` or your custom domain). Leave the path open so `/` and `/api` are both covered.
3. On that application, allow only the Google login method. Do not leave One-time PIN enabled.
4. Policy: Allow. Include → Emails → your Gmail address.

## Spend numbers

Charts add posted purchases (Plaid positive amounts). Pending rows stay in the list until they post. Categories named Payment, Transfer, or Income are left out, which drops card payments and paychecks. Refunds stay in the list as money in and do not reduce the category total.
