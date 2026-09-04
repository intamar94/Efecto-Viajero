# Tareas para ChatGPT (Fase 2: Backend + Híbrido)

**Repositorio**: https://github.com/intamar94/Efecto-Viajero  
**Branch**: `claude/efecto-viajero-platform-tl35wr`  
**Contexto**: Hemos preparado la UI de auth (login, signup, settings). Tú harás el backend para que funcione + la sincronización híbrida.

---

## 📋 Tareas en orden

### 1. **Reescribir `src/lib/store.tsx`: Hybrid persistence**

**¿Qué?**: Hacer que `useData()` lea de Supabase + localStorage caché en paralelo.

**Comportamiento deseado**:
- Si el usuario está autenticado → lee de localStorage (latencia 0), pero escribe en Supabase en background (async)
- Si no está autenticado → funciona como ahora (solo localStorage)
- Si hay conflicto (edición local + remota simultánea) → última escritura gana
- No cambiar la interfaz de `useData()` (los componentes no deben saber)

**Pseudocódigo**:
```typescript
if (user) {
  // Al cargar: trae de localStorage inmediatamente (caché)
  // En background: sincroniza con Supabase y resuelve conflictos
  // Al guardar: escribe en localStorage + encola en Supabase
}
```

**Archivos a modificar**: `src/lib/store.tsx`

---

### 2. **Autenticación Supabase Auth**

**¿Qué?**: Conectar Supabase Auth a la UI que ya existe (`/auth/login`, `/auth/signup`).

**Funciones necesarias**:
- Validar que email no existe antes de signup
- Manejar errores de Supabase Auth (usuario ya existe, contraseña débil, etc)
- Guardar `user_id` en localStorage para sincronización

**Archivos a crear/modificar**:
- `src/lib/supabase/auth-client.ts` (ya existe; mejorar)
- `src/lib/hooks/useAuth.ts` (ya existe; mejorar)

---

### 3. **Migración: localStorage → Supabase (primera carga)**

**¿Qué?**: Mover datos históricos sin perder nada.

**Función única**:
```typescript
export async function migrateLocalStorageToSupabase(userId: string): Promise<void>
```

**Comportamiento**:
- Se ejecuta solo una vez, al autenticarse por primera vez
- Lee `localStorage['effecto-viajero-state']` (viajes + viajeros)
- Inserta todo en Supabase con `user_id`
- Marca como migrado (flag en localStorage: `migrated_to_supabase = true`)

**Archivos**:
- `src/lib/supabase/migrations.ts` (nuevo)

---

### 4. **Auto-crear viajeros desde texto**

**¿Qué?**: Si el usuario dice "Viajo con mi pareja y 2 niños", generar automáticamente 4 viajeros.

**Función**:
```typescript
export function extraerYCrearViajeros(texto: string): Viajero[]
```

**Ejemplos**:
- "2 adultos, 1 niño, 1 gato" → PersonaViajero + PersonaViajero + PersonaViajero + MascotaViajero
- "mi pareja y yo" → 2 PersonaViajero
- "solo" → 1 PersonaViajero
- Maneja números en letra: "dos", "un", "tres"

**Archivos**:
- `src/lib/viajeros/auto-extract.ts` (nuevo)

---

### 5. **Refrescar análisis (re-ejecutar Travel Brain)**

**¿Qué?**: Botón "🔄 Actualizar investigación" que vuelve a correr el análisis del viaje.

**Función**:
```typescript
export async function refrescarAnalisis(viajeId: string): Promise<Investigacion | null>
```

**Comportamiento**:
- Lee el viaje actual (con fechas, destino, etc)
- Llama a `/api/trips/analyze` de nuevo
- Actualiza `viaje.investigacion` en Supabase + localStorage
- Retorna la investigación nueva

**Archivos**:
- `src/lib/viajes/refresh-analysis.ts` (nuevo)

---

### 6. **Vault → Presupuesto (sumar importes)**

**¿Qué?**: Conectar los documentos del Vault al cálculo de presupuesto.

**Función**:
```typescript
export function sumarImportesVault(documentos: DocumentoViaje[]): number
```

**Comportamiento**:
- Lee `documento.importe` de cada uno
- Suma todos (solo números > 0)
- Se integra en `calcularPresupuesto()` como una línea más: "Documentos del Vault: 350€"

