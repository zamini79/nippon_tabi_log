/** 2025.05.02 – 05.06 · 4박 5일 */
export function formatRange(start: string | null, end: string | null): string {
  if (!start) return "날짜 미정";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const sTxt = `${s.getFullYear()}.${pad(s.getMonth() + 1)}.${pad(s.getDate())}`;
  if (!e) return sTxt;
  const sameYear = s.getFullYear() === e.getFullYear();
  const eTxt = sameYear
    ? `${pad(e.getMonth() + 1)}.${pad(e.getDate())}`
    : `${e.getFullYear()}.${pad(e.getMonth() + 1)}.${pad(e.getDate())}`;
  const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
  return nights > 0 ? `${sTxt} – ${eTxt} · ${nights}박 ${nights + 1}일` : sTxt;
}

export function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function yearOf(date: string | null): string | null {
  return date ? String(new Date(date).getFullYear()) : null;
}
