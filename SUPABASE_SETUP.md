# Configuración de Supabase para Efecto Viajero

## Paso 1: Crear el proyecto Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión (o crea una cuenta gratuita)
2. Haz clic en "New Project"
3. Elige:
   - **Project name**: `efecto-viajero` (o lo que prefieras)
   - **Database password**: genera una segura (Supabase te lo genera)
   - **Region**: elige la más cercana (ej: `us-east-1` o Europa)
4. Espera a que se cree (2-3 minutos)

## Paso 2: Aplicar la migración

1. En el panel de Supabase, ve a **SQL Editor**
2. Haz clic en **New Query**
3. Copia el contenido de `supabase/migrations/0001_create_initial_schema.sql`
4. Pégalo en el editor
5. Haz clic en **Run** (arriba a la derecha)
6. Verifica en la pestaña **Table Editor** que aparecen las tablas: `viajes`, `viajeros`, `documentos`

## Paso 3: Obtener las credenciales

1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (bajo "Project API keys") → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Paso 4: Configurar variables de entorno

Crea (o edita) `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-anon-key]
```

**Importante**: Estas son públicas (por el prefijo `NEXT_PUBLIC_`). No compartas el proyecto, pero está diseñado para ser público gracias a Row Level Security (RLS).

## Paso 5: Verificar que funciona

```bash
npm run build
npm run dev
```

Abre http://localhost:3000 en el navegador.

## Plan de migración: localStorage → Supabase

**Estado actual**: Todos los datos están en `localStorage` del navegador, bajo `effecto-viajero-state`.

**Migración en tres fases**:

### Fase 1 (ya hecha): Capa de repositorio
- `src/lib/supabase/repository.ts`: operaciones CRUD contra Supabase
- `src/lib/supabase/database.types.ts`: tipos TypeScript generados
- Sin cambios en la interfaz aún

### Fase 2 (próxima): Híbrido durante transición
- El `useData` sigue usando `localStorage` como caché local
- Cada operación sincroniza bidireccional con Supabase
- El viajero ve datos al instante (desde cache) y se sincronizan en background

### Fase 3: Supabase es fuente de verdad
- `useData` se reescribe para leer/escribir directamente en Supabase
- El caché local solo es backup offline
- Sincronización en tiempo real entre dispositivos (misma cuenta)

## Próximas capacidades desbloqueadas

Una vez que Supabase está conectado:

1. **Viaje compartido** (B16): invita amigos por email, edición colaborativa en tiempo real
2. **Recuerdos con fotos** (B18): almacenamiento en Supabase Storage
3. **Multi-dispositivo**: accede desde el móvil, tableta, portátil — el mismo viaje sincronizado
4. **Exportar viajes**: backup JSON descargable

## Troubleshooting

**"Cannot find package '@supabase/supabase-js'"**
```bash
npm install @supabase/supabase-js
```

**"Unauthorized" al guardar viajes**
- Verifica que las variables de entorno están en `.env.local` (no en `.env`)
- Reinicia el servidor: `Ctrl+C` y `npm run dev`

**Datos del viejo localStorage no aparecen**
- Eso es normal en esta fase. La UI sigue leyendo de `localStorage`, Supabase es paralelo aún.
- En Fase 2 haremos la migración del histórico.

## Siguientes pasos

Una vez verificado:
1. Commit de la estructura Supabase
2. Implementar Fase 2: híbrido localStorage ↔ Supabase
3. Eliminar elementos bloqueados de `providerRegistry.ts` (alojamiento, emergencias, etc.) conforme se implementan
