"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";

type Props = {
  candles: Candle[];
};

function toUtc(seconds: number): UTCTimestamp {
  return seconds as UTCTimestamp;
}

export function PriceChart({ candles }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = createChart(host, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontFamily: "var(--font-geist-sans), sans-serif",
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
      autoSize: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#f43f5e",
      borderUpColor: "#22c55e",
      borderDownColor: "#f43f5e",
      wickUpColor: "#22c55e",
      wickDownColor: "#f43f5e",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const smaSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "SMA 20",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    smaSeriesRef.current = smaSeries;

    const onResize = () => {
      chart.applyOptions({ width: host.clientWidth, height: host.clientHeight });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !smaSeriesRef.current) {
      return;
    }

    const candleData = candles.map((c) => ({
      time: toUtc(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(candleData);

    const hasVolume = candles.some((c) => c.volume > 0);
    volumeSeriesRef.current.setData(
      hasVolume
        ? candles.map((c) => ({
            time: toUtc(c.time),
            value: c.volume,
            color:
              c.close >= c.open
                ? "rgba(34,197,94,0.35)"
                : "rgba(244,63,94,0.35)",
          }))
        : [],
    );

    const smaPoints: { time: UTCTimestamp; value: number }[] = [];
    let sum = 0;
    for (let i = 0; i < candles.length; i++) {
      sum += candles[i].close;
      if (i >= 20) sum -= candles[i - 20].close;
      if (i >= 19) {
        smaPoints.push({ time: toUtc(candles[i].time), value: sum / 20 });
      }
    }
    smaSeriesRef.current.setData(smaPoints);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={hostRef}
      className="h-[320px] w-full sm:h-[420px] lg:h-[480px]"
    />
  );
}
