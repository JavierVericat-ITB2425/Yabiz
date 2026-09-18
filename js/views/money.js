import { html, useState } from '../lib.js'
import { list, get, areas, area, openEditor, createAndEdit, areaColor } from '../store.js'
import { PageHead, Seg, Section, Empty, Fab, AreaTag, Icon, AreaFilter, Progress } from '../components.js'
import { money, today, addMonths, fmtMonth, fmtDate, cap, num, by, daysBetween } from '../utils.js'
import {
  accountBalance, monthByArea, movements, monthlyCost, productProfit, productCost, STATUS, PERIODS,
} from '../finance.js'

let saved = { tab: 'resumen', month: today().slice(0, 7), filter: [], pstatus: 'activos' }

const MonthNav = ({ month, onChange }) => html`<div class="cal-nav">
  <button class="icon-btn" aria-label="Mes anterior" onClick=${() => onChange(addMonths(month + '-01', -1).slice(0, 7))}><${Icon} n="left" /></button>
  <h2>${cap(fmtMonth(month + '-01'))}</h2>
  <button class="icon-btn" aria-label="Mes siguiente" onClick=${() => onChange(addMonths(month + '-01', 1).slice(0, 7))}><${Icon} n="right" /></button>
</div>`

export function Money() {
  const [st, setSt] = useState(saved)
  const set = f => { saved = { ...st, ...f }; setSt(saved) }
  const tabs = [
    { v: 'resumen', l: 'Resumen' }, { v: 'movimientos', l: 'Movimientos' }, { v: 'stock', l: 'Stock' },
    { v: 'fijos', l: 'Fijos' }, { v: 'cuentas', l: 'Cuentas' },
  ]
  const fab = {
    resumen: () => createAndEdit('tx', { type: 'gasto', date: today(), accountId: 'personal', areaId: 'personal' }),
    movimientos: () => createAndEdit('tx', { type: 'gasto', date: today(), accountId: 'personal', areaId: st.filter[0] || 'personal' }),
    stock: () => createAndEdit('product', { status: 'stock', areaId: 'wallapop', buyDate: today(), buyAccountId: 'negocio' }),
    fijos: () => createAndEdit('sub', { period: 'mensual', nextDate: today(), active: true, accountId: 'personal', areaId: 'personal', category: 'Suscripciones' }),
    cuentas: () => createAndEdit('account', { kind: 'personal', initial: 0 }),
  }[st.tab]
  return html`<div class="page">
    <${PageHead} title="Dinero" sub="Cuentas, gastos, negocios y stock de Wallapop" />
    <div class="tabs-scroll"><${Seg} options=${tabs} value=${st.tab} onChange=${v => set({ tab: v })} /></div>
    ${st.tab === 'resumen' && html`<${Summary} month=${st.month} setMonth=${m => set({ month: m })} />`}
    ${st.tab === 'movimientos' && html`<${Movements} st=${st} set=${set} />`}
    ${st.tab === 'stock' && html`<${Stock} st=${st} set=${set} />`}
    ${st.tab === 'fijos' && html`<${Fixed} />`}
    ${st.tab === 'cuentas' && html`<${Accounts} />`}
    <${Fab} label="Añadir" onClick=${fab} />
  </div>`
}

