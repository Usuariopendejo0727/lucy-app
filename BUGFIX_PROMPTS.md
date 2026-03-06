# Prompts de Corrección de Bugs — Lucy App
**Generado:** 2026-03-06
**Referencia:** CODE_AUDIT_REPORT.md
**Total de prompts:** 20 (3 Críticos · 6 Altos · 7 Medios · 4 Bajos)

> Cada sección contiene un prompt autónomo y preciso para que Antigravity
> corrija exactamente ese bug. Copia y pega el bloque completo de cada prompt.

---

## 🔴 CRÍTICOS

---

### PROMPT BUG-01
> **Archivo afectado:** `src/hooks/useChat.ts`

```
Archivo: src/hooks/useChat.ts

Problema: El parámetro `sessionId` nunca se incluye en el body del fetch a
`/api/chat`. El servidor espera `sessionId` en el body para guardar la
conversación en Supabase, pero como no llega, la condición
`if (sessionId && lastUserMessage && assistantContent)` en
`src/app/api/chat/route.ts` línea 224 nunca es verdadera. Resultado:
ninguna conversación se persiste en Supabase.

Corrección requerida:
En la función `sendMessage` dentro de `useChat.ts`, localiza el bloque
`fetch('/api/chat', { ... body: JSON.stringify({ messages: ... }) })` y
agrega `sessionId: conversationId` dentro del objeto que se serializa
en el body.

El body resultante debe quedar así:
  body: JSON.stringify({
    messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
    sessionId: conversationId,   // ← esta línea es la corrección
  })

No modifiques ningún otro archivo ni ninguna otra parte del hook.
```

---

### PROMPT BUG-02
> **Archivo afectado:** `src/app/api/chat/route.ts`

```
Archivo: src/app/api/chat/route.ts

Problema A — INSERT duplicado:
La función `saveToSupabase` usa `.insert()` para la tabla `conversations`,
lo que crea una fila nueva por cada par de mensajes enviados con el mismo
`sessionId`. Debe usar `.upsert()` con `onConflict: 'session_id'` para
actualizar la fila existente si ya hay una conversación con ese sessionId.

Problema B — message_count hardcodeado:
El campo `message_count` se establece siempre como `2` (línea ~86),
sin importar cuántos mensajes existan. Debe calcularse dinámicamente:
tras hacer el upsert y obtener el `id` y el `message_count` actual de la
fila resultante, ejecutar un segundo update que sume 2 al valor existente.

Corrección requerida en la función `saveToSupabase`:

1. Reemplaza el bloque `.insert({ session_id, title, ip_address,
   message_count: 2, updated_at })` por:

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

2. Después del upsert, si no hay error, incrementa el contador:

   if (conv) {
     await supabase
       .from('conversations')
       .update({ message_count: (conv.message_count ?? 0) + 2 })
       .eq('id', conv.id);
   }

No modifiques nada fuera de la función `saveToSupabase`.
```

---

### PROMPT BUG-03
> **Archivo afectado:** `src/app/api/chat/route.ts`

```
Archivo: src/app/api/chat/route.ts

Problema:
El rate limiting actual usa un Map en memoria del módulo (`rateLimitMap`).
En Vercel (serverless), cada instancia de la función tiene su propio
proceso aislado con estado independiente. Las solicitudes concurrentes se
distribuyen entre instancias, cada una con su contador en cero, lo que
hace que el rate limit sea completamente inefectivo.

Corrección requerida:
Reemplaza la lógica de rate limiting en memoria por una implementación
basada en Supabase que sea compartida entre instancias.

1. Elimina las variables de módulo `rateLimitMap`, `CLEANUP_INTERVAL_MS`,
   `lastCleanup`, y las funciones `cleanupRateLimitMap` y `checkRateLimit`.

2. Crea una nueva función asíncrona `checkRateLimit` que use Supabase:

   async function checkRateLimit(ip: string, limitPerMin: number): Promise<boolean> {
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

3. En el handler POST, la llamada a `checkRateLimit(ip, rateLimit)` ya
   es `await`-able, pero asegúrate de que el sitio de llamada la espere:
   `if (!(await checkRateLimit(ip, rateLimit))) { ... }`

4. Nota: La tabla `rate_limit_events` debe tener columnas `ip_address TEXT`
   y `created_at TIMESTAMPTZ DEFAULT now()`. Añade un comentario en el
   código indicando que esta tabla debe existir en Supabase.

No cambies ninguna otra lógica del handler POST.
```

