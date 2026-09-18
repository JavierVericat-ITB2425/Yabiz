// Sincronización con Google Calendar a través de tu script gratuito de Google Apps Script
// (apps-script/Code.gs). Cualquier dispositivo con la app abierta envía los cambios pendientes;
// el script es idempotente, así que no importa si dos dispositivos lo hacen a la vez.
import { S, SYNC_COLS, list, get, settings, rawSet, hardDelete, emit, onDataChange } from './store.js'
import { gcalColor, addTime, addDays, isoDow, today } from './utils.js'
import { typeLabel } from './agenda-data.js'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'
const DRAFT_GRACE = 10 * 60 * 1000
let timer = null, running = false

onDataChange(col => { if (SYNC_COLS.includes(col) || col === 'settings') scheduleSync() })
addEventListener('online', () => scheduleSync(500))

export function scheduleSync(ms = 2500) { clearTimeout(timer); timer = setTimeout(runSync, ms) }

function areaName(id) { return get('areas', id)?.name || '' }
function colorOf(areaId) { return gcalColor(get('areas', areaId)?.color) }

// ¿Debe existir este elemento en Google Calendar? Devuelve el payload o null.
function payloadFor(col, d, st) {
  if (col === 'events') {
    if (!d.date || !d.title) return null
    const prefix = ['examen', 'entrega'].includes(d.type) ? typeLabel(d.type) + ': ' : ''
    const allDay = !!d.allDay || !d.time
    return {
      title: prefix + d.title, location: d.location || '',
      description: [d.notes, areaName(d.areaId) && 'Ámbito: ' + areaName(d.areaId)].filter(Boolean).join('\n\n'),
      allDay, startDate: d.date, startTime: d.time || '', endDate: d.endDate || d.date,
      endTime: d.endTime || (d.time ? addTime(d.time, 60) : ''),
      color: colorOf(d.areaId), reminders: remindersOf(d.reminder, allDay),
    }
  }
  if (col === 'routines') {
    if (!d.title || !d.start || !(d.days || []).length || d.sync === false) return null
    // La serie empieza el primer día (desde hoy o "desde") que coincide con los días elegidos
    let start = d.from || today()
    for (let i = 0; i < 7 && !d.days.includes(isoDow(start)); i++) start = addDays(start, 1)
    return {
      title: d.title, description: d.notes || '', allDay: false, startDate: start, startTime: d.start,
      endDate: start, endTime: d.end || addTime(d.start, 60), weekdays: d.days, until: d.until || '',
      color: colorOf(d.areaId), reminders: d.reminder > 0 ? [d.reminder] : [],
    }
  }
  if (col === 'tasks') {
    if (!st.gcalTasks || !d.dueDate || d.done || !d.title) return null
    const allDay = !d.dueTime
    return {
      title: '✔ ' + d.title, description: d.notes || '', allDay, startDate: d.dueDate, startTime: d.dueTime || '',
      endDate: d.dueDate, endTime: d.dueTime ? addTime(d.dueTime, 30) : '',
      color: colorOf(d.areaId), reminders: remindersOf(d.reminder ?? (allDay ? 540 : 30), allDay),
    }
  }
  return null
}
// Recordatorio en minutos; en eventos de día completo se cuenta desde las 00:00 (540 = 15:00 del día anterior)
function remindersOf(r, allDay) {
  if (r === -1 || r === '-1') return []
  if (r === undefined || r === null || r === '') return [allDay ? 540 : 30]
  return [Number(r)]
}

function collectPending(st) {
  const ops = []
  const now = Date.now()
  for (const col of SYNC_COLS) {
    for (const d of S.data[col]) {
      if (d.draft && now - (d.createdAt || 0) < DRAFT_GRACE) continue
      if (d.updatedAt === d.gcalRev) continue
      const key = col + ':' + d.id
      if (d.deleted) { ops.push({ col, doc: d, op: { action: 'delete', id: key } }); continue }
      const p = payloadFor(col, d, st)
      if (p) ops.push({ col, doc: d, op: { action: 'upsert', id: key, tz: TZ, ...p } })
      else if (d.gcalRev) ops.push({ col, doc: d, op: { action: 'delete', id: key } })
    }
  }
  return ops
}

export function pendingCount() { const st = settings(); return st.gcalUrl ? collectPending(st).length : 0 }

export async function runSync() {
  const st = settings()
  if (!st.gcalUrl || !st.gcalSecret) { S.gcal.state = 'off'; emit(); return }
  if (running || !navigator.onLine || !S.fromServer.settings) return
  const all = collectPending(st)
  S.gcal.pending = all.length
  if (!all.length) { S.gcal.state = 'ok'; emit(); return }
  running = true; S.gcal.state = 'syncing'; emit()
  const batch = all.slice(0, 25)
  try {
    const res = await fetch(st.gcalUrl, {
      method: 'POST', // text/plain para evitar preflight CORS con Apps Script
      body: JSON.stringify({ secret: st.gcalSecret, ops: batch.map(b => b.op) }),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error === 'secret' ? 'Clave secreta incorrecta' : json.error || 'Error del script')
    const okIds = new Set(json.results.filter(r => r.ok).map(r => r.id))
    const failed = json.results.filter(r => !r.ok)
    for (const b of batch) {
      if (!okIds.has(b.op.id)) continue
      if (b.doc.deleted) hardDelete(b.col, b.doc.id)
      else rawSet(b.col, b.doc.id, { gcalRev: b.doc.updatedAt })
    }
    S.gcal.state = failed.length ? 'error' : 'ok'
    S.gcal.error = failed.length ? failed[0].error : null
    S.gcal.last = Date.now()
  } catch (e) {
    S.gcal.state = 'error'; S.gcal.error = String(e.message || e)
  } finally {
    running = false
    S.gcal.pending = collectPending(st).length
    emit()
    if (S.gcal.pending && S.gcal.state !== 'error') scheduleSync(500)
  }
}

export async function testConnection(url) {
  const res = await fetch(url)
  return res.json()
}
