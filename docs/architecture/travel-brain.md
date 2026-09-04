# Efecto Viajero — arquitectura central

## Principio

El viaje es la unidad de producto. Las pestañas son vistas especializadas del mismo viaje, no aplicaciones independientes.

```text
Usuario
  ↓
Intención
  ↓
Destination Resolver
  ↓
Trip State
  ↓
Travel Brain
  ├─ Accommodation Intelligence
  ├─ Transport Intelligence
  ├─ Activity Intelligence
  ├─ Culture Intelligence
  ├─ Gastronomy Intelligence
  ├─ Nature Intelligence
  ├─ Requirements Intelligence
  ├─ Weather Intelligence
  ├─ Personalized Map
  └─ Offline Travel
  ↓
Travel Builder
  ↓
Plan + Inventory + Reservas + Documentos + Presupuesto
  ↓
Travel Mode
  ↓
Adaptación / Resolver
```

## Reglas

1. El contexto del viaje es compartido por todas las funciones.
2. Los datos verificables proceden de fuentes/proveedores; el modelo de IA interpreta y relaciona, no inventa hechos.
3. Los datos importantes deben conservar fuente, fecha de comprobación y confianza.
4. Una decisión del usuario recalcula las partes dependientes del viaje.
5. El GPS aporta contexto espacial; Internet aporta datos externos. No deben confundirse.
6. El modo offline debe preparar previamente lo necesario para continuar el viaje sin conexión.
7. Las preferencias permanentes del viajero y las necesidades del viaje permanecen separadas; el viaje actual tiene prioridad.

## Orden de ingeniería

### Capa 1 — núcleo
- Trip State
- Destination Resolver
- fuentes/evidencias
- Travel Brain
- delegates por dominio

### Capa 2 — inteligencia
- alojamiento
- transporte
- actividades
- cultura
- gastronomía
- naturaleza
- requisitos
- clima

### Capa 3 — experiencia
- constructor progresivo
- inventario/bag
- mapa personalizado
- presupuesto
- vault
- offline
- travel mode
- adaptación
- resolver

### Capa 4 — proveedores
Cada delegate puede conectar uno o varios proveedores sin cambiar la interfaz de la aplicación.
