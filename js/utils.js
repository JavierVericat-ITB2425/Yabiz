export const pad = n => String(n).padStart(2, '0')
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => ymd(new Date())
export const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d) }
export const addMonths = (s, n) => {
  const d = parseYmd(s); const day = d.getDate()
  d.setDate(1); d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last)); return ymd(d)
}
// Lunes = 1 ... Domingo = 7
export const isoDow = s => ((parseYmd(s).getDay() + 6) % 7) + 1
export const weekStart = s => addDays(s, 1 - isoDow(s))
export const monthStart = s => s.slice(0, 8) + '01'
export const monthEnd = s => { const d = parseYmd(s); return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000)
export const range = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out }

export const fmtDate = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  s ? parseYmd(s).toLocaleDateString('es-ES', opts) : ''
export const fmtLong = s => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtMonth = s => fmtDate(s, { month: 'long', year: 'numeric' })
export const cap = s => s ? s[0].toUpperCase() + s.slice(1) : ''

export function relDay(s) {
  if (!s) return ''
  const n = daysBetween(today(), s)
  if (n === 0) return 'hoy'
  if (n === 1) return 'mañana'
  if (n === -1) return 'ayer'
  if (n > 1 && n < 7) return fmtDate(s, { weekday: 'long' })
  if (n < 0) return `hace ${-n} días`
  return fmtDate(s, { day: 'numeric', month: 'short' })
}
export function countdown(s) {
  const n = daysBetween(today(), s)
  if (n < 0) return `venció hace ${-n} días`
  if (n === 0) return 'es hoy'
  if (n < 60) return `faltan ${n} días`
  const months = Math.round(n / 30.4)
  return `faltan ${months} meses`
}

export const addTime = (t, mins) => {
  const [h, m] = t.split(':').map(Number); const tot = Math.min(h * 60 + m + mins, 23 * 60 + 59)
  return `${pad(Math.floor(tot / 60))}:${pad(tot % 60)}`
}

export const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n }
export const money = n => (n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
export const by = (...keys) => (a, b) => {
  for (const k of keys) {
    const desc = k[0] === '-'; const key = desc ? k.slice(1) : k
    const va = a[key] ?? '', vb = b[key] ?? ''
    if (va < vb) return desc ? 1 : -1
    if (va > vb) return desc ? -1 : 1
  }
  return 0
}

// Paleta = los 11 colores de evento de Google Calendar (así los colores se mantienen al sincronizar)
export const COLORS = [
  { id: 7, hex: '#039be5', name: 'Pavo real' },
  { id: 9, hex: '#3f51b5', name: 'Arándano' },
  { id: 1, hex: '#7986cb', name: 'Lavanda' },
  { id: 3, hex: '#8e24aa', name: 'Uva' },
  { id: 4, hex: '#e67c73', name: 'Flamenco' },
  { id: 11, hex: '#d50000', name: 'Tomate' },
  { id: 6, hex: '#f4511e', name: 'Mandarina' },
  { id: 5, hex: '#f6bf26', name: 'Plátano' },
  { id: 2, hex: '#33b679', name: 'Salvia' },
  { id: 10, hex: '#0b8043', name: 'Albahaca' },
  { id: 8, hex: '#616161', name: 'Grafito' },
]
export const gcalColor = hex => (COLORS.find(c => c.hex === hex) || COLORS[0]).id

export const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DOW_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
