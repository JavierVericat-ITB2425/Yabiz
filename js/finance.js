// Cálculos de dinero: saldos, resultados del mes por ámbito y beneficio de productos.
import { list, get } from './store.js'
import { num } from './utils.js'

export const PERIODS = [
  { v: 'mensual', l: 'Mensual', perMonth: 1 }, { v: 'anual', l: 'Anual', perMonth: 1 / 12 },
  { v: 'trimestral', l: 'Trimestral', perMonth: 1 / 3 }, { v: 'semanal', l: 'Semanal', perMonth: 52 / 12 },
]
export const monthlyCost = s => num(s.amount) * (PERIODS.find(p => p.v === (s.period || 'mensual'))?.perMonth || 1)

export const STATUS = [{ v: 'stock', l: 'En stock' }, { v: 'venta', l: 'En venta' }, { v: 'vendido', l: 'Vendido' }]
export const productCost = p => num(p.buyPrice) + num(p.extraCosts)
export const productNet = p => num(p.sellPrice) - num(p.fees)
export const productProfit = p => productNet(p) - productCost(p)

export function accountBalance(accId) {
  const acc = get('accounts', accId)
  let b = num(acc?.initial)
  for (const t of list('transactions')) {
    const a = num(t.amount)
    if (t.type === 'transferencia') {
      if (t.accountId === accId) b -= a
      if (t.toAccountId === accId) b += a
    } else if (t.accountId === accId) b += t.type === 'ingreso' ? a : -a
  }
  for (const p of list('products')) {
    if (p.buyAccountId === accId && p.buyDate) b -= productCost(p)
    if (p.status === 'vendido' && p.sellAccountId === accId && p.sellDate) b += productNet(p)
  }
  return b
}

// Resultado (caja) de un mes por ámbito. month = 'AAAA-MM'
export function monthByArea(month) {
  const res = {}
  const bucket = id => (res[id || ''] ||= { income: 0, expense: 0, sales: 0, salesProfit: 0, sold: 0, purchases: 0 })
  for (const t of list('transactions')) {
    if (!t.date?.startsWith(month) || t.type === 'transferencia') continue
    const b = bucket(t.areaId)
    if (t.type === 'ingreso') b.income += num(t.amount); else b.expense += num(t.amount)
  }
  for (const p of list('products')) {
    if (p.buyDate?.startsWith(month)) { const b = bucket(p.areaId); b.expense += productCost(p); b.purchases += productCost(p) }
    if (p.status === 'vendido' && p.sellDate?.startsWith(month)) {
      const b = bucket(p.areaId); b.income += productNet(p); b.sales += num(p.sellPrice); b.salesProfit += productProfit(p); b.sold++
    }
  }
  return res
}

// Todos los movimientos del mes, incluidos compras y ventas de productos (para listarlos juntos)
export function movements(month) {
  const out = list('transactions').filter(t => t.date?.startsWith(month) && !(t.draft && !t.amount))
    .map(t => ({ ...t, kind: 'tx', sign: t.type === 'ingreso' ? 1 : t.type === 'gasto' ? -1 : 0, label: t.note || t.category || 'Movimiento' }))
  for (const p of list('products')) {
    if (p.buyDate?.startsWith(month)) out.push({ id: p.id, kind: 'product', date: p.buyDate, amount: productCost(p), sign: -1, label: 'Compra: ' + (p.name || 'producto'), category: 'Compra stock', areaId: p.areaId, accountId: p.buyAccountId })
    if (p.status === 'vendido' && p.sellDate?.startsWith(month)) out.push({ id: p.id, kind: 'product', date: p.sellDate, amount: productNet(p), sign: 1, label: 'Venta: ' + (p.name || 'producto'), category: 'Venta', areaId: p.areaId, accountId: p.sellAccountId })
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0))
}

export const DEFAULT_CATEGORIES = [
  'Comida', 'Supermercado', 'Cenas fuera', 'Transporte', 'Gasolina', 'Ocio', 'Ropa', 'Salud', 'Universidad',
  'Casa', 'Suscripciones', 'Software', 'Envíos', 'Publicidad', 'Nómina', 'Clientes', 'Regalos', 'Otros',
]
export function categories() {
  const used = list('transactions').map(t => t.category).filter(Boolean)
  return [...new Set([...DEFAULT_CATEGORIES, ...used])]
}
