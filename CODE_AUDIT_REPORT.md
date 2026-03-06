# Code Audit Report — Lucy App
**Date:** 2026-03-06
**Auditor:** Claude Code (Senior Software Engineer)
**Scope:** Full repository — `/src` directory (40 files, ~1,800 LOC)
**Stack:** Next.js 16, React 19, TypeScript, Supabase, OpenAI API, Vercel

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Crítico | 3 |
| 🟠 Alto | 6 |
| 🟡 Medio | 7 |
| 🟢 Bajo | 4 |
| **Total** | **20** |

**Archivos más problemáticos:**
1. `src/app/api/chat/route.ts` — 7 issues (críticos + altos)
2. `src/hooks/useChat.ts` — 1 crítico (rompe toda la persistencia)
3. `src/hooks/useConversations.ts` — 1 alto (race condition de estado)
4. `src/components/Admin/StatsCards.tsx` — 1 alto (métricas falsas)
5. `src/app/api/admin/` — 3 medios distribuidos

---

## 🔴 CRÍTICO

---

### BUG-01 — `sessionId` nunca se envía al backend: persistencia de conversaciones completamente rota

- **Archivo:** `src/hooks/useChat.ts:49-58`
- **Categoría:** Bug lógico / Pérdida de datos
- **Descripción:**
  El hook `useChat` hace `fetch('/api/chat', ...)` pero el body **solo incluye `messages`**, nunca `sessionId`. En el servidor (`chat/route.ts:150`), se desestructura `const { messages, sessionId } = body;`, resultando en `sessionId === undefined`. La condición en la línea 224 del servidor es `if (sessionId && lastUserMessage && assistantContent)` — **esta condición NUNCA es verdadera**. Consecuencia: ninguna conversación, ningún mensaje, y ningún evento de analytics se guarda jamás en Supabase. La capa de persistencia completa está silenciosamente rota.

- **Impacto:**
  Toda la funcionalidad de Supabase es inerte. El panel de admin siempre mostrará cero conversaciones. El propósito principal del backend (tracking de uso, analytics) no funciona.

- **Corrección sugerida:**

```typescript
// useChat.ts — dentro de sendMessage(), pasar sessionId al fetch
const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        sessionId: conversationId, // ← línea faltante
    }),
});
```

---

### BUG-02 — `saveToSupabase` siempre hace `INSERT`, nunca `UPSERT`: duplicados masivos en DB

- **Archivo:** `src/app/api/chat/route.ts:80-95`
- **Categoría:** Bug lógico / Integridad de datos
- **Descripción:**
  La función `saveToSupabase` usa `.insert()` para la tabla `conversations`. Dado que cada llamada al endpoint genera una nueva fila con el mismo `session_id`, se crean filas duplicadas sin límite por conversación. Además, `message_count` está hardcodeado a `2` en línea 86, sin importar cuántos mensajes tenga la conversación. El campo `updated_at` se pasa en el insert pero no existe lógica de update para conversaciones existentes.

- **Impacto:**
  Base de datos con N filas duplicadas por conversación. El contador `message_count` es siempre `2` (dato incorrecto). Degradación del rendimiento de la DB con el tiempo.

- **Corrección sugerida:**

```typescript
// Upsert conversation by session_id, update message count dynamically
const { data: conv, error: convError } = await supabase
    .from('conversations')
    .upsert(
        {
            session_id: sessionId,
            title: userMessage.slice(0, 80),
            ip_address: ipAddress,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id', ignoreDuplicates: false }
    )
    .select('id, message_count')
    .single();

// Then increment message_count:
if (conv) {
    await supabase
        .from('conversations')
        .update({ message_count: (conv.message_count ?? 0) + 2 })
        .eq('id', conv.id);
}
```

---

### BUG-03 — Rate limiting en memoria es inefectivo en entornos serverless

- **Archivo:** `src/app/api/chat/route.ts:36-63`
- **Categoría:** Seguridad / Evasión de controles
- **Descripción:**
  El mapa `rateLimitMap` y la variable `lastCleanup` son state de módulo (en memoria). En Vercel (serverless), cada instancia de la función se ejecuta de forma aislada y efímera. Las instancias no comparten estado. Un atacante puede superar el rate limit enviando muchas solicitudes concurrentes que Vercel distribuye entre instancias, **cada una con su propio contador en cero**. El rate limit configurable desde el panel admin también es irrelevante bajo esta arquitectura.

