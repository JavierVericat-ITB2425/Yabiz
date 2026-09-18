/**
 * Puente gratuito entre Yabiz y tu Google Calendar.
 * Instrucciones completas en el README (paso 4).
 *
 * 1. Cambia SECRET por una clave larga inventada (la misma que pondrás en Yabiz → Ajustes).
 * 2. Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 * 3. Copia la URL que acaba en /exec y pégala en Yabiz → Ajustes → Google Calendar.
 */
const SECRET = 'CAMBIA_ESTA_CLAVE_POR_UNA_TUYA';
const CALENDAR_NAME = 'Yabiz';

function doGet() {
  return out({ ok: true, msg: 'Puente de Yabiz activo' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'JSON no válido' }); }
  if (body.secret !== SECRET) return out({ ok: false, error: 'secret' });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const cal = getCalendar();
    const results = (body.ops || []).map(function (op) {
      try { apply(cal, op); return { id: op.id, ok: true }; }
      catch (err) { return { id: op.id, ok: false, error: String(err) }; }
    });
    return out({ ok: true, results: results });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getCalendar() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CAL_ID');
  let cal = id ? CalendarApp.getCalendarById(id) : null;
  if (!cal) {
    cal = CalendarApp.getCalendarsByName(CALENDAR_NAME)[0] || CalendarApp.createCalendar(CALENDAR_NAME);
    props.setProperty('CAL_ID', cal.getId());
  }
  return cal;
}

const WEEKDAYS = [null, CalendarApp.Weekday.MONDAY, CalendarApp.Weekday.TUESDAY, CalendarApp.Weekday.WEDNESDAY,
  CalendarApp.Weekday.THURSDAY, CalendarApp.Weekday.FRIDAY, CalendarApp.Weekday.SATURDAY, CalendarApp.Weekday.SUNDAY];

function parse(date, time, tz) {
  return Utilities.parseDate(date + ' ' + (time || '00:00'), tz || Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

// Cada elemento de Yabiz se borra y se vuelve a crear: sencillo y sin duplicados.
function apply(cal, op) {
  const props = PropertiesService.getScriptProperties();
  const key = 'ev:' + op.id;
  const existing = props.getProperty(key);
  if (existing) {
    const kind = existing.charAt(0), gid = existing.slice(2);
    try {
      if (kind === 's') { const s = cal.getEventSeriesById(gid); if (s) s.deleteEventSeries(); }
      else { const ev = cal.getEventById(gid); if (ev) ev.deleteEvent(); }
    } catch (err) { /* ya no existía (borrado a mano en Google Calendar) */ }
    props.deleteProperty(key);
  }
  if (op.action === 'delete') return;

  const opts = { description: op.description || '', location: op.location || '' };
  let ev, kind = 'e';
  if (op.weekdays && op.weekdays.length) {
    const rule = CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekdays(op.weekdays.map(function (d) { return WEEKDAYS[d]; }));
    if (op.until) rule.until(parse(op.until, '23:59', op.tz));
    ev = cal.createEventSeries(op.title, parse(op.startDate, op.startTime, op.tz), parse(op.startDate, op.endTime, op.tz), rule, opts);
    kind = 's';
  } else if (op.allDay) {
    const start = parse(op.startDate, '00:00', op.tz);
    if (op.endDate && op.endDate > op.startDate) {
      const end = parse(op.endDate, '00:00', op.tz);
      end.setDate(end.getDate() + 1);
      ev = cal.createAllDayEvent(op.title, start, end, opts);
    } else {
      ev = cal.createAllDayEvent(op.title, start, opts);
    }
  } else {
    let end = parse(op.endDate || op.startDate, op.endTime || op.startTime, op.tz);
    const start = parse(op.startDate, op.startTime, op.tz);
    if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
    ev = cal.createEvent(op.title, start, end, opts);
  }
  if (op.color) ev.setColor(String(op.color));
  ev.removeAllReminders();
  (op.reminders || []).forEach(function (m) { if (m >= 0) ev.addPopupReminder(Math.min(m, 40320)); });
  props.setProperty(key, kind + ':' + ev.getId());
}

// Ejecuta esta función una vez desde el editor para dar permisos al script.
function autorizar() {
  getCalendar();
  Logger.log('Listo. Calendario: ' + CALENDAR_NAME);
}
