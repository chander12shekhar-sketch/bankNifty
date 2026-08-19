# Bank Nifty desk

A small Next.js desk for **NIFTY BANK** (`^NSEBANK`). It pulls candles from Yahoo Finance, draws a candlestick chart, writes a technical readout, and builds a **same-session options playbook** (CE vs PE, ATM/OTM strikes, trigger, target, invalidation).

This is not investment advice. Options can expire worthless. Yahoo’s index feed can lag. Confirm expiry and lot size on NSE before you order.

## Run locally

```bash
npm install
npm run dev -- --port 4317
```

- Chart desk: [http://localhost:4317](http://localhost:4317)
- Phone next-move: [http://localhost:4317/move](http://localhost:4317/move)
- Fresh text brief: `npm run brief` or [http://localhost:4317/api/banknifty/brief?format=text](http://localhost:4317/api/banknifty/brief?format=text)

On a phone, open `/move`, then **Add to Home Screen** (Safari) or **Install app** (Chrome). The page refreshes when you reopen it, and every minute while the cash market is open.

## Cursor Automation (on demand + schedule)

This agent cannot save an automation into your Cursor account. Create it once (about a minute):

1. Open [cursor.com/automations/new](https://cursor.com/automations/new)
2. Attach **this repository**, branch `main`
3. Copy the prompt and trigger list from [`.cursor/automations/bank-nifty-next-move.md`](.cursor/automations/bank-nifty-next-move.md)
4. Turn **off** pull requests. Optionally enable **Send to Slack**
5. Save, then copy the **webhook URL + API key** for on-demand runs from your phone (iOS Shortcuts, or any HTTP client)

From the Cursor **iOS** app or [cursor.com/agents](https://cursor.com/agents) (Android: install that site as a PWA), you can also start a cloud agent and say “Bank Nifty brief”.

Scheduled crons in that file are UTC: 09:20, 12:30, and 15:15 IST on weekdays.

## Stack

Next.js (App Router), TypeScript, Tailwind, and shadcn/ui. The chart is an SVG candlestick plot so it stays readable without a canvas library.
