import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NextMove } from "@/lib/types";
import { cn } from "@/lib/utils";

function inr(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function NextMoveCard({ plan }: { plan: NextMove }) {
  const tone =
    plan.direction === "down"
      ? "border-rose-500/40"
      : plan.direction === "up"
        ? "border-emerald-500/40"
        : "border-border";

  return (
    <Card className={cn("border-2", tone)}>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.18em] text-sky-400 uppercase">
            {plan.sessionLabel}
          </p>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            {plan.direction === "down" ? (
              <ArrowDownRight className="size-6 text-rose-400" />
            ) : plan.direction === "up" ? (
              <ArrowUpRight className="size-6 text-emerald-400" />
            ) : (
              <Minus className="size-6 text-muted-foreground" />
            )}
            {plan.headline}
          </CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-relaxed">
            {plan.why}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "capitalize",
              plan.direction === "down" && "bg-rose-500/15 text-rose-300",
              plan.direction === "up" && "bg-emerald-500/15 text-emerald-300",
            )}
          >
            {plan.direction}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {plan.confidence} confidence
          </Badge>
          <Badge variant="outline" className="capitalize">
            {plan.marketStatus === "open" ? "Market open" : plan.marketStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className={cn(
            "rounded-xl px-4 py-3 font-medium",
            plan.side === "PE" && "bg-rose-500/10 text-rose-200",
            plan.side === "CE" && "bg-emerald-500/10 text-emerald-200",
            plan.side === "NONE" && "bg-muted text-muted-foreground",
          )}
        >
          {plan.action}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Level
            label={plan.triggerLive ? "Trigger (in play)" : "Wait for trigger"}
            value={inr(plan.trigger)}
          />
          <Level label="Target" value={inr(plan.target)} />
          <Level label="Invalidation" value={inr(plan.invalidation)} />
          <Level
            label={plan.side === "NONE" ? "ATM (stand aside)" : "ATM strike"}
            value={`${inr(plan.atmStrike)} ${plan.side === "NONE" ? "" : plan.side}`}
          />
        </div>

        <p className="text-sm text-muted-foreground">{plan.triggerNote}</p>
        <p className="text-sm text-muted-foreground">{plan.timeStop}</p>
        <p className="text-xs text-muted-foreground">{plan.expiryHint}</p>

        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {plan.rules.map((rule) => (
            <li key={rule}>• {rule}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Level({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg tabular-nums">{value}</p>
    </div>
  );
}
