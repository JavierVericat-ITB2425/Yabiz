# Yabiz: tu organizador personal

Una sola app para: **Hoy** (agenda del día y checklist), **Agenda** (calendario con eventos, rutinas, exámenes y tareas por colores), **Tareas** (con prioridades P1–P4), **Dinero** (cuentas, gastos, negocios, stock de Wallapop y gastos fijos), **Uni** (asignaturas, notas y apuntes), **Diario** y **Metas**.

- Funciona en el PC, en los portátiles y en el iPhone (se instala como app).
- Todo se **guarda solo** y aparece al instante en los demás dispositivos.
- Funciona **sin conexión**: los cambios se suben cuando vuelve internet.
- La Agenda se copia a **Google Calendar** con avisos.
- **Gratis**: GitHub Pages (web), Firebase plan Spark (datos) y Google Apps Script (calendario).

---

## Puesta en marcha (una sola vez, unos 20 minutos)

### 1. Subir el código a GitHub (y tener la web online)

1. Crea una cuenta gratis en https://github.com.
2. Crea un repositorio nuevo llamado `yabiz` (**Public**: GitHub Pages es gratis en repos públicos. En el código no hay ningún dato tuyo; tus datos están protegidos en Firebase).
3. En esta carpeta ejecuta:
   ```bash
   git remote add origin https://github.com/JavierVericat-ITB2425/yabiz.git
   git push -u origin main
   ```
4. En GitHub, dentro del repo: **Settings → Pages → Branch: `main` / `(root)` → Save**.
   En 1–2 minutos la app estará en `https://javiervericat-itb2425.github.io/yabiz/`.

### 2. Crear la base de datos gratis (Firebase)

1. Entra en https://console.firebase.google.com con tu cuenta de Google → **Crear proyecto** (llámalo `yabiz`; puedes desactivar Analytics).
2. **Compilación → Authentication → Comenzar → Correo electrónico/contraseña → Habilitar**.
3. **Compilación → Firestore Database → Crear base de datos** → ubicación `eur3 (europe-west)` → modo producción.
4. En Firestore → pestaña **Reglas**: pega el contenido de [`firestore.rules`](firestore.rules) y pulsa **Publicar**.
5. **Configuración del proyecto (⚙️) → General → Tus apps → icono `</>` (Web)** → nombre `yabiz` → Registrar.
   Copia los valores de `firebaseConfig` en [`js/config.js`](js/config.js).
6. En **Authentication → Configuración → Dominios autorizados**, añade `javiervericat-itb2425.github.io`.
7. Sube el cambio:
   ```bash
   git commit -am "Configurar Firebase" && git push
   ```

> El plan gratuito (Spark) no pide tarjeta. Para uso personal da de sobra: 1 GB de datos y 50.000 lecturas al día.

### 3. Entrar

Abre la web → **Primera vez: crear cuenta** con tu email y una contraseña. En los demás dispositivos, **Entrar** con el mismo email.

- **iPhone**: abre la web en Safari → Compartir → **Añadir a pantalla de inicio**.
- **PC/portátil**: en Chrome o Edge, icono de instalar de la barra de direcciones.

### 4. Conectar Google Calendar (avisos en el móvil)

1. Entra en https://script.google.com → **Nuevo proyecto**.
2. Borra lo que haya y pega el contenido de [`apps-script/Code.gs`](apps-script/Code.gs).
3. En la línea `const SECRET = '...'` pon una clave larga inventada (por ejemplo `yabiz-8f3k2-lo-que-quieras`).
4. En el desplegable de funciones elige **autorizar** → **Ejecutar** → acepta los permisos (Configuración avanzada → Ir a proyecto → Permitir).
5. **Implementar → Nueva implementación → ⚙️ Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   → Implementar → copia la **URL** (acaba en `/exec`).
6. En Yabiz → **Ajustes → Google Calendar**: pega la URL y la clave → **Probar conexión**.

Se crea un calendario **Yabiz** en tu Google Calendar con los colores de cada ámbito. Eventos, exámenes, rutinas (como eventos repetidos) y tareas con fecha llegan con su aviso.

> Si algún día cambias el código del script: Implementar → Gestionar implementaciones → editar → Versión: **nueva versión** (así la URL no cambia).

---

## Cómo usarlo (resumen)

| Sección | Para qué |
|---|---|
| **Hoy** | Lo que tienes hoy, checklist (hábitos + tareas de hoy), próximos 14 días, metas y dinero del mes. |
| **Agenda** | Día / Semana / Mes / Rutinas. Filtra por ámbito. Los tipos Cita, Reunión, Examen, Entrega y Clase se distinguen con etiquetas. |
| **Tareas** | Vencidas, Hoy, Esta semana, Este mes, Más adelante y Sin fecha. P1 es lo más urgente. Pueden repetirse. |
| **Dinero** | *Resumen* (saldos, mes, negocios, gastos por categoría), *Movimientos*, *Stock* (compra-venta con beneficio por producto), *Fijos* (suscripciones que se apuntan solas) y *Cuentas* (personal y negocio). |
| **Uni** | Asignaturas con notas ponderadas ("¿cuánto necesito en el final?"), exámenes, deberes y apuntes. |
| **Diario** | Una página por día con estado de ánimo y buscador. |
| **Metas** | Objetivos con fecha (3 meses, 6 meses, 1 año…), hitos y progreso. |
| **Ajustes** | Ámbitos y colores, hábitos diarios, Google Calendar y copia de seguridad. |

**Ámbitos**: Personal, Universidad, Salud, Wallapop, Agencia IA y Ocio vienen creados. Los marcados como *negocio* tienen su propio panel en Dinero.

**Tu NAS**: no hace falta para que funcione. Si quieres, descarga de vez en cuando la copia (Ajustes → Copia de seguridad) y guárdala en el NAS.

---

## Seguir desarrollando desde otro ordenador

Todo el código está en GitHub. En cualquier PC:

```bash
git clone https://github.com/JavierVericat-ITB2425/yabiz.git
```

Abre esa carpeta en Claude Code y pide los cambios. Después ejecuta `git push` y la web se actualiza sola en todos tus dispositivos.

Para probar en local: `powershell -ExecutionPolicy Bypass -File .claude/serve.ps1` y abre http://localhost:5173.

## Estructura técnica

- Sin compilación: HTML + JavaScript (Preact + htm desde CDN).
- `js/store.js`: estado y sincronización en tiempo real (Firestore con caché offline).
- `js/gcal.js`: cola de sincronización con Google Calendar (idempotente, desde cualquier dispositivo).
- `js/views/*`: una pantalla por sección. `js/editors.js`: formularios con autoguardado.
- `apps-script/Code.gs`: puente con Google Calendar.
