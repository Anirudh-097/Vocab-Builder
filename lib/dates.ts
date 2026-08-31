const TIME_ZONE = "Asia/Kolkata";
const formatter = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export function todayKey(date = new Date()): string { const values = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; }
export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00+05:30`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
export function dayStart(key = todayKey()): Date { return new Date(`${key}T00:00:00+05:30`); }
