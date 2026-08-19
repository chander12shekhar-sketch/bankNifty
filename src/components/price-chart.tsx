"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";

type Props = {
  candles: Candle[];
};

export function PriceChart({ candles }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let chart: IChartApi | null = null;
    let cancelled = false;

    const boot = () => {
      if (cancelled || chartRef.current) return;
      const width = Math.max(host.clientWidth, 320);
      const height = Math.max(host.clientHeight, 320);

      try {
        chart = createChart(host, {
          width,
          height,
          layout: {
            background: { type: ColorType.Solid, color: "#0c0c0e" },
            textColor: "#9ca3af",
            fontFamily: "var(--font-sans), sans-serif",
          },
          grid: {
            vertLines: { color: "rgba(255,255,255,0.06)" },
            horzLines: { color: "rgba(255,255,255,0.06)" },
          },
          rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
          timeScale: {
            borderColor: "rgba(255,255,255,0.08)",
            timeVisible: true,
            secondsVisible: false,
          },
          crosshair: {
            vertLine: { color: "rgba(148,163,184,0.4)", width: 1 },
            horzLine: { color: "rgba(148,163,184,0.4)", width: 1 },
          },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#f43f5e",
          borderUpColor: "#22c55e",
          borderDownColor: "#f43f5e",
          wickUpColor: "#22c55e",
          wickDownColor: "#f43f5e",
        });

        const smaSeries = chart.addSeries(LineSeries, {
          color: "#38bdf8",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "SMA 20",
        });

        candleSeries.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );

        const smaPoints: { time: UTCTimestamp; value: number }[] = [];
        let sum = 0;
        for (let i = 0; i < candles.length; i++) {
          sum += candles[i].close;
          if (i >= 20) sum -= candles[i - 20].close;
          if (i >= 19) {
            smaPoints.push({
              time: candles[i].time as UTCTimestamp,
              value: sum / 20,
            });
          }
        }
        smaSeries.setData(smaPoints);
        chart.timeScale().fitContent();
        chartRef.current = chart;
        setFailed(null);
      } catch (error) {
        setFailed(
          error instanceof Error ? error.message : "Chart failed to render",
        );
      }
    };

    const frame = requestAnimationFrame(boot);
    const observer = new ResizeObserver(() => {
      const current = chartRef.current;
      if (!current || !host) return;
      current.applyOptions({
        width: Math.max(host.clientWidth, 320),
        height: Math.max(host.clientHeight, 320),
      });
    });
    observer.observe(host);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [candles]);

  return (
    <div className="relative">
      {failed ? (
        <p className="absolute inset-x-0 top-2 z-10 text-center text-xs text-rose-400">
          {failed}
        </p>
      ) : null}
      <div
        ref={hostRef}
        className="h-[320px] w-full rounded-lg bg-[#0c0c0e] sm:h-[420px] lg:h-[480px]"
      />
    </div>
  );
}
