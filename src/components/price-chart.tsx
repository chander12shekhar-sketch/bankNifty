"use client";

import { useMemo, useState } from "react";
import type { Candle } from "@/lib/types";

type Props = {
  candles: Candle[];
};

function sma20(candles: Candle[]) {
  const points: { time: number; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= 20) sum -= candles[i - 20].close;
    if (i >= 19) points.push({ time: candles[i].time, value: sum / 20 });
  }
  return points;
}

function formatAxis(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatTip(n: number) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function PriceChart({ candles }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const layout = useMemo(() => {
    const width = 960;
    const height = 420;
    const pad = { top: 16, right: 72, bottom: 36, left: 12 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const sma = sma20(candles);
    const min = Math.min(...lows, ...sma.map((p) => p.value));
    const max = Math.max(...highs, ...sma.map((p) => p.value));
    const span = max - min || 1;
    const y = (price: number) => pad.top + ((max - price) / span) * plotH;
    const slot = plotW / Math.max(candles.length, 1);
    const x = (i: number) => pad.left + slot * i + slot / 2;
    const ticks = 5;
    const grid = Array.from({ length: ticks }, (_, i) => {
      const price = max - (span * i) / (ticks - 1);
      return { price, y: y(price) };
    });
    const smaPath = sma
      .map((point, idx) => {
        const i = idx + 19;
        const cmd = idx === 0 ? "M" : "L";
        return `${cmd}${x(i).toFixed(2)},${y(point.value).toFixed(2)}`;
      })
      .join(" ");
    return { width, height, pad, plotH, y, x, slot, grid, smaPath, sma };
  }, [candles]);

  if (candles.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground sm:h-[420px]">
        No candles to plot.
      </div>
    );
  }

  const active = hover != null ? candles[hover] : candles[candles.length - 1];
  const up = active.close >= active.open;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted-foreground">
        <span>{formatDate(active.time)}</span>
        <span>O {formatTip(active.open)}</span>
        <span>H {formatTip(active.high)}</span>
        <span>L {formatTip(active.low)}</span>
        <span className={up ? "text-emerald-400" : "text-rose-400"}>
          C {formatTip(active.close)}
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[320px] w-full sm:h-[420px] lg:h-[480px]"
          role="img"
          aria-label="Bank Nifty candlestick chart"
          onMouseLeave={() => setHover(null)}
        >
          <rect
            width={layout.width}
            height={layout.height}
            fill="#0c0c0e"
            rx="8"
          />
          {layout.grid.map((g) => (
            <g key={g.price}>
              <line
                x1={layout.pad.left}
                x2={layout.width - layout.pad.right}
                y1={g.y}
                y2={g.y}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                x={layout.width - layout.pad.right + 8}
                y={g.y + 4}
                fill="#9ca3af"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {formatAxis(g.price)}
              </text>
            </g>
          ))}
          {candles.map((c, i) => {
            const color = c.close >= c.open ? "#22c55e" : "#f43f5e";
            const cx = layout.x(i);
            const bodyTop = layout.y(Math.max(c.open, c.close));
            const bodyBot = layout.y(Math.min(c.open, c.close));
            const bodyH = Math.max(bodyBot - bodyTop, 1);
            const wickW = Math.max(Math.min(layout.slot * 0.16, 1.6), 0.7);
            const bodyW = Math.max(Math.min(layout.slot * 0.7, 8), 2);
            return (
              <g
                key={c.time}
                onMouseEnter={() => setHover(i)}
                className="cursor-crosshair"
              >
                <rect
                  x={cx - layout.slot / 2}
                  y={layout.pad.top}
                  width={layout.slot}
                  height={layout.plotH}
                  fill="transparent"
                />
                <rect
                  x={cx - wickW / 2}
                  y={layout.y(c.high)}
                  width={wickW}
                  height={Math.max(layout.y(c.low) - layout.y(c.high), 1)}
                  fill={color}
                />
                <rect
                  x={cx - bodyW / 2}
                  y={bodyTop}
                  width={bodyW}
                  height={bodyH}
                  fill={color}
                />
              </g>
            );
          })}
          <path
            d={layout.smaPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {hover != null ? (
            <line
              x1={layout.x(hover)}
              x2={layout.x(hover)}
              y1={layout.pad.top}
              y2={layout.pad.top + layout.plotH}
              stroke="rgba(148,163,184,0.45)"
            />
          ) : null}
          <text
            x={layout.pad.left}
            y={layout.height - 10}
            fill="#6b7280"
            fontSize="11"
          >
            {formatDate(candles[0].time)}
          </text>
          <text
            x={layout.width - layout.pad.right}
            y={layout.height - 10}
            fill="#6b7280"
            fontSize="11"
            textAnchor="end"
          >
            {formatDate(candles[candles.length - 1].time)}
          </text>
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">
        Blue line is the 20-period simple moving average on this chart window.
      </p>
    </div>
  );
}
