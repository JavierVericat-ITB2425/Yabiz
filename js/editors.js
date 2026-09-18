// Ventanas de edición. Todo se guarda solo al escribir/cambiar: no hay botón "Guardar".
import { html } from './lib.js'
import { S, EDITOR_COLS, get, list, patch, remove, closeEditor, emit } from './store.js'
import {
  Modal, Txt, Num, Field, Row, Seg, Select, Toggle, AreaPick, ColorPick, DaysPick, Check, Icon,
} from './components.js'
import { today, addDays, addMonths, addTime, money, num, countdown, fmtDate } from './utils.js'
import { EVENT_TYPES } from './agenda-data.js'
import { STATUS, PERIODS, productProfit, productCost, accountBalance, categories } from './finance.js'

export const PRIORITIES = [{ v: 1, l: 'P1' }, { v: 2, l: 'P2' }, { v: 3, l: 'P3' }, { v: 4, l: 'P4' }]
export const PRIO_COLORS = { 1: '#d50000', 2: '#f4511e', 3: '#039be5', 4: '#9aa0ac' }
const REMINDERS = [
  { v: '-1', l: 'Sin aviso' }, { v: '10', l: '10 min antes' }, { v: '30', l: '30 min antes' }, { v: '60', l: '1 hora antes' },
  { v: '120', l: '2 horas antes' }, { v: '540', l: 'El día anterior (15:00)' }, { v: '1440', l: '1 día antes' }, { v: '10080', l: '1 semana antes' },
]
const REPEAT = [{ v: '', l: 'No se repite' }, { v: 'daily', l: 'Cada día' }, { v: 'weekly', l: 'Cada semana' }, { v: 'monthly', l: 'Cada mes' }]

const subjectOptions = () => list('subjects').map(s => ({ v: s.id, l: s.name || 'Asignatura' }))
const accountOptions = () => list('accounts').map(a => ({ v: a.id, l: a.name }))

function DeleteBtn({ col, id, label = 'Eliminar' }) {
  const del = () => {
    if (!confirm('¿Eliminar definitivamente?')) return
    document.activeElement?.blur?.() // guarda lo pendiente antes de borrar para que no "resucite"
    remove(col, id); S.ui.editor = null; emit()
  }
  return html`<button class="btn danger ghost" onClick=${del}>
    <${Icon} n="trash" s=${16} /> ${label}</button>`
}
const Foot = ({ col, id }) => html`<${DeleteBtn} col=${col} id=${id} /><span class="grow"></span><button class="btn primary" onClick=${closeEditor}>Listo</button>`

// Completar una tarea (si se repite, pasa a la siguiente fecha)
export function toggleTask(t, done) {
  if (done && t.repeat && t.dueDate) {
    const next = t.repeat === 'daily' ? addDays(t.dueDate, 1) : t.repeat === 'weekly' ? addDays(t.dueDate, 7) : addMonths(t.dueDate, 1)
    patch('tasks', t.id, { dueDate: next, lastDone: today() })
  } else patch('tasks', t.id, { done, doneAt: done ? today() : '' })
}

