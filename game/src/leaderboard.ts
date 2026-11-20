// Ticket-04 local leaderboard: pure rules (no DOM, no fs). Storage lives in web.ts (localStorage) / electron main (userData file).
export type Entry = { name: string; score: number; nights_won: number; achieved_at: string; seed: number };
export const MAX_ENTRIES = 10;

/** NFC-normalised name: 3–12 characters, ASCII [A-Za-z0-9_] plus Vietnamese letters with diacritics (bonus). No spaces. */
const VI = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
const NAME_RE = new RegExp(`^[A-Za-z0-9_${VI}${VI.toUpperCase()}]{3,12}$`, 'u');
export const normalizeName = (s: string) => s.normalize('NFC').trim();
export function validName(s: string): boolean { return NAME_RE.test(normalizeName(s)); }
export function nameError(s: string): string | null {
  const n = [...normalizeName(s)].length;
  if (n < 3) return 'Tên cần ít nhất 3 ký tự.';
  if (n > 12) return 'Tên tối đa 12 ký tự.';
  return validName(s) ? null : 'Chỉ dùng chữ cái (có thể có dấu tiếng Việt), số và dấu _.';
}

/** Score desc; equal score → earlier achieved_at first; equal time → earlier insertion first (stable). Keeps top 10. */
export function sortEntries(list: Entry[]): Entry[] {
  return list.map((e, i) => ({ e, i, t: Date.parse(e.achieved_at) }))
    .sort((a, b) => b.e.score - a.e.score || a.t - b.t || a.i - b.i).map(x => x.e).slice(0, MAX_ENTRIES);
}
export function insertEntry(list: Entry[], e: Entry): Entry[] { return sortEntries([...list, { ...e, name: normalizeName(e.name) }]); }
/** Would this score enter the current top 10? */
export function qualifies(list: Entry[], score: number): boolean { const s = sortEntries(list); return s.length < MAX_ENTRIES || score > s[s.length - 1].score; }

/** ISO 8601 with the local timezone offset, e.g. 2026-11-20T22:15:03+07:00. */
export function isoLocal(d = new Date()): string {
  const p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0'), off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(off / 60)}:${p(off % 60)}`;
}

/** Defensive parse of a stored file/localStorage value; drops malformed rows. */
export function parseEntries(raw: unknown): Entry[] {
  const arr = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.entries) ? (raw as any).entries : [];
  return sortEntries(arr.filter((e: any) => e && typeof e.name === 'string' && Number.isFinite(e.score) && Number.isInteger(e.nights_won)
    && e.nights_won >= 0 && e.nights_won <= 3 && typeof e.achieved_at === 'string' && !Number.isNaN(Date.parse(e.achieved_at)) && Number.isFinite(e.seed))
    .map((e: any) => ({ name: e.name, score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed })));
}
export const exportJson = (list: Entry[]) => JSON.stringify({ entries: sortEntries(list) }, null, 2) + '\n';
