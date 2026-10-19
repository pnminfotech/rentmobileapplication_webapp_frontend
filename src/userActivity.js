let lastUserActivityAt = 0;

export function recordUserActivity() {
  lastUserActivityAt = Date.now();
}

export function hasRecentUserActivity(maxAgeMs = 2 * 60 * 1000) {
  return lastUserActivityAt > 0 && Date.now() - lastUserActivityAt <= maxAgeMs;
}
