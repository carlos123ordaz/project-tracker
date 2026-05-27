# Prompt para rediseño visual — Project Tracker

## Contexto general

Tengo una aplicación web de gestión de proyectos construida con **React + TypeScript + Tailwind CSS v4 + Supabase**. 
El objetivo fue reemplazar un Excel de seguimiento de proyectos. La aplicación funciona correctamente, pero visualmente se siente estática, plana y poco expresiva. Quiero un rediseño que la haga sentir **viva, moderna y profesional** — que los datos hablen, que los colores comuniquen estado, que las interacciones tengan carácter.

**Stack técnico (no negociable):**
- React 18 + TypeScript
- Tailwind CSS v4 (usa `@import "tailwindcss"` + `@theme {}`, NO `@tailwind` directives)
- Supabase (PostgreSQL)
- lucide-react para íconos
- date-fns para fechas
- react-router-dom v6

**Color principal de marca actual:** `#3b56e8` (brand-600)

---

## Estructura de la aplicación

### Layout base
- **Sidebar izquierdo colapsable** (expandido: 240px / colapsado: 64px solo íconos)
  - Logo "Project Tracker" en header del sidebar
  - 7 items de navegación + Settings al fondo separado
  - Estado activo marcado con fondo de color marca
- **Header superior** (h-16) con título de la página actual + ícono de campana + avatar del usuario
- **Contenido principal** con padding y scroll independiente

---

## Páginas y funcionalidades

### 1. Dashboard (`/`)
**Propósito:** Vista ejecutiva de todo el portafolio.

**Contenido actual:**
- 6 stat cards en fila: Total Proyectos, Tareas Completadas, Tareas Retrasadas, En Progreso, Presupuesto Total, Avance Promedio
- Panel "Proyectos Activos": lista de proyectos con barra de progreso y contador de tareas retrasadas, clickeable para ir al detalle
- Panel "Tareas Prioritarias": lista de tareas no completadas, priorizando las retrasadas, con badge de status y fecha de vencimiento

**Problema actual:** Las stat cards son iguales visualmente sin importar si hay 0 o 50 tareas retrasadas. El dashboard no transmite urgencia ni celebración.

**Qué debería sentirse:** El dashboard tiene que ser el "pulso" del portafolio. Si hay proyectos en riesgo, debe notarse. Si todo va bien, debe verse tranquilo y ordenado.

---

### 2. Proyectos (`/projects`)
**Propósito:** Catálogo de todos los proyectos, punto de entrada.

**Contenido actual:**
- Grid de tarjetas de proyectos (3 columnas en desktop)
- Cada tarjeta tiene: barra de color de 1.5px en el top, nombre, área de enfoque + iniciativa, líder, fechas, conteo de tareas, barra de progreso, botones de editar/eliminar
- Última tarjeta es un botón de "Nuevo Proyecto" con borde dashed
- Modales para crear, editar y confirmar eliminación

**Problema actual:** Las tarjetas se ven planas y apagadas. La barra de color del top es muy delgada y pasa desapercibida. El estado (tareas retrasadas) se muestra solo como texto rojo pequeño.

**Qué debería sentirse:** Cada proyecto tiene una identidad visual. El color del proyecto debe ser protagonista. Las tarjetas deben comunicar salud del proyecto de un vistazo.

**Paleta de colores de proyecto disponibles:**
Sunflower Yellow `#FFC107`, Crimson Red `#DC2626`, Dodger Blue `#3B82F6`, Turquoise `#06B6D4`, Royal Purple `#7C3AED`, Emerald Green `#10B981`, Caribbean Green `#059669`, Cyan `#00BCD4`, Slate Gray `#64748B`, Amber `#F59E0B`, Wild Strawberry `#EC4899`

---

### 3. Detalle de Proyecto (`/projects/:id`)
**Propósito:** Vista completa de todas las tareas de un proyecto.

**Contenido actual:**
- Header del proyecto con color dot, nombre, área+iniciativa, botón volver
- 4 mini stat cards: Total Tareas, Avance %, Presupuesto, Costo Actual
- Tabla de tareas con filtros de status (chips pill)
- Columnas tabla: #, Nombre+Tipo, Status (badge), Prioridad (badge), Fechas inicio/fin, Asignado a, Barra de Avance, Presupuesto/Costo, acciones editar/eliminar

**Status posibles (dinámicos, configurables):** No Iniciado · En Progreso · Retrasado · Completado + cualquier status custom que el usuario agregue desde Settings

**Prioridades (dinámicas, configurables):** Crítica · Alta · Media · Baja + customs

**Problema actual:** La tabla es funcional pero fría. No hay diferenciación visual entre una tarea retrasada y una completada a nivel de fila. Los badges de status son el único indicador de urgencia.

**Qué debería sentirse:** Las filas retrasadas deben destacar sutilmente (no gritar). Completadas pueden verse más apagadas/tachadas. La barra de progreso debería cambiar de color según el avance.

