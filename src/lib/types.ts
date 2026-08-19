export type RangeKey = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Quote = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  exchange: string;
  timezone: string;
  marketTime: number;
};

export type Levels = {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
  swingHigh: number;
  swingLow: number;
};

export type OptionsSide = "CE" | "PE" | "NONE";

export type NextMove = {
  sessionLabel: string;
  marketStatus: "open" | "closed" | "preopen";
  direction: "up" | "down" | "range";
  confidence: "low" | "medium" | "high";
  headline: string;
  why: string;
  side: OptionsSide;
  action: string;
  atmStrike: number;
  otmStrike: number;
  expiryHint: string;
  trigger: number;
  triggerNote: string;
  target: number;
  invalidation: number;
  timeStop: string;
  triggerLive: boolean;
  rules: string[];
};

export type Analysis = {
  bias: "bullish" | "bearish" | "neutral";
  headline: string;
  summary: string;
  bullets: string[];
  rsi: number | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  atr: number | null;
  levels: Levels | null;
  nextMove: NextMove | null;
};

export type BankNiftyResponse = {
  quote: Quote;
  candles: Candle[];
  analysis: Analysis;
  range: RangeKey;
  source: string;
  fetchedAt: string;
};
