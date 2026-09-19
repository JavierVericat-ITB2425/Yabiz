import { html, useState, useEffect } from './lib.js'
import { S, useStore, auth } from './store.js'
import { Icon } from './components.js'
import { CONFIG } from './config.js'
import { EditorHost } from './editors.js'
import { Home } from './views/home.js'
import { Agenda } from './views/agenda.js'
import { Tasks } from './views/tasks.js'
import { Goals } from './views/goals.js'
import { Journal } from './views/journal.js'
import { Money } from './views/money.js'
import { Uni } from './views/uni.js'
import { Settings } from './views/settings.js'
import './gcal.js'

const NAV = [
  { id: 'hoy', label: 'Hoy', icon: 'sun', C: Home },
  { id: 'agenda', label: 'Agenda', icon: 'calendar', C: Agenda },
  { id: 'tareas', label: 'Tareas', icon: 'check', C: Tasks },
  { id: 'dinero', label: 'Dinero', icon: 'wallet', C: Money },
  { id: 'uni', label: 'Uni', icon: 'cap', C: Uni },
  { id: 'diario', label: 'Diario', icon: 'book', C: Journal },
  { id: 'metas', label: 'Metas', icon: 'target', C: Goals },
  { id: 'ajustes', label: 'Ajustes', icon: 'sliders', C: Settings },
]
const MOBILE_MAIN = ['hoy', 'agenda', 'tareas', 'dinero']

function useRoute() {
  const get = () => (location.hash.replace(/^#\/?/, '') || 'hoy').split('/')[0]
  const [r, setR] = useState(get())
  useEffect(() => { const f = () => { setR(get()); window.scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return NAV.find(n => n.id === r) ? r : 'hoy'
}

function Login() {
  const [f, setF] = useState({ email: '', pass: '', mode: 'in', err: '', busy: false })
  const submit = async e => {
    e.preventDefault(); setF({ ...f, busy: true, err: '' })
    try { f.mode === 'in' ? await auth.signIn(f.email.trim(), f.pass) : await auth.signUp(f.email.trim(), f.pass) }
    catch (err) {
      const code = err.code || ''
      const msg = code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') ? 'Email o contraseña incorrectos'
        : code.includes('email-already') ? 'Ya existe una cuenta con ese email: inicia sesión'
        : code.includes('weak-password') ? 'La contraseña debe tener al menos 6 caracteres'
        : code.includes('network') ? 'Sin conexión' : (err.message || 'Error')
      setF(x => ({ ...x, busy: false, err: msg }))
    }
  }
  return html`<div class="login"><form class="card" onSubmit=${submit}>
    <img src="icons/icon.svg" width="56" height="56" alt="" />
    <h1>Yabiz</h1><p class="muted">Tu vida organizada, en todos tus dispositivos.</p>
    <input class="inp" type="email" autocomplete="email" placeholder="Email" value=${f.email} onInput=${e => setF({ ...f, email: e.target.value })} required />
    <input class="inp" type="password" autocomplete=${f.mode === 'in' ? 'current-password' : 'new-password'} placeholder="Contraseña" value=${f.pass} onInput=${e => setF({ ...f, pass: e.target.value })} required />
    ${f.err && html`<p class="neg small">${f.err}</p>`}
    <button class="btn primary wide" disabled=${f.busy}>${f.mode === 'in' ? 'Entrar' : 'Crear mi cuenta'}</button>
    ${CONFIG.allowSignup !== false && html`<button type="button" class="btn ghost wide" onClick=${() => setF({ ...f, mode: f.mode === 'in' ? 'up' : 'in', err: '' })}>
      ${f.mode === 'in' ? 'Primera vez: crear cuenta' : 'Ya tengo cuenta'}</button>`}
    ${f.mode === 'in' && html`<button type="button" class="link small" onClick=${async () => { if (!f.email) return setF({ ...f, err: 'Escribe tu email arriba' }); await auth.reset(f.email.trim()); setF({ ...f, err: 'Te he enviado un email para cambiar la contraseña' }) }}>He olvidado la contraseña</button>`}
  </form></div>`
}

function SyncDot() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const f = () => setOnline(navigator.onLine)
    addEventListener('online', f); addEventListener('offline', f)
    return () => { removeEventListener('online', f); removeEventListener('offline', f) }
  }, [])
  const title = S.demo ? 'Modo demo (solo este dispositivo)' : online ? 'Sincronizado en la nube' : 'Sin conexión: se guarda y se subirá al volver'
  return html`<span class=${'sync-dot ' + (S.demo ? 'demo' : online ? 'on' : 'off')} title=${title}><${Icon} n="cloud" s=${16} /><span>${S.demo ? 'Demo' : online ? 'Sincronizado' : 'Sin conexión'}</span></span>`
}

export function App() {
  useStore()
  const route = useRoute()
  const [more, setMore] = useState(false)
  if (S.user === undefined) return html`<div class="boot">Cargando…</div>`
  if (!S.user) return html`<${Login} />`
  const Page = NAV.find(n => n.id === route).C
  const moreActive = !MOBILE_MAIN.includes(route)
  return html`<div class="shell">
    <nav class="side">
      <div class="brand"><img src="icons/icon.svg" width="28" height="28" alt="" /> Yabiz</div>
      ${NAV.map(n => html`<a href=${'#/' + n.id} class=${route === n.id ? 'on' : ''}><${Icon} n=${n.icon} /> ${n.label}</a>`)}
      <div class="grow"></div><${SyncDot} />
    </nav>
    <main>
      ${S.demo && html`<div class="demo-banner">Modo demo: los datos solo se guardan en este navegador. Configura Firebase (README) para sincronizar entre dispositivos.</div>`}
      <div class="mobile-top"><span class="brand"><img src="icons/icon.svg" width="22" height="22" alt="" /> Yabiz</span><${SyncDot} /></div>
      <${Page} />
    </main>
    <nav class="bottom">
      ${NAV.filter(n => MOBILE_MAIN.includes(n.id)).map(n => html`<a href=${'#/' + n.id} class=${route === n.id ? 'on' : ''}><${Icon} n=${n.icon} /><span>${n.label}</span></a>`)}
      <button class=${moreActive ? 'on' : ''} onClick=${() => setMore(!more)}><${Icon} n="grid" /><span>Más</span></button>
    </nav>
    ${more && html`<div class="overlay" onClick=${() => setMore(false)}><div class="more-menu">
      ${NAV.filter(n => !MOBILE_MAIN.includes(n.id)).map(n => html`<a href=${'#/' + n.id} class=${route === n.id ? 'on' : ''}><${Icon} n=${n.icon} s=${24} /><span>${n.label}</span></a>`)}
    </div></div>`}
    <${EditorHost} />
  </div>`
}
