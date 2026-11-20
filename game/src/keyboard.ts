// The camera looks toward +Z at yaw 0, so screen-right is world -X.
// Adapt browser keys here; do not change the headless contract's move axes.
export function keyboardMove(keys: ReadonlySet<string>): [number, number] {
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const forward = keys.has('KeyW') || keys.has('ArrowUp');
  const backward = keys.has('KeyS') || keys.has('ArrowDown');
  return [Number(left) - Number(right), Number(forward) - Number(backward)];
}
