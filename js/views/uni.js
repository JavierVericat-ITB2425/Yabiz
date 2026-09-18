import { html, useState } from '../lib.js'
import { list, get, save, patch, hardDelete, openEditor, createAndEdit } from '../store.js'
import { PageHead, Section, Empty, Fab, Icon, Txt, Num } from '../components.js'
import { TaskRow } from './tasks.js'
import { AgendaItem } from './home.js'
import { today, fmtDate, relDay, num, by, addDays } from '../utils.js'

// Media ponderada: lo que llevas sacado sobre lo evaluado y cuánto necesitas en lo que queda para aprobar
export function gradeStats(subjectId, passMark = 5) {
  const gs = list('grades').filter(g => g.subjectId === subjectId)
  let wDone = 0, pts = 0, wAll = 0
  for (const g of gs) {
    const w = num(g.weight); wAll += w
    if (g.score !== undefined && g.score !== '' && g.score !== null) { wDone += w; pts += num(g.score) * w }
  }
  const avg = wDone ? pts / wDone : null
  const earned = pts / 100
  const remaining = Math.max(0, 100 - wDone)
  const needed = remaining ? (passMark - earned) / (remaining / 100) : null
  return { gs, avg, earned, wDone, wAll, needed, remaining }
}

let savedSubject = null

