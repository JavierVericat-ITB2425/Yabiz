// Estado global: todas las colecciones del usuario se escuchan en tiempo real.
// Cualquier cambio (desde este u otro dispositivo) vuelve a pintar la app.
import { useState, useEffect } from './lib.js'
import { CONFIG } from './config.js'
import { newId, today, addMonths, addDays } from './utils.js'

export const COLS = [
  'settings', 'areas', 'goals', 'tasks', 'events', 'routines', 'habits', 'days', 'journal',
  'accounts', 'transactions', 'subscriptions', 'products', 'subjects', 'grades', 'notes',
]
// Colecciones que se copian a Google Calendar
export const SYNC_COLS = ['events', 'routines', 'tasks']

export const S = {
  user: undefined, demo: false,
  data: Object.fromEntries(COLS.map(c => [c, []])),
  loaded: {}, fromServer: {},
  ui: { editor: null },
  gcal: { state: 'off', pending: 0, last: null, error: null },
}

let backend, unsubs = []
const listeners = new Set()
const changeHooks = []
let scheduled = false
export function emit() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => { scheduled = false; listeners.forEach(f => f()) })
}
export function useStore() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force(x => x + 1); listeners.add(f)
    f() // por si el estado cambió antes de empezar a escuchar (p. ej. la sesión respondió muy rápido)
    return () => listeners.delete(f)
  }, [])
  return S
}
export const onDataChange = fn => changeHooks.push(fn)

export async function init() {
  const fb = CONFIG.firebase?.apiKey
  backend = fb ? await import('./backend-firebase.js') : await import('./backend-local.js')
  S.demo = !fb
  backend.init(CONFIG.firebase)
  backend.onAuth(user => {
    unsubs.forEach(u => u()); unsubs = []
    S.user = user
    S.data = Object.fromEntries(COLS.map(c => [c, []])); S.loaded = {}; S.fromServer = {}
    if (user) {
      unsubs = COLS.map(col => backend.subscribe(col, (docs, fromCache) => {
        S.data[col] = docs; S.loaded[col] = true
        if (!fromCache) S.fromServer[col] = true
        if (col === 'settings') maybeSeed(docs, fromCache)
        emit()
        changeHooks.forEach(fn => fn(col))
      }))
    }
    emit()
  })
}
export const auth = {
  signIn: (e, p) => backend.signIn(e, p),
  signUp: (e, p) => backend.signUp(e, p),
  reset: e => backend.resetPassword(e),
  signOut: () => backend.signOut(),
}

// ---------- lectura ----------
export const list = col => S.data[col].filter(d => !d.deleted)
export const get = (col, id) => id ? S.data[col].find(d => d.id === id) : undefined
export const settings = () => get('settings', 'main') || {}
export const areas = () => list('areas').sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.name || '').localeCompare(b.name || ''))
export const area = id => get('areas', id)
export const areaColor = id => area(id)?.color || '#9aa0ac'

// ---------- escritura (se aplica al instante en local y se sube en segundo plano) ----------
function localMerge(col, id, fields) {
  const arr = S.data[col]; const i = arr.findIndex(d => d.id === id)
  if (i >= 0) arr[i] = { ...arr[i], ...fields }; else arr.push({ id, ...fields })
  emit()
}
export function rawSet(col, id, fields) { localMerge(col, id, fields); backend.set(col, id, fields) }
export function save(col, obj) {
  const { id: given, ...rest } = obj
  const id = given || newId()
  rawSet(col, id, { ...rest, updatedAt: Date.now() })
  return id
}
export const patch = (col, id, fields) => rawSet(col, id, { ...fields, updatedAt: Date.now() })
export function hardDelete(col, id) {
  S.data[col] = S.data[col].filter(d => d.id !== id); emit()
  backend.del(col, id)
}
// Si ya estaba en Google Calendar se marca como borrado para que la sincronización lo quite de allí.
export function remove(col, id) {
  const d = get(col, id)
  if (SYNC_COLS.includes(col) && d?.gcalRev && settings().gcalUrl) patch(col, id, { deleted: true })
  else hardDelete(col, id)
}