- **Impacto:**
  La protección contra abuso (y el costo en tokens de OpenAI) es nula. Un atacante puede provocar un consumo descontrolado de la API de OpenAI.

- **Corrección sugerida:**
  Usar rate limiting basado en Supabase (tabla `rate_limits`) o un KV store (Vercel KV / Upstash Redis) que sea compartido entre instancias:

```typescript
// Ejemplo con Supabase como backend de rate limit
async function checkRateLimitDB(ip: string, limitPerMin: number): Promise<boolean> {
    const supabase = createServiceClient();
    const windowStart = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase
        .from('rate_limit_events')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gte('created_at', windowStart);
    if ((count ?? 0) >= limitPerMin) return false;
    await supabase.from('rate_limit_events').insert({ ip_address: ip });
    return true;
}
```

---

## 🟠 ALTO

---

### BUG-04 — Rate limit bypasseable via spoofing del header `X-Real-IP`

- **Archivo:** `src/app/api/chat/route.ts:140`
- **Categoría:** Seguridad / Bypass de control de acceso
- **Descripción:**
  La IP del cliente se obtiene exclusivamente del header `X-Real-IP`: `const ip = request.headers.get('x-real-ip') || 'unknown';`. Este header puede ser enviado por cualquier cliente HTTP con un valor arbitrario (ej: `X-Real-IP: 1.2.3.4`). Un atacante puede rotar IPs falsas en cada request para evitar el rate limit. Adicionalmente, si `X-Real-IP` no está presente, todas las solicitudes se agrupan bajo `'unknown'` — compartiendo el rate limit entre todos los usuarios anónimos.

- **Impacto:**
  El rate limit es eludible trivialmente. Usuarios legítimos sin proxy podrían ser bloqueados incorrectamente si comparten el bucket `'unknown'`.

- **Corrección sugerida:**

```typescript
// En Vercel, usar el header verificado por la plataforma
const ip =
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
```

---

### BUG-05 — Métricas del dashboard admin son datos falsos hardcodeados

- **Archivo:** `src/components/Admin/StatsCards.tsx:50-57, 68`
- **Categoría:** Bug lógico / Datos engañosos
- **Descripción:**
  Los porcentajes de cambio mostrados en las tarjetas de estadísticas son **valores inventados**:
  - "Conversaciones totales" siempre muestra `↑ 12%`
  - "Mensajes hoy" siempre muestra `↑ 5%`
  - "Tasa de respuesta" siempre muestra `99.8%` como valor fijo

  ```tsx
  // StatsCards.tsx:50-51 — completamente inventado
  change={summary.conversations_today > 0 ? 12 : 0}
  // ...
  change={summary.messages_today > 0 ? 5 : 0}
  ```
  La API de analytics no devuelve datos comparativos de "ayer vs hoy" (`AnalyticsResponse` no tiene campos de comparación). En lugar de mostrar "sin datos", se muestran porcentajes ficticios que engañan al administrador.

- **Impacto:**
  Decisiones operativas basadas en datos falsos. Pérdida de confianza cuando el admin detecte la inconsistencia.

- **Corrección sugerida:**
  Eliminar los valores hardcodeados o calcularlos realmente desde `analytics.daily`:

```tsx
// Eliminar change prop si no hay datos reales de comparación:
<StatCard
    title="Conversaciones totales"
    value={summary.total_conversations}
    icon="💬"
    // Sin prop `change` hasta tener datos comparativos reales
/>
<StatCard
    title="Tasa de respuesta"
    value={summary.total_messages > 0
        ? `${((summary.assistant_messages / summary.total_messages) * 100).toFixed(1)}%`
        : 'N/A'}
    icon="✅"
/>
```

---

### BUG-06 — `message_count` hardcodeado a `2` en la inserción de conversaciones

