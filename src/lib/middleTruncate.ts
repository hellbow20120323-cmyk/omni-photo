/** Middle ellipsis for long paths, e.g. `/Users/.../Photos`. Preserves leading and trailing segments. */
export function middleTruncatePath(path: string, maxLen = 52): string {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.length <= maxLen) return normalized;
  const ellipsis = "…";
  const budget = maxLen - ellipsis.length;
  const headLen = Math.max(8, Math.floor(budget * 0.38));
  const tailLen = Math.max(12, budget - headLen);
  return `${normalized.slice(0, headLen)}${ellipsis}${normalized.slice(-tailLen)}`;
}