// ---------- editor (ventana de edición con autoguardado) ----------
export const EDITOR_COLS = {
  task: 'tasks', event: 'events', routine: 'routines', goal: 'goals', tx: 'transactions', product: 'products',
  sub: 'subscriptions', account: 'accounts', subject: 'subjects', note: 'notes', area: 'areas', habit: 'habits',
}
export function openEditor(kind, id) { S.ui.editor = { kind, id }; emit() }
export function createAndEdit(kind, defaults = {}) {
  const id = save(EDITOR_COLS[kind], { ...defaults, draft: true, createdAt: Date.now() })
  S.ui.editor = { kind, id, isNew: true }; emit()
  return id
}
export function closeEditor() {
  // Forzar que el campo con foco guarde lo último escrito antes de cerrar
  document.activeElement?.blur?.()
  const ed = S.ui.editor; if (!ed) return
  const col = EDITOR_COLS[ed.kind]; const d = get(col, ed.id)
  S.ui.editor = null
  if (d) {
    const empty = ed.kind === 'tx' ? !d.amount : !(d.title || d.name)
    if (empty && ed.isNew) hardDelete(col, ed.id)
    else if (d.draft) patch(col, ed.id, { draft: false })
  }
  emit()
}

// ---------- datos iniciales la primera vez ----------
let seeded = false
function maybeSeed(docs, fromCache) {
  if (seeded || fromCache || docs.length) return
  seeded = true
  const now = Date.now()
  const A = [
    ['personal', 'Personal', '#039be5', false],
    ['uni', 'Universidad', '#3f51b5', false],
    ['salud', 'Salud', '#33b679', false],
    ['wallapop', 'Wallapop', '#f4511e', true],
    ['agencia', 'Agencia IA', '#8e24aa', true],
    ['ocio', 'Ocio y social', '#f6bf26', false],
  ]
  A.forEach(([id, name, color, isBusiness], order) => rawSet('areas', id, { name, color, isBusiness, order, updatedAt: now }))
  rawSet('accounts', 'personal', { name: 'Cuenta personal', kind: 'personal', initial: 0, updatedAt: now })
  rawSet('accounts', 'negocio', { name: 'Cuenta negocio', kind: 'negocio', initial: 0, updatedAt: now })
  ;[['Hacer ejercicio', 'salud'], ['Leer 20 minutos', 'personal'], ['Revisar mensajes de Wallapop', 'wallapop']]
    .forEach(([title, areaId], i) => rawSet('habits', 'h' + i, { title, areaId, days: [1, 2, 3, 4, 5, 6, 7], order: i, updatedAt: now }))
  rawSet('settings', 'main', { createdAt: now, gcalTasks: true, updatedAt: now })
}

// ---------- suscripciones: registrar cobros automáticamente como gastos ----------
function nextCharge(date, period) {
  if (period === 'anual') return addMonths(date, 12)
  if (period === 'trimestral') return addMonths(date, 3)
  if (period === 'semanal') return addDays(date, 7)
  return addMonths(date, 1)
}
onDataChange(col => {
  if (col !== 'subscriptions' || !S.fromServer.subscriptions) return
  const t = today()
  for (const s of list('subscriptions')) {
    if (!s.active || !s.nextDate || !s.amount || s.draft || s.nextDate > t) continue
    let d = s.nextDate, n = 0
    while (d <= t && n++ < 36) {
      // id fijo: si dos dispositivos lo hacen a la vez no se duplica
      rawSet('transactions', `sub-${s.id}-${d}`, {
        type: 'gasto', amount: s.amount, date: d, accountId: s.accountId || '', areaId: s.areaId || '',
        category: s.category || 'Suscripciones', note: s.name, subId: s.id, updatedAt: Date.now(),
      })
      d = nextCharge(d, s.period)
    }
    patch('subscriptions', s.id, { nextDate: d })
  }
})
export { nextCharge }