function TaskEditor({ d, isNew }) {
  const up = f => patch('tasks', d.id, f)
  return html`
    <div class="title-row"><${Check} checked=${d.done} color=${PRIO_COLORS[d.priority || 4]} onChange=${v => toggleTask(d, v)} />
      <${Txt} value=${d.title} onSave=${v => up({ title: v })} placeholder="¿Qué tienes que hacer?" cls="big" autoFocus=${isNew} /></div>
    <${Field} label="Ámbito"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} allowEmpty /><//>
    <${Field} label="Prioridad"><${Seg} options=${PRIORITIES.map(p => ({ ...p, l: html`<span style=${{ color: PRIO_COLORS[p.v] }}>⚑</span> ${p.l}` }))} value=${d.priority || 4} onChange=${v => up({ priority: v })} /><//>
    <${Field} label="Fecha">
      <div class="inline">
        <input type="date" class="inp" value=${d.dueDate || ''} onChange=${e => up({ dueDate: e.target.value })} />
        <button class="btn small" onClick=${() => up({ dueDate: today() })}>Hoy</button>
        <button class="btn small" onClick=${() => up({ dueDate: addDays(today(), 1) })}>Mañana</button>
        ${d.dueDate && html`<button class="btn small ghost" onClick=${() => up({ dueDate: '', dueTime: '' })}>Quitar</button>`}
      </div><//>
    ${d.dueDate && html`<${Row}>
      <${Field} label="Hora (opcional)"><input type="time" class="inp" value=${d.dueTime || ''} onChange=${e => up({ dueTime: e.target.value })} /><//>
      <${Field} label="Repetir"><${Select} value=${d.repeat || ''} options=${REPEAT} onChange=${v => up({ repeat: v })} /><//>
    <//>
    <${Field} label="Aviso en Google Calendar"><${Select} value=${String(d.reminder ?? (d.dueTime ? 30 : 540))} options=${REMINDERS} onChange=${v => up({ reminder: Number(v) })} /><//>`}
    <${Row}>
      <${Field} label="Meta relacionada"><${Select} value=${d.goalId} empty="—" options=${list('goals').map(g => ({ v: g.id, l: g.title || 'Meta' }))} onChange=${v => up({ goalId: v })} /><//>
      <${Field} label="Asignatura"><${Select} value=${d.subjectId} empty="—" options=${subjectOptions()} onChange=${v => up({ subjectId: v, ...(v ? { areaId: 'uni' } : {}) })} /><//>
    <//>
    <${Field} label="Notas"><${Txt} multiline value=${d.notes} onSave=${v => up({ notes: v })} placeholder="Detalles, enlaces…" /><//>`
}

function EventEditor({ d, isNew }) {
  const up = f => patch('events', d.id, f)
  const setTime = t => up({ time: t, allDay: !t, ...(t && (!d.endTime || d.endTime <= t) ? { endTime: addTime(t, 60) } : {}) })
  return html`
    <${Txt} value=${d.title} onSave=${v => up({ title: v })} placeholder="Título (médico, reunión, examen…)" cls="big" autoFocus=${isNew} />
    <${Field} label="Tipo"><${Seg} small options=${EVENT_TYPES} value=${d.type || 'cita'} onChange=${v => up({ type: v, ...(['examen', 'entrega', 'clase'].includes(v) && !d.areaId ? { areaId: 'uni' } : {}) })} /><//>
    <${Field} label="Ámbito"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} /><//>
    <${Toggle} checked=${d.allDay} onChange=${v => up({ allDay: v, ...(v ? {} : { time: d.time || '10:00', endTime: d.endTime || '11:00' }) })} label="Todo el día" />
    <${Row}>
      <${Field} label="Fecha"><input type="date" class="inp" value=${d.date || ''} onChange=${e => up({ date: e.target.value, ...(d.endDate && d.endDate < e.target.value ? { endDate: '' } : {}) })} /><//>
      ${!d.allDay && html`<${Field} label="Hora"><input type="time" class="inp" value=${d.time || ''} onChange=${e => setTime(e.target.value)} /><//>`}
    <//>
    <${Row}>
      <${Field} label="Hasta (fecha, opcional)"><input type="date" class="inp" value=${d.endDate || ''} min=${d.date} onChange=${e => up({ endDate: e.target.value })} /><//>
      ${!d.allDay && html`<${Field} label="Hora fin"><input type="time" class="inp" value=${d.endTime || ''} onChange=${e => up({ endTime: e.target.value })} /><//>`}
    <//>
    <${Field} label="Aviso"><${Select} value=${String(d.reminder ?? (d.allDay ? 540 : 30))} options=${REMINDERS} onChange=${v => up({ reminder: Number(v) })} /><//>
    <${Field} label="Lugar"><${Txt} value=${d.location} onSave=${v => up({ location: v })} placeholder="Dirección o enlace" /><//>
    ${(d.areaId === 'uni' || d.subjectId) && html`<${Field} label="Asignatura"><${Select} value=${d.subjectId} empty="—" options=${subjectOptions()} onChange=${v => up({ subjectId: v })} /><//>`}
    <${Field} label="Notas"><${Txt} multiline value=${d.notes} onSave=${v => up({ notes: v })} /><//>`
}

