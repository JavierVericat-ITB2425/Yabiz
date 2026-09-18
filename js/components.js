import { html, useState, useEffect, useRef } from './lib.js'
import { areas, area } from './store.js'
import { COLORS, DOW } from './utils.js'

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
}
export function Icon({ n, s = 20 }) {
  return html`<svg class="ic" width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: ICONS[n] || '' }}></svg>`
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [onClose])
  return html`<div class="overlay" onMouseDown=${e => { if (e.target === e.currentTarget) onClose() }}>
    <div class=${'sheet' + (wide ? ' wide' : '')} role="dialog" aria-label=${title}>
      <div class="sheet-head"><h3>${title}</h3>
        <button class="icon-btn" onClick=${onClose} aria-label="Cerrar"><${Icon} n="x" /></button></div>
      <div class="sheet-body">${children}</div>
      ${footer && html`<div class="sheet-foot">${footer}</div>`}
    </div></div>`
}

// Campo de texto con autoguardado (guarda 0,6 s después de dejar de escribir y al salir del campo)
export function Txt({ value, onSave, multiline, placeholder, cls = '', type = 'text', autoFocus, rows = 4, inputMode, onEnter, list }) {
  const [v, setV] = useState(value ?? '')
  const focused = useRef(false), timer = useRef(), pending = useRef(null), saveRef = useRef(onSave)
  saveRef.current = onSave
  useEffect(() => { if (!focused.current && pending.current === null) setV(value ?? '') }, [value])
  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current !== null) { const p = pending.current; pending.current = null; saveRef.current(p) }
  }
  const el = useRef()
  useEffect(() => { if (autoFocus) setTimeout(() => el.current?.focus(), 50); return flush }, [])
  const onInput = e => {
    const val = e.target.value; setV(val); pending.current = val
    clearTimeout(timer.current); timer.current = setTimeout(flush, 600)
  }
  const props = {
    class: 'inp ' + cls, value: v, placeholder, onInput, inputMode, list, ref: el,
    onFocus: () => { focused.current = true },
    onBlur: () => { focused.current = false; flush() },
  }
  if (multiline) return html`<textarea rows=${rows} ...${props}></textarea>`
  return html`<input type=${type} ...${props}
    onKeyDown=${e => { if (e.key === 'Enter') { flush(); onEnter ? onEnter(e) : e.target.blur() } }} />`
}
export const Num = ({ value, onSave, placeholder = '0,00', cls }) => html`<${Txt} value=${value === undefined || value === null || value === 0 ? '' : String(value).replace('.', ',')}
  inputMode="decimal" placeholder=${placeholder} cls=${cls}
  onSave=${v => onSave(parseFloat(String(v).replace(',', '.')) || 0)} />`

export const Field = ({ label, children, hint }) => html`<label class="field"><span class="lbl">${label}</span>${children}${hint && html`<small class="hint">${hint}</small>`}</label>`
export const Row = ({ children }) => html`<div class="row2">${children}</div>`

export function Seg({ options, value, onChange, small }) {
  return html`<div class=${'seg' + (small ? ' small' : '')}>${options.map(o => html`
    <button type="button" class=${o.v === value ? 'on' : ''} onClick=${() => onChange(o.v)}>${o.l}</button>`)}</div>`
}

export function Select({ value, onChange, options, empty }) {
  return html`<select class="inp" value=${value ?? ''} onChange=${e => onChange(e.target.value)}>
    ${empty !== undefined && html`<option value="">${empty}</option>`}
    ${options.map(o => html`<option value=${o.v}>${o.l}</option>`)}</select>`
}

export function Toggle({ checked, onChange, label }) {
  return html`<label class="toggle"><input type="checkbox" checked=${!!checked} onChange=${e => onChange(e.target.checked)} /><span class="track"></span>${label}</label>`
}

export function Check({ checked, onChange, color }) {
  return html`<button type="button" class=${'check' + (checked ? ' on' : '')} style=${{ '--c': color || 'var(--primary)' }}
    aria-pressed=${!!checked} aria-label=${checked ? 'Desmarcar' : 'Marcar como hecho'}
    onClick=${e => { e.stopPropagation(); onChange(!checked) }}>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></button>`
}

export function AreaPick({ value, onChange, business, allowEmpty }) {
  const list = areas().filter(a => !business || a.isBusiness)
  return html`<div class="chips">
    ${allowEmpty && html`<button type="button" class=${'chip' + (!value ? ' on' : '')} onClick=${() => onChange('')}>Ninguno</button>`}
    ${list.map(a => html`<button type="button" class=${'chip' + (value === a.id ? ' on' : '')} style=${{ '--c': a.color }} onClick=${() => onChange(a.id)}>
      <i class="dot" style=${{ background: a.color }}></i>${a.name}</button>`)}</div>`
}
export function AreaFilter({ value = [], onChange }) {
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  return html`<div class="chips scroll">
    <button type="button" class=${'chip' + (!value.length ? ' on' : '')} onClick=${() => onChange([])}>Todo</button>
    ${areas().map(a => html`<button type="button" class=${'chip' + (value.includes(a.id) ? ' on' : '')} style=${{ '--c': a.color }} onClick=${() => toggle(a.id)}>
      <i class="dot" style=${{ background: a.color }}></i>${a.name}</button>`)}</div>`
}
export const AreaTag = ({ id }) => { const a = area(id); return a ? html`<span class="tag" style=${{ '--c': a.color }}>${a.name}</span>` : null }

export function ColorPick({ value, onChange }) {
  return html`<div class="colors">${COLORS.map(c => html`<button type="button" title=${c.name} aria-label=${c.name}
    class=${'swatch' + (value === c.hex ? ' on' : '')} style=${{ background: c.hex }} onClick=${() => onChange(c.hex)}></button>`)}</div>`
}

export function DaysPick({ value = [], onChange }) {
  const toggle = d => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort())
  return html`<div class="days">${DOW.map((l, i) => html`<button type="button" class=${value.includes(i + 1) ? 'on' : ''} onClick=${() => toggle(i + 1)}>${l}</button>`)}</div>`
}

export const Section = ({ title, action, children, cls = '' }) => html`<section class=${'card ' + cls}>
  ${(title || action) && html`<div class="card-head"><h2>${title}</h2>${action}</div>`}${children}</section>`
export const Empty = ({ children }) => html`<div class="empty">${children}</div>`
export const Progress = ({ value, color }) => html`<div class="bar"><i style=${{ width: Math.max(0, Math.min(100, value || 0)) + '%', background: color }}></i></div>`
export const PageHead = ({ title, sub, children }) => html`<header class="page-head"><div><h1>${title}</h1>${sub && html`<p class="muted">${sub}</p>`}</div><div class="head-actions">${children}</div></header>`
export const Fab = ({ onClick, label }) => html`<button class="fab" onClick=${onClick} aria-label=${label}><${Icon} n="plus" s=${26} /></button>`
