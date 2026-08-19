"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { NextMoveCard } from "@/components/next-move-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBrief } from "@/lib/brief";
import { cashMarketStatus } from "@/lib/next-move";
import type { BankNiftyResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function inr(n: number) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function MoveDesk({ initialData }: { initialData: BankNiftyResponse | null }) {
  const [data, setData] = useState<BankNiftyResponse | null>(initialData);
  const [error, setError] = useState<string | null>(
    initialData ? null : "Could not load Bank Nifty on first paint.",
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/banknifty/brief", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not refresh Bank Nifty");
      setData(body as BankNiftyResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh Bank Nifty");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(() => {
      const status = cashMarketStatus();
      if (status === "open" || status === "preopen") void load();
    }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [load]);

  const quote = data?.quote;
  const up = (quote?.change ?? 0) >= 0;
  const move = data?.analysis.nextMove;

  const [copied, setCopied] = useState(false);

  const briefText = data ? formatBrief(data) : "";

  async function copyBrief() {
    if (!briefText) return;
    await navigator.clipboard.writeText(briefText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    const text = briefText || "Bank Nifty next move";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Bank Nifty next move", text });
      } catch {
        /* user cancelled */
      }
      return;
    }
    await copyBrief();
  }

  function sendWhatsApp() {
    if (!briefText) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(briefText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-5 pb-10 sm:max-w-2xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-sky-400 uppercase">
            On demand
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Next move</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use this page, WhatsApp, or a Cursor cloud agent from your phone.
            No Automations required.
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      </header>

      {quote ? (
        <div className="rounded-xl border px-4 py-3">
          <p className="text-xs text-muted-foreground">NIFTY BANK</p>
          <p className="font-mono text-3xl tabular-nums">{inr(quote.price)}</p>
          <p
            className={cn(
              "text-sm font-medium",
              up ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {up ? "+" : ""}
            {inr(quote.change)} ({up ? "+" : ""}
            {quote.changePercent.toFixed(2)}%)
          </p>
        </div>
      ) : loading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {loading && !move ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : move ? (
        <NextMoveCard plan={move} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void copyBrief()} disabled={!briefText}>
          <Copy className="size-4" />
          {copied ? "Copied" : "Copy brief"}
        </Button>
        <Button variant="outline" onClick={() => void share()} disabled={!briefText}>
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="outline" onClick={sendWhatsApp} disabled={!briefText}>
          <MessageCircle className="size-4" />
          WhatsApp
        </Button>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Full chart
        </Link>
      </div>

      <section className="space-y-3 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">From a phone, without Automations</p>
        <ol className="list-decimal space-y-2 pl-4">
          <li>
            <span className="text-foreground">Bookmark this page</span> after you
            host the desk, then Add to Home Screen. Reopen it whenever you want
            a live CE/PE plan.
          </li>
          <li>
            <span className="text-foreground">Cursor on the phone:</span> iOS app,
            or Chrome →{" "}
            <a
              className="text-sky-400 underline-offset-2 hover:underline"
              href="https://cursor.com/agents"
            >
              cursor.com/agents
            </a>{" "}
            → Install app. Start an agent on this repo and type{" "}
            <span className="font-mono text-foreground">brief</span>.
          </li>
          <li>
            <span className="text-foreground">WhatsApp yourself:</span> tap
            WhatsApp above, pick your own chat, send. That keeps the last plan
            in your message list.
          </li>
        </ol>
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Not investment advice. Confirm expiry and lot size on NSE.
      </p>
    </main>
  );
}