---

## 🟠 ALTOS

---

### PROMPT BUG-04
> **Archivo afectado:** `src/app/api/chat/route.ts`

```
Archivo: src/app/api/chat/route.ts

Problema:
La IP del cliente se obtiene exclusivamente del header `X-Real-IP`:
  const ip = request.headers.get('x-real-ip') || 'unknown';

Este header puede ser enviado por cualquier cliente con un valor falso,
permitiendo evadir el rate limit con IPs inventadas. Además, si el header
no está presente, todas las solicitudes caen bajo el bucket 'unknown',
mezclando el rate limit de todos los usuarios sin reverse proxy.

Corrección requerida:
Reemplaza la línea de obtención de IP por la siguiente lógica que prioriza
los headers verificados por Vercel sobre los headers manipulables por el cliente:

  const ip =
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

Solo modifica esa única línea. No cambies ningún otro código.
```

---

### PROMPT BUG-05
> **Archivo afectado:** `src/components/Admin/StatsCards.tsx`

```
Archivo: src/components/Admin/StatsCards.tsx

Problema:
Los props `change` de dos StatCards tienen valores hardcodeados que
simulan porcentajes reales de cambio pero son completamente inventados:
  - "Conversaciones totales": change={summary.conversations_today > 0 ? 12 : 0}
  - "Mensajes hoy": change={summary.messages_today > 0 ? 5 : 0}
  - "Tasa de respuesta": value="99.8%" (valor fijo que no refleja datos reales)

Esto engaña al administrador mostrando métricas falsas.

Corrección requerida:

1. En la StatCard de "Conversaciones totales", elimina el prop `change`
   por completo (no pasar nada, ya que no hay datos comparativos reales).

2. En la StatCard de "Mensajes hoy", elimina el prop `change` por completo.

3. En la StatCard de "Tasa de respuesta":
   - Cambia el `value` hardcodeado "99.8%" por un cálculo real:
     si `summary.total_messages > 0`, calcular
     `((summary.assistant_messages / summary.total_messages) * 100).toFixed(1) + '%'`
     sino mostrar `'N/A'`
   - Elimina el prop `changeLabel="Excelente"`

No modifiques la función StatCard ni ningún otro componente.
```

---

### PROMPT BUG-06
> **Archivo afectado:** `src/app/api/chat/route.ts`

```
Archivo: src/app/api/chat/route.ts

Nota: Este bug está relacionado con BUG-02 (upsert de conversaciones).
Si BUG-02 ya fue corregido, este bug queda resuelto automáticamente
como parte de esa corrección. Verifica antes de aplicar este prompt.

Problema (si BUG-02 aún no fue corregido):
En la función `saveToSupabase`, el campo `message_count` se inserta
siempre con valor `2`, independientemente de cuántos mensajes haya
en la conversación. Esto hace que el panel admin muestre "2 mensajes"
para todas las conversaciones sin excepción.

Corrección requerida (solo si BUG-02 no fue aplicado):
Localiza en la función `saveToSupabase` la línea:
  message_count: 2,
y reemplázala por:
  message_count: existingMessages.length + 2,

Para hacer esto, `saveToSupabase` necesita recibir `existingMessages`
como parámetro adicional de tipo `number`. Actualiza:
1. La firma de la función: agrega `existingCount: number` como quinto parámetro.
2. El cuerpo: usa `message_count: existingCount + 2`
3. El sitio de llamada en el handler POST (dentro del stream `start`):
   `saveToSupabase(sessionId, lastUserMessage, assistantContent, ip, messages.length - 1)`
   (messages.length - 1 porque el último mensaje es el placeholder del asistente)

No modifiques nada más.
```

---

### PROMPT BUG-07
> **Archivo afectado:** `src/hooks/useConversations.ts`