function RoutineEditor({ d, isNew }) {
  const up = f => patch('routines', d.id, f)
  return html`
    <${Txt} value=${d.title} onSave=${v => up({ title: v })} placeholder="Ej: Universidad, Gimnasio, Trabajo…" cls="big" autoFocus=${isNew} />
    <${Field} label="Días"><${DaysPick} value=${d.days} onChange=${v => up({ days: v })} /><//>
    <${Row}>
      <${Field} label="De"><input type="time" class="inp" value=${d.start || ''} onChange=${e => up({ start: e.target.value })} /><//>
      <${Field} label="A"><input type="time" class="inp" value=${d.end || ''} onChange=${e => up({ end: e.target.value })} /><//>
    <//>
    <${Field} label="Ámbito"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} /><//>
    <${Row}>
      <${Field} label="Desde (opcional)"><input type="date" class="inp" value=${d.from || ''} onChange=${e => up({ from: e.target.value })} /><//>
      <${Field} label="Hasta (opcional)" hint="Ej: fin del cuatrimestre"><input type="date" class="inp" value=${d.until || ''} onChange=${e => up({ until: e.target.value })} /><//>
    <//>
    <${Toggle} checked=${d.sync !== false} onChange=${v => up({ sync: v })} label="Mostrar en Google Calendar" />
    <${Field} label="Aviso"><${Select} value=${String(d.reminder ?? -1)} options=${REMINDERS.slice(0, 5)} onChange=${v => up({ reminder: Number(v) })} /><//>
    <${Field} label="Notas"><${Txt} multiline rows=${2} value=${d.notes} onSave=${v => up({ notes: v })} /><//>`
}

