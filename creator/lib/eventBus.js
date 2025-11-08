// /creator/lib/eventBus.js
export const bus = (() => {
  const map = new Map();
  return {
    on(evt, fn)  { (map.get(evt) || map.set(evt, new Set()).get(evt)).add(fn); },
    off(evt, fn) { map.get(evt)?.delete(fn); },
    emit(evt, payload) { map.get(evt)?.forEach(fn => fn(payload)); }
  };
})();