- **Archivo:** `src/app/api/chat/route.ts:86`
- **Categoría:** Bug lógico / Integridad de datos
- **Descripción:**
  Al insertar una conversación en Supabase, `message_count` se establece siempre como `2` (`message_count: 2`), independientemente de cuántos mensajes realmente existan. Esto genera datos incorrectos en la DB y el panel admin mostrará siempre "2 mensajes" por conversación.

- **Impacto:**
  Datos de analytics incorrectos. La vista de conversaciones del admin muestra conteos erróneos.

- **Corrección sugerida:** Ver BUG-02 — el conteo correcto debe calcularse e incrementarse en cada turno de conversación.

---

### BUG-07 — Race condition: `deleteConversation` puede ser revertida por el debounce timer pendiente

- **Archivo:** `src/hooks/useConversations.ts:119-127`
- **Categoría:** Bug de estado / Race condition
- **Descripción:**
  `deleteConversation` llama a `deleteFromStorage(id)` (escribe directamente en `localStorage`) y luego actualiza el estado de React. Sin embargo, si existe un debounce timer pendiente de `debouncedSave`, ese timer tiene capturado en su closure el array de conversaciones **anterior a la eliminación** (incluyendo la conversación eliminada). Cuando el timer se dispara ~500ms después, sobreescribe `localStorage` con los datos viejos, **restaurando la conversación eliminada**.

  ```typescript
  // useConversations.ts:121 — deleteFromStorage escribe en localStorage
  deleteFromStorage(id);
  // Pero si hay un timer pendiente de debouncedSave, lo va a sobreescribir
  setConversations((prev) => prev.filter((c) => c.id !== id));
  ```

- **Impacto:**
  Conversaciones "eliminadas" reaparecen tras recargar la página. El usuario cree haber eliminado datos pero siguen en `localStorage`.

- **Corrección sugerida:**

```typescript
const deleteConversation = useCallback(
    (id: string) => {
        // Cancelar timer pendiente antes de eliminar
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        setConversations((prev) => {
            const updated = prev.filter((c) => c.id !== id);
            saveConversations(updated); // escritura inmediata (sin debounce)
            return updated;
        });
        if (activeConversationId === id) {
            setActiveConversationId(null);
        }
    },
    [activeConversationId]
);
```

---

### BUG-08 — Sin manejo de errores de red en páginas admin (crash silencioso)

- **Archivos:** `src/app/admin/page.tsx:28-33`, `src/app/admin/conversations/page.tsx:19-27`
- **Categoría:** Error de runtime / Excepción no manejada
- **Descripción:**
  Los `fetch()` en las páginas del admin no están envueltos en `try/catch`. Un error de red (timeout, conexión rechazada, DNS fallo) lanza una excepción no capturada que puede causar un crash silencioso del componente, dejando la UI colgada en estado de carga indefinidamente sin ningún mensaje de error al usuario.

  ```typescript
  // admin/page.tsx:28 — sin try/catch
  fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setAnalytics(data); })
      .finally(() => setLoading(false));
  // Si fetch() lanza (error de red), .finally() tampoco se ejecuta
  ```

- **Impacto:**
  El panel admin se congela en "Cargando métricas…" sin posibilidad de recuperación para el administrador.

- **Corrección sugerida:**

```typescript
useEffect(() => {
    fetch('/api/admin/analytics')
        .then((r) => r.json())
        .then((data) => { if (!data.error) setAnalytics(data); })
        .catch((err) => console.error('Error cargando analytics:', err))
        .finally(() => setLoading(false));
}, []);
```

---

## 🟡 MEDIO

---

### BUG-09 — Endpoint de config PUT sin validación de claves: permite escritura arbitraria

- **Archivo:** `src/app/api/admin/config/route.ts:44-57`
- **Categoría:** Seguridad / Validación de entrada
- **Descripción:**
  El endpoint `PUT /api/admin/config` acepta cualquier `key` y `value` sin validar contra un conjunto permitido. Un admin comprometido o un bug en el cliente podría insertar claves arbitrarias en `bot_config` (ej: sobreescribir `system_prompt` con un prompt de inyección malicioso) sin restricción alguna. Tampoco hay validación de longitud máxima del `value`.

