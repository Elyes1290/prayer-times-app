import { useEffect, useState } from "react";

/** Force un re-render périodique pour rafraîchir les comptes à rebours. */
export function useMinuteTick(intervalMs = 60_000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
