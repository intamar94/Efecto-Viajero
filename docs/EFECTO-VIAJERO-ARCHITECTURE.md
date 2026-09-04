# Efecto Viajero — Arquitectura objetivo

## 1. Principio

Efecto Viajero es una capa de coordinación inteligente sobre datos y servicios de viaje. La interfaz nunca expone agentes, orquestadores ni proveedores. El usuario ve una sola experiencia: su viaje.

El centro del sistema es `TripContext`: una representación canónica y mutable de quién viaja, cuándo, con qué presupuesto, qué quiere hacer, dónde quiere ir, qué restricciones existen y cómo quiere organizarse.

## 2. Flujo principal

```text
USUARIO
  ↓
ENTRADA LIBRE + DATOS MÍNIMOS
  ↓
UNDERSTANDING LAYER
  ├─ deconstrucción de intención
  ├─ destinos / regiones / países
  ├─ fechas y duración
  ├─ presupuesto
  ├─ composición de viajeros
  ├─ accesibilidad
  ├─ preferencias y restricciones
  └─ modo de planificación
  ↓
TRIP CONTEXT (fuente única de verdad)
  ↓
DESTINATION RESOLUTION
  ↓
RESEARCH ORCHESTRATOR
  ├─ requisitos / leyes / emergencias
  ├─ transporte
  ├─ alojamiento
  ├─ clima
  ├─ experiencias / cultura / gastronomía / naturaleza / eventos
  ├─ moneda / presupuesto / gastos
  ├─ mapa / offline
  ├─ social
  └─ memoria
  ↓
TRAVEL BRAIN
  ├─ verifica compatibilidad
  ├─ prioriza
  ├─ detecta conflictos
  ├─ explica incertidumbre
  └─ decide qué recalcular
  ↓
TRAVEL BUILDER
  ├─ itinerario
  ├─ días
  ├─ rutas
  └─ opciones alternativas
  ↓
APP / MODO VIAJE
```

## 3. Los tres modos

### Completo
Objetivo: llegar a la fecha con el máximo de viaje preparado. El sistema propone un itinerario inicial, detecta huecos y reoptimiza cuando cambian fechas, reservas, presupuesto o restricciones.

### Poco a poco
Objetivo: conservar flexibilidad. Cada nueva actividad, reserva, idea o cambio se añade al contexto y genera una recalculación incremental en lugar de reconstruir todo.

### Explorar
Objetivo: resolver el momento actual. Ejemplo: `Hoy quiero playa y un día tranquilo`.

El flujo interno es:

```text
petición de hoy
 → ubicación / hora
 → clima y condiciones
 → disponibilidad temporal
 → composición del grupo
 → accesibilidad
 → distancia y transporte
 → presupuesto
 → reglas locales
 → candidatos
 → ranking contextual
 → recomendaciones + cosas que llevar / comprobar
```

Una recomendación contextual nunca debe presentar como hecho una regla no verificada. Las restricciones de playa, comida, bebidas, parques, entradas, mascotas o actividades deben llegar con evidencia cuando la fuente lo permita.

## 4. Grafo de dependencias

```text
DESTINATION
 ├─ REQUIREMENTS
 ├─ LAWS
 ├─ EMERGENCY
 ├─ TRANSPORT
 ├─ ACCOMMODATION
 ├─ WEATHER
 ├─ EXPERIENCES
 ├─ CULTURE
 ├─ GASTRONOMY
 ├─ NATURE
 ├─ EVENTS
 ├─ LANGUAGE
 └─ CURRENCY

TRANSPORT + ACCOMMODATION + DESTINATION
 └─ BUDGET

BUDGET + TRANSPORT + ACCOMMODATION
 └─ EXPENSES

DESTINATION + TRANSPORT
 └─ MAP

REQUIREMENTS + EMERGENCY + MAP
 └─ OFFLINE

MEMORY y SOCIAL son capacidades transversales y no bloquean la construcción básica del viaje.
```

El scheduler debe ejecutar tareas por capas topológicas. Las tareas independientes pueden correr en paralelo. Un fallo de una capacidad no invalida todo el viaje: el resultado pasa a `partial`, `needs_review` o `unavailable` con motivo.

## 5. Evidencia y confianza

Toda información externa que pueda cambiar debe modelarse con:

- `source`
- `checkedAt`
- `freshness`
- `confidence`