- **Impacto:**
  Si la sesión de admin es comprometida (XSS, CSRF, session hijacking), el atacante puede modificar el system prompt para convertir a Lucy en un bot malicioso, con cambios que se aplican a todos los usuarios.

- **Corrección sugerida:**

```typescript
const ALLOWED_KEYS = new Set([
    'system_prompt', 'model', 'temperature', 'max_tokens',
    'rate_limit_per_minute', 'max_messages_per_conversation',
    'welcome_message', 'welcome_subtitle',
]);
const MAX_VALUE_LENGTH = 10000;

// En el handler PUT:
const invalidUpdates = updates.filter(
    (u) => !ALLOWED_KEYS.has(u.key) || u.value.length > MAX_VALUE_LENGTH
);
if (invalidUpdates.length > 0) {
    return NextResponse.json({ error: 'Clave de configuración no permitida' }, { status: 400 });
}
```

---

### BUG-10 — `daily_metrics` se consulta sin `ORDER BY`: gráfica puede mostrar datos en orden aleatorio

- **Archivo:** `src/app/api/admin/analytics/route.ts:31-34`
- **Categoría:** Bug lógico / Visualización incorrecta
- **Descripción:**
  La consulta a `daily_metrics` no incluye `.order()`:
  ```typescript
  const { data: daily } = await supabase
      .from('daily_metrics')
      .select('*')
      .limit(30); // Sin order — orden indefinido
  ```
  En `ConversationsChart.tsx`, el componente hace `.reverse().slice(-7)` asumiendo que los datos llegan ordenados por fecha descendente. Sin `ORDER BY`, el orden depende del plan de ejecución de la DB y puede variar entre queries.

- **Impacto:**
  La gráfica de "Actividad últimos 7 días" puede mostrar fechas desordenadas o datos aleatorios, induciendo análisis incorrectos.

- **Corrección sugerida:**

```typescript
const { data: daily } = await supabase
    .from('daily_metrics')
    .select('*')
    .order('date', { ascending: false }) // ← agregar
    .limit(30);
```

---

### BUG-11 — Endpoint `/api/cron/keepalive` no tiene autenticación

- **Archivo:** `src/app/api/cron/keepalive/route.ts`
- **Categoría:** Seguridad / Control de acceso
- **Descripción:**
  El endpoint de cron está completamente expuesto públicamente sin ninguna verificación. Cualquiera puede llamarlo con `GET /api/cron/keepalive` y forzar una consulta a Supabase usando la service role key. Vercel recomienda proteger los endpoints cron con el header `Authorization: Bearer <CRON_SECRET>`.

- **Impacto:**
  Posible abuso para forzar carga innecesaria en la DB. Exposición de metadata sobre la DB (número de filas en `bot_config` retornado en la respuesta).

- **Corrección sugerida:**

```typescript
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... resto del handler
}
```

Y en `vercel.json` definir `CRON_SECRET` como variable de entorno.

---

### BUG-12 — Cron schedule incorrecto: no se ejecuta cada 5 días como se intenta

- **Archivo:** `vercel.json:5`
- **Categoría:** Bug de configuración
- **Descripción:**
  El schedule `"0 0 */5 * *"` en el campo day-of-month significa "en los días 1, 6, 11, 16, 21, 26, 31" del mes — no "cada 5 días a partir de hoy". Concretamente, el intervalo entre ejecuciones varía (5 días, luego 5 días, luego potencialmente 5-6 días en el cambio de mes). Esto puede no ser suficiente para prevenir que Supabase free-tier pause la DB si el intervalo efectivo supera 7 días.

- **Impacto:**
  La base de datos podría pausarse inesperadamente si el intervalo real entre ejecuciones supera el threshold de Supabase (actualmente 7 días de inactividad).

- **Corrección sugerida:**

```json
// Ejecutar cada 3 días para mayor margen de seguridad
"schedule": "0 0 */3 * *"
// O diariamente si el costo es aceptable:
"schedule": "0 0 * * *"
```

---

### BUG-13 — Detalles del error de OpenAI se exponen directamente al cliente

