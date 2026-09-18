import { html, useState } from '../lib.js'
import { list, save, openEditor, settings } from '../store.js'
import { Check, AreaFilter, AreaTag, Empty, PageHead, Icon, Select, Toggle, Fab } from '../components.js'
import { toggleTask, PRIO_COLORS, PRIORITIES } from '../editors.js'
import { today, addDays, weekStart, monthEnd, relDay, by } from '../utils.js'
import { areas, createAndEdit } from '../store.js'

let saved = { filter: [], showDone: false }

export function TaskRow({ t }) {
  const overdue = t.dueDate && t.dueDate < today() && !t.done
  return html`<div class=${'task' + (t.done ? ' done' : '')} onClick=${() => openEditor('task', t.id)}>
    <${Check} checked=${t.done} color=${PRIO_COLORS[t.priority || 4]} onChange=${v => toggleTask(t, v)} />
    <div class="task-main">
      <div class="t">${t.title}</div>
      <div class="meta">
        ${t.dueDate && html`<span class=${overdue ? 'warn-text' : ''}><${Icon} n="calendar" s=${12} /> ${relDay(t.dueDate)}${t.dueTime ? ' ' + t.dueTime : ''}</span>`}
        ${t.repeat && html`<span><${Icon} n="repeat" s=${12} /></span>`}
        ${(t.priority || 4) < 4 && html`<span style=${{ color: PRIO_COLORS[t.priority] }}>⚑ P${t.priority}</span>`}
        <${AreaTag} id=${t.areaId} />
      </div>
    </div></div>`
}

export function Tasks() {
  const [st, setSt] = useState(saved)
  const set = f => { saved = { ...st, ...f }; setSt(saved) }
  const [q, setQ] = useState({ title: '', when: 'hoy', priority: 3, areaId: '' })
  const t = today(), we = addDays(weekStart(t), 6), me = monthEnd(t)
  const all = list('tasks').filter(x => x.title && (!st.filter.length || st.filter.includes(x.areaId)))
  const open = all.filter(x => !x.done).sort(by('priority', 'dueDate', 'dueTime', 'createdAt'))
  const groups = [
    ['Vencidas', open.filter(x => x.dueDate && x.dueDate < t), 'warn'],
    ['Hoy', open.filter(x => x.dueDate === t)],
    ['Esta semana', open.filter(x => x.dueDate > t && x.dueDate <= we)],
    ['Este mes', open.filter(x => x.dueDate > we && x.dueDate <= me)],
    ['Más adelante', open.filter(x => x.dueDate > me)],
    ['Sin fecha', open.filter(x => !x.dueDate)],
  ]
  const done = all.filter(x => x.done && x.doneAt >= addDays(t, -14)).sort(by('-doneAt'))

  const add = () => {
    if (!q.title.trim()) return
    const dueDate = { hoy: t, manana: addDays(t, 1), semana: we, mes: me, '': '' }[q.when]
    save('tasks', { title: q.title.trim(), dueDate, priority: Number(q.priority), areaId: q.areaId || st.filter[0] || '', createdAt: Date.now() })
    setQ({ ...q, title: '' })
  }

  return html`<div class="page">
    <${PageHead} title="Tareas" sub="Ordenadas por fecha y prioridad (P1 = más urgente)" />
    <div class="card quick-add">
      <input class="inp big" placeholder="Nueva tarea… y pulsa Enter" value=${q.title} onInput=${e => setQ({ ...q, title: e.target.value })} onKeyDown=${e => e.key === 'Enter' && add()} />
      <div class="inline">
        <${Select} value=${q.when} onChange=${v => setQ({ ...q, when: v })} options=${[{ v: 'hoy', l: 'Hoy' }, { v: 'manana', l: 'Mañana' }, { v: 'semana', l: 'Esta semana' }, { v: 'mes', l: 'Este mes' }, { v: '', l: 'Sin fecha' }]} />
        <${Select} value=${String(q.priority)} onChange=${v => setQ({ ...q, priority: v })} options=${PRIORITIES.map(p => ({ v: String(p.v), l: 'Prioridad ' + p.l }))} />
        <${Select} value=${q.areaId} empty="Ámbito…" onChange=${v => setQ({ ...q, areaId: v })} options=${areas().map(a => ({ v: a.id, l: a.name }))} />
        <button class="btn primary" onClick=${add}>Añadir</button>
      </div>
    </div>
    <${AreaFilter} value=${st.filter} onChange=${v => set({ filter: v })} />
    ${groups.filter(g => g[1].length).map(([name, items, cls]) => html`<section class="card">
      <div class="card-head"><h2 class=${cls === 'warn' ? 'warn-text' : ''}>${name}</h2><span class="muted">${items.length}</span></div>
      ${items.map(x => html`<${TaskRow} t=${x} key=${x.id} />`)}</section>`)}
    ${!open.length && html`<${Empty}>¡Todo hecho! No tienes tareas pendientes.<//>`}
    <${Toggle} checked=${st.showDone} onChange=${v => set({ showDone: v })} label=${`Ver completadas (últimos 14 días: ${done.length})`} />
    ${st.showDone && html`<section class="card">${done.map(x => html`<${TaskRow} t=${x} key=${x.id} />`)}</section>`}
    <${Fab} label="Nueva tarea" onClick=${() => createAndEdit('task', { priority: 3, dueDate: t, areaId: st.filter[0] || '' })} />
  </div>`
}