Fuentes oficiales tienen prioridad para leyes, requisitos, emergencias y restricciones. Los agregadores sirven para descubrimiento y comparación; no deben sustituir automáticamente a una fuente normativa.

## 6. Cambios y recalculación

El orquestador no debe reconstruir el mundo cuando cambia una sola variable.

Ejemplos:

- cambio de fecha → clima/eventos/requisitos dependientes de fecha + disponibilidad
- cambio de viajero → compatibilidad, accesibilidad, alojamiento, actividades, transporte
- cambio de presupuesto → alojamiento, transporte, actividades y ranking económico
- nueva reserva → presupuesto + itinerario + mapa
- cambio de destino → nueva rama de destino y sus dependencias
- cambio de clima durante el viaje → solo el día y actividades afectadas

Esto requiere un futuro `ChangeSet`/`DeltaPlan` para ejecutar únicamente tareas afectadas por la mutación.

## 7. Inteligencia vs. proveedores

El Travel Brain decide qué necesita, relaciona resultados, detecta conflictos y selecciona opciones. Los proveedores aportan hechos y disponibilidad.

La arquitectura usa capacidades (`providerRegistry`) en lugar de acoplar la lógica del producto a una sola marca. Se pueden incorporar REST APIs, MCP servers, datos oficiales, servicios de mapas, proveedores de vuelos, alojamiento, experiencias o fuentes conectadas sin cambiar el contrato del Travel Brain.

## 8. Papel de OpenAI

OpenAI encaja como capa de razonamiento/understanding, no como fuente única de hechos.

Uso recomendado:

- parser estructurado de intención
- extracción de preferencias implícitas
- resolución de lenguaje natural
- ranking y explicación
- agentes especializados como herramientas internas cuando la complejidad lo justifique
- web/file search o herramientas externas para adquirir evidencia
- guardrails y tracing para depurar el orquestador

El Agents SDK soporta agentes como herramientas, handoffs, herramientas de función, MCP y trazas; el patrón manager puede mantener un solo responsable del resultado mientras delega trabajo internamente. Ver documentación oficial: https://openai.github.io/openai-agents-js/ y https://openai.github.io/openai-agents-python/

No se debe convertir la app en un conjunto de agentes autónomos sin control: el scheduler de Efecto Viajero debe mantener los contratos, dependencias, permisos, coste y estado.

## 9. Integraciones externas

Prioridad de integración:

1. mapas / routing / POI
2. clima
3. vuelos / tren / transporte
4. alojamiento
5. fuentes oficiales de requisitos / leyes / emergencias
6. experiencias / gastronomía / eventos
7. FX
8. nube de fotos / memoria
9. calendar / email cuando el usuario lo conecte
10. pagos/booking solo cuando el producto tenga un flujo transaccional definido

Plugins de ChatGPT pueden ser útiles como complementos o fuentes puntuales, pero no deben ser una dependencia arquitectónica del producto. Efecto Viajero necesita sus propias interfaces de proveedor y su propio estado.

## 10. Memoria y medios

Los originales pertenecen al usuario. Efecto Viajero debe preferir:

- dispositivo del usuario
- nube del usuario conectada
- índice de metadatos en Efecto Viajero
- caché temporal para procesamiento
- resultado generado guardado de nuevo en la nube del usuario

La memoria debe poder buscar por `qué + dónde + cuándo + personas + categorías`.

## 11. Rutas de fallo

- destino ambiguo → pedir confirmación, no elegir arbitrariamente
- proveedor caído → continuar con otras capacidades y mostrar cobertura parcial
- dato desactualizado → marcar freshness
- conflicto entre fuentes → conservar ambas evidencias y elevar a revisión
- falta de fechas → permitir planificación relativa
- falta de presupuesto → no inventar límite; recomendar rangos
- falta de ubicación GPS → usar destino/última ubicación conocida y pedir permiso solo cuando sea necesario
- falta de internet → usar bundle offline mínimo y marcar información posiblemente desactualizada

## 12. Estado actual del código

Ya existe el contexto canónico, los tres modos, el grafo de investigación, el resolver global de destinos, el perfil de exploración, el registro de capacidades y endpoints separados para análisis y exploración.

El siguiente salto necesario para considerar el Travel Brain plenamente operativo es conectar proveedores reales para las capacidades que hoy solo tienen contrato/cola y reemplazar el parser regex por extracción estructurada con LLM + validación de esquema. Nunca marcar una capacidad como lista cuando solo exista la estructura.
