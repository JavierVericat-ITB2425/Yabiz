import { html, useState } from '../lib.js'
import { list, get, rawSet } from '../store.js'
import { PageHead, Txt, Icon } from '../components.js'
import { today, addDays, fmtLong, fmtDate, cap, by } from '../utils.js'

const MOODS = ['😞', '😕', '😐', '🙂', '😄']
let savedDate = null

export function Journal() {
  const [date, setDateState] = useState(savedDate || today())
  const setDate = d => { savedDate = d; setDateState(d) }
  const [q, setQ] = useState('')
  const e = get('journal', date) || {}
  const up = f => rawSet('journal', date, { ...f, updatedAt: Date.now() })
  const entries = list('journal').filter(x => x.text || x.mood)
    .filter(x => !q || (x.text || '').toLowerCase().includes(q.toLowerCase())).sort(by('-id'))
  const words = (e.text || '').trim().split(/\s+/).filter(Boolean).length
  return html`<div class="page">
    <${PageHead} title="Diario" sub="Tu espacio para escribir. Se guarda solo." />
    <div class="journal">
      <section class="card j-editor">
        <div class="cal-nav">
          <button class="icon-btn" onClick=${() => setDate(addDays(date, -1))} aria-label="Día anterior"><${Icon} n="left" /></button>
          <h2>${cap(fmtLong(date))}</h2>
          <button class="icon-btn" onClick=${() => setDate(addDays(date, 1))} aria-label="Día siguiente"><${Icon} n="right" /></button>
          ${date !== today() && html`<button class="btn small" onClick=${() => setDate(today())}>Hoy</button>`}
        </div>
        <div class="moods">${MOODS.map((m, i) => html`<button class=${e.mood === i + 1 ? 'on' : ''} onClick=${() => up({ mood: e.mood === i + 1 ? 0 : i + 1 })} aria-label=${'Ánimo ' + (i + 1)}>${m}</button>`)}</div>
        <${Txt} key=${date} multiline rows=${16} cls="journal-area" value=${e.text} onSave=${v => up({ text: v })} placeholder="¿Qué tal ha ido el día? ¿Qué has aprendido? ¿Qué te preocupa o te ilusiona?" />
        <div class="muted small">${words} palabras</div>
      </section>
      <aside class="card j-list">
        <div class="search"><${Icon} n="search" s=${16} /><input class="inp" placeholder="Buscar en el diario" value=${q} onInput=${ev => setQ(ev.target.value)} /></div>
        ${entries.map(x => html`<button class=${'j-entry' + (x.id === date ? ' on' : '')} onClick=${() => setDate(x.id)}>
          <div class="between"><b>${cap(fmtDate(x.id, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</b><span>${x.mood ? MOODS[x.mood - 1] : ''}</span></div>
          <div class="muted small clamp">${(x.text || '').slice(0, 140)}</div></button>`)}
        ${!entries.length && html`<p class="muted small">Todavía no hay entradas.</p>`}
      </aside>
    </div>
  </div>`
}
