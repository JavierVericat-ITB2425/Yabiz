import { html, useState } from '../lib.js'
import { S, list, areas, settings, patch, rawSet, openEditor, createAndEdit, auth, COLS } from '../store.js'
import { PageHead, Section, Txt, Field, Toggle, Empty, Icon } from '../components.js'
import { runSync, testConnection } from '../gcal.js'
import { DOW, by } from '../utils.js'

function GcalSettings() {
  const st = settings()
  const [test, setTest] = useState('')
  const up = f => patch('settings', 'main', f)
  const g = S.gcal
  const label = { off: 'Sin configurar', ok: 'Sincronizado', syncing: 'Sincronizando…', error: 'Error' }[g.state]
  return html`<${Section} title="Google Calendar">
    <p class="muted small">Todo lo que pongas en la Agenda (eventos, exámenes, rutinas y, si quieres, tareas con fecha) se copia a un calendario llamado <b>Yabiz</b> en tu Google Calendar, con sus avisos. Instrucciones en el README (paso 4).</p>
    <${Field} label="URL del script (termina en /exec)"><${Txt} value=${st.gcalUrl} placeholder="https://script.google.com/macros/s/…/exec" onSave=${v => up({ gcalUrl: v.trim() })} /><//>
    <${Field} label="Clave secreta (la misma que pusiste en el script)"><${Txt} type="password" value=${st.gcalSecret} onSave=${v => up({ gcalSecret: v.trim() })} /><//>
    <${Toggle} checked=${st.gcalTasks !== false} onChange=${v => up({ gcalTasks: v })} label="Enviar también las tareas con fecha" />
    <div class="inline">
      <span class=${'status ' + g.state}>● ${label}${g.pending ? ` · ${g.pending} pendientes` : ''}</span>
      <button class="btn small" disabled=${!st.gcalUrl} onClick=${() => runSync()}>Sincronizar ahora</button>
      <button class="btn small ghost" disabled=${!st.gcalUrl} onClick=${async () => { setTest('Probando…'); try { const r = await testConnection(st.gcalUrl); setTest(r.ok ? '✓ Conexión correcta con el script' : 'Respuesta inesperada') } catch (e) { setTest('✗ No se pudo conectar: revisa la URL y que el acceso sea "Cualquier usuario"') } }}>Probar conexión</button>
    </div>
    ${test && html`<p class="small">${test}</p>`}
    ${g.error && html`<p class="small neg">${g.error}</p>`}
  <//>`
}

function Backup() {
  const exportAll = () => {
    const data = Object.fromEntries(COLS.map(c => [c, S.data[c]]))
    const blob = new Blob([JSON.stringify({ app: 'yabiz', exportedAt: new Date().toISOString(), data }, null, 1)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `yabiz-copia-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const importFile = async e => {
    const f = e.target.files[0]; if (!f) return
    try {
      const json = JSON.parse(await f.text())
      if (json.app !== 'yabiz' || !confirm('Esto añadirá/sobrescribirá los datos con los de la copia. ¿Seguir?')) return
      let n = 0
      for (const [col, docs] of Object.entries(json.data)) {
        if (!COLS.includes(col)) continue
        for (const { id, ...rest } of docs) { rawSet(col, id, rest); n++ }
      }
      alert(`Importados ${n} elementos.`)
    } catch (err) { alert('Archivo no válido') }
    e.target.value = ''
  }
  return html`<${Section} title="Copia de seguridad">
    <p class="muted small">Tus datos ya están en la nube (Firebase), pero puedes descargar una copia cuando quieras (por ejemplo, para guardarla en tu NAS).</p>
    <div class="inline"><button class="btn" onClick=${exportAll}>Descargar copia (.json)</button>
      <label class="btn ghost">Restaurar copia<input type="file" accept="application/json" hidden onChange=${importFile} /></label></div>
  <//>`
}

export function Settings() {
  const habits = list('habits').filter(h => h.title || h.draft).sort(by('order', 'title'))
  return html`<div class="page">
    <${PageHead} title="Ajustes" sub=${S.demo ? 'Modo demo: los datos solo se guardan en este navegador' : 'Sesión: ' + (S.user?.email || '')}>
      ${!S.demo && html`<button class="btn ghost" onClick=${() => auth.signOut()}>Cerrar sesión</button>`}
    <//>
    <div class="grid2">
      <${Section} title="Ámbitos (etiquetas y colores)" action=${html`<button class="btn small" onClick=${() => createAndEdit('area', { color: '#7986cb', order: areas().length })}>+ Añadir</button>`}>
        ${areas().map(a => html`<div class="mov" onClick=${() => openEditor('area', a.id)}>
          <i class="dot big" style=${{ background: a.color }}></i><div class="grow">${a.name || 'Sin nombre'}</div>
          ${a.isBusiness && html`<span class="badge soft">negocio</span>`}</div>`)}
      <//>
      <${Section} title="Hábitos del checklist diario" action=${html`<button class="btn small" onClick=${() => createAndEdit('habit', { days: [1, 2, 3, 4, 5, 6, 7], order: habits.length })}>+ Añadir</button>`}>
        ${habits.map(h => html`<div class="mov" onClick=${() => openEditor('habit', h.id)}>
          <${Icon} n="check" s=${18} /><div class="grow">${h.title || 'Sin nombre'}</div>
          <span class="muted small">${(h.days || []).length === 7 ? 'Cada día' : (h.days || []).map(d => DOW[d - 1]).join(' ')}</span></div>`)}
        ${!habits.length && html`<${Empty}>Añade cosas que quieras hacer cada día.<//>`}
      <//>
      <${GcalSettings} />
      <${Backup} />
      <${Section} title="Instalar en el iPhone y en los PCs">
        <ol class="small steps">
          <li><b>iPhone:</b> abre la web en Safari → botón Compartir → <i>Añadir a pantalla de inicio</i>. Se abrirá como una app a pantalla completa.</li>
          <li><b>PC / portátil (Chrome o Edge):</b> icono de instalar en la barra de direcciones (o menú → <i>Instalar Yabiz</i>).</li>
          <li>Inicia sesión con el mismo email en todos: lo que cambies en uno aparece al instante en los demás.</li>
        </ol>
      <//>
    </div>
  </div>`
}
