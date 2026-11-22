// Orari: Sekri lavora con l'ora svizzera (uguale a quella italiana).
export const TZ = "Europe/Zurich";

function offsetMinutes(at: Date): number {
  const s = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value || "GMT+1";
  const m = s.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const v = Number(m[2]) * 60 + Number(m[3] || 0);
  return m[1] === "-" ? -v : v;
}

/** "2026-11-23" + "09:00" (ora svizzera) -> ISO in UTC */
export function toUTC(day: string, hhmm: string): string {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - offsetMinutes(new Date(guess)) * 60000;
  utc = guess - offsetMinutes(new Date(utc)) * 60000; // corregge i giorni del cambio d'ora
  return new Date(utc).toISOString();
}

/** Giorno svizzero di un istante, come "AAAA-MM-GG". */
export function localDay(iso: string | Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export function fmtShort(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso));
}

/** "oggi", "domani" oppure "lunedì 23 novembre" */
export function dayLabel(iso: string): string {
  const d = localDay(iso);
  const t = localDay();
  if (d === t) return "oggi";
  if (d === addDays(t, 1)) return "domani";
  return fmtDay(iso);
}

/** Ora attuale svizzera come "OO:MM" */
export function nowHHMM(): string {
  return fmtTime(new Date().toISOString());
}

/** true se adesso siamo nell'orario di riposo (es. 20:00 -> 07:30) */
export function inQuiet(from?: string, to?: string): boolean {
  if (!from || !to) return false;
  const n = nowHHMM();
  return from <= to ? n >= from && n < to : n >= from || n < to;
}
