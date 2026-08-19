"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NextMoveCard } from "@/components/next-move-card";
import { PriceChart } from "@/components/price-chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { BankNiftyResponse, RangeKey } from "@/lib/types";
import { REFRESH_MS } from "@/lib/refresh";
import { cn } from "@/lib/utils";

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "1d", label: "1D" },
  { id: "5d", label: "5D" },
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "2y", label: "2Y" },
];

function inr(n: number, digits = 2) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatIst(seconds: number) {
  return new Date(seconds * 1000).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function BiasIcon({ bias }: { bias: BankNiftyResponse["analysis"]["bias"] }) {
  if (bias === "bullish") return <ArrowUpRight className="size-4" />;
  if (bias === "bearish") return <ArrowDownRight className="size-4" />;
  return <Minus className="size-4" />;
}

type DashboardProps = {
  initialData: BankNiftyResponse | null;
};

export function Dashboard({ initialData }: DashboardProps) {
  const [range, setRange] = useState<RangeKey>("6mo");
  const [data, setData] = useState<BankNiftyResponse | null>(initialData);
  const [error, setError] = useState<string | null>(
    initialData
      ? null
      : "Yahoo Finance did not return Bank Nifty on first load.",
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextRange: RangeKey, silent = false) => {
    setRange(nextRange);
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/banknifty?range=${nextRange}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Could not load Bank Nifty");
      }
      setData(body as BankNiftyResponse);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Could not load Bank Nifty");
        setData(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load(range, true);
    };
    const id = window.setInterval(tick, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load(range, true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, range]);

  const quote = data?.quote;
  const up = (quote?.change ?? 0) >= 0;
  const analysis = data?.analysis;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-sky-400 uppercase">
            NSE index
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Bank Nifty
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live NIFTY BANK (^NSEBANK) with a same-session options playbook.
            The chart and quote cards auto-refresh every 18 seconds while this
            tab is open (Yahoo can still lag the NSE tape).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/move" className={buttonVariants({ variant: "outline" })}>
            Phone view
          </Link>
          <Button
            variant="outline"
            onClick={() => void load(range)}
            disabled={loading}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Chart unavailable
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void load(range)}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading && !quote ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : quote ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Last price</CardDescription>
                <CardTitle className="font-mono text-3xl tabular-nums">
                  {inr(quote.price)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    up ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {up ? (
                    <ArrowUpRight className="size-4" />
                  ) : (
                    <ArrowDownRight className="size-4" />
                  )}
                  {up ? "+" : ""}
                  {inr(quote.change)} ({up ? "+" : ""}
                  {quote.changePercent.toFixed(2)}%)
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Session range</CardDescription>
                <CardTitle className="font-mono text-xl tabular-nums">
                  {inr(quote.dayLow)} – {inr(quote.dayHigh)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Prev close {inr(quote.previousClose)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>52-week range</CardDescription>
                <CardTitle className="font-mono text-xl tabular-nums">
                  {inr(quote.fiftyTwoWeekLow, 0)} –{" "}
                  {inr(quote.fiftyTwoWeekHigh, 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {quote.fiftyTwoWeekHigh
                  ? `${((quote.price / quote.fiftyTwoWeekHigh - 1) * 100).toFixed(1)}% from high`
                  : "—"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Structure</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl capitalize">
                  {analysis ? <BiasIcon bias={analysis.bias} /> : null}
                  {analysis?.bias ?? "—"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                RSI {analysis?.rsi != null ? analysis.rsi.toFixed(1) : "—"} ·
                SMA20{" "}
                {analysis?.sma20 != null ? inr(analysis.sma20, 0) : "—"}
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>

      {analysis?.nextMove ? <NextMoveCard plan={analysis.nextMove} /> : null}

      <Card className="overflow-hidden">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Price chart</CardTitle>
            <CardDescription>
              Candles with 20-period SMA. Auto-refreshes every 18 seconds while
              this tab is visible. Yahoo index prints can still lag NSE.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            {RANGES.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={range === item.id ? "default" : "ghost"}
                onClick={() => void load(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <Skeleton className="h-[320px] w-full sm:h-[420px]" />
          ) : data && data.candles.length === 0 ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground sm:h-[420px]">
              <Activity className="size-8 opacity-50" />
              No candles for this range yet. Markets may be closed, or Yahoo
              has not published the session.
            </div>
          ) : data ? (
            <PriceChart candles={data.candles} />
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Technical read</CardTitle>
              {analysis ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize",
                    analysis.bias === "bullish" &&
                      "bg-emerald-500/15 text-emerald-300",
                    analysis.bias === "bearish" &&
                      "bg-rose-500/15 text-rose-300",
                  )}
                >
                  {analysis.bias}
                </Badge>
              ) : null}
            </div>
            <CardDescription>
              Built from two years of daily candles so SMA 200 and RSI stay
              stable when you zoom the chart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && !analysis ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : analysis ? (
              <>
                <h2 className="text-lg font-medium leading-snug">
                  {analysis.headline}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.summary}
                </p>
                <ul className="space-y-2 text-sm">
                  {analysis.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="border-l-2 border-sky-500/50 pl-3 text-muted-foreground"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Levels</CardTitle>
            <CardDescription>Pivots and recent swing range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && !analysis ? (
              <Skeleton className="h-48 w-full" />
            ) : analysis?.levels ? (
              [
                ["R2", analysis.levels.r2],
                ["R1", analysis.levels.r1],
                ["Pivot", analysis.levels.pivot],
                ["S1", analysis.levels.s1],
                ["S2", analysis.levels.s2],
                ["60d high", analysis.levels.swingHigh],
                ["60d low", analysis.levels.swingLow],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between font-mono text-sm tabular-nums"
                >
                  <span className="font-sans text-muted-foreground">
                    {label}
                  </span>
                  <span>{inr(Number(value))}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Levels appear once daily candles load.
              </p>
            )}
            {analysis?.macd ? (
              <div className="border-t pt-3 text-sm text-muted-foreground">
                MACD {analysis.macd.macd.toFixed(2)} · signal{" "}
                {analysis.macd.signal.toFixed(2)} · hist{" "}
                {analysis.macd.histogram.toFixed(2)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <footer className="pb-6 text-xs text-muted-foreground">
        {data ? (
          <p>
            {data.source}. Last market print{" "}
            {quote ? formatIst(quote.marketTime) : "—"}. Fetched{" "}
            {formatWhen(data.fetchedAt)} IST. Auto-refresh 18s. Not investment
            advice.
          </p>
        ) : (
          <p>Not investment advice. Data via Yahoo Finance.</p>
        )}
      </footer>
    </main>
  );
}