- **Archivo:** `src/app/api/chat/route.ts:200-204`
- **Categoría:** Seguridad / Exposición de información
- **Descripción:**
  Cuando la API de OpenAI retorna un error, el mensaje de error interno se propaga directamente al cliente:
  ```typescript
  { error: (errorData as {...})?.error?.message || 'Error al comunicarse con la IA' }
  ```
  Los mensajes de error de OpenAI pueden revelar información sobre límites de cuota, nombres de modelos internos, o detalles de configuración de la cuenta.

- **Impacto:**
  Exposición de información operacional sensible a usuarios finales.

- **Corrección sugerida:**

```typescript
// Loguear el error completo server-side, enviar mensaje genérico al cliente
console.error('OpenAI API error:', response.status, errorData);
const userFacingMsg = response.status === 429
    ? 'El servicio está temporalmente saturado. Intenta en un momento.'
    : 'Error al comunicarse con la IA. Intenta de nuevo.';
return NextResponse.json({ error: userFacingMsg }, { status: response.status });
```

---

### BUG-14 — Login de admin sin protección contra fuerza bruta

- **Archivo:** `src/app/admin/login/page.tsx`
- **Categoría:** Seguridad / Autenticación débil
- **Descripción:**
  El formulario de login del admin no tiene ningún mecanismo de throttling, CAPTCHA, ni bloqueo por intentos fallidos. Si bien Supabase Auth tiene algunas protecciones, la capa de aplicación no añade ninguna defensa adicional. El campo de password tampoco tiene longitud mínima validada en frontend.

- **Impacto:**
  Ataques de credential stuffing / diccionario contra la cuenta admin no tienen fricciones adicionales a nivel de aplicación.

- **Corrección sugerida:**
  Añadir un contador de intentos fallidos en el estado del componente y deshabilitar el botón por N segundos tras cada intento fallido consecutivo:

```typescript
const [failedAttempts, setFailedAttempts] = useState(0);
const [lockoutUntil, setLockoutUntil] = useState(0);

if (authError) {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    if (newAttempts >= 5) {
        setLockoutUntil(Date.now() + 30000); // 30s lockout
    }
    setError('Email o contraseña incorrectos.');
}
```

---

## 🟢 BAJO

---

### BUG-15 — Función `saveConversation` es código muerto (nunca usada)

- **Archivo:** `src/utils/storage.ts:32-53`
- **Categoría:** Código muerto
- **Descripción:**
  La función `saveConversation` está definida y exportada pero no se importa ni llama en ningún archivo del proyecto. El sistema usa exclusivamente `saveConversations` (plural). La función duplica lógica de manera inconsistente con la versión plural (lee de `localStorage` en cada llamada en lugar de recibir el array completo).

- **Impacto:**
  Mantenimiento confuso. Un futuro developer podría usar esta función por error y obtener comportamiento inconsistente (lee el estado de localStorage en lugar del estado de React, potencialmente perdiendo cambios no guardados).

- **Corrección sugerida:** Eliminar la función `saveConversation` por completo.

---

### BUG-16 — `BarChart` y `Bar` importados pero nunca usados

- **Archivo:** `src/components/Admin/ConversationsChart.tsx:4,7`
- **Categoría:** Código muerto / Bundle innecesario
- **Descripción:**
  ```typescript
  import {
      BarChart,   // ← no usado
      Bar,        // ← no usado
      XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
      Area, AreaChart,
  } from 'recharts';
  ```
  Solo se usa `AreaChart`/`Area`. Los imports de `BarChart` y `Bar` son código muerto.

- **Impacto:**
  Incremento marginal del bundle size. Confusión sobre cuál chart se usa realmente.

- **Corrección sugerida:** Eliminar `BarChart` y `Bar` del import.

---

### BUG-17 — `formatRelative` puede mostrar "Hace 0 min" o valores negativos

- **Archivo:** `src/components/Admin/ConversationViewer.tsx:16-25`
- **Categoría:** Bug lógico / UX
- **Descripción:**
  Si hay una diferencia de reloj entre servidor y cliente, o si `dateStr` es un timestamp en el futuro cercano, `diff` puede ser 0 o negativo. Esto resulta en "Hace 0 min" o "Hace -3 min". No hay manejo del caso `mins < 1`.