export const goalProgress = g => {
  const ms = g.milestones || []
  if (ms.length) return Math.round(ms.filter(m => m.done).length / ms.length * 100)
  return g.progress || 0
}
function GoalEditor({ d, isNew }) {
  const up = f => patch('goals', d.id, f)
  const ms = d.milestones || []
  const setMs = next => up({ milestones: next })
  const presets = [['3 meses', 3], ['6 meses', 6], ['1 año', 12], ['2 años', 24]]
  return html`
    <${Txt} value=${d.title} onSave=${v => up({ title: v })} placeholder="¿Qué quieres conseguir?" cls="big" autoFocus=${isNew} />
    <${Field} label="Ámbito"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} allowEmpty /><//>
    <${Field} label="Fecha objetivo" hint=${d.targetDate ? countdown(d.targetDate) : ''}>
      <div class="inline"><input type="date" class="inp" value=${d.targetDate || ''} onChange=${e => up({ targetDate: e.target.value })} />
      ${presets.map(([l, m]) => html`<button class="btn small" onClick=${() => up({ targetDate: addMonths(today(), m) })}>${l}</button>`)}</div><//>
    <${Field} label="¿Por qué es importante? / Cómo lo mediré"><${Txt} multiline rows=${3} value=${d.why} onSave=${v => up({ why: v })} /><//>
    <${Field} label="Pasos / hitos" hint=${ms.length ? 'El progreso se calcula con los hitos completados' : 'Añade hitos o usa el progreso manual'}>
      <div class="ms-list">${ms.map((m, i) => html`<div class="ms" key=${m.id}>
        <${Check} checked=${m.done} onChange=${v => setMs(ms.map((x, j) => j === i ? { ...x, done: v } : x))} />
        <${Txt} value=${m.text} onSave=${v => setMs(ms.map((x, j) => j === i ? { ...x, text: v } : x))} />
        <button class="icon-btn" aria-label="Quitar hito" onClick=${() => setMs(ms.filter((_, j) => j !== i))}><${Icon} n="x" s=${16} /></button></div>`)}
      <input class="inp" placeholder="+ Añadir hito y pulsa Enter" onKeyDown=${e => {
        const v = e.target.value.trim()
        if (e.key === 'Enter' && v) { setMs([...ms, { id: Date.now().toString(36), text: v, done: false }]); e.target.value = '' }
      }} /></div><//>
    ${!ms.length && html`<${Field} label=${'Progreso manual: ' + (d.progress || 0) + '%'}>
      <input type="range" min="0" max="100" step="5" value=${d.progress || 0} onChange=${e => up({ progress: Number(e.target.value) })} /><//>`}
    <${Toggle} checked=${d.achieved} onChange=${v => up({ achieved: v, achievedAt: v ? today() : '' })} label="¡Conseguida!" />`
}

function TxEditor({ d, isNew }) {
  const up = f => patch('transactions', d.id, f)
  const type = d.type || 'gasto'
  return html`
    <${Seg} options=${[{ v: 'gasto', l: 'Gasto' }, { v: 'ingreso', l: 'Ingreso' }, { v: 'transferencia', l: 'Transferencia' }]} value=${type} onChange=${v => up({ type: v })} />
    <${Row}>
      <${Field} label="Importe (€)"><${Num} value=${d.amount} onSave=${v => up({ amount: v })} cls="big" /><//>
      <${Field} label="Fecha"><input type="date" class="inp" value=${d.date || ''} onChange=${e => up({ date: e.target.value })} /><//>
    <//>
    <${Row}>
      <${Field} label=${type === 'transferencia' ? 'Desde la cuenta' : 'Cuenta'}><${Select} value=${d.accountId} empty="—" options=${accountOptions()} onChange=${v => up({ accountId: v })} /><//>
      ${type === 'transferencia' && html`<${Field} label="A la cuenta"><${Select} value=${d.toAccountId} empty="—" options=${accountOptions()} onChange=${v => up({ toAccountId: v })} /><//>`}
    <//>
    ${type !== 'transferencia' && html`
      <${Field} label="Ámbito"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} /><//>
      <${Field} label="Categoría"><${Txt} value=${d.category} list="cats" onSave=${v => up({ category: v })} placeholder="Comida, Cenas fuera, Software…" />
        <datalist id="cats">${categories().map(c => html`<option value=${c} />`)}</datalist><//>`}
    <${Field} label="Concepto / nota"><${Txt} value=${d.note} onSave=${v => up({ note: v })} placeholder=${isNew ? 'Ej: cena con amigos, cliente X…' : ''} /><//>
    ${d.subId && html`<p class="muted small">Cobro automático de una suscripción.</p>`}`
}

function ProductEditor({ d, isNew }) {
  const up = f => patch('products', d.id, f)
  const setStatus = v => up({ status: v, ...(v === 'vendido' && !d.sellDate ? { sellDate: today(), sellAccountId: d.sellAccountId || d.buyAccountId || 'negocio' } : {}) })
  const profit = productProfit(d), cost = productCost(d)
  return html`
    <${Txt} value=${d.name} onSave=${v => up({ name: v })} placeholder="Producto (ej: iPhone 12 128GB)" cls="big" autoFocus=${isNew} />
    <${Field} label="Estado"><${Seg} options=${STATUS} value=${d.status || 'stock'} onChange=${setStatus} /><//>
    <${Field} label="Negocio"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} business /><//>
    <h4 class="sub">Compra</h4>
    <${Row}>
      <${Field} label="Precio de compra"><${Num} value=${d.buyPrice} onSave=${v => up({ buyPrice: v })} /><//>
      <${Field} label="Fecha compra"><input type="date" class="inp" value=${d.buyDate || ''} onChange=${e => up({ buyDate: e.target.value })} /><//>
    <//>
    <${Row}>
      <${Field} label="Gastos extra" hint="Envío, reparación, limpieza…"><${Num} value=${d.extraCosts} onSave=${v => up({ extraCosts: v })} /><//>
      <${Field} label="Pagado desde"><${Select} value=${d.buyAccountId} empty="—" options=${accountOptions()} onChange=${v => up({ buyAccountId: v })} /><//>
    <//>
    <${Field} label="Precio anunciado"><${Num} value=${d.listPrice} onSave=${v => up({ listPrice: v })} /><//>
    ${d.status === 'vendido' && html`
      <h4 class="sub">Venta</h4>
      <${Row}>
        <${Field} label="Precio de venta"><${Num} value=${d.sellPrice} onSave=${v => up({ sellPrice: v })} /><//>
        <${Field} label="Fecha venta"><input type="date" class="inp" value=${d.sellDate || ''} onChange=${e => up({ sellDate: e.target.value })} /><//>
      <//>
      <${Row}>
        <${Field} label="Comisiones / envío" hint="Lo que te descuentan"><${Num} value=${d.fees} onSave=${v => up({ fees: v })} /><//>
        <${Field} label="Cobrado en"><${Select} value=${d.sellAccountId} empty="—" options=${accountOptions()} onChange=${v => up({ sellAccountId: v })} /><//>
      <//>
      <div class=${'result ' + (profit >= 0 ? 'pos' : 'neg')}>Beneficio: <b>${money(profit)}</b>
        ${cost > 0 && html` · margen ${Math.round(profit / cost * 100)}%`}</div>`}
    <${Field} label="Notas"><${Txt} multiline rows=${2} value=${d.notes} onSave=${v => up({ notes: v })} placeholder="Estado, dónde está guardado, a quién se lo compré…" /><//>`
}

