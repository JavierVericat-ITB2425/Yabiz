// Une eventos, rutinas y tareas con fecha en una sola lista por día (lo que ve el calendario).
import { list, areaColor } from './store.js'
import { isoDow } from './utils.js'

export const EVENT_TYPES = [
  { v: 'cita', l: 'Cita' }, { v: 'reunion', l: 'Reunión' }, { v: 'examen', l: 'Examen' },
  { v: 'entrega', l: 'Entrega' }, { v: 'clase', l: 'Clase' }, { v: 'otro', l: 'Otro' },
]
export const typeLabel = v => EVENT_TYPES.find(t => t.v === v)?.l || ''

export function itemsOn(date, filter) {
  const out = []
  const ok = a => !filter || !filter.length || filter.includes(a)
  for (const e of list('events')) {
    if (e.draft && !e.title) continue
    const end = e.endDate && e.endDate > e.date ? e.endDate : e.date
    if (e.date && e.date <= date && date <= end && ok(e.areaId))
      out.push({ kind: 'event', id: e.id, title: e.title || 'Sin título', time: e.allDay ? '' : e.time, end: e.allDay ? '' : e.endTime, areaId: e.areaId, color: areaColor(e.areaId), type: e.type, location: e.location })
  }
  const dow = isoDow(date)
  for (const r of list('routines')) {
    if (!r.title || !(r.days || []).includes(dow)) continue
    if ((r.from && date < r.from) || (r.until && date > r.until) || !ok(r.areaId)) continue
    out.push({ kind: 'routine', id: r.id, title: r.title, time: r.start, end: r.end, areaId: r.areaId, color: areaColor(r.areaId) })
  }
  for (const t of list('tasks')) {
    if (t.dueDate !== date || !t.title || !ok(t.areaId)) continue
    out.push({ kind: 'task', id: t.id, title: t.title, time: t.dueTime || '', areaId: t.areaId, color: areaColor(t.areaId), done: !!t.done, priority: t.priority })
  }
  return out.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00') || (a.kind === 'routine') - (b.kind === 'routine'))
}