---

### 4. Kanban (`/kanban`)
**Propósito:** Visualización y gestión de tareas por status con drag & drop.

**Contenido actual:**
- Filtro por proyecto en header
- Columnas generadas dinámicamente desde la tabla `task_statuses` de Supabase (NO están hardcodeadas, el usuario puede agregar más desde Settings)
- Cada columna: header con StatusBadge + contador, área de drop con min-height 200px
- Tarjetas: nombre tarea, badge de prioridad, nombre del proyecto (con color), barra de progreso, asignado a + fecha de vencimiento
- Drag & drop nativo HTML5: al arrastrar la tarjeta se vuelve semitransparente y rota 2°; la columna destino resalta con borde azul
- El board hace scroll horizontal si hay muchas columnas

**Problema actual:** Las columnas tienen fondo gris uniforme y no hay diferencia visual entre el estado "vacío" y "lleno". Las tarjetas son rectangulares básicas sin jerarquía visual clara.

**Qué debería sentirse:** Cada columna debería tener su propio micro-ambiente de color (muy sutil). Las tarjetas deben tener jerarquía visual: el nombre de la tarea destaca, la prioridad y la fecha se ven secundarias. Una tarea retrasada en la columna "En Progreso" debería notarse.

---

### 5. Timeline (`/timeline`)
**Propósito:** Diagrama de Gantt horizontal de todas las tareas.

**Contenido actual:**
- Filtros: proyecto + miembro del equipo
- Escala de tiempo: semanas, con navegación prev/next + botón "Hoy"
- Filas por proyecto, con sub-filas por tarea
- Barras de tarea: coloreadas según el color del proyecto, con el nombre encima
- Indicador vertical de "Hoy" en rojo
- Las barras de tareas retrasadas tienen `opacity-80`

**Problema actual:** El Gantt es legible pero monótono. No hay indicación visual de progreso dentro de la barra. La línea de "Hoy" es fina y pasa desapercibida.

**Qué debería sentirse:** Las barras del Gantt deberían mostrar el progreso real con un fill interno. La línea de hoy debería ser más prominente. Las tareas vencidas deberían tener un tratamiento especial (patrón, color diferente).

---

### 6. Consolidado (`/consolidated`)
**Propósito:** Tabla maestra de todas las tareas de todos los proyectos.

**Contenido actual:**
- Filtros: texto libre, proyecto, status, prioridad, miembro
- Tabla con columnas: Proyecto (con color), #, Nombre+Tipo, Status, Prioridad, Fechas, Asignado, Avance, Presupuesto
- Scroll horizontal en mobile
- Empty state si no hay resultados

**Problema actual:** Tabla muy densa con poca diferenciación visual entre proyectos. Al tener muchos proyectos se vuelve difícil de leer.

**Qué debería sentirse:** La columna del proyecto debería ser una "etiqueta" de color visible. Agrupar visualmente las tareas del mismo proyecto ayudaría mucho.

---

### 7. Calendario (`/calendar`)
**Propósito:** Vista mensual de tareas activas por día.

**Contenido actual:**
- Navegación mes a mes + botón "Hoy"
- Filtros: proyecto + miembro del equipo
- Grid de 7 columnas (L-D), 5-6 filas
- Cada día muestra hasta 3 pills de tareas activas (con color del proyecto), con "+N más" si hay más
- Click en un día abre un panel lateral con lista completa de tareas del día
- El día de hoy tiene fondo azul en su número
- Días del mes anterior/siguiente en color gris apagado

**Problema actual:** Las pills de tareas son muy pequeñas y difíciles de distinguir. El panel lateral se siente desconectado.

**Qué debería sentirse:** Un calendario que invite a interactuar. Las pills deben ser legibles. El día activo/seleccionado debe tener presencia visual clara.

---

### 8. Overview (`/overview`)
**Propósito:** Semáforo ejecutivo de salud del portafolio de proyectos.

**Contenido actual:**
- 4 cards de resumen: En curso (verde), En riesgo (amarillo), Crítico (rojo), Sin planificar (gris) — cada una con conteo
- Tabla con columnas: #, Semáforo (dot + label), Proyecto (color + nombre + área + iniciativa), Total tareas, Pendientes, Retrasadas (con badge rojo si >0), Avance (barra), Días Restantes (chip con color según urgencia), Líder
- Lógica semáforo: 🔴 Crítico si >30% retrasadas o fecha vencida; 🟡 En riesgo si hay retrasadas o ≤7 días; 🟢 En curso si todo ok; ⚪ Sin planificar si no tiene tareas/fechas
- Click en fila navega al detalle del proyecto

**Problema actual:** Los 4 cards de resumen son simples y aburridos. El semáforo es solo un punto pequeño. La urgencia del cuadro no se transmite.

**Qué debería sentirse:** Esta pantalla es para gerentes. Debe comunicar estado del portafolio de un golpe de vista. Las filas críticas deben tener peso visual. Los 4 cards de resumen deben transmitir la salud global.