**Archivos**:
- Modificar `src/lib/compatibilidad.ts`: agregar una línea al desglose

---

### 7. **Compartir viaje: lógica**

**¿Qué?**: Estructura de datos y funciones para compartir viajes.

**Tablas SQL nuevas** (agregar a `supabase/migrations/0002_shared_viajes.sql`):
```sql
CREATE TABLE public.viajes_compartidos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  viaje_id uuid REFERENCES public.viajes ON DELETE CASCADE,
  usuario_email text NOT NULL,
  permiso text CHECK (permiso IN ('ver', 'editar')),
  creado_en timestamp DEFAULT now()
);
```

**Funciones**:
```typescript
export async function compartirViaje(
  viajeId: string,
  emailDestino: string,
  permiso: "ver" | "editar"
): Promise<boolean>

export async function revocarCompartido(
  viajeId: string,
  emailDestino: string
): Promise<boolean>

export async function obtenerCompartidos(
  viajeId: string
): Promise<Array<{ email: string; permiso: string }>>
```

**RLS**: Actualizar policies para que si un viaje está compartido contigo con "editar", puedas modificarlo.

**Archivos**:
- `supabase/migrations/0002_shared_viajes.sql` (nuevo)
- `src/lib/supabase/shared.ts` (nuevo)

---

## 🔄 Dependencias entre tareas

1. **Antes de 2 (Auth)**: Supabase debe estar configurado (usuario siguió `SUPABASE_SETUP.md`)
2. **Antes de 3 (Migración)**: Debe estar completada la tarea 1 (hybrid persistence)
3. **Antes de 5 (Refrescar)**: Nada, es independiente
4. **Antes de 6 (Vault)**: Nada, es una línea en compatibilidad.ts
5. **Antes de 7 (Compartido)**: Nada, pero requiere que auth esté hecho

**Orden recomendado**:
1. Task 1 (Híbrido)
2. Task 2 (Auth)
3. Task 3 (Migración)
4. Task 4 (Auto-viajeros)
5. Task 5 (Refrescar análisis)
6. Task 6 (Vault suma)
7. Task 7 (Compartido)

---

## 📝 Detalles técnicos

### Hybrid persistence pseudocódigo

```typescript
function useData() {
  const { user } = useAuth();
  const [state, setState] = useState(() => {
    // Al cargar: lee caché local
    const cached = localStorage.getItem("effecto-viajero-state");
    return cached ? JSON.parse(cached) : initialState;
  });

  useEffect(() => {
    if (!user) return;

    // En background: sync con Supabase
    (async () => {
      const remoteData = await viajesRepository.obtenerTodos(user.id);
      // Resolver conflictos, guardar en localStorage
      localStorage.setItem("effecto-viajero-state", JSON.stringify(remoteData));
      setState(remoteData);
    })();
  }, [user]);

  const guardarViaje = useCallback(async (viaje: Viaje) => {
    // Guardar local (instantáneo)
    const newState = { ...state, viajes: [...state.viajes, viaje] };
    localStorage.setItem("effecto-viajero-state", JSON.stringify(newState));
    setState(newState);

    // Guardar remoto (background)
    if (user) {
      try {
        await viajesRepository.crear(viaje, user.id);
      } catch (err) {
        // Marcar como pendiente de sync
        console.error("Sync failed:", err);
      }
    }
  }, [state, user]);

  return { ...state, guardarViaje, ... };
}
```

---

## ✅ Criterios de aceptación

Cada tarea se considera completa cuando:

1. **Build pasa**: `npx next build` sin errores
2. **TypeScript limpio**: `npx tsc --noEmit` sin warnings
3. **Código testeado**: al menos un test e2e o verificación manual
4. **Commits limpios**: mensaje descriptivo, sin debug code
5. **PR abierta**: a `claude/efecto-viajero-platform-tl35wr`

---

## 📞 Coordinación

- **Claude (yo)**: Interfaz, flows de usuario, mostrar el botón "refrescar", UI de compartir
- **ChatGPT (tú)**: Backend, funciones, migraciones, sincronización
- **Comunicación**: Ambos hacemos commits a la misma rama, pullemos antes de push

---

**Arranca cuando sea. Avísame cuando termines las primeras 3 tareas (híbrido + auth + migración) y las testeo en navegador.**

