# Personal Purchase Tracker

Private spend dashboard. Plaid syncs into a Google Sheet you own, and a static site on Cloudflare reads that sheet.

## Locked for v1

- One person. Bring your own Plaid keys, Google service account, and spreadsheet. No accounts inside the app.
- The spreadsheet is the source of truth. Cloudflare KV stores Plaid access tokens and the sync cursor only.
- `category_override` wins. Rules run next. The Plaid category is the fallback.
- Spend charts count posted outflows. They skip pending rows and categories named `Payment`, `Transfer`, and `Income`.
- The dashboard does not edit categories. Change the sheet.
- The site is a static React app behind Cloudflare Access. The Worker on the same hostname does Link, sync, and the JSON read.
- Secrets stay in `.dev.vars` / Wrangler secrets. Sheet contents are never committed.

Plaid's Development environment was shut down in 2024. Use `PLAID_ENV=sandbox` for the fake bank, or `production` for real cards.

## Flow

```
Plaid Link  →  Worker stores the access token in KV
Cron 13:00 UTC (about 6:00am Pacific)  →  transactions/sync  →  private Google Sheet
Dashboard  →  GET /api/snapshot  →  rules + overrides applied live
Cloudflare Access  →  your email, in front of that hostname
```

Manual **Sync** hits `POST /api/sync`. Linking a bank syncs immediately.

## Sheet

| Tab | Who edits it | Columns that matter |
|---|---|---|
| Transactions | Sync writes these. You may set `category_override`. | `category_override` is kept. `category` is rewritten. The current month and the three before it stay here. |
| Monthly | Sync, once a month is older than that | One row per month, card, category, and direction (`out` spend or `in` refund). The category is frozen. |
| Archived | Sync only | Ids already folded into Monthly. Leave this tab in place. |
| Rules | You | `priority`, `field` (`name`, `merchant`, or `plaid_category`), `pattern`, `category`. Lower priority number wins. Match is a case-insensitive substring. |
| Accounts | Sync only | Institution, name, mask. No tokens. |

A posted transaction keeps the override from its pending row when Plaid sends `pending_transaction_id`.

## Later

Unlink a bank from the UI, webhooks instead of only the daily cron, netting refunds into category totals, budgets, editing categories in the dashboard.