function SubEditor({ d, isNew }) {
  const up = f => patch('subscriptions', d.id, f)
  return html`
    <${Txt} value=${d.name} onSave=${v => up({ name: v })} placeholder="Ej: ChatGPT Plus, Spotify, gimnasio…" cls="big" autoFocus=${isNew} />
    <${Row}>
      <${Field} label="Importe (€)"><${Num} value=${d.amount} onSave=${v => up({ amount: v })} /><//>
      <${Field} label="Cada"><${Select} value=${d.period || 'mensual'} options=${PERIODS} onChange=${v => up({ period: v })} /><//>
    <//>
    <${Row}>
      <${Field} label="Próximo cobro"><input type="date" class="inp" value=${d.nextDate || ''} onChange=${e => up({ nextDate: e.target.value })} /><//>
      <${Field} label="Cuenta"><${Select} value=${d.accountId} empty="—" options=${accountOptions()} onChange=${v => up({ accountId: v })} /><//>
    <//>
    <${Field} label="Ámbito"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} /><//>
    <${Field} label="Categoría"><${Txt} value=${d.category} list="cats2" onSave=${v => up({ category: v })} placeholder="Suscripciones" />
      <datalist id="cats2">${categories().map(c => html`<option value=${c} />`)}</datalist><//>
    <${Toggle} checked=${d.active !== false} onChange=${v => up({ active: v })} label="Activa" />
    <p class="muted small">Cada vez que llegue la fecha de cobro se apunta sola como gasto en la cuenta elegida.</p>`
}

function AccountEditor({ d, isNew }) {
  const up = f => patch('accounts', d.id, f)
  const bal = accountBalance(d.id)
  return html`
    <${Txt} value=${d.name} onSave=${v => up({ name: v })} placeholder="Nombre (ej: BBVA negocio)" cls="big" autoFocus=${isNew} />
    <${Field} label="Tipo"><${Seg} options=${[{ v: 'personal', l: 'Personal' }, { v: 'negocio', l: 'Negocio' }, { v: 'ahorro', l: 'Ahorro' }]} value=${d.kind || 'personal'} onChange=${v => up({ kind: v })} /><//>
    <${Field} label="Saldo actual calculado"><div class="result">${money(bal)}</div><//>
    <${Field} label="Ajustar saldo actual a…" hint="Escribe lo que ves en tu banco y la app cuadra el saldo">
      <${Txt} value="" inputMode="decimal" placeholder="Saldo real del banco"
        onSave=${v => { if (String(v).trim() !== '') up({ initial: num(d.initial) + (num(v) - bal) }) }} /><//>`
}

