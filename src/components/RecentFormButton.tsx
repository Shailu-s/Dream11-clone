"use client";

import { useEffect, useRef, useState } from "react";

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

function formatAverage(points: number | null): string {
  if (points === null) return "-";
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export default function RecentFormButton({
  average,
  points,
}: {
  average: number | null;
  points: number[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const displayPoints = [...points];

  while (displayPoints.length < 5) {
    displayPoints.push(Number.NaN);
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative flex items-center gap-1.5"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="text-[10px] font-semibold text-muted bg-background border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
        Avg {formatAverage(average)}
      </span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`h-5 rounded-full border px-1.5 text-[10px] font-black uppercase tracking-wide transition-colors whitespace-nowrap ${
          open
            ? "border-primary bg-primary text-white"
            : "border-primary/40 bg-primary/15 text-primary hover:border-primary hover:bg-primary/20"
        }`}
        aria-label="Show recent form"
      >
        Form
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-20 min-w-[176px] rounded-lg border border-border bg-card p-3 shadow-xl">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
            Last 5 Fantasy Points
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {displayPoints.map((point, index) => (
              <span
                key={index}
                className="min-w-8 text-center rounded-md bg-background border border-border px-2 py-1 text-xs font-semibold"
              >
                {Number.isNaN(point) ? "-" : formatPoints(point)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