---

### 9. Configuración (`/settings`)
**Propósito:** CRUD de datos maestros del sistema.

**Contenido actual:**
- 5 tabs: Equipo | Status | Prioridades | Tipos de Tarea | Conexión
- **Equipo:** Lista de miembros con avatar (inicial de nombre en círculo de color), nombre, rol, email. Inline edit con confirm/cancel. Botón "Agregar miembro".
- **Status:** Lista con dot de color, nombre, color de fondo y color del dot (color picker de 10 colores). Agregar/editar/eliminar inline. Estos status alimentan el Kanban dinámicamente.
- **Prioridades:** Igual que status pero sin dot_color.
- **Tipos de Tarea:** Solo nombre, sin color.
- **Conexión:** Instrucciones de configuración de .env + lista de tablas Supabase.

**Qué debería sentirse:** Clean, organizado, administrativo. Pero que no se sienta olvidado — debe pertenecer al mismo sistema visual que el resto de la app.

---

## Auto-detección de tareas retrasadas

Al cargar la app (en el Layout), un hook corre una vez y detecta todas las tareas cuya `end_date < hoy` y que NO están en "Completado" ni "Retrasado". Las actualiza automáticamente a "Retrasado" en Supabase y muestra un **toast naranja** en la esquina inferior derecha: _"X tareas fueron marcadas como Retrasadas automáticamente"_. El toast desaparece a los 6 segundos.

---

## Lo que quiero lograr con el rediseño

**Filosofía de diseño:** Que se sienta como una herramienta profesional de gestión de proyectos, no como un formulario de Excel. Debe comunicar estado, urgencia y progreso a través del diseño, no solo del texto.

**Principios específicos:**

1. **Color con significado** — Los colores de los proyectos deben tener presencia real, no ser solo un dot de 10px. Los colores de status (rojo=retrasado, verde=completado) deben ser coherentes en toda la app.

2. **Jerarquía visual** — En tablas y listas, el elemento más importante (nombre del proyecto/tarea) debe dominar. Lo secundario (fechas, tipos) debe estar claramente subordinado.

3. **Micro-feedback** — Hover states, transiciones suaves, sombras que aparecen al hacer hover. Que el usuario sienta que la interfaz responde a sus acciones.

4. **Urgencia comunicada** — Una tarea retrasada en cualquier vista debe comunicar urgencia visualmente. Un proyecto en verde debe verse estable y confiable.

5. **Vacío con propósito** — Los empty states (sin proyectos, sin tareas) deben invitar a crear, no solo mostrar texto gris.

6. **Consistencia en el sistema de diseño** — Un mismo componente (badge de status, barra de progreso, avatar de usuario) debe verse igual en todas las pantallas.

---

## Componentes clave a rediseñar

### StatusBadge
Recibe: `status: string`, `bgColor?: string` (hex), `dotColor?: string` (hex)
Si recibe los colores hex los usa con inline style; si no, hace fallback a un mapa estático.
Actualmente: pill pequeño con dot y texto.

### PriorityBadge  
Recibe: `priority: string`
Actualmente: pill rectangular pequeño con color de fondo.

### ProgressBar
Recibe: `value: number` (0 a 1), `className?: string`
Actualmente: barra gris de fondo con fill en color marca fijo (`#3b56e8`).
Mejora deseada: el color del fill debería variar — rojo si <30%, amarillo si 30-70%, verde si >70%.

### StatCard (Dashboard)
Recibe: ícono, label, value, color de fondo del ícono.
Actualmente: todas iguales en tamaño y peso.

### Semaforo (Overview)
Recibe: `'green' | 'yellow' | 'red' | 'gray'`
Actualmente: dot pequeño + texto.

---

## Restricciones y notas técnicas

- **Tailwind v4**: La configuración de colores customizados va en `src/index.css` dentro del bloque `@theme {}` como variables CSS (`--color-brand-600: #3b56e8`). No usar `tailwind.config.js` para colores.
- **Sin librerías de componentes externas** (no shadcn, no MUI, no Chakra) — todo custom con Tailwind.
- **Los colores de status son dinámicos** (vienen de Supabase), así que los componentes que muestran status deben poder recibir hex como prop, no solo nombres hardcodeados.
- **El sidebar es colapsable** — los diseños deben funcionar en ambos estados.
- **La app es solo para desktop/tablet** — no es necesario optimizar para mobile muy pequeño.

---

## Entregable esperado

Quiero el rediseño completo en código React + TypeScript + Tailwind v4, página por página. Puedes empezar por el componente base (Layout, Sidebar, Header) y los componentes UI compartidos (StatusBadge, ProgressBar, PriorityBadge), luego las páginas de mayor impacto visual: Dashboard → Overview → Kanban → Proyectos → Detalle → resto.

Para cada componente/página rediseñado, entregar el archivo `.tsx` completo listo para reemplazar.
