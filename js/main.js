import { html, render } from './lib.js'
import { init } from './store.js'
import { App } from './app.js'

init().then(() => render(html`<${App} />`, document.getElementById('app')))

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e))
}
