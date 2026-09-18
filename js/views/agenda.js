import { html, useState } from '../lib.js'
import { S, list, createAndEdit, openEditor, areaColor } from '../store.js'
import { Seg, AreaFilter, Icon, Empty, PageHead, Fab, AreaTag } from '../components.js'
import { itemsOn } from '../agenda-data.js'
import { AgendaItem } from './home.js'
import { today, addDays, addMonths, weekStart, monthStart, fmtDate, fmtMonth, cap, range, DOW, DOW_LONG, by } from '../utils.js'

let saved = { view: 'semana', date: today(), filter: [] } // se mantiene al cambiar de sección

export function Agenda() {
  const [st, setSt] = useState(saved)
  const set = f => { saved = { ...st, ...f }; setSt(saved) }
  const { view, date, filter } = st
  const t = today()
  const step = n => set({ date: view === 'mes' ? addMonths(monthStart(date), n) : addDays(date, view === 'semana' ? 7 * n : n) })
  const newEvent = d => createAndEdit('event', { date: d || date, time: '10:00', endTime: '11:00', allDay: false, type: 'cita', areaId: filter[0] || 'personal' })

  let title = ''
  if (view === 'mes') title = cap(fmtMonth(date))
  else if (view === 'semana') { const ws = weekStart(date); title = `${fmtDate(ws, { day: 'numeric', month: 'short' })} – ${fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short' })}` }
  else if (view === 'dia') title = cap(fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' }))
  else title = 'Rutinas semanales'

  return html`<div class="page">
    <${PageHead} title="Agenda" sub="Eventos, rutinas, exámenes y tareas en un solo calendario">
      <${Seg} options=${[{ v: 'dia', l: 'Día' }, { v: 'semana', l: 'Semana' }, { v: 'mes', l: 'Mes' }, { v: 'rutinas', l: 'Rutinas' }]} value=${view} onChange=${v => set({ view: v })} />
    <//>
    ${view !== 'rutinas' && html`<div class="cal-nav">
      <button class="icon-btn" onClick=${() => step(-1)} aria-label="Anterior"><${Icon} n="left" /></button>
      <h2>${title}</h2>
      <button class="icon-btn" onClick=${() => step(1)} aria-label="Siguiente"><${Icon} n="right" /></button>
      <button class="btn small" onClick=${() => set({ date: t })}>Hoy</button>
    </div>
    <${AreaFilter} value=${filter} onChange=${v => set({ filter: v })} />`}
    ${view === 'mes' && html`<${Month} date=${date} filter=${filter} onPick=${d => set({ view: 'dia', date: d })} />`}
    ${view === 'semana' && html`<${Week} date=${date} filter=${filter} onPick=${d => set({ view: 'dia', date: d })} onAdd=${newEvent} />`}
    ${view === 'dia' && html`<${Day} date=${date} filter=${filter} onAdd=${newEvent} />`}
    ${view === 'rutinas' && html`<${Routines} />`}
    <${Fab} label=${view === 'rutinas' ? 'Nueva rutina' : 'Nuevo evento'} onClick=${() => view === 'rutinas'
      ? createAndEdit('routine', { days: [1, 2, 3, 4, 5], start: '08:00', end: '13:00', areaId: 'uni', sync: true })
      : newEvent()} />
  </div>`
}

function Month({ date, filter, onPick }) {
  const ms = monthStart(date); const start = weekStart(ms)
  const days = range(start, addDays(start, 41)); const t = today()
  return html`<div class="month">
    ${DOW.map(d => html`<div class="dow">${d}</div>`)}
    ${days.map(d => {
      const its = itemsOn(d, filter)
      const main = its.filter(i => i.kind !== 'routine')
      return html`<button class=${'mcell' + (d.slice(0, 7) !== ms.slice(0, 7) ? ' out' : '') + (d === t ? ' today' : '')} onClick=${() => onPick(d)}>
        <span class="n">${Number(d.slice(8))}</span>
        <div class="mitems">${main.slice(0, 3).map(i => html`<span class=${'mi' + (i.done ? ' done' : '')} style=${{ '--c': i.color }}>${i.time && html`<b>${i.time}</b> `}${i.title}</span>`)}
          ${main.length > 3 && html`<span class="more">+${main.length - 3}</span>`}</div>
        <div class="mdots">${main.slice(0, 5).map(i => html`<i style=${{ background: i.color }}></i>`)}</div>
      </button>`
    })}
  </div>`
}

function Week({ date, filter, onPick, onAdd }) {
  const ws = weekStart(date); const t = today()
  return html`<div class="week">${range(ws, addDays(ws, 6)).map((d, i) => {
    const its = itemsOn(d, filter)
    return html`<div class=${'wday' + (d === t ? ' today' : '')}>
      <div class="wday-head" onClick=${() => onPick(d)}><b>${DOW_LONG[i]}</b> <span>${Number(d.slice(8))}</span>
        <button class="icon-btn small" aria-label="Añadir" onClick=${e => { e.stopPropagation(); onAdd(d) }}><${Icon} n="plus" s=${16} /></button></div>
      ${its.length ? its.map(it => html`<${AgendaItem} it=${it} />`) : html`<div class="muted small pad">—</div>`}
    </div>`
  })}</div>`
}

function Day({ date, filter, onAdd }) {
  const its = itemsOn(date, filter)
  return html`<div class="card">
    ${its.length ? its.map(it => html`<${AgendaItem} it=${it} />`) : html`<${Empty}>Nada este día.<//>`}
    <button class="btn wide" onClick=${() => onAdd(date)}>+ Añadir evento este día</button>
    <button class="btn wide ghost" onClick=${() => createAndEdit('task', { dueDate: date, priority: 3 })}>+ Añadir tarea este día</button>
  </div>`
}

function Routines() {
  const rs = list('routines').filter(r => r.title || r.draft).sort(by('start'))
  return html`<div>
    <p class="muted">Las rutinas son bloques que se repiten cada semana (ej: Uni de 8 a 13 de lunes a viernes). Aparecen en tu agenda y en Google Calendar.</p>
    <div class="week">${DOW_LONG.map((name, i) => {
      const its = rs.filter(r => (r.days || []).includes(i + 1))
      return html`<div class="wday"><div class="wday-head"><b>${name}</b></div>
        ${its.length ? its.map(r => html`<div class="agenda-item routine" style=${{ '--c': areaColor(r.areaId) }} onClick=${() => openEditor('routine', r.id)}>
          <div class="when">${r.start}<small>${r.end}</small></div><div class="what"><span class="t">${r.title || 'Sin título'}</span></div></div>`)
        : html`<div class="muted small pad">—</div>`}</div>`
    })}</div>
    ${!rs.length && html`<${Empty}>Pulsa + para crear tu primera rutina.<//>`}
  </div>`
}
