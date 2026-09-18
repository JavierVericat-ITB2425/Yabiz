import { html, useState } from '../lib.js'
import { list, openEditor, createAndEdit, areaColor, patch } from '../store.js'
import { PageHead, Seg, Progress, AreaTag, Empty, Fab, Check } from '../components.js'
import { goalProgress } from '../editors.js'
import { countdown, fmtDate, by, today, addMonths } from '../utils.js'

export function Goals() {
  const [tab, setTab] = useState('activas')
  const all = list('goals').filter(g => g.title)
  const shown = all.filter(g => tab === 'activas' ? !g.achieved : g.achieved).sort(by('targetDate'))
  return html`<div class="page">
    <${PageHead} title="Metas" sub="Objetivos a 3 meses, 6 meses, 1 año… con su fecha y sus pasos">
      <${Seg} options=${[{ v: 'activas', l: 'Activas' }, { v: 'logradas', l: 'Conseguidas' }]} value=${tab} onChange=${setTab} />
    <//>
    <div class="goals">
      ${shown.map(g => {
        const p = goalProgress(g); const ms = g.milestones || []
        const tasks = list('tasks').filter(t => t.goalId === g.id)
        const next = ms.find(m => !m.done)
        return html`<article class="card goal" style=${{ '--c': areaColor(g.areaId) }} onClick=${() => openEditor('goal', g.id)}>
          <div class="between"><h3>${g.title}</h3><b class="pct">${p}%</b></div>
          <div class="meta"><${AreaTag} id=${g.areaId} />
            ${g.targetDate && html`<span class="muted small">${fmtDate(g.targetDate, { day: 'numeric', month: 'short', year: 'numeric' })} · ${countdown(g.targetDate)}</span>`}</div>
          <${Progress} value=${p} color=${areaColor(g.areaId)} />
          ${next && html`<div class="next" onClick=${e => e.stopPropagation()}>
            <${Check} checked=${false} onChange=${() => patch('goals', g.id, { milestones: ms.map(m => m.id === next.id ? { ...m, done: true } : m) })} />
            <span>Siguiente paso: ${next.text}</span></div>`}
          ${tasks.length > 0 && html`<div class="muted small">${tasks.filter(t => !t.done).length} tareas pendientes vinculadas</div>`}
        </article>`
      })}
    </div>
    ${!shown.length && html`<${Empty}>${tab === 'activas' ? 'Crea tu primera meta con el botón +. Ej: "Ganar 1.000 €/mes con Wallapop antes de junio".' : 'Aquí aparecerán las metas que consigas.'}<//>`}
    <${Fab} label="Nueva meta" onClick=${() => createAndEdit('goal', { targetDate: addMonths(today(), 6), milestones: [] })} />
  </div>`
}
