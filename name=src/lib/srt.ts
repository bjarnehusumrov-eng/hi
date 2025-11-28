// Søvnrestriksjon (SRT) logikk
export type SRTState = {
  initialTIBMin: number;
  minTIBMin: number;
  recommendedBedtimeOffsetMin: number; // relative to wake time
};

export function computeSRTFromBaseline(sleepLogs: Array<{ totalSleepTimeMin?: number }>) {
  // take last N nights (preferably 5-7)
  const valid = sleepLogs.filter((s) => typeof s.totalSleepTimeMin === "number");
  const last = valid.slice(0, 7);
  const n = last.length || 0;
  const ATST = n > 0 ? Math.round(last.reduce((a, b) => a + (b.totalSleepTimeMin || 0), 0) / n) : 6 * 60; // minutes
  const initialTIBMin = Math.max(4.5 * 60, ATST + 30); // ATST + 30 min, min 4.5h
  const minTIBMin = 4.5 * 60;
  return {
    ATST,
    initialTIBMin,
    minTIBMin
  };
}

export function adjustTIBWeekly(currentTIBMin: number, sleepEfficiencyPercent: number) {
  // SE thresholds per spec
  if (sleepEfficiencyPercent >= 90) {
    return currentTIBMin + Math.round((15 + 30) / 2); // increase 15-30 -> choose 22.5 -> round 23
  }
  if (sleepEfficiencyPercent >= 85 && sleepEfficiencyPercent <= 89) {
    return currentTIBMin; // hold
  }
  if (sleepEfficiencyPercent < 85) {
    const next = currentTIBMin - Math.round((15 + 30) / 2);
    return Math.max(next, 4.5 * 60);
  }
  return currentTIBMin;
}
