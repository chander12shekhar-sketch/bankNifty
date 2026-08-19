import type { Candle, Levels, NextMove, OptionsSide, Quote } from "./types";

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function roundStrike(price: number, step = 100) {
  return Math.round(price / step) * step;
}

function format(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function istNow(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const mins = hour * 60 + minute;
  return {
    weekday,
    hour,
    minute,
    mins,
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function cashMarketStatus(at = new Date()): NextMove["marketStatus"] {
  const { weekday, mins } = istNow(at);
  if (weekday === "Sat" || weekday === "Sun") return "closed";
  if (mins < 9 * 60 + 15) return "preopen";
  if (mins >= 15 * 60 + 30) return "closed";
  return "open";
}

function nextTuesdayHint(at = new Date()) {
  const { weekday, ymd } = istNow(at);
  const daysAhead: Record<string, number> = {
    Tue: 0,
    Wed: 6,
    Thu: 5,
    Fri: 4,
    Sat: 3,
    Sun: 2,
    Mon: 1,
  };
  const add = daysAhead[weekday] ?? 0;
  if (add === 0) {
    return `BANKNIFTY weekly is typically Tuesday — today (${ymd} IST) may be expiry. Confirm on NSE before you buy; theta burns ATM options into the close.`;
  }
  return `Use the nearest BANKNIFTY weekly (often Tuesday). Confirm the exact expiry on NSE before you send the order.`;
}

function openingRange(intraday: Candle[]) {
  const first = intraday.slice(0, 3);
  if (first.length < 3) return null;
  return {
    high: Math.max(...first.map((c) => c.high)),
    low: Math.min(...first.map((c) => c.low)),
  };
}

function intradayLean(intraday: Candle[], price: number) {
  if (intraday.length < 6) return 0;
  const sessionHigh = Math.max(...intraday.map((c) => c.high));
  const sessionLow = Math.min(...intraday.map((c) => c.low));
  const mid = (sessionHigh + sessionLow) / 2;
  const recent = intraday.slice(-3);
  const recentUp = recent.filter((c) => c.close >= c.open).length;
  let score = 0;
  if (price > mid) score += 1;
  else if (price < mid) score -= 1;
  if (recentUp >= 2) score += 1;
  else if (recentUp <= 1) score -= 1;
  const lastBar = last(intraday)!;
  if (lastBar.close > lastBar.open) score += 1;
  else score -= 1;
  return score;
}

export function buildNextMove(input: {
  quote: Quote;
  daily: Candle[];
  intraday: Candle[];
  bias: "bullish" | "bearish" | "neutral";
  levels: Levels | null;
  atr: number | null;
  rsi: number | null;
}): NextMove {
  const { quote, daily, intraday, bias, levels, atr, rsi } = input;
  const status = cashMarketStatus();
  const price = quote.price;
  const atm = roundStrike(price);
  const sessionLabel =
    status === "open"
      ? "Today's remaining session"
      : status === "preopen"
        ? "Today's session (before 9:15 IST)"
        : "Next cash session";

  const pivot = levels?.pivot ?? price;
  const r1 = levels?.r1 ?? price + 150;
  const s1 = levels?.s1 ?? price - 150;
  const r2 = levels?.r2 ?? price + 300;
  const s2 = levels?.s2 ?? price - 300;
  const swing = atr && atr > 0 ? atr * 0.55 : 300;
  const orb = openingRange(intraday);
  const intra = intradayLean(intraday, price);
  const lastDaily = last(daily);
  const insideDay =
    lastDaily != null &&
    quote.dayHigh <= lastDaily.high &&
    quote.dayLow >= lastDaily.low;

  let direction: NextMove["direction"] = "range";
  let confidence: NextMove["confidence"] = "low";
  let side: OptionsSide = "NONE";

  const dailyDown = bias === "bearish";
  const dailyUp = bias === "bullish";
  const belowPivot = price < pivot;
  const abovePivot = price > pivot;

  if (dailyDown && (belowPivot || intra < 0)) {
    direction = "down";
    side = "PE";
    confidence = dailyDown && belowPivot && intra < 0 ? "medium" : "low";
    if (dailyDown && belowPivot && intra <= -2) confidence = "high";
  } else if (dailyUp && (abovePivot || intra > 0)) {
    direction = "up";
    side = "CE";
    confidence = dailyUp && abovePivot && intra > 0 ? "medium" : "low";
    if (dailyUp && abovePivot && intra >= 2) confidence = "high";
  } else {
    direction = "range";
    side = "NONE";
    confidence = "low";
  }

  if (rsi != null && rsi >= 70 && direction === "up") {
    confidence = "low";
  }
  if (rsi != null && rsi <= 30 && direction === "down") {
    confidence = "low";
  }

  const trigger =
    direction === "down"
      ? Math.min(s1, orb?.low ?? s1, quote.dayLow)
      : direction === "up"
        ? Math.max(r1, orb?.high ?? r1, quote.dayHigh)
        : pivot;
  const target =
    direction === "down"
      ? Math.min(s2, trigger - swing)
      : direction === "up"
        ? Math.max(r2, trigger + swing)
        : r1;
  const invalidation =
    direction === "down"
      ? Math.max(pivot, orb?.high ?? pivot)
      : direction === "up"
        ? Math.min(pivot, orb?.low ?? pivot)
        : s1;

  const triggerLive =
    direction === "down"
      ? price < trigger
      : direction === "up"
        ? price > trigger
        : false;
  const otm = side === "PE" ? atm - 100 : side === "CE" ? atm + 100 : atm;

  const action =
    side === "PE"
      ? `Buy ${format(atm)} PE only after the trigger. Cheaper debit: ${format(otm)} PE.`
      : side === "CE"
        ? `Buy ${format(atm)} CE only after the trigger. Cheaper debit: ${format(otm)} CE.`
        : dailyDown
          ? `Do not buy yet. Daily lean is down: buy ${format(atm)} PE only on a 5-minute close under ${format(quote.dayLow)}. Against-trend ${format(atm)} CE only if ${format(quote.dayHigh)} breaks.`
          : dailyUp
            ? `Do not buy yet. Daily lean is up: buy ${format(atm)} CE only on a 5-minute close over ${format(quote.dayHigh)}. Against-trend ${format(atm)} PE only if ${format(quote.dayLow)} breaks.`
            : `Do not buy CE or PE yet. Wait for a break of ${format(quote.dayHigh)} (calls) or ${format(quote.dayLow)} (puts).`;

  const headline =
    direction === "down"
      ? `Next move lean: down. Plan a PE if ${format(trigger)} breaks.`
      : direction === "up"
        ? `Next move lean: up. Plan a CE if ${format(trigger)} breaks.`
        : dailyDown
          ? `Next move: chop first. Daily lean still down — no PE until ${format(quote.dayLow)} breaks.`
          : dailyUp
            ? `Next move: chop first. Daily lean still up — no CE until ${format(quote.dayHigh)} breaks.`
            : `Next move: sideways until a range break. Stand aside on options.`;

  const whyParts: string[] = [];
  whyParts.push(
    `Daily structure is ${bias}, last price ${format(price)} is ${belowPivot ? "below" : abovePivot ? "above" : "at"} pivot ${format(pivot)}.`,
  );
  if (intraday.length >= 6) {
    whyParts.push(
      intra < 0
        ? "5-minute tape is still offering lower."
        : intra > 0
          ? "5-minute tape is still offering higher."
          : "5-minute tape is mixed.",
    );
  } else {
    whyParts.push("Intraday tape is thin, so this is a next-session plan, not a live scalp.");
  }
  if (insideDay) {
    whyParts.push("Price is still an inside-day versus the previous daily candle — fake breaks are common.");
  }

  const triggerNote =
    direction === "down"
      ? `Need a 5-minute close under ${format(trigger)} (S1 / session low / opening-range low). Do not buy PE while price holds above that.`
      : direction === "up"
        ? `Need a 5-minute close over ${format(trigger)} (R1 / session high / opening-range high). Do not buy CE while price holds below that.`
        : `No directional trigger until the index leaves ${format(quote.dayLow)} – ${format(quote.dayHigh)}.`;

  const timeStop =
    status === "open"
      ? "If the trigger has not printed by 14:30 IST, skip the option. Do not hold a same-day debit into the close without a live trigger."
      : "Trade the first 90 minutes of the next cash session only. If there is no break by 11:00 IST, stand down.";

  const rules = [
    "This is a technical scenario, not a signal that the option will make money.",
    "Buy only after the trigger close. Chasing ATM before the break is how premium dies.",
    "Risk is the full premium. Use one lot until the method is proven in your own blotter.",
    "If price trades through invalidation, exit — do not average the option.",
    "Index options decay all day. A correct direction with a late entry still loses.",
  ];

  return {
    sessionLabel,
    marketStatus: status,
    direction,
    confidence,
    headline,
    why: whyParts.join(" "),
    side,
    action,
    atmStrike: atm,
    otmStrike: otm,
    expiryHint: nextTuesdayHint(),
    trigger,
    triggerNote,
    target,
    invalidation,
    timeStop,
    triggerLive,
    rules,
  };
}