```
Archivo: src/hooks/useConversations.ts

Problema (race condition):
La función `deleteConversation` primero llama a `deleteFromStorage(id)`
que escribe directamente en localStorage, y luego actualiza el estado de
React. Sin embargo, si existe un debounce timer pendiente de
`debouncedSave` (disparado por una acción previa como enviar un mensaje),
ese timer tiene capturado en su closure el array de conversaciones ANTES
de la eliminación. Cuando el timer se dispara ~500ms después, sobreescribe
localStorage con el array viejo, RESTAURANDO la conversación supuestamente
eliminada. El usuario recarga la página y la conversación reaparece.

Corrección requerida:
Reemplaza el cuerpo de la función `deleteConversation` por la siguiente
implementación que cancela el timer pendiente y escribe directamente
en localStorage de forma síncrona:

  const deleteConversation = useCallback(
    (id: string) => {
      // Cancelar cualquier escritura debounced pendiente
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      // Actualizar estado y escribir inmediatamente en localStorage
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        saveConversations(updated);
        return updated;
      });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId]
  );

Nota: `saveConversations` (importada de `@/utils/storage`) ya está
disponible en el archivo. Asegúrate de que el import de `deleteConversation
as deleteFromStorage` sea eliminado si ya no se usa en ninguna otra parte
del hook tras esta corrección.

No modifiques ninguna otra función del hook.
```

---

### PROMPT BUG-08
> **Archivos afectados:** `src/app/admin/page.tsx` y `src/app/admin/conversations/page.tsx`

```
Archivos: src/app/admin/page.tsx y src/app/admin/conversations/page.tsx

Problema:
Ambas páginas realizan llamadas fetch() sin ningún bloque try/catch.
Si ocurre un error de red (timeout, DNS, conexión rechazada), fetch()
lanza una excepción que no es capturada. Como resultado:
- `.finally(() => setLoading(false))` nunca se ejecuta
- El componente queda atascado mostrando "Cargando…" indefinidamente
- No se muestra ningún mensaje de error al administrador

Corrección requerida en src/app/admin/page.tsx:
Agrega `.catch()` al encadenamiento de promesas en el `useEffect` Y en
el manejador del botón de refresh. En ambos casos el catch debe:
1. Llamar a `console.error('Error cargando analytics:', err)`
2. No cambiar el estado `analytics` (mantener el valor anterior o vacío)

El patrón correcto para ambos fetch en este archivo:
  fetch('/api/admin/analytics')
    .then((r) => r.json())
    .then((data) => { if (!data.error) setAnalytics(data); })
    .catch((err) => console.error('Error cargando analytics:', err))
    .finally(() => setLoading(false));

Corrección requerida en src/app/admin/conversations/page.tsx:
En la función `loadConversations`, envuelve el cuerpo completo de la
función en un try/catch/finally:

  const loadConversations = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: '20' });
      if (q) params.set('search', q);
      const res = await fetch(`/api/admin/conversations?${params}`);
      const data = await res.json();
      if (!data.error) {
        setConversations(data.conversations);
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      }
    } catch (err) {
      console.error('Error cargando conversaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

No modifiques nada más en ninguno de los dos archivos.
```

---

## 🟡 MEDIOS

---

### PROMPT BUG-09
> **Archivo afectado:** `src/app/api/admin/config/route.ts`

```
Archivo: src/app/api/admin/config/route.ts

Problema:
El handler PUT acepta cualquier `key` y `value` sin validar contra un
conjunto de claves permitidas ni verificar la longitud máxima del valor.
Un administrador o un bug en el cliente podría insertar claves arbitrarias
en la tabla `bot_config`, incluyendo claves que el sistema no espera o
valores de longitud maliciosa.

Corrección requerida:
Antes del bloque de upsert en el handler PUT, agrega las siguientes
validaciones:

1. Define un Set de claves permitidas al inicio del archivo (fuera del handler):

   const ALLOWED_CONFIG_KEYS = new Set([
     'system_prompt',
     'model',
     'temperature',
     'max_tokens',
     'rate_limit_per_minute',
     'max_messages_per_conversation',
     'welcome_message',
     'welcome_subtitle',
   ]);
   const MAX_CONFIG_VALUE_LENGTH = 10000;

2. Dentro del handler PUT, después de construir el array `updates` y
   antes del upsert a Supabase, agrega:

   const invalidUpdate = updates.find(
     (u) => !ALLOWED_CONFIG_KEYS.has(u.key) || String(u.value).length > MAX_CONFIG_VALUE_LENGTH
   );
   if (invalidUpdate) {
     return NextResponse.json(
       { error: `Clave de configuración no permitida: ${invalidUpdate.key}` },
       { status: 400 }
     );
   }

No modifiques el handler GET ni ninguna otra función del archivo.
```

---

### PROMPT BUG-10
> **Archivo afectado:** `src/app/api/admin/analytics/route.ts`

