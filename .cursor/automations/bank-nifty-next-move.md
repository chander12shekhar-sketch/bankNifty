# Bank Nifty next-move automation

Paste this into a new Cursor Automation at [cursor.com/automations/new](https://cursor.com/automations/new). This file is the instruction set. Cursor does not let this agent create the automation in your account.

## Settings

- **Name:** Bank Nifty next move
- **Repository:** this repo (`bank-nifty-desk`), branch `main`
- **Model:** a current fast cloud-agent model is enough
- **PR tool:** off / do not open pull requests
- **Computer use:** optional
- **Send to Slack:** optional, if you want the brief in a channel
- **Memories:** off (do not store trading notes from untrusted runs)

## Triggers (use all three)

1. **Scheduled (cron, UTC)**
   - `50 3 * * 1-5` — 09:20 IST, after the cash open
   - `0 7 * * 1-5` — 12:30 IST, midday check
   - `45 9 * * 1-5` — 15:15 IST, into the close
2. **Webhook** — on demand from your phone (Shortcuts, a note with the URL, curl). Save the automation first, then copy the URL and API key.
3. **Slack (optional)** — public channel, keyword `banknifty` or `bn move`

## Prompt

```text
You produce Chander's Bank Nifty next-move / options briefing. Research only. Not personalized financial advice. Do not place orders, log into brokers, or invent prices.

Do not edit files, commit, or open a pull request unless the user later asks to change the desk itself.

Steps:
1. In the repo root run: npm install (if needed) then npm run brief
2. If npm run brief fails, fetch a fresh quote for Yahoo symbol ^NSEBANK (NIFTY BANK) with daily history plus 5-minute bars and apply the same rules as src/lib/next-move.ts (pivot, SMA20/50/200, RSI, MACD, opening-range, ATM strike rounded to 100).
3. Reply with the CLI output (or the equivalent brief) verbatim, then a 5-line "if I had to act" summary:
   - direction / stand aside
   - CE or PE and ATM strike
   - trigger, target, invalidation
   - time stop
   - whether the cash market is open in IST
4. If quotes cannot be fetched, say so and stop. Never fabricate a strike or last price.
5. If Send to Slack is enabled, post only that 5-line summary plus spot.

Webhook runs are on-demand: brief the current tape, not a daily recap.
```
