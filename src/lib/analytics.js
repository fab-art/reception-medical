// Groups receptions into weekly buckets (last N weeks) for trend charts.
export function weeklyBuckets(receptions, weeks = 8, dateField = 'receivedAt') {
  const now = new Date();
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    buckets.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}`, items: [] });
  }
  for (const r of receptions) {
    const d = r[dateField] ? new Date(r[dateField]) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const bucket = buckets.find((b) => d >= b.start && d <= b.end);
    if (bucket) bucket.items.push(r);
  }
  return buckets;
}

// Average / distribution of hours between receivedAt and verifiedAt.
export function processingTimeHours(record) {
  if (!record.verifiedAt) return null;
  const ms = new Date(record.verifiedAt) - new Date(record.receivedAt);
  return ms / 36e5;
}

export function groupSum(list, keyFn, valueFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + valueFn(item));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

export function groupCount(list, keyFn) {
  return groupSum(list, keyFn, () => 1);
}

export const CHART_COLORS = ['#0b3d78', '#0f9d8c', '#e0a530', '#7c5cff', '#e14f6b', '#3fa7d6'];