export function Uni() {
  const [sel, setSelState] = useState(savedSubject)
  const setSel = id => { savedSubject = id; setSelState(id) }
  const subj = sel && get('subjects', sel)
  if (subj) return html`<${Subject} s=${subj} onBack=${() => setSel(null)} />`
  const subjects = list('subjects').filter(s => s.name || s.draft).sort(by('finished', 'name'))
  const t = today()
  const exams = list('events').filter(e => (e.type === 'examen' || e.type === 'entrega') && e.date >= t).sort(by('date', 'time')).slice(0, 8)
  const hw = list('tasks').filter(x => !x.done && x.title && (x.subjectId || x.areaId === 'uni')).sort(by('dueDate')).slice(0, 8)
  // media del expediente ponderada por créditos
  let cr = 0, sum = 0
  subjects.forEach(s => { const g = gradeStats(s.id, num(s.passMark) || 5); if (g.avg !== null) { const c = num(s.credits) || 1; cr += c; sum += g.avg * c } })
  return html`<div class="page">
    <${PageHead} title="Universidad" sub=${cr ? `Media ponderada: ${(sum / cr).toFixed(2)}` : 'Asignaturas, notas, apuntes, exámenes y entregas'}>
      <button class="btn" onClick=${() => createAndEdit('event', { type: 'examen', areaId: 'uni', date: addDays(t, 7), allDay: false, time: '09:00', endTime: '11:00' })}>+ Examen</button>
      <button class="btn" onClick=${() => createAndEdit('task', { areaId: 'uni', priority: 2, dueDate: addDays(t, 7) })}>+ Deber</button>
    <//>
    <div class="grid2">
      <${Section} title="Próximos exámenes y entregas">
        ${exams.length ? exams.map(e => html`<${AgendaItem} it=${{ kind: 'event', id: e.id, title: (get('subjects', e.subjectId)?.name ? get('subjects', e.subjectId).name + ' · ' : '') + e.title, time: e.allDay ? '' : e.time, type: e.type, color: get('subjects', e.subjectId)?.color || '#3f51b5' }} showDate=${e.date} />`)
          : html`<${Empty}>Sin exámenes a la vista.<//>`}
      <//>
      <${Section} title="Deberes pendientes">
        ${hw.length ? hw.map(x => html`<${TaskRow} t=${x} />`) : html`<${Empty}>Nada pendiente.<//>`}
      <//>
    </div>
    <h3 class="sub">Asignaturas</h3>
    <div class="subjects">
      ${subjects.map(s => {
        const g = gradeStats(s.id, num(s.passMark) || 5)
        return html`<button class=${'card subject' + (s.finished ? ' off' : '')} style=${{ '--c': s.color || '#3f51b5' }} onClick=${() => setSel(s.id)}>
          <b>${s.name || 'Sin nombre'}</b><span class="muted small">${[s.term, s.credits && s.credits + ' ECTS'].filter(Boolean).join(' · ')}</span>
          <span class="grade">${g.avg === null ? '—' : g.avg.toFixed(2)}</span>
          <span class="muted small">${list('notes').filter(n => n.subjectId === s.id).length} apuntes</span></button>`
      })}
    </div>
    ${!subjects.length && html`<${Empty}>Pulsa + para añadir tus asignaturas.<//>`}
    <${Fab} label="Nueva asignatura" onClick=${() => { const id = createAndEdit('subject', { color: '#3f51b5', passMark: 5 }); setSel(id) }} />
  </div>`
}

function Subject({ s, onBack }) {
  const pass = num(s.passMark) || 5
  const g = gradeStats(s.id, pass)
  const t = today()
  const events = list('events').filter(e => e.subjectId === s.id).sort(by('date'))
  const tasks = list('tasks').filter(x => x.subjectId === s.id && x.title).sort(by('done', 'dueDate'))
  const notes = list('notes').filter(n => n.subjectId === s.id).sort(by('-updatedAt'))
  return html`<div class="page">
    <button class="btn ghost" onClick=${onBack}><${Icon} n="back" s=${16} /> Asignaturas</button>
    <${PageHead} title=${s.name || 'Asignatura'} sub=${[s.term, s.credits && s.credits + ' ECTS', s.teacher].filter(Boolean).join(' · ')}>
      <button class="btn" onClick=${() => openEditor('subject', s.id)}>Editar</button>
    <//>
    <div class="grid2">
      <${Section} title="Notas" action=${html`<button class="btn small" onClick=${() => save('grades', { subjectId: s.id, name: '', weight: '', createdAt: Date.now() })}>+ Añadir</button>`}>
        <div class="kpis">
          <div><small>Media de lo evaluado</small><b>${g.avg === null ? '—' : g.avg.toFixed(2)}</b></div>
          <div><small>Llevas acumulado</small><b>${g.earned.toFixed(2)} / ${(g.wDone / 10).toFixed(1)}</b></div>
          <div><small>Necesitas en lo que queda</small><b class=${g.needed > 10 ? 'neg' : ''}>${g.needed === null ? (g.earned >= pass ? '✓ Aprobado' : '—') : g.needed <= 0 ? '¡Ya aprobado!' : g.needed.toFixed(2)}</b></div>
        </div>
        <div class="grades">
          <div class="grade-row head"><span>Prueba</span><span>Peso %</span><span>Nota /10</span><span></span></div>
          ${g.gs.sort(by('createdAt')).map(x => html`<div class="grade-row" key=${x.id}>
            <${Txt} value=${x.name} placeholder="Parcial 1, prácticas…" onSave=${v => patch('grades', x.id, { name: v })} />
            <${Num} value=${x.weight} placeholder="30" onSave=${v => patch('grades', x.id, { weight: v })} />
            <${Txt} value=${x.score === undefined || x.score === '' ? '' : String(x.score).replace('.', ',')} inputMode="decimal" placeholder="—"
              onSave=${v => patch('grades', x.id, { score: v.trim() === '' ? '' : num(v) })} />
            <button class="icon-btn" aria-label="Quitar" onClick=${() => hardDelete('grades', x.id)}><${Icon} n="x" s=${16} /></button></div>`)}
          ${g.wAll !== 100 && g.gs.length > 0 && html`<p class="muted small">Los pesos suman ${g.wAll}% (deberían sumar 100%).</p>`}
        </div>
      <//>
      <${Section} title="Exámenes, entregas y deberes" action=${html`<span class="inline">
        <button class="btn small" onClick=${() => createAndEdit('event', { type: 'examen', areaId: 'uni', subjectId: s.id, title: 'Examen ' + (s.name || ''), date: addDays(t, 7), time: '09:00', endTime: '11:00' })}>+ Examen</button>
        <button class="btn small" onClick=${() => createAndEdit('task', { areaId: 'uni', subjectId: s.id, priority: 2, dueDate: addDays(t, 7) })}>+ Deber</button></span>`}>
        ${events.map(e => html`<${AgendaItem} it=${{ kind: 'event', id: e.id, title: e.title, time: e.allDay ? '' : e.time, type: e.type, color: s.color || '#3f51b5' }} showDate=${e.date} />`)}
        ${tasks.map(x => html`<${TaskRow} t=${x} />`)}
        ${!events.length && !tasks.length && html`<${Empty}>Nada todavía.<//>`}
      <//>
    </div>
    <${Section} title="Apuntes" action=${html`<button class="btn small" onClick=${() => createAndEdit('note', { subjectId: s.id })}>+ Apunte</button>`}>
      <div class="notes">${notes.map(n => html`<button class="note" onClick=${() => openEditor('note', n.id)}>
        <b>${n.title || 'Sin título'}</b><span class="muted small clamp">${(n.content || n.url || '').slice(0, 120)}</span>
        <span class="muted small">${relDay(new Date(n.updatedAt || Date.now()).toISOString().slice(0, 10))}</span></button>`)}</div>
      ${!notes.length && html`<${Empty}>Guarda aquí resúmenes, fórmulas o enlaces a tus PDFs.<//>`}
    <//>
  </div>`
}
