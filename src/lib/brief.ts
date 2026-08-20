import type { BankNiftyResponse } from "./types";

function n(value: number, digits = 2) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function n0(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatBrief(data: BankNiftyResponse): string {
  const q = data.quote;
  const a = data.analysis;
  const move = a.nextMove;
  const chg = `${q.change >= 0 ? "+" : ""}${n(q.change)} (${q.change >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`;
  const lines = [
    `BANK NIFTY BRIEF — ${new Date(data.fetchedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
    `Spot ${n(q.price)}  ${chg}`,
    `Session ${n(q.dayLow)} – ${n(q.dayHigh)}  |  Prev close ${n(q.previousClose)}`,
    `Structure ${a.bias.toUpperCase()}  |  RSI ${a.rsi != null ? a.rsi.toFixed(1) : "n/a"}  |  SMA20 ${a.sma20 != null ? n0(a.sma20) : "n/a"}`,
    "",
  ];

  if (move) {
    const moveLines = [
      `NEXT MOVE (${move.sessionLabel}, market ${move.marketStatus}, ${move.confidence} confidence)`,
      `BUY ${move.buyContract}`,
      `WHEN: ${move.whenToBuy}`,
      `Window ${move.entryWindow}`,
      `Trigger ${n0(move.trigger)}${move.triggerLive ? " — IN PLAY" : " — wait"}  |  Target ${n0(move.target)}  |  Invalidation ${n0(move.invalidation)}`,
      `CALL ${move.probabilityCall}%  strike ${n0(move.callStrike)} CE`,
      `PUT  ${move.probabilityPut}%  strike ${n0(move.putStrike)} PE`,
      `Range ${move.probabilityRange}%`,
      move.indiaVix != null ? `India VIX ${move.indiaVix.toFixed(1)}` : "",
      move.triggerNote,
      move.timeStop,
      move.expiryHint,
      `Why: ${move.why}`,
      "",
    ].filter((line) => line !== "");
    lines.push(...moveLines);
  }

  lines.push(a.headline, a.summary, "");
  for (const bullet of a.bullets) lines.push(`- ${bullet}`);
  lines.push(
    "",
    "Not investment advice. Options can expire worthless. Confirm expiry and lot size on NSE.",
    `Source: ${data.source}`,
  );
  return lines.join("\n");
}
