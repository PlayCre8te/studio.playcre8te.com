let cleanup = [];
export async function init() {}
export function destroy(){ cleanup.forEach(fn => fn()); cleanup = []; }