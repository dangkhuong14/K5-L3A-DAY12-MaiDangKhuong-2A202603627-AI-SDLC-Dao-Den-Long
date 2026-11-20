// The camera looks toward +Z at yaw 0, so screen-right is world -X.
// Adapt browser keys here; do not change the headless contract's move axes.
// Ticket-04: every action is rebindable (two slots each). Bindings are web-only; core only sees the resulting Input.
export const ACTIONS = ['up', 'down', 'left', 'right', 'jump', 'dash', 'interact', 'pulse', 'pause'] as const;
export type Action = typeof ACTIONS[number];
export type Bindings = Record<Action, string[]>;
export const ACTION_LABEL: Record<Action, string> = {
  up: 'Đi lên (tiến)', down: 'Đi xuống (lùi)', left: 'Sang trái', right: 'Sang phải',
  jump: 'Nhảy', dash: 'Lướt', interact: 'Thắp / châm dầu', pulse: 'Tỏa Sáng', pause: 'Tạm dừng'
};
export const DEFAULT_BINDINGS: Bindings = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], dash: ['ShiftLeft', 'ShiftRight'], interact: ['KeyE'], pulse: ['KeyQ'], pause: ['Escape', 'KeyP']
};

export const actionDown = (keys: ReadonlySet<string>, b: Bindings, a: Action) => b[a].some(k => keys.has(k));
export function keyboardMove(keys: ReadonlySet<string>, b: Bindings = DEFAULT_BINDINGS): [number, number] {
  const left = actionDown(keys, b, 'left'), right = actionDown(keys, b, 'right');
  const forward = actionDown(keys, b, 'up'), backward = actionDown(keys, b, 'down');
  return [Number(left) - Number(right), Number(forward) - Number(backward)];
}
/** Keys bound to more than one action (sorted by code, actions in ACTIONS order). */
export function conflicts(b: Bindings): { code: string; actions: Action[] }[] {
  const by = new Map<string, Action[]>();
  for (const a of ACTIONS) for (const k of new Set(b[a])) if (k) by.set(k, [...(by.get(k) ?? []), a]);
  return [...by].filter(([, a]) => a.length > 1).map(([code, actions]) => ({ code, actions })).sort((x, y) => x.code.localeCompare(y.code));
}
/** Merge a stored value over the defaults; unknown/malformed entries fall back to defaults. */
export function loadBindings(raw: unknown): Bindings {
  const out = structuredClone(DEFAULT_BINDINGS);
  if (raw && typeof raw === 'object') for (const a of ACTIONS) { const v = (raw as any)[a]; if (Array.isArray(v) && v.every(k => typeof k === 'string')) out[a] = v.slice(0, 2); }
  return out;
}
/** Human label for a KeyboardEvent.code. */
export function keyName(code: string | undefined): string {
  if (!code) return '—';
  const m: Record<string, string> = { Space: 'Space', ShiftLeft: 'Shift trái', ShiftRight: 'Shift phải', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', ControlLeft: 'Ctrl trái', ControlRight: 'Ctrl phải', AltLeft: 'Alt trái', AltRight: 'Alt phải', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace' };
  return m[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
}