function Summary({ month, setMonth }) {
  const accs = list('accounts')
  const total = accs.reduce((s, a) => s + accountBalance(a.id), 0)
  const stats = monthByArea(month)
  const allIn = Object.values(stats).reduce((s, b) => s + b.income, 0)
  const allOut = Object.values(stats).reduce((s, b) => s + b.expense, 0)
  const business = areas().filter(a => a.isBusiness)
  // Gastos por categoría del mes
  const cats = {}
  for (const t of list('transactions')) if (t.type === 'gasto' && t.date?.startsWith(month)) cats[t.category || 'Sin categoría'] = (cats[t.category || 'Sin categoría'] || 0) + num(t.amount)
  const catList = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const maxCat = catList[0]?.[1] || 1
  const fixed = list('subscriptions').filter(s => s.active !== false && s.amount).reduce((s, x) => s + monthlyCost(x), 0)

  return html`
    <div class="kpi-cards">
      <div class="card kpi"><small>Total en cuentas</small><b>${money(total)}</b></div>
      ${accs.map(a => html`<div class="card kpi click" onClick=${() => openEditor('account', a.id)}><small>${a.name}</small><b>${money(accountBalance(a.id))}</b></div>`)}
    </div>
    <${MonthNav} month=${month} onChange=${setMonth} />
    <div class="kpi-cards">
      <div class="card kpi"><small>Entradas del mes</small><b class="pos">${money(allIn)}</b></div>
      <div class="card kpi"><small>Salidas del mes</small><b class="neg">${money(allOut)}</b></div>
      <div class="card kpi"><small>Balance</small><b class=${allIn - allOut >= 0 ? 'pos' : 'neg'}>${money(allIn - allOut)}</b></div>
      <div class="card kpi"><small>Gastos fijos / mes</small><b>${money(fixed)}</b></div>
    </div>
    <h3 class="sub">Negocios</h3>
    <div class="grid2">${business.map(a => {
      const b = stats[a.id] || { income: 0, expense: 0, sales: 0, salesProfit: 0, sold: 0, purchases: 0 }
      const inStock = list('products').filter(p => p.areaId === a.id && p.status !== 'vendido' && p.name)
      const hasProducts = list('products').some(p => p.areaId === a.id)
      return html`<section class="card biz" style=${{ '--c': a.color }}>
        <div class="card-head"><h2><i class="dot" style=${{ background: a.color }}></i> ${a.name}</h2></div>
        ${hasProducts && html`<div class="kpis">
          <div><small>Beneficio de lo vendido</small><b class=${b.salesProfit >= 0 ? 'pos' : 'neg'}>${money(b.salesProfit)}</b></div>
          <div><small>Ventas (${b.sold})</small><b>${money(b.sales)}</b></div>
          <div><small>En stock (${inStock.length})</small><b>${money(inStock.reduce((s, p) => s + productCost(p), 0))}</b></div>
        </div>`}
        <div class="kpis">
          <div><small>Entradas</small><b class="pos">${money(b.income)}</b></div>
          <div><small>Salidas${hasProducts ? ' (incl. compras)' : ''}</small><b class="neg">${money(b.expense)}</b></div>
          <div><small>Caja neta</small><b class=${b.income - b.expense >= 0 ? 'pos' : 'neg'}>${money(b.income - b.expense)}</b></div>
        </div></section>`
    })}</div>
    <${Section} title="Gastos por categoría">
      ${catList.length ? catList.map(([c, v]) => html`<div class="catrow"><span>${c}</span><${Progress} value=${v / maxCat * 100} /><b>${money(v)}</b></div>`)
      : html`<${Empty}>Sin gastos este mes.<//>`}
    <//>`
}

