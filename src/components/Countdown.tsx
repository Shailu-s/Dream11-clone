"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate: string | Date;
  className?: string;
  onEnd?: () => void;
}

export function useCountdown(targetDate: Date | null) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return { countdown: "", minutesUntil: 0 };

  const msUntil = targetDate.getTime() - now.getTime();
  const totalSeconds = Math.floor(msUntil / 1000);
  const minutesUntil = Math.floor(msUntil / 60000);
  const hoursUntil = Math.floor(minutesUntil / 60);
  const daysUntil = Math.floor(hoursUntil / 24);

  let countdown = "";
  if (totalSeconds <= 0) {
    countdown = "Started";
  } else if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    countdown = `${m}m ${s}s`;
  } else if (hoursUntil < 24) {
    const remainMin = Math.floor((totalSeconds % 3600) / 60);
    const remainSec = totalSeconds % 60;
    countdown = `${hoursUntil}h ${remainMin}m ${remainSec}s`;
  } else {
    countdown = `${daysUntil}d ${hoursUntil % 24}h`;
  }

  return { countdown, minutesUntil };
}

export function Countdown({ targetDate, className = "", onEnd }: CountdownProps) {
  const { countdown } = useCountdown(targetDate instanceof Date ? targetDate : new Date(targetDate));

  useEffect(() => {
    if (countdown === "Started" && onEnd) onEnd();
  }, [countdown, onEnd]);

  return (
    <span className={`font-mono text-[10px] font-bold tracking-tighter ${className}`}>
      {countdown}
    </span>
  );
}
