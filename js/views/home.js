import { html, useState } from '../lib.js'
import { S, list, get, rawSet, save, openEditor, createAndEdit, areaColor, settings } from '../store.js'
import { Section, Check, Empty, Progress, AreaTag, Icon, PageHead } from '../components.js'
import { itemsOn, typeLabel } from '../agenda-data.js'
import { toggleTask, goalProgress, PRIO_COLORS } from '../editors.js'
import { today, addDays, isoDow, fmtLong, relDay, countdown, money, cap, by } from '../utils.js'
import { monthByArea } from '../finance.js'

export function AgendaItem({ it, showDate }) {
  const open = () => openEditor(it.kind === 'routine' ? 'routine' : it.kind, it.id)
  return html`<div class=${'agenda-item ' + it.kind + (it.done ? ' done' : '')} style=${{ '--c': it.color }} onClick=${open}>
    <div class="when">${it.time ? html`${it.time}${it.end && html`<small>${it.end}</small>`}` : html`<small>todo el día</small>`}</div>
    <div class="what">
      ${it.kind === 'task' && html`<${Check} checked=${it.done} color=${it.color} onChange=${v => toggleTask(get('tasks', it.id), v)} />`}
      <span class="t">${it.title}</span>
      ${it.type && ['examen', 'entrega', 'reunion'].includes(it.type) && html`<span class="badge">${typeLabel(it.type)}</span>`}
      ${it.kind === 'routine' && html`<span class="badge soft">rutina</span>`}
      ${showDate && html`<span class="muted small"> · ${relDay(showDate)}</span>`}
    </div></div>`
}

function DailyChecklist() {
  const t = today()
  const day = get('days', t) || {}
  const checks = day.habits || {}
  const habits = list('habits').filter(h => h.title && (h.days || []).includes(isoDow(t))).sort(by('order', 'title'))
  const tasks = list('tasks').filter(x => x.title && x.dueDate && ((x.dueDate <= t && !x.done) || (x.done && x.doneAt === t && x.dueDate <= t)))
    .sort(by('done', 'priority', 'dueDate'))
  const [quick, setQuick] = useState('')
  const total = habits.length + tasks.length
  const done = habits.filter(h => checks[h.id]).length + tasks.filter(x => x.done).length
  const add = () => { if (!quick.trim()) return; save('tasks', { title: quick.trim(), dueDate: t, priority: 3 }); setQuick('') }
  return html`<${Section} title="Checklist de hoy" action=${html`<span class="muted">${done}/${total}</span>`}>
    <${Progress} value=${total ? done / total * 100 : 0} />
    <div class="checklist">
      ${habits.map(h => html`<div class="check-row" key=${h.id}>
        <${Check} checked=${!!checks[h.id]} color=${areaColor(h.areaId)} onChange=${v => rawSet('days', t, { habits: { ...checks, [h.id]: v } })} />
        <span class=${checks[h.id] ? 'done' : ''}>${h.title}</span><span class="badge soft">hábito</span></div>`)}
      ${tasks.map(x => html`<div class="check-row" key=${x.id} onClick=${() => openEditor('task', x.id)}>
        <${Check} checked=${x.done} color=${PRIO_COLORS[x.priority || 4]} onChange=${v => toggleTask(x, v)} />
        <span class=${x.done ? 'done' : ''}>${x.title}</span>
        ${x.dueDate < t && !x.done && html`<span class="badge warn">${relDay(x.dueDate)}</span>`}
        <${AreaTag} id=${x.areaId} /></div>`)}
      ${!total && html`<${Empty}>Nada pendiente para hoy. Añade algo abajo.<//>`}
    </div>
    <div class="quick"><input class="inp" placeholder="+ Añadir tarea para hoy" value=${quick} onInput=${e => setQuick(e.target.value)} onKeyDown=${e => e.key === 'Enter' && add()} />
      <button class="btn primary" onClick=${add} aria-label="Añadir"><${Icon} n="plus" s=${18} /></button></div>
  <//>`
}

function Upcoming() {
  const t = today(); const out = []
  for (let i = 1; i <= 14; i++) {
    const d = addDays(t, i)
    itemsOn(d).filter(it => it.kind !== 'routine' && !it.done).forEach(it => out.push({ ...it, date: d }))
  }
  return html`<${Section} title="Próximos 14 días">
    ${out.length ? out.slice(0, 12).map(it => html`<${AgendaItem} it=${it} showDate=${it.date} />`) : html`<${Empty}>Sin citas ni entregas próximas.<//>`}
  <//>`
}

function GoalsGlance() {
  const goals = list('goals').filter(g => g.title && !g.achieved).sort(by('targetDate')).slice(0, 4)
  return html`<${Section} title="Metas" action=${html`<a class="link" href="#/metas">Ver todas</a>`}>
    ${goals.length ? goals.map(g => html`<div class="goal-mini" onClick=${() => openEditor('goal', g.id)}>
      <div class="between"><b>${g.title}</b><span class="muted small">${g.targetDate ? countdown(g.targetDate) : ''}</span></div>
      <${Progress} value=${goalProgress(g)} color=${areaColor(g.areaId)} /></div>`)
    : html`<${Empty}>Aún no tienes metas. <a class="link" href="#/metas">Crear una</a><//>`}
  <//>`
}

function MoneyGlance() {
  const m = today().slice(0, 7)
  const stats = monthByArea(m)
  const tot = Object.values(stats).reduce((a, b) => ({ i: a.i + b.income, e: a.e + b.expense }), { i: 0, e: 0 })
  const wall = stats.wallapop
  return html`<${Section} title="Dinero este mes" action=${html`<a class="link" href="#/dinero">Abrir</a>`}>
    <div class="kpis">
      <div><small>Entradas</small><b class="pos">${money(tot.i)}</b></div>
      <div><small>Salidas</small><b class="neg">${money(tot.e)}</b></div>
      ${wall && html`<div><small>Beneficio Wallapop</small><b>${money(wall.salesProfit)}</b></div>`}
    </div><//>`
}

export function Home() {
  const t = today()
  const items = itemsOn(t).filter(it => it.kind !== 'task')
  const h = new Date().getHours()
  const hello = h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'
  return html`<div class="page">
    <${PageHead} title=${hello} sub=${cap(fmtLong(t))}>
      <button class="btn" onClick=${() => createAndEdit('event', { date: t, time: '', allDay: true, type: 'cita', areaId: 'personal' })}>+ Evento</button>
      <button class="btn" onClick=${() => createAndEdit('tx', { type: 'gasto', date: t, accountId: 'personal', areaId: 'personal' })}>+ Gasto</button>
      <a class="btn" href="#/diario">Escribir diario</a>
    <//>
    <div class="grid2">
      <div class="col">
        <${Section} title="Agenda de hoy">
          ${items.length ? items.map(it => html`<${AgendaItem} it=${it} />`) : html`<${Empty}>Día libre: sin eventos ni rutinas.<//>`}
        <//>
        <${DailyChecklist} />
      </div>
      <div class="col">
        <${Upcoming} />
        <${GoalsGlance} />
        <${MoneyGlance} />
      </div>
    </div>
  </div>`
}
