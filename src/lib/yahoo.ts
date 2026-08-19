import { analyze } from "./indicators";
import type { BankNiftyResponse, Candle, Quote, RangeKey } from "./types";

const SYMBOL = "^NSEBANK";

const RANGE_QUERY: Record<RangeKey, { range: string; interval: string }> = {
  "1d": { range: "5d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "2y": { range: "2y", interval: "1d" },
};

type YahooChart = {
  chart: {
    result?: Array<{
      meta: {
        currency?: string;
        symbol?: string;
        exchangeName?: string;
        timezone?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        regularMarketTime?: number;
        shortName?: string;
        longName?: string;
      };
      timestamp?: number[];
      indicators: {
        quote: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

function parseCandles(payload: YahooChart): Candle[] {
  const result = payload.chart.result?.[0];
  if (!result?.timestamp) return [];
  const q = result.indicators.quote[0];
  const candles: Candle[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    const close = q.close?.[i];
    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !Number.isFinite(open) ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    candles.push({
      time: result.timestamp[i],
      open,
      high,
      low,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return candles;
}

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
  fresh = false,
): Promise<YahooChart> {
  const url = new URL(
    "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol),
  );
  url.searchParams.set("range", range);
  url.searchParams.set("interval", interval);
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,split");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BankNiftyDesk/1.0; +https://localhost)",
      Accept: "application/json",
    },
    cache: fresh ? "no-store" : "force-cache",
    next: { revalidate: fresh ? 0 : 60 },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance returned ${res.status}`);
  }
  return (await res.json()) as YahooChart;
}

function lastSessionCandles(candles: Candle[]): Candle[] {
  if (candles.length === 0) return candles;
  const last = candles[candles.length - 1];
  const lastDay = new Date(last.time * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const sameDay = candles.filter(
    (c) =>
      new Date(c.time * 1000).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      }) === lastDay,
  );
  return sameDay.length >= 8 ? sameDay : candles.slice(-78);
}

export async function getBankNifty(
  range: RangeKey,
  options: { fresh?: boolean } = {},
): Promise<BankNiftyResponse> {
  const fresh = options.fresh ?? false;
  const view = RANGE_QUERY[range];
  const [viewPayload, dailyPayload, intraPayload, vixPayload] = await Promise.all([
    fetchChart(SYMBOL, view.range, view.interval, fresh),
    fetchChart(SYMBOL, "2y", "1d", fresh),
    fetchChart(SYMBOL, "5d", "5m", fresh),
    fetchChart("^INDIAVIX", "5d", "1d", fresh).catch(() => null),
  ]);

  if (viewPayload.chart.error) {
    throw new Error(viewPayload.chart.error.description || "Yahoo chart error");
  }

  let candles = parseCandles(viewPayload);
  if (range === "1d") candles = lastSessionCandles(candles);
  const daily = parseCandles(dailyPayload);
  const analysisSource = daily.length > 30 ? daily : candles;

  const meta = viewPayload.chart.result?.[0]?.meta;
  const lastView = candles[candles.length - 1];
  const lastDaily = daily[daily.length - 1];
  const price =
    meta?.regularMarketPrice ?? lastView?.close ?? lastDaily?.close ?? 0;
  const todayYmd = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const lastDailyYmd = lastDaily
    ? new Date(lastDaily.time * 1000).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      })
    : "";
  const previousClose =
    lastDailyYmd === todayYmd && daily.length >= 2
      ? daily[daily.length - 2].close
      : (lastDaily?.close ?? price);
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  const quote: Quote = {
    symbol: meta?.symbol ?? SYMBOL,
    name: meta?.longName || meta?.shortName || "NIFTY BANK",
    currency: meta?.currency ?? "INR",
    price,
    previousClose,
    change,
    changePercent,
    dayHigh: meta?.regularMarketDayHigh ?? lastView?.high ?? price,
    dayLow: meta?.regularMarketDayLow ?? lastView?.low ?? price,
    fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta?.fiftyTwoWeekLow ?? 0,
    exchange: meta?.exchangeName ?? "NSE",
    timezone: meta?.timezone ?? "IST",
    marketTime: meta?.regularMarketTime ?? lastView?.time ?? 0,
  };

  const vixCandles = vixPayload ? parseCandles(vixPayload) : [];
  const indiaVix =
    vixPayload?.chart.result?.[0]?.meta.regularMarketPrice ??
    (vixCandles.length ? vixCandles[vixCandles.length - 1].close : null);

  const intraday = lastSessionCandles(parseCandles(intraPayload));

  return {
    quote,
    candles,
    analysis: analyze(analysisSource, { quote, intraday, indiaVix }),
    range,
    source: "Yahoo Finance (^NSEBANK, ^INDIAVIX)",
    fetchedAt: new Date().toISOString(),
  };
}

export function isRangeKey(value: string): value is RangeKey {
  return value in RANGE_QUERY;
}