function SubjectEditor({ d, isNew }) {
  const up = f => patch('subjects', d.id, f)
  return html`
    <${Txt} value=${d.name} onSave=${v => up({ name: v })} placeholder="Nombre de la asignatura" cls="big" autoFocus=${isNew} />
    <${Row}>
      <${Field} label="Curso / cuatrimestre"><${Txt} value=${d.term} onSave=${v => up({ term: v })} placeholder="2º - 1C" /><//>
      <${Field} label="Créditos"><${Num} value=${d.credits} onSave=${v => up({ credits: v })} placeholder="6" /><//>
    <//>
    <${Field} label="Profesor/a y contacto"><${Txt} value=${d.teacher} onSave=${v => up({ teacher: v })} /><//>
    <${Field} label="Nota para aprobar"><${Num} value=${d.passMark} onSave=${v => up({ passMark: v })} placeholder="5" /><//>
    <${Field} label="Color"><${ColorPick} value=${d.color} onChange=${v => up({ color: v })} /><//>
    <${Toggle} checked=${d.finished} onChange=${v => up({ finished: v })} label="Asignatura terminada" />`
}

function NoteEditor({ d, isNew }) {
  const up = f => patch('notes', d.id, f)
  return html`
    <${Txt} value=${d.title} onSave=${v => up({ title: v })} placeholder="Título del apunte" cls="big" autoFocus=${isNew} />
    <${Row}>
      <${Field} label="Asignatura"><${Select} value=${d.subjectId} empty="—" options=${subjectOptions()} onChange=${v => up({ subjectId: v })} /><//>
      <${Field} label="Enlace (Drive, PDF…)"><${Txt} value=${d.url} onSave=${v => up({ url: v })} placeholder="https://" /><//>
    <//>
    ${d.url && html`<a class="link" href=${d.url} target="_blank" rel="noopener">Abrir enlace ↗</a>`}
    <${Txt} multiline rows=${14} value=${d.content} onSave=${v => up({ content: v })} placeholder="Escribe tus apuntes…" cls="note-area" />`
}

function AreaEditor({ d, isNew }) {
  const up = f => patch('areas', d.id, f)
  return html`
    <${Txt} value=${d.name} onSave=${v => up({ name: v })} placeholder="Nombre del ámbito" cls="big" autoFocus=${isNew} />
    <${Field} label="Color (también en Google Calendar)"><${ColorPick} value=${d.color} onChange=${v => up({ color: v })} /><//>
    <${Toggle} checked=${d.isBusiness} onChange=${v => up({ isBusiness: v })} label="Es un negocio (aparece en Dinero → Negocios y Stock)" />`
}

function HabitEditor({ d, isNew }) {
  const up = f => patch('habits', d.id, f)
  return html`
    <${Txt} value=${d.title} onSave=${v => up({ title: v })} placeholder="Ej: Beber 2L de agua" cls="big" autoFocus=${isNew} />
    <${Field} label="Qué días"><${DaysPick} value=${d.days || []} onChange=${v => up({ days: v })} /><//>
    <${Field} label="Ámbito"><${AreaPick} value=${d.areaId} onChange=${v => up({ areaId: v })} allowEmpty /><//>`
}

const EDITORS = {
  task: ['Tarea', TaskEditor], event: ['Evento', EventEditor], routine: ['Rutina', RoutineEditor], goal: ['Meta', GoalEditor],
  tx: ['Movimiento', TxEditor], product: ['Producto', ProductEditor], sub: ['Gasto fijo / suscripción', SubEditor],
  account: ['Cuenta', AccountEditor], subject: ['Asignatura', SubjectEditor], note: ['Apunte', NoteEditor],
  area: ['Ámbito', AreaEditor], habit: ['Hábito diario', HabitEditor],
}

export function EditorHost() {
  const ed = S.ui.editor
  if (!ed) return null
  const col = EDITOR_COLS[ed.kind]
  const d = get(col, ed.id)
  if (!d || d.deleted) { S.ui.editor = null; return null }
  const [title, Comp] = EDITORS[ed.kind]
  return html`<${Modal} title=${(ed.isNew ? 'Nuevo: ' : '') + title} onClose=${closeEditor} wide=${ed.kind === 'note'}
    footer=${html`<${Foot} col=${col} id=${d.id} />`}>
    <div class="form" key=${d.id}><${Comp} d=${d} isNew=${ed.isNew} /></div>
    <p class="saved-note">Se guarda automáticamente${S.demo ? ' (modo demo: solo en este dispositivo)' : ' y se sincroniza en todos tus dispositivos'}.</p>
  <//>`
}
