# Bank Nifty desk

A small Next.js desk for **NIFTY BANK** (`^NSEBANK`). It pulls candles from Yahoo Finance, draws a candlestick chart, writes a technical readout, and builds a **same-session options playbook**.

This is not investment advice. Options can expire worthless. Confirm expiry and lot size on NSE before you order.

## Run locally

```bash
npm install
npm run dev -- --port 4317
```

- Chart: [http://localhost:4317](http://localhost:4317)
- Phone next-move: [http://localhost:4317/move](http://localhost:4317/move)
- Fresh text: `npm run brief`

## Get this on your phone (no Automations)

Cursor Automations are optional. Use any of these:

1. **Host this app and bookmark `/move`.** Put the Next.js app on any host you can open from LTE (Vercel, your VPS, Cloudflare). On the phone open `/move` → Share → Add to Home Screen (iPhone) or Install app (Android). That is the live CE/PE card. It auto-refreshes every 18 seconds while the tab is visible.

2. **Cursor Cloud Agent from the phone.** iPhone: Cursor iOS app. Android: Chrome → [cursor.com/agents](https://cursor.com/agents) → Install app. Start an agent **on this repo** and type `brief`. The agent runs `npm run brief` and replies with spot, next move, and strikes. This is the on-demand path that does not need Automations.

3. **WhatsApp or copy.** On `/move`, tap **Copy brief** or **WhatsApp** and send it to yourself. The last plan sits in your chat.

4. **Ask this same cloud agent later.** Open the existing agent thread on [cursor.com/agents](https://cursor.com/agents) from the phone and say `brief` again.

## Stack

Next.js (App Router), TypeScript, Tailwind, and shadcn/ui.