function Movements({ st, set }) {
  const rows = movements(st.month).filter(r => !st.filter.length || st.filter.includes(r.areaId))
  const inc = rows.reduce((s, r) => s + (r.sign > 0 ? num(r.amount) : 0), 0)
  const out = rows.reduce((s, r) => s + (r.sign < 0 ? num(r.amount) : 0), 0)
  let lastDate = ''
  return html`
    <${MonthNav} month=${st.month} onChange=${m => set({ month: m })} />
    <${AreaFilter} value=${st.filter} onChange=${v => set({ filter: v })} />
    <div class="kpis card"><div><small>Entradas</small><b class="pos">${money(inc)}</b></div><div><small>Salidas</small><b class="neg">${money(out)}</b></div><div><small>Neto</small><b>${money(inc - out)}</b></div></div>
    <section class="card">
      ${rows.map(r => {
        const head = r.date !== lastDate ? (lastDate = r.date, html`<div class="date-sep">${cap(fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'short' }))}</div>`) : null
        return html`${head}<div class="mov" onClick=${() => openEditor(r.kind === 'product' ? 'product' : 'tx', r.id)}>
          <i class="dot" style=${{ background: areaColor(r.areaId) }}></i>
          <div class="grow"><div>${r.label}</div><div class="muted small">${[r.category !== r.label && r.category, get('accounts', r.accountId)?.name, r.type === 'transferencia' && '→ ' + (get('accounts', r.toAccountId)?.name || '')].filter(Boolean).join(' · ')}</div></div>
          <b class=${r.sign > 0 ? 'pos' : r.sign < 0 ? 'neg' : ''}>${r.sign > 0 ? '+' : r.sign < 0 ? '−' : ''}${money(num(r.amount))}</b></div>`
      })}
      ${!rows.length && html`<${Empty}>Sin movimientos este mes. Pulsa + para apuntar un gasto o ingreso.<//>`}
    </section>`
}

function Stock({ st, set }) {
  const all = list('products').filter(p => p.name || p.draft)
  const active = all.filter(p => p.status !== 'vendido')
  const sold = all.filter(p => p.status === 'vendido')
  const m = today().slice(0, 7)
  const soldMonth = sold.filter(p => p.sellDate?.startsWith(m))
  const avgProfit = sold.length ? sold.reduce((s, p) => s + productProfit(p), 0) / sold.length : 0
  const withDays = sold.filter(p => p.buyDate && p.sellDate)
  const avgDays = withDays.length ? Math.round(withDays.reduce((s, p) => s + daysBetween(p.buyDate, p.sellDate), 0) / withDays.length) : null
  const shown = (st.pstatus === 'activos' ? active : st.pstatus === 'vendidos' ? sold : all)
    .sort(st.pstatus === 'vendidos' ? by('-sellDate') : by('-buyDate'))
  return html`
    <div class="kpi-cards">
      <div class="card kpi"><small>Productos en stock</small><b>${active.length}</b><span class="muted small">${money(active.reduce((s, p) => s + productCost(p), 0))} invertidos</span></div>
      <div class="card kpi"><small>Beneficio este mes</small><b class="pos">${money(soldMonth.reduce((s, p) => s + productProfit(p), 0))}</b><span class="muted small">${soldMonth.length} vendidos</span></div>
      <div class="card kpi"><small>Beneficio medio / producto</small><b>${money(avgProfit)}</b></div>
      <div class="card kpi"><small>Tiempo medio de venta</small><b>${avgDays === null ? '—' : avgDays + ' días'}</b></div>
    </div>
    <${Seg} options=${[{ v: 'activos', l: `En stock / venta (${active.length})` }, { v: 'vendidos', l: `Vendidos (${sold.length})` }, { v: 'todos', l: 'Todos' }]} value=${st.pstatus} onChange=${v => set({ pstatus: v })} />
    <section class="card">
      ${shown.map(p => {
        const profit = productProfit(p)
        return html`<div class="mov" onClick=${() => openEditor('product', p.id)}>
          <${Icon} n="box" s=${18} />
          <div class="grow"><div>${p.name || 'Sin nombre'}</div>
            <div class="muted small">${STATUS.find(s => s.v === (p.status || 'stock'))?.l} · ${area(p.areaId)?.name || ''} · compra ${money(productCost(p))}${p.listPrice && p.status !== 'vendido' ? ' · anunciado ' + money(num(p.listPrice)) : ''}</div></div>
          ${p.status === 'vendido' ? html`<b class=${profit >= 0 ? 'pos' : 'neg'}>${profit >= 0 ? '+' : ''}${money(profit)}</b>`
            : html`<span class="badge soft">${p.buyDate ? daysBetween(p.buyDate, today()) + ' d' : ''}</span>`}
        </div>`
      })}
      ${!shown.length && html`<${Empty}>Pulsa + para añadir un producto que hayas comprado para revender.<//>`}
    </section>`
}

function Fixed() {
  const subs = list('subscriptions').filter(s => s.name || s.draft).sort(by('nextDate'))
  const active = subs.filter(s => s.active !== false)
  const byArea = {}
  active.forEach(s => { byArea[s.areaId || ''] = (byArea[s.areaId || ''] || 0) + monthlyCost(s) })
  return html`
    <div class="kpi-cards">
      <div class="card kpi"><small>Total al mes</small><b>${money(active.reduce((s, x) => s + monthlyCost(x), 0))}</b></div>
      ${Object.entries(byArea).map(([a, v]) => html`<div class="card kpi"><small>${area(a)?.name || 'Sin ámbito'}</small><b>${money(v)}</b></div>`)}
    </div>
    <section class="card">
      ${subs.map(s => html`<div class=${'mov' + (s.active === false ? ' off' : '')} onClick=${() => openEditor('sub', s.id)}>
        <i class="dot" style=${{ background: areaColor(s.areaId) }}></i>
        <div class="grow"><div>${s.name || 'Sin nombre'}</div><div class="muted small">${PERIODS.find(p => p.v === (s.period || 'mensual'))?.l} · próximo cobro ${s.nextDate ? fmtDate(s.nextDate) : '—'} · ${get('accounts', s.accountId)?.name || ''}</div></div>
        <b>${money(num(s.amount))}</b></div>`)}
      ${!subs.length && html`<${Empty}>Añade tus suscripciones y gastos recurrentes (ChatGPT, Spotify, gimnasio, dominio de la agencia…). Se apuntan solos cada mes.<//>`}
    </section>`
}

function Accounts() {
  const accs = list('accounts')
  return html`<section class="card">
    ${accs.map(a => html`<div class="mov" onClick=${() => openEditor('account', a.id)}>
      <${Icon} n="wallet" s=${18} /><div class="grow"><div>${a.name}</div><div class="muted small">${{ personal: 'Personal', negocio: 'Negocio', ahorro: 'Ahorro' }[a.kind] || ''}</div></div>
      <b>${money(accountBalance(a.id))}</b></div>`)}
    <p class="muted small pad">Abre una cuenta y usa "Ajustar saldo" para que cuadre con tu banco. A partir de ahí, cada gasto, ingreso, compra o venta la actualiza.</p>
  </section>`
}