- **Impacto:**
  Texto confuso en la UI del admin ("Hace -3 min").

- **Corrección sugerida:**

```typescript
function formatRelative(dateStr: string) {
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    // ...
}
```

---

### BUG-18 — `max_tokens` bloqueado en UI a máximo de 4096 pero modelos GPT-4o soportan hasta 16384

- **Archivo:** `src/components/Admin/ModelSettings.tsx:93`
- **Categoría:** Bug lógico / Funcionalidad limitada
- **Descripción:**
  ```typescript
  onClick={() => setMaxTokens((v) => Math.min(4096, v + 128))}
  ```
  El máximo hardcodeado de 4096 es correcto para `gpt-3.5-turbo`, pero `gpt-4o` y `gpt-4o-mini` soportan hasta 16,384 tokens de output. El input HTML también tiene `max={4096}`. Esto limita artificialmente la capacidad de respuestas largas cuando se usan los modelos más capaces.

- **Impacto:**
  Respuestas innecesariamente truncadas al usar `gpt-4o` o `gpt-4o-mini`. El admin no puede aprovechar el máximo de los modelos.

- **Corrección sugerida:**

```typescript
const MAX_TOKENS_LIMIT: Record<string, number> = {
    'gpt-4o': 16384,
    'gpt-4o-mini': 16384,
    'gpt-4-turbo': 4096,
    'gpt-3.5-turbo': 4096,
};
const currentMax = MAX_TOKENS_LIMIT[model] ?? 4096;
// Usar currentMax en los botones +/- y en el input max={}
```

---

## Archivos sin issues encontrados

Los siguientes archivos fueron revisados y no presentan bugs significativos:
- `src/middleware.ts` — autenticación correctamente implementada
- `src/lib/supabase-client.ts` / `supabase-server.ts` — uso correcto de service role key (server-only)
- `src/components/Chat/ChatInput.tsx` — validación y UX correctas
- `src/components/Chat/MessageBubble.tsx` — rendering seguro (React escapa HTML; ReactMarkdown sin `rehype-raw`)
- `src/components/Sidebar/Sidebar.tsx` — sin issues
- `src/components/UI/Toast.tsx` — patrón singleton correcto con cleanup en unmount
- `src/components/UI/Modal.tsx` — no revisado en detalle pero estructura estándar
- `next.config.ts` — security headers correctamente configurados
- `src/types/index.ts` — tipos bien definidos

---

## Resumen de correcciones por prioridad

### Semana 1 (Críticos — producción rota):
1. **BUG-01**: Agregar `sessionId: conversationId` al fetch en `useChat.ts`
2. **BUG-02**: Cambiar `.insert()` a `.upsert()` con `onConflict: 'session_id'` en `saveToSupabase`
3. **BUG-03**: Reemplazar rate limiting en memoria con Supabase/Redis compartido

### Semana 2 (Altos — datos incorrectos / seguridad):
4. **BUG-04**: Usar `x-vercel-forwarded-for` para IP real
5. **BUG-05**: Eliminar métricas hardcodeadas del StatsCards
6. **BUG-06**: Calcular `message_count` real (ver BUG-02)
7. **BUG-07**: Cancelar debounce timer en `deleteConversation`
8. **BUG-08**: Agregar `.catch()` a todos los fetch en páginas admin

### Semana 3 (Medios — hardening):
9. **BUG-09**: Allowlist de claves en config PUT
10. **BUG-10**: Agregar `.order('date', { ascending: false })` a `daily_metrics`
11. **BUG-11**: Autenticar endpoint keepalive con `CRON_SECRET`
12. **BUG-12**: Corregir cron schedule a `*/3` días
13. **BUG-13**: Sanitizar mensajes de error de OpenAI antes de enviarlos al cliente
14. **BUG-14**: Throttling de intentos en login page

### Cleanup (Bajos):
15. **BUG-15**: Eliminar `saveConversation` (singular, código muerto)
16. **BUG-16**: Eliminar imports `BarChart`, `Bar` no usados
17. **BUG-17**: Manejar caso `mins < 1` en `formatRelative`
18. **BUG-18**: Ajustar límite `max_tokens` según modelo seleccionado