```
Archivo: src/app/api/admin/analytics/route.ts

Problema:
La consulta a la tabla `daily_metrics` no tiene cláusula ORDER BY:

  const { data: daily } = await supabase
    .from('daily_metrics')
    .select('*')
    .limit(30);

El orden de los resultados es indeterminado. El componente
`ConversationsChart.tsx` asume que los datos llegan en orden descendente
por fecha (hace `.reverse().slice(-7)`). Sin ORDER BY, la gráfica puede
mostrar fechas desordenadas o datos incorrectos.

Corrección requerida:
Agrega `.order('date', { ascending: false })` a la query de `daily_metrics`:

  const { data: daily } = await supabase
    .from('daily_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(30);

Solo modifica esa query. No toques ninguna otra consulta del archivo.
```

---

### PROMPT BUG-11
> **Archivo afectado:** `src/app/api/cron/keepalive/route.ts`

```
Archivo: src/app/api/cron/keepalive/route.ts

Problema:
El endpoint GET `/api/cron/keepalive` no tiene ninguna autenticación.
Cualquier persona puede llamarlo libremente, lo que provoca:
1. Consultas innecesarias a Supabase con la service role key
2. El response incluye `bot_config_rows` (metadata de la DB expuesta)
3. Posibilidad de abuso para incrementar el conteo de invocaciones de la función

Corrección requerida:
1. Al inicio del handler GET, antes de cualquier operación, verifica
   el header de autorización de Vercel Cron:

   const authHeader = request.headers.get('authorization');
   if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }

   Nota: la condición `process.env.CRON_SECRET &&` permite que el endpoint
   funcione en desarrollo local donde la variable no está definida.

2. Cambia la firma del handler para aceptar `request`:
   `export async function GET(request: Request) {`

3. En `vercel.json`, no se requiere cambio de código, pero añade un
   comentario inline en el archivo de código indicando que la variable
   de entorno `CRON_SECRET` debe configurarse en el dashboard de Vercel.

No modifiques ninguna otra lógica del handler.
```

---

### PROMPT BUG-12
> **Archivo afectado:** `vercel.json`

```
Archivo: vercel.json

Problema:
El cron schedule actual es `"0 0 */5 * *"`. El campo `*/5` en la posición
day-of-month significa "en días 1, 6, 11, 16, 21, 26, 31 del mes" — no
"cada 5 días corridos". El intervalo real entre ejecuciones puede exceder
7 días en el cambio de mes (ej: del día 26 al 1 del siguiente mes son
5 días, pero del 31 al 1 son solo 1 día y luego al 6 son 5 días más).
Si el intervalo efectivo supera 7 días de inactividad, Supabase free-tier
puede pausar la base de datos.

Corrección requerida:
Cambia el schedule de `"0 0 */5 * *"` a `"0 0 */3 * *"` para ejecutar
el keepalive cada 3 días, dando un margen de seguridad adecuado:

  {
    "crons": [
      {
        "path": "/api/cron/keepalive",
        "schedule": "0 0 */3 * *"
      }
    ]
  }

No agregues ni elimines ninguna otra propiedad del archivo.
```

---

### PROMPT BUG-13
> **Archivo afectado:** `src/app/api/chat/route.ts`

```
Archivo: src/app/api/chat/route.ts

Problema:
Cuando la API de OpenAI retorna un error HTTP, el mensaje de error interno
de OpenAI se expone directamente al cliente:

  { error: (errorData as {...})?.error?.message || 'Error al comunicarse con la IA' }

Los mensajes de error de OpenAI pueden contener información sensible como
detalles de cuota agotada, nombres internos de modelos, límites de la
cuenta, o información de billing.

Corrección requerida:
Reemplaza el bloque de manejo de errores de OpenAI (aproximadamente
líneas 192-205) por la siguiente lógica que:
1. Loguea el error completo en el servidor
2. Envía al cliente solo un mensaje genérico según el código HTTP

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenAI API error:', response.status, errorData);

    const supabase = createServiceClient();
    await supabase.from('analytics_events').insert({
      event_type: 'error',
      session_id: sessionId || 'unknown',
      metadata: { status: response.status },
    });

    const userFacingMsg =
      response.status === 429
        ? 'El servicio está temporalmente saturado. Intenta en un momento.'
        : response.status === 401
        ? 'Error de configuración del servicio. Contacta al administrador.'
        : 'Error al comunicarse con la IA. Por favor intenta de nuevo.';

    return NextResponse.json({ error: userFacingMsg }, { status: response.status });
  }

No modifiques ninguna otra parte del archivo.
```

---

### PROMPT BUG-14
> **Archivo afectado:** `src/app/admin/login/page.tsx`

```
Archivo: src/app/admin/login/page.tsx

Problema:
El formulario de login del admin no tiene ningún mecanismo de protección
contra intentos repetidos. Un atacante puede probar contraseñas de forma
ilimitada sin ninguna fricción a nivel de aplicación (más allá de lo que
Supabase Auth pueda limitar por su cuenta).

Corrección requerida:
Agrega un sistema de bloqueo temporal basado en intentos fallidos consecutivos.

1. Agrega dos nuevos estados en el componente:
   const [failedAttempts, setFailedAttempts] = useState(0);
   const [lockedUntil, setLockedUntil] = useState(0);

2. Al inicio de `handleLogin`, agrega una verificación de lockout:
   if (Date.now() < lockedUntil) {
     const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
     setError(`Demasiados intentos. Espera ${secsLeft} segundos.`);
     setLoading(false);
     return;
   }

3. En el bloque `if (authError)`, reemplaza el `setError` actual por:
   const newAttempts = failedAttempts + 1;
   setFailedAttempts(newAttempts);
   if (newAttempts >= 5) {
     setLockedUntil(Date.now() + 30000); // 30 segundos de bloqueo
     setError('Demasiados intentos fallidos. Espera 30 segundos.');
   } else {
     setError(`Email o contraseña incorrectos. (${newAttempts}/5 intentos)`);
   }
   setLoading(false);
   return;

4. En el JSX del botón submit, agrega la condición de lockout al `disabled`:
   disabled={loading || Date.now() < lockedUntil}

No modifiques el comportamiento del login exitoso ni ningún otro elemento del formulario.
```

---

## 🟢 BAJOS

---

### PROMPT BUG-15
> **Archivo afectado:** `src/utils/storage.ts`

```
Archivo: src/utils/storage.ts

Problema:
La función `saveConversation` (líneas 32-53) está definida y exportada
pero no es importada ni utilizada en ningún archivo del proyecto.
El sistema usa exclusivamente `saveConversations` (plural). Esta función
huérfana además implementa una lógica diferente a la función plural
(lee de localStorage en cada llamada en lugar de recibir el array completo),
lo que podría causar comportamientos inconsistentes si alguien la usara
por error en el futuro.

Corrección requerida:
Elimina completamente la función `saveConversation` (singular) del archivo,
incluyendo su JSDoc si lo tuviera. La función abarca desde la línea que
dice `export function saveConversation(conversation: Conversation): void {`
hasta su llave de cierre `}`.

Verifica que no hay ningún import de `saveConversation` en ningún otro
archivo antes de eliminarla (puedes buscarlo con grep). No modifiques
ninguna otra función del archivo.
```

---

### PROMPT BUG-16
> **Archivo afectado:** `src/components/Admin/ConversationsChart.tsx`

```
Archivo: src/components/Admin/ConversationsChart.tsx

Problema:
El archivo importa `BarChart` y `Bar` de 'recharts' pero ninguno de los
dos se utiliza en el JSX del componente. Solo se usan `AreaChart` y `Area`.
Estos imports muertos incrementan el tamaño del bundle innecesariamente.

Corrección requerida:
En la declaración de import de 'recharts' (primera línea del archivo),
elimina `BarChart` y `Bar` de la lista de named imports.

El import debe quedar así:
  import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
  } from 'recharts';

No cambies ninguna otra parte del archivo.
```

---

### PROMPT BUG-17
> **Archivo afectado:** `src/components/Admin/ConversationViewer.tsx`

```
Archivo: src/components/Admin/ConversationViewer.tsx

Problema:
La función `formatRelative` no maneja el caso donde `diff` es 0 o negativo
(lo cual puede ocurrir por diferencias de reloj entre servidor y cliente,
o si el timestamp es levemente en el futuro). En ese caso, `mins` es 0
o negativo y la función retorna "Hace 0 min" o "Hace -3 min".

Corrección requerida:
Modifica la función `formatRelative` para manejar valores muy pequeños
o negativos. La función completa corregida debe ser:

  function formatRelative(dateStr: string) {
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  }

Los cambios son: (1) `Math.max(0, ...)` para evitar valores negativos,
(2) agregar el caso `mins < 1` que retorna 'Ahora mismo'.

No modifiques ningún otro código del archivo.
```

---

### PROMPT BUG-18
> **Archivo afectado:** `src/components/Admin/ModelSettings.tsx`

```
Archivo: src/components/Admin/ModelSettings.tsx

Problema:
El control de "Max Tokens" tiene un máximo hardcodeado de 4096 tanto
en los botones +/- como en el atributo `max` del input HTML.
Este límite es correcto para `gpt-3.5-turbo` pero incorrecto para
`gpt-4o` y `gpt-4o-mini` que soportan hasta 16,384 tokens de output.
El admin no puede configurar respuestas más largas en los modelos
más capaces.

Corrección requerida:

1. Define un objeto de límites por modelo al inicio del componente
   (fuera del JSX, dentro del cuerpo de la función), después de los
   estados ya existentes:

   const MODEL_MAX_TOKENS: Record<string, number> = {
     'gpt-4o': 16384,
     'gpt-4o-mini': 16384,
     'gpt-4-turbo': 4096,
     'gpt-3.5-turbo': 4096,
   };
   const currentMaxTokens = MODEL_MAX_TOKENS[model] ?? 4096;

2. En el botón de decremento (−), mantén el mínimo en 256:
   onClick={() => setMaxTokens((v) => Math.max(256, v - 128))}
   (sin cambio)

3. En el botón de incremento (+), reemplaza el 4096 hardcodeado:
   onClick={() => setMaxTokens((v) => Math.min(currentMaxTokens, v + 128))}

4. En el input de tipo number, actualiza el atributo max:
   max={currentMaxTokens}

5. Cuando el modelo cambia y el `maxTokens` actual supera el nuevo límite,
   ajusta automáticamente. Agrega un useEffect después de los estados:

   useEffect(() => {
     const limit = MODEL_MAX_TOKENS[model] ?? 4096;
     if (maxTokens > limit) setMaxTokens(limit);
   }, [model]);

No modifiques el texto de los labels ni la lógica de guardado.
```

---

## Índice rápido

| ID | Severidad | Archivo | Descripción corta |
|----|-----------|---------|-------------------|
| BUG-01 | 🔴 Crítico | `useChat.ts` | `sessionId` no enviado al backend → cero persistencia |
| BUG-02 | 🔴 Crítico | `chat/route.ts` | INSERT en vez de UPSERT → duplicados en DB |
| BUG-03 | 🔴 Crítico | `chat/route.ts` | Rate limit en memoria inefectivo en serverless |
| BUG-04 | 🟠 Alto | `chat/route.ts` | X-Real-IP spoofable → rate limit bypasseable |
| BUG-05 | 🟠 Alto | `StatsCards.tsx` | Métricas del dashboard son datos falsos hardcodeados |
| BUG-06 | 🟠 Alto | `chat/route.ts` | `message_count` siempre hardcodeado a 2 |
| BUG-07 | 🟠 Alto | `useConversations.ts` | Race condition debounce restaura conversaciones eliminadas |
| BUG-08 | 🟠 Alto | `admin/page.tsx`, `conversations/page.tsx` | Sin try/catch en fetch → crash silencioso |
| BUG-09 | 🟡 Medio | `admin/config/route.ts` | Config PUT sin allowlist de claves |
| BUG-10 | 🟡 Medio | `admin/analytics/route.ts` | `daily_metrics` sin ORDER BY → gráfica desordenada |
| BUG-11 | 🟡 Medio | `keepalive/route.ts` | Endpoint cron sin autenticación |
| BUG-12 | 🟡 Medio | `vercel.json` | Cron schedule incorrecto → posible pausa de Supabase |
| BUG-13 | 🟡 Medio | `chat/route.ts` | Errores internos de OpenAI expuestos al cliente |
| BUG-14 | 🟡 Medio | `admin/login/page.tsx` | Sin protección contra fuerza bruta |
| BUG-15 | 🟢 Bajo | `storage.ts` | `saveConversation` es código muerto |
| BUG-16 | 🟢 Bajo | `ConversationsChart.tsx` | Imports `BarChart`, `Bar` no usados |
| BUG-17 | 🟢 Bajo | `ConversationViewer.tsx` | `formatRelative` muestra "Hace 0 min" / valores negativos |
| BUG-18 | 🟢 Bajo | `ModelSettings.tsx` | `max_tokens` limitado a 4096 para todos los modelos |
