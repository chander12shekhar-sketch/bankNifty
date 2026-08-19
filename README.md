# Bank Nifty desk

A small Next.js desk for **NIFTY BANK** (`^NSEBANK`). It pulls candles from Yahoo Finance, draws a candlestick chart, and writes a technical readout from SMA 20/50/200, RSI, MACD, ATR, and classic pivot levels.

This is not investment advice. Yahoo’s index feed can lag, and Bank Nifty index volume is often empty.

## Run locally

```bash
npm install
npm run dev -- --port 4317
```

Open [http://localhost:4317](http://localhost:4317). Use **1D / 5D / 1M / 3M / 6M / 1Y / 2Y** to change the chart window. The written analysis always uses two years of daily bars so the longer averages stay stable.

## Stack

Next.js (App Router), TypeScript, Tailwind, and shadcn/ui. The chart is an SVG candlestick plot so it stays readable without a canvas library.
