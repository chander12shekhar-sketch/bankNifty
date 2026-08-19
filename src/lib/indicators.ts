import type { Analysis, Candle, Levels } from "./types";

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = seed;
      out.push(seed);
    } else {
      prev = values[i] * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(null);
      continue;
    }
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      out.push(null);
      continue;
    }
    if (i === period) {
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) {
      out.push(100);
    } else {
      const rs = avgGain / avgLoss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export function macd(values: number[]) {
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  const macdLine: (number | null)[] = values.map((_, i) => {
    if (ema12[i] == null || ema26[i] == null) return null;
    return ema12[i]! - ema26[i]!;
  });
  const macdVals = macdLine.map((v) => v ?? 0);
  const signalFull = ema(
    macdVals.slice(macdLine.findIndex((v) => v != null)),
    9,
  );
  const signal: (number | null)[] = macdLine.map(() => null);
  let si = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] == null) continue;
    signal[i] = signalFull[si] ?? null;
    si += 1;
  }
  const histogram = macdLine.map((v, i) =>
    v == null || signal[i] == null ? null : v - signal[i]!,
  );
  return { macdLine, signal, histogram };
}

export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      trs.push(c.high - c.low);
      out.push(null);
      continue;
    }
    const prev = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev),
      Math.abs(c.low - prev),
    );
    trs.push(tr);
    if (i < period) {
      out.push(null);
      continue;
    }
    if (i === period) {
      const avg = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
      out.push(avg);
    } else {
      const prevAtr = out[i - 1]!;
      out.push((prevAtr * (period - 1) + tr) / period);
    }
  }
  return out;
}

function pivotLevels(lastCandle: Candle): Levels["pivot"] extends number
  ? Omit<Levels, "swingHigh" | "swingLow">
  : never {
  const { high, low, close } = lastCandle;
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  return { pivot, r1, r2, s1, s2 };
}

function swingLevels(candles: Candle[]): { high: number; low: number } {
  const window = candles.slice(-60);
  let high = -Infinity;
  let low = Infinity;
  for (const c of window) {
    high = Math.max(high, c.high);
    low = Math.min(low, c.low);
  }
  return { high, low };
}

function format(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function analyze(candles: Candle[]): Analysis {
  const closes = candles.map((c) => c.close);
  const lastClose = last(closes);
  if (!lastClose || candles.length < 5) {
    return {
      bias: "neutral",
      headline: "Not enough history to analyse Bank Nifty",
      summary:
        "The feed returned too few candles. Try another range once the session data is available.",
      bullets: [],
      rsi: null,
      macd: null,
      sma20: null,
      sma50: null,
      sma200: null,
      atr: null,
      levels: null,
    };
  }

  const sma20s = sma(closes, 20);
  const sma50s = sma(closes, 50);
  const sma200s = sma(closes, 200);
  const rsis = rsi(closes, 14);
  const macds = macd(closes);
  const atrs = atr(candles, 14);

  const sma20 = last(sma20s.filter((v) => v != null)) ?? null;
  const sma50 = last(sma50s.filter((v) => v != null)) ?? null;
  const sma200 = last(sma200s.filter((v) => v != null)) ?? null;
  const rsiNow = last(rsis.filter((v) => v != null)) ?? null;
  const macdNow = last(macds.macdLine.filter((v) => v != null));
  const signalNow = last(macds.signal.filter((v) => v != null));
  const histNow = last(macds.histogram.filter((v) => v != null));
  const atrNow = last(atrs.filter((v) => v != null)) ?? null;

  const lastCandle = last(candles)!;
  const pivots = pivotLevels(lastCandle);
  const swings = swingLevels(candles);
  const levels: Levels = {
    ...pivots,
    swingHigh: swings.high,
    swingLow: swings.low,
  };

  const vs20 = sma20 ? lastClose - sma20 : 0;
  const vs50 = sma50 ? lastClose - sma50 : 0;
  const vs200 = sma200 ? lastClose - sma200 : 0;

  let score = 0;
  if (sma20) score += vs20 > 0 ? 1 : -1;
  if (sma50) score += vs50 > 0 ? 1 : -1;
  if (sma200) score += vs200 > 0 ? 1 : -1;
  if (histNow != null) score += histNow > 0 ? 1 : -1;
  if (rsiNow != null) {
    if (rsiNow >= 55) score += 1;
    else if (rsiNow <= 45) score -= 1;
  }

  const bias: Analysis["bias"] =
    score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";

  const dayMove = lastCandle.close - lastCandle.open;
  const dayPct = (dayMove / lastCandle.open) * 100;

  const headline =
    bias === "bullish"
      ? `Bank Nifty holds a bullish structure near ${format(lastClose)}`
      : bias === "bearish"
        ? `Bank Nifty is in a bearish stretch near ${format(lastClose)}`
        : `Bank Nifty is range-bound around ${format(lastClose)}`;

  const trendBits: string[] = [];
  if (sma20) {
    trendBits.push(
      `price is ${vs20 >= 0 ? "above" : "below"} the 20-session average (${format(sma20)})`,
    );
  }
  if (sma50) {
    trendBits.push(
      `${vs50 >= 0 ? "above" : "below"} the 50-session average (${format(sma50)})`,
    );
  }
  if (sma200) {
    trendBits.push(
      `${vs200 >= 0 ? "above" : "below"} the 200-session average (${format(sma200)})`,
    );
  }

  const summary = `Last session closed ${dayMove >= 0 ? "up" : "down"} ${format(Math.abs(dayPct))}% at ${format(lastClose)}, ${trendBits.join(", ")}. ${
    rsiNow != null
      ? `RSI is ${format(rsiNow)}, ${
          rsiNow >= 70
            ? "in overbought territory"
            : rsiNow <= 30
              ? "in oversold territory"
              : "neither overbought nor oversold"
        }.`
      : ""
  } This is a technical readout from Yahoo Finance candles, not a trade recommendation.`;

  const bullets: string[] = [];
  if (sma20 && sma50) {
    bullets.push(
      sma20 > sma50
        ? `Short-term average (${format(sma20)}) sits above the 50-session average — short-term trend still leads higher.`
        : `Short-term average (${format(sma20)}) is below the 50-session average — pullback is in control on the daily structure.`,
    );
  }
  if (macdNow != null && signalNow != null && histNow != null) {
    bullets.push(
      histNow >= 0
        ? `MACD histogram is positive (${format(histNow)}), so momentum still favours the upside versus the signal line.`
        : `MACD histogram is negative (${format(histNow)}), so downside momentum still has the edge.`,
    );
  }
  if (atrNow) {
    bullets.push(
      `14-session ATR is ${format(atrNow)} points — a typical daily swing is about ${(
        (atrNow / lastClose) *
        100
      ).toFixed(2)}% of the index.`,
    );
  }
  bullets.push(
    `Classic pivots from the last candle: support ${format(levels.s1)} / ${format(levels.s2)}, resistance ${format(levels.r1)} / ${format(levels.r2)}.`,
  );
  bullets.push(
    `Recent 60-session range: ${format(levels.swingLow)} – ${format(levels.swingHigh)}.`,
  );

  return {
    bias,
    headline,
    summary,
    bullets,
    rsi: rsiNow,
    macd:
      macdNow != null && signalNow != null && histNow != null
        ? { macd: macdNow, signal: signalNow, histogram: histNow }
        : null,
    sma20,
    sma50,
    sma200,
    atr: atrNow,
    levels,
  };
}
