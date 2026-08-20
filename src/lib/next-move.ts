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
  return {
    weekday,
    hour,
    minute,
    mins: hour * 60 + minute,
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    day: Number(get("day")),
    month: Number(get("month")),
    year: Number(get("year")),
  };
}

export function cashMarketStatus(at = new Date()): NextMove["marketStatus"] {
  const { weekday, mins } = istNow(at);
  if (weekday === "Sat" || weekday === "Sun") return "closed";
  if (mins < 9 * 60 + 15) return "preopen";
  if (mins >= 15 * 60 + 30) return "closed";
  return "open";
}

function istYmdFromUnix(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function addIstDays(at: Date, days: number) {
  const cur = istNow(at);
  const utc = Date.UTC(cur.year, cur.month - 1, cur.day + days, 6, 0, 0);
  return new Date(utc);
}

function formatIstDate(at: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(at);
}

/** BANKNIFTY weekly expiry is typically Tuesday. Confirm on NSE. */
function nextWeeklyExpiry(at = new Date()) {
  const { weekday, mins } = istNow(at);
  const ahead: Record<string, number> = {
    Tue: mins >= 15 * 60 + 30 ? 7 : 0,
    Wed: 6,
    Thu: 5,
    Fri: 4,
    Sat: 3,
    Sun: 2,
    Mon: 1,
  };
  const add = ahead[weekday] ?? 1;
  const expiry = addIstDays(at, add);
  const label = formatIstDate(expiry);
  const isExpirySession =
    weekday === "Tue" && mins < 15 * 60 + 30 && cashMarketStatus(at) !== "closed";
  return { label, isExpirySession, date: expiry };
}

function emaLast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

function openingRange(intraday: Candle[]) {
  const first = intraday.slice(0, 3);
  if (first.length < 3) return null;
  return {
    high: Math.max(...first.map((c) => c.high)),
    low: Math.min(...first.map((c) => c.low)),
  };
}

function previousSession(daily: Candle[], todayYmd: string) {
  if (daily.length === 0) return null;
  const lastBar = last(daily)!;
  const lastYmd = istYmdFromUnix(lastBar.time);
  if (lastYmd === todayYmd) {
    return daily.length >= 2 ? daily[daily.length - 2] : null;
  }
  return lastBar;
}

function scenarioProbs(score: number, vix: number | null, expiryChop: boolean) {
  const rangeBias = (vix != null && vix >= 16 ? 1.7 : 1.1) + (expiryChop ? 0.8 : 0);
  const up = Math.exp(score / 2.2);
  const down = Math.exp(-score / 2.2);
  const range = Math.exp(rangeBias);
  const z = up + down + range;
  const probabilityCall = Math.round((up / z) * 100);
  let probabilityPut = Math.round((down / z) * 100);
  let probabilityRange = 100 - probabilityCall - probabilityPut;
  if (probabilityRange < 0) {
    probabilityPut += probabilityRange;
    probabilityRange = 0;
  }
  return { probabilityCall, probabilityPut, probabilityRange };
}

function strikesFromProbability(
  atm: number,
  callPct: number,
  putPct: number,
  rangePct: number,
  vixOtm: boolean,
) {
  let callStrike = atm;
  let putStrike = atm;
  if (rangePct >= callPct && rangePct >= putPct) {
    callStrike = atm + 100;
    putStrike = atm - 100;
  } else if (putPct >= callPct) {
    putStrike = atm;
    callStrike = atm + (putPct >= 55 ? 200 : 100);
    if (vixOtm) putStrike -= 100;
  } else {
    callStrike = atm;
    putStrike = atm - (callPct >= 55 ? 200 : 100);
    if (vixOtm) callStrike += 100;
  }
  return { callStrike, putStrike };
}

function cprFrom(candle: Candle) {
  const pivot = (candle.high + candle.low + candle.close) / 3;
  const bc = (candle.high + candle.low) / 2;
  const tc = pivot * 2 - bc;
  const top = Math.max(tc, bc);
  const bottom = Math.min(tc, bc);
  return { pivot, tc: top, bc: bottom };
}

export function buildNextMove(input: {
  quote: Quote;
  daily: Candle[];
  intraday: Candle[];
  bias: "bullish" | "bearish" | "neutral";
  levels: Levels | null;
  atr: number | null;
  rsi: number | null;
  indiaVix?: number | null;
}): NextMove {
  const { quote, daily, intraday, bias, atr, rsi, indiaVix = null } = input;
  const now = new Date();
  const status = cashMarketStatus(now);
  const ist = istNow(now);
  const price = quote.price;
  const expiry = nextWeeklyExpiry(now);
  const prev = previousSession(daily, ist.ymd);
  const cpr = prev ? cprFrom(prev) : null;
  const pdh = prev?.high ?? quote.dayHigh;
  const pdl = prev?.low ?? quote.dayLow;
  const orb = openingRange(intraday);
  const closes5 = intraday.map((c) => c.close);
  const ema9 = emaLast(closes5, 9);
  const ema21 = emaLast(closes5, 21);
  const swing = atr && atr > 0 ? atr * 0.5 : 280;

  let score = 0;
  if (bias === "bearish") score -= 2;
  if (bias === "bullish") score += 2;
  if (cpr) {
    if (price < cpr.bc) score -= 2;
    else if (price > cpr.tc) score += 2;
  }
  if (price < pdl) score -= 1;
  if (price > pdh) score += 1;
  if (ema9 != null && ema21 != null) {
    if (ema9 < ema21) score -= 1;
    else if (ema9 > ema21) score += 1;
  }
  if (rsi != null && rsi >= 60) score += 1;
  if (rsi != null && rsi <= 40) score -= 1;
  if (intraday.length >= 3) {
    const recent = intraday.slice(-3);
    const down = recent.filter((c) => c.close < c.open).length;
    if (down >= 2) score -= 1;
    if (down <= 1 && recent.filter((c) => c.close > c.open).length >= 2) score += 1;
  }

  let direction: NextMove["direction"] = "range";
  let side: OptionsSide = "NONE";
  let confidence: NextMove["confidence"] = "low";
  if (score <= -3) {
    direction = "down";
    side = "PE";
    confidence = score <= -5 ? "high" : "medium";
  } else if (score >= 3) {
    direction = "up";
    side = "CE";
    confidence = score >= 5 ? "high" : "medium";
  }

  if (indiaVix != null && indiaVix >= 18 && confidence === "high") {
    confidence = "medium";
  }
  const expiryChop = expiry.isExpirySession && ist.mins >= 13 * 60;
  if (expiryChop) {
    direction = "range";
    side = "NONE";
    confidence = "low";
  }

  const { probabilityCall, probabilityPut, probabilityRange } = scenarioProbs(
    score,
    indiaVix,
    expiryChop,
  );

  const preferOtm = indiaVix != null && indiaVix >= 16;
  const atm = roundStrike(price);
  const { callStrike, putStrike } = strikesFromProbability(
    atm,
    probabilityCall,
    probabilityPut,
    probabilityRange,
    preferOtm,
  );

  if (!expiryChop) {
    if (probabilityRange >= probabilityCall && probabilityRange >= probabilityPut) {
      direction = "range";
      side = "NONE";
    } else if (probabilityPut >= probabilityCall) {
      direction = "down";
      side = "PE";
      confidence =
        probabilityPut >= 55 ? "high" : probabilityPut >= 40 ? "medium" : "low";
    } else {
      direction = "up";
      side = "CE";
      confidence =
        probabilityCall >= 55 ? "high" : probabilityCall >= 40 ? "medium" : "low";
    }
  }

  const peBreak = Math.min(pdl, cpr?.bc ?? pdl, orb?.low ?? pdl);
  const ceBreak = Math.max(pdh, cpr?.tc ?? pdh, orb?.high ?? pdh);
  const trigger =
    direction === "down" ? peBreak : direction === "up" ? ceBreak : cpr?.pivot ?? price;
  const target =
    direction === "down"
      ? trigger - swing
      : direction === "up"
        ? trigger + swing
        : (cpr?.tc ?? trigger + 150);
  const invalidation =
    direction === "down"
      ? Math.max(cpr?.pivot ?? trigger + 120, orb?.high ?? trigger + 120)
      : direction === "up"
        ? Math.min(cpr?.pivot ?? trigger - 120, orb?.low ?? trigger - 120)
        : (cpr?.bc ?? trigger - 150);

  const triggerLive =
    direction === "down"
      ? price < trigger
      : direction === "up"
        ? price > trigger
        : false;

  const buyStrike = side === "PE" ? putStrike : side === "CE" ? callStrike : atm;
  const otmStrike =
    side === "PE" ? putStrike - 100 : side === "CE" ? callStrike + 100 : atm;

  const buyContract =
    side === "NONE"
      ? "No contract yet — wait for the trigger"
      : `BANKNIFTY ${expiry.label} ${format(buyStrike)} ${side}`;

  const primaryWindow = expiry.isExpirySession
    ? "09:30–12:30 IST"
    : "09:30–11:15 IST";
  const secondWindow = expiry.isExpirySession ? "none (expiry)" : "12:15–14:15 IST";
  const hardStop = expiry.isExpirySession ? "12:30 IST" : "14:30 IST";

  const sessionLabel =
    status === "open"
      ? "Today's remaining session"
      : status === "preopen"
        ? "Today before the open"
        : "Next cash session";

  const whenToBuy =
    side === "NONE"
      ? `Do not buy CE or PE now. Watch 09:30 IST onward. PE only after a 5-minute close below ${format(peBreak)}. CE only after a 5-minute close above ${format(ceBreak)}. No new buy after ${hardStop}.`
      : triggerLive && status === "open" && ist.mins >= 9 * 60 + 30
        ? `Trigger is live. Buy ${format(buyStrike)} ${side} on the next 5-minute close that still holds ${side === "PE" ? "below" : "above"} ${format(trigger)}. Do it now through ${hardStop}, not in the last 30 minutes.`
        : status === "open" && ist.mins < 9 * 60 + 30
          ? `Do not buy in the 09:15–09:30 opening range. After 09:30 IST, buy ${format(buyStrike)} ${side} on the first 5-minute close ${side === "PE" ? "below" : "above"} ${format(trigger)}.`
          : `Next cash session: skip 09:15–09:30. Buy ${format(buyStrike)} ${side} after 09:30 IST on the first 5-minute close ${side === "PE" ? "below" : "above"} ${format(trigger)}. Best ${primaryWindow}. If missed, ${secondWindow === "none (expiry)" ? "stand down" : `second chance ${secondWindow}`}. No new buy after ${hardStop}.`;

  const entryWindow =
    status === "open" && ist.mins >= 9 * 60 + 30
      ? `Now until ${hardStop}`
      : primaryWindow;

  const action =
    side === "NONE"
      ? `Range is the top outcome (${probabilityRange}%). Do not buy yet. If ${format(peBreak)} breaks, buy ${format(putStrike)} PE (${probabilityPut}%). If ${format(ceBreak)} breaks, buy ${format(callStrike)} CE (${probabilityCall}%). After 09:30 IST, before ${hardStop}.`
      : `Buy ${buyContract} — PUT ${probabilityPut}% vs CALL ${probabilityCall}%. One lot after a 5-minute close ${side === "PE" ? "under" : "over"} ${format(trigger)}. Alternate: ${format(otmStrike)} ${side}.`;

  const headline =
    side === "NONE"
      ? `Range ${probabilityRange}% — CALL ${format(callStrike)} (${probabilityCall}%) / PUT ${format(putStrike)} (${probabilityPut}%)`
      : `${side === "PE" ? "PUT" : "CALL"} ${format(buyStrike)} (${side === "PE" ? probabilityPut : probabilityCall}%) vs ${side === "PE" ? "CALL" : "PUT"} ${format(side === "PE" ? callStrike : putStrike)} (${side === "PE" ? probabilityCall : probabilityPut}%)`;

  const whyParts: string[] = [];
  whyParts.push(
    `Probabilities (technical, not a forecast): CALL ${probabilityCall}% · PUT ${probabilityPut}% · range ${probabilityRange}%. Daily structure ${bias} (score ${score}).`,
  );
  if (cpr) {
    whyParts.push(
      `CPR ${format(cpr.bc)}–${format(cpr.tc)}; spot is ${
        price < cpr.bc ? "below BC (bearish)" : price > cpr.tc ? "above TC (bullish)" : "inside CPR (chop risk)"
      }.`,
    );
  }
  whyParts.push(`PDH ${format(pdh)} / PDL ${format(pdl)}.`);
  if (ema9 != null && ema21 != null) {
    whyParts.push(
      `5-min EMA9 ${format(ema9)} is ${ema9 >= ema21 ? "above" : "below"} EMA21 ${format(ema21)}.`,
    );
  }
  if (indiaVix != null) {
    whyParts.push(
      `India VIX ${indiaVix.toFixed(1)} — ${
        indiaVix >= 16 ? "options are richer, so the plan uses slightly OTM" : "premium is not stretched, ATM of the trigger is preferred"
      }.`,
    );
  }
  if (expiry.isExpirySession) {
    whyParts.push("Tuesday looks like weekly expiry — theta is fast after lunch; no new buys after 12:30 IST.");
  }

  const triggerNote =
    side === "PE"
      ? `Entry trigger: 5-minute candle close below ${format(trigger)} (PDL / CPR BC / opening-range low).`
      : side === "CE"
        ? `Entry trigger: 5-minute candle close above ${format(trigger)} (PDH / CPR TC / opening-range high).`
        : `No buy until a 5-minute close outside ${format(peBreak)} – ${format(ceBreak)}.`;

  const timeStop = `Hard stop for new buys: ${hardStop}. If the index hits invalidation ${format(invalidation)}, exit the option — do not average.`;

  const rules = [
    `Contract to buy if triggered: ${buyContract}. Live CALL ${format(callStrike)} (${probabilityCall}%) / PUT ${format(putStrike)} (${probabilityPut}%). Confirm on NSE.`,
    "Buy only after the 5-minute close, never inside the 09:15–09:30 opening range.",
    "This is a technical playbook from Yahoo index candles plus India VIX, not a guaranteed payout.",
    "Risk is the full premium. One lot. No averaging.",
    "If you miss the first window, do not chase a 200+ point spike; wait for the second window or skip.",
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
    otmStrike,
    expiryHint: `Nearest BANKNIFTY weekly expiry used here: ${expiry.label} (typically Tuesday). Confirm on NSE.`,
    trigger,
    triggerNote,
    target,
    invalidation,
    timeStop,
    triggerLive,
    buyContract,
    buyStrike,
    whenToBuy,
    entryWindow,
    expiryDate: expiry.label,
    indiaVix,
    probabilityCall,
    probabilityPut,
    probabilityRange,
    callStrike,
    putStrike,
    rules,
  };
}
