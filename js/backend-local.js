// Modo demo: guarda en localStorage de este navegador (sin cuenta ni sincronización).
const subs = {}
const key = col => 'yabiz:' + col
const read = col => { try { return JSON.parse(localStorage.getItem(key(col)) || '{}') } catch { return {} } }
const write = (col, map) => { try { localStorage.setItem(key(col), JSON.stringify(map)) } catch (e) { console.error(e) } }
const notify = col => {
  const map = read(col)
  const docs = Object.entries(map).map(([id, d]) => ({ id, ...d }));
  (subs[col] || []).forEach(cb => cb(docs, false))
}

export function init() {
  addEventListener('storage', e => { if (e.key?.startsWith('yabiz:')) notify(e.key.slice(6)) })
}
export function onAuth(cb) { setTimeout(() => cb({ uid: 'demo', email: 'modo demo' })) }
export const signIn = async () => {}
export const signUp = async () => {}
export const resetPassword = async () => {}
export const signOut = async () => {}

export function subscribe(col, cb) {
  (subs[col] ||= []).push(cb)
  setTimeout(() => notify(col))
  return () => { subs[col] = subs[col].filter(f => f !== cb) }
}
export function set(col, id, data) {
  const map = read(col); map[id] = { ...(map[id] || {}), ...data }; write(col, map); setTimeout(() => notify(col))
}
export function del(col, id) {
  const map = read(col); delete map[id]; write(col, map); setTimeout(() => notify(col))
}
