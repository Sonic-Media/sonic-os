"use client";

import { useEffect, useState } from "react";
import { getTodayISO } from "@/lib/dates";

export function useTodayISO(): string {
  const [today, setToday] = useState(() => getTodayISO());

  useEffect(() => {
    function refreshToday() {
      const next = getTodayISO();
      setToday((current) => (current === next ? current : next));
    }

    refreshToday();
    const interval = window.setInterval(refreshToday, 60_000);
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshToday);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshToday);
    };
  }, []);

  return today;
}
